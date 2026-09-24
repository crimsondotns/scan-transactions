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
 *  - Edge Cache (caches.default) — คำขอเดียวกันจากหลายคนในออฟฟิศใช้คำตอบร่วมกัน ลดโหลดปลายทาง
 */
import { allowedOrigin, carriesClientAuth, mapRoute, parseRoute, safeQuery, upstreamUrl } from './validate';

export interface Env {
  /** รายการ origin ที่เรียกได้ คั่นด้วยจุลภาค เช่น https://<user>.github.io */
  ALLOWED_ORIGINS?: string;
  /** จำนวนคำขอต่อ IP ต่อนาที (ค่าเริ่มต้น 300) */
  RATE_LIMIT_PER_MIN?: string;
  /** อายุ cache (วินาที) — 0 = ปิด cache (ค่าเริ่มต้น 60) */
  CACHE_TTL_SECONDS?: string;
  /** ตัวจำกัดอัตราของ Cloudflare ถ้าผูกไว้ */
  RATE_LIMITER?: { limit(o: { key: string }): Promise<{ success: boolean }> };
  /** ต่อ alias: UPSTREAM_<ALIAS>_BASE (secret), _AUTH_HEADER (var), _KEY (secret), _ROUTES (secret, ไม่บังคับ) */
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

/**
 * สร้าง cache key จาก (alias, path, query) — ไม่รวม origin
 * เพื่อให้ทุกไคลเอนต์ที่ยิงเส้นทางเดียวกันใช้คำตอบร่วมกัน (นี่คือหัวใจของการลด rate limit)
 * ใช้ pathname /__cache/ แยกจาก /s/ จริงเพื่อไม่ให้ชนกับ route
 */
function buildCacheKey(requestUrl: string, alias: string, path: string, query: URLSearchParams): Request {
  const u = new URL(requestUrl);
  u.pathname = `/__cache/${alias}/${path}`;
  u.search = query.toString();
  return new Request(u.toString(), { method: 'GET' });
}

export default {
  async fetch(request: Request, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const url = new URL(request.url);
    const origin = allowedOrigin(request.headers.get('origin'), env.ALLOWED_ORIGINS);

    if (request.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: cors(origin) });
    if (request.method !== 'GET') return fail(405, 'method', origin);
    // เรียกจาก origin อื่น (หรือไม่มี origin) → ปฏิเสธ และไม่ใส่ CORS header ให้
    if (!origin) return fail(403, 'origin', null);
    if (carriesClientAuth(request.headers)) return fail(400, 'client_auth', origin);

    const perMin = Number(env.RATE_LIMIT_PER_MIN ?? '300') || 300;
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
    // ชื่อเส้นทางที่ไคลเอนต์ใช้เป็นตัวอักษรกลางๆ แล้วมาแปลงเป็น path จริงที่นี่ (ถ้า alias นั้นตั้งตารางไว้)
    const path = mapRoute(route.path, envStr(env, `UPSTREAM_${route.alias.toUpperCase()}_ROUTES`));
    if (path === null) return fail(404, 'route', origin);
    const target = upstreamUrl(up, path, query);
    if (!target) return fail(400, 'route', origin);

    // ---- Edge Cache: เช็คก่อนยิง upstream ----
    const ttl = Number(env.CACHE_TTL_SECONDS ?? '60') || 0;
    const cache = (caches as unknown as { default: Cache }).default;
    const cacheKey = buildCacheKey(request.url, route.alias, path, query);

    if (ttl > 0) {
      const cached = await cache.match(cacheKey);
      if (cached) {
        const headers = new Headers(cached.headers);
        for (const [k, v] of Object.entries(cors(origin))) headers.set(k, v);
        headers.set('x-cache', 'HIT');
        console.log(JSON.stringify({ alias: route.alias, status: cached.status, cache: 'hit' }));
        return new Response(cached.body, { status: cached.status, headers });
      }
    }

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
    const ct = res.headers.get('content-type') ?? 'application/json';
    const responseHeaders: Record<string, string> = {
      'content-type': ct,
      'cache-control': ttl > 0 ? `public, max-age=${ttl}` : 'no-store',
      'x-cache': 'MISS',
      ...cors(origin),
    };
    const response = new Response(res.body, { status: res.status, headers: responseHeaders });

    // เก็บลง cache เฉพาะ 200 + ttl > 0 — clone ก่อน เพราะ body อ่านได้ครั้งเดียว
    if (ttl > 0 && res.status === 200) {
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    // log เฉพาะข้อมูลที่ไม่ระบุความลับ: ชื่อย่อ + สถานะ
    console.log(JSON.stringify({ alias: route.alias, status: res.status, cache: 'miss' }));
    return response;
  },
};