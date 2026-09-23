/**
 * XCap Scan — API wrapper (Cloudflare Worker)
 *
 * ทำไมต้องมี: หน้าเว็บเป็น static บน GitHub Pages จึงไม่มีที่เก็บความลับ — กุญแจของแหล่งข้อมูลอยู่ที่นี่เท่านั้น
 * สัญญากับหน้าเว็บ: GET /s/<alias>/<path>?<query> — ไคลเอนต์รู้แค่ชื่อย่อ (alias) ไม่รู้ URL จริงและไม่เคยเห็นกุญแจ
 *
 * ความปลอดภัย (ทุกข้อบังคับใช้ที่ไฟล์นี้)
 *  - ไม่มีโหมดส่งต่อ URL อิสระ (?url=) → ไม่เป็น open proxy; ปลายทางมาจาก secret ที่ผูกกับ alias เท่านั้น
 *  - CORS เฉพาะ origin ที่ตั้งไว้ (ALLOWED_ORIGINS) ไม่มี wildcard
 *  - ไคลเอนต์ส่ง Authorization/x-api-key มาเอง = 400 (กุญแจต้องมาจากฝั่งนี้)
 *  - ไม่ log กุญแจ ไม่ส่งกุญแจกลับ ไม่ส่ง header ของปลายทางกลับนอกจาก content-type
 *  - จำกัดอัตราคำขอต่อ IP (best effort ในหน่วยความจำ หรือผ่าน binding RATE_LIMITER ถ้าผูกไว้)
 */
import { allowedOrigin, carriesClientAuth, parseRoute, safeQuery, upstreamUrl } from './validate';

export interface Env {
  /** รายการ origin ที่เรียกได้ คั่นด้วยจุลภาค เช่น https://<user>.github.io */
  ALLOWED_ORIGINS?: string;
  /** จำนวนคำขอต่อ IP ต่อนาที (ค่าเริ่มต้น 60) */
  RATE_LIMIT_PER_MIN?: string;
  /** ตัวจำกัดอัตราของ Cloudflare ถ้าผูกไว้ */
  RATE_LIMITER?: { limit(o: { key: string }): Promise<{ success: boolean }> };
  /** ต่อ alias: UPSTREAM_<ALIAS>_BASE (secret), _AUTH_HEADER (var), _KEY (secret) */
  [k: string]: unknown;
}

const WINDOW_MS = 60_000;
const hits = new Map<string, { n: number; until: number }>();

/** best effort: นับในหน่วยความจำของ isolate — ไม่ใช่ของแข็ง แต่กันยิงรัวจากเครื่องเดียวได้ */
function underLimit(ip: string, perMin: number): boolean {
  const now = Date.now();
  const cur = hits.get(ip);
  if (!cur || cur.until <= now) {
    hits.set(ip, { n: 1, until: now + WINDOW_MS });
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.until <= now) hits.delete(k);
    return true;
  }
  cur.n++;
  return cur.n <= perMin;
}

function cors(origin: string | null): Record<string, string> {
  const h: Record<string, string> = { vary: 'Origin' };
  if (origin) {
    h['access-control-allow-origin'] = origin;
    h['access-control-allow-methods'] = 'GET, OPTIONS';
    h['access-control-allow-headers'] = 'accept';
    h['access-control-max-age'] = '86400';
  }
  return h;
}

/** ข้อความสั้น ไม่บอกรายละเอียดปลายทาง (ไคลเอนต์ไม่ควรเดาโครงสร้างฝั่งเซิร์ฟเวอร์ได้) */
function fail(status: number, code: string, origin: string | null): Response {
  return new Response(JSON.stringify({ error: code }), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...cors(origin) } });
}

const envStr = (env: Env, k: string): string | undefined => {
  const v = env[k];
  return typeof v === 'string' && v !== '' ? v : undefined;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = allowedOrigin(request.headers.get('origin'), env.ALLOWED_ORIGINS);

    if (request.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: cors(origin) });
    if (request.method !== 'GET') return fail(405, 'method', origin);
    // เรียกจาก origin อื่น (หรือไม่มี origin) → ปฏิเสธ และไม่ใส่ CORS header ให้
    if (!origin) return fail(403, 'origin', null);
    if (carriesClientAuth(request.headers)) return fail(400, 'client_auth', origin);

    const perMin = Number(env.RATE_LIMIT_PER_MIN ?? '60') || 60;
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (env.RATE_LIMITER) {
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return fail(429, 'rate', origin);
    } else if (!underLimit(ip, perMin)) {
      return fail(429, 'rate', origin);
    }

    const route = parseRoute(url.pathname);
    if (!route) return fail(404, 'route', origin);
    const query = safeQuery(url.searchParams);
    if (!query) return fail(400, 'query', origin);

    const up = envStr(env, `UPSTREAM_${route.alias.toUpperCase()}_BASE`);
    if (!up) return fail(404, 'route', origin);
    const target = upstreamUrl(up, route.path, query);
    if (!target) return fail(400, 'route', origin);

    // กุญแจถูกเติมที่นี่ — ไม่เคยผ่านเบราว์เซอร์และไม่ถูก log
    const headers: Record<string, string> = { accept: 'application/json' };
    const authHeader = envStr(env, `UPSTREAM_${route.alias.toUpperCase()}_AUTH_HEADER`);
    const key = envStr(env, `UPSTREAM_${route.alias.toUpperCase()}_KEY`);
    if (authHeader && key) headers[authHeader.toLowerCase()] = key;

    let res: Response;
    try {
      res = await fetch(target, { method: 'GET', headers });
    } catch {
      return fail(502, 'upstream', origin);
    }
    // ส่งกลับเฉพาะเนื้อหา: ไม่ส่ง header ของปลายทาง (set-cookie/authorization/rate-limit) ต่อให้ไคลเอนต์
    const body = res.body;
    // log เฉพาะข้อมูลที่ไม่ระบุความลับ: ชื่อย่อ + สถานะ (ไม่มี URL ปลายทาง ไม่มีกุญแจ)
    console.log(JSON.stringify({ alias: route.alias, status: res.status }));
    return new Response(body, {
      status: res.status,
      headers: { 'content-type': res.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store', ...cors(origin) },
    });
  },
};
