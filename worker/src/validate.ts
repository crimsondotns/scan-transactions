/**
 * ตัวตรวจคำขอของ API wrapper — แยกเป็นไฟล์ล้วนๆ เพื่อทดสอบได้โดยไม่ต้องมี runtime ของ Cloudflare
 * กติกาความปลอดภัย: เบราว์เซอร์ = ไคลเอนต์ที่เชื่อไม่ได้ ทุกอย่างที่มาจากมันต้องผ่านด่านนี้ก่อน
 */

/** ชื่อย่อของปลายทาง (ตั้งฝั่งเซิร์ฟเวอร์) — ไคลเอนต์รู้แค่ชื่อย่อ ไม่รู้ URL จริง */
export const ALIAS_RE = /^[a-z0-9][a-z0-9_-]{0,31}$/;
/** path ที่ต่อท้าย: ตัวอักษรของ URL ปกติเท่านั้น ห้ามย้อนขึ้น (..) ห้ามยัด scheme/host เข้ามา */
const PATH_RE = /^[A-Za-z0-9._~%\-/]{0,512}$/;
const KEY_RE = /^[A-Za-z0-9_.\-[\]]{1,64}$/;
/** พารามิเตอร์ที่ห้ามให้ไคลเอนต์ส่ง — กันไคลเอนต์แนบ/ทับกุญแจเอง (กุญแจต้องมาจากฝั่งเซิร์ฟเวอร์เท่านั้น) */
const BANNED_KEYS = new Set(['key', 'apikey', 'api_key', 'apiKey'.toLowerCase(), 'token', 'access_token', 'authorization', 'auth', 'secret', 'signature']);
const MAX_PARAMS = 20;
const MAX_VALUE = 4096;
const MAX_QUERY = 16384;

/** /s/<alias>/<path> → { alias, path } ; รูปแบบอื่นทั้งหมด = null (ไม่มีโหมดส่งต่อ URL อิสระ = ไม่เป็น open proxy) */
export function parseRoute(pathname: string): { alias: string; path: string } | null {
  const m = /^\/s\/([^/]+)(?:\/(.*))?$/.exec(pathname);
  if (!m) return null;
  const alias = m[1] ?? '';
  const path = m[2] ?? '';
  if (!ALIAS_RE.test(alias)) return null;
  if (!PATH_RE.test(path)) return null;
  if (path.split('/').some((s) => s === '..' || s === '.')) return null;
  // %2e%2e / %2f ที่ถอดรหัสแล้วกลายเป็นการย้อน path
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  if (decoded.includes('..') || decoded.includes('\\') || /[\x00-\x1f]/.test(decoded)) return null;
  return { alias, path };
}

/** คัดพารามิเตอร์: จำกัดจำนวน/ความยาว และตัดคีย์ที่เป็นข้อมูลยืนยันตัวตนทิ้ง — เกินโควตา = null */
export function safeQuery(sp: URLSearchParams): URLSearchParams | null {
  const out = new URLSearchParams();
  let n = 0;
  let total = 0;
  for (const [k, v] of sp) {
    if (BANNED_KEYS.has(k.toLowerCase())) continue;
    if (!KEY_RE.test(k)) return null;
    if (v.length > MAX_VALUE || /[\x00-\x1f]/.test(v)) return null;
    if (++n > MAX_PARAMS) return null;
    total += k.length + v.length + 2;
    if (total > MAX_QUERY) return null;
    out.append(k, v);
  }
  return out;
}

/** origin ที่อนุญาต (ตั้งฝั่งเซิร์ฟเวอร์, คั่นด้วยจุลภาค) — ไม่มี wildcard, เทียบแบบตรงตัว */
export function allowedOrigin(origin: string | null, allowList: string | undefined): string | null {
  if (!origin || !allowList) return null;
  const list = allowList
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return list.includes(origin) ? origin : null;
}

/** คำขอที่พกข้อมูลยืนยันตัวตนมาเอง = ผิดสัญญา (กุญแจต้องมาจากฝั่งเซิร์ฟเวอร์) */
export const CLIENT_AUTH_HEADERS = ['authorization', 'x-api-key', 'x-auth-token', 'cookie'];
export function carriesClientAuth(h: Headers): boolean {
  return CLIENT_AUTH_HEADERS.some((k) => h.has(k));
}

/**
 * แปลง path ที่ไคลเอนต์ส่งมาให้เป็น path จริงของปลายทาง เมื่อ alias นั้นประกาศตารางเส้นทางไว้
 * ตาราง (secret): {"t":"v1/transfers","p":"v1/pnl-activity"} → "/s/a/t/<addr>" กลายเป็น "v1/transfers/<addr>"
 * ผลคือชื่อเส้นทางที่เห็นในเบราว์เซอร์เป็นตัวอักษรกลางๆ ไม่บอกว่าปลายทางเป็นเจ้าไหน
 * ไม่มีตาราง = ส่ง path ผ่านตามเดิม; มีตารางแต่คีย์ไม่ตรง = null (404)
 */
export function mapRoute(path: string, routesJson: string | undefined): string | null {
  if (!routesJson) return path;
  let table: unknown;
  try {
    table = JSON.parse(routesJson);
  } catch {
    return null;
  }
  if (typeof table !== 'object' || table === null) return null;
  const [key, ...rest] = path.split('/');
  const mapped = (table as Record<string, unknown>)[key ?? ''];
  if (typeof mapped !== 'string' || mapped === '') return null;
  const tail = rest.filter(Boolean).join('/');
  return tail ? `${mapped.replace(/\/+$/, '')}/${tail}` : mapped;
}

/** ต่อ URL ปลายทาง — base มาจาก secret ฝั่งเซิร์ฟเวอร์เท่านั้น */
export function upstreamUrl(base: string, path: string, query: URLSearchParams): string | null {
  let u: URL;
  try {
    u = new URL(`${base.replace(/\/+$/, '')}/${path}`);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const q = query.toString();
  return q ? `${u.origin}${u.pathname}?${q}` : `${u.origin}${u.pathname}`;
}
