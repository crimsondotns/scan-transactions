/**
 * แคชราคาโทเคน (USD ต่อหน่วย) — เก็บจากข้อมูลที่แหล่งข้อมูลส่งมากับแต่ละธุรกรรม
 * ไม่มีการยิงขอราคาแยก: ราคาที่รู้ล่าสุดของโทเคนนั้นถูกจำไว้ แล้วใช้เติมให้แถวที่แหล่งไม่ให้มูลค่า USD
 * จำลง localStorage ด้วย (24 ชม.) เพื่อไม่ต้องรอโหลดใหม่หลังรีเฟรช
 */
const KEY = 'xcap.scan.prices';
const TTL = 24 * 60 * 60 * 1000;
/** ราคาที่ดึงจาก URL ราคา ถือว่าสดอยู่ 5 นาที แล้วค่อยดึงใหม่ */
export const REFRESH_MS = 5 * 60 * 1000;

type Entry = { p: number; t: number };
let cache: Record<string, Entry> | null = null;
let flush: ReturnType<typeof setTimeout> | null = null;

function load(): Record<string, Entry> {
  if (cache) return cache;
  cache = {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const now = Date.now();
      for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, Entry>)) if (now - v.t < TTL) cache[k] = v;
    }
  } catch {
    /* ไม่มี storage */
  }
  return cache;
}

function save(): void {
  if (flush) return;
  flush = setTimeout(() => {
    flush = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(cache ?? {}));
    } catch {
      /* เต็มหรือถูกบล็อก */
    }
  }, 500);
}

/** key: เชน + ที่อยู่สัญญา (null = เหรียญพื้นเมือง) — สัญลักษณ์ใช้เป็นสำรองเมื่อไม่มีที่อยู่ */
export function priceKey(chain: string, tokenId: string | null, symbol: string): string {
  return `${chain}:${tokenId ?? (symbol ? `sym:${symbol.toUpperCase()}` : 'native')}`;
}

export function rememberPrice(chain: string, tokenId: string | null, symbol: string, price: number | null | undefined, at?: number): void {
  if (price === null || price === undefined || !Number.isFinite(price) || price <= 0) return;
  const c = load();
  const k = priceKey(chain, tokenId, symbol);
  const t = at ? at * 1000 : Date.now();
  const cur = c[k];
  if (cur && cur.t > t) return; // เก็บราคาที่ใหม่กว่าเสมอ
  c[k] = { p: price, t };
  save();
}

export function priceOf(chain: string, tokenId: string | null, symbol: string): number | null {
  const c = load();
  return c[priceKey(chain, tokenId, symbol)]?.p ?? (tokenId ? (c[priceKey(chain, null, symbol)]?.p ?? null) : null);
}

/** มูลค่า USD: ใช้ที่แหล่งให้มาก่อน ไม่มีค่อยคูณราคาจากแคช */
export function usdOf(amount: number, usd: number | null, chain: string, tokenId: string | null, symbol: string): number | null {
  if (usd !== null && Number.isFinite(usd)) return usd;
  const p = priceOf(chain, tokenId, symbol);
  return p === null ? null : amount * p;
}

/** เวลาที่ราคาในแคชถูกจด (ms) — ใช้ตัดสินว่าต้องดึงใหม่ไหม */
export function priceAge(chain: string, tokenId: string | null, symbol: string): number | null {
  const e = load()[priceKey(chain, tokenId, symbol)];
  return e ? Date.now() - e.t : null;
}

/** เติม URL ราคาของผู้ใช้: ถ้ามี {chain} {token} {symbol} ก็แทนที่ ไม่มีก็ต่อเป็น query */
export function priceRequestUrl(template: string, chain: string, tokenId: string | null, symbol: string): string {
  const token = tokenId ?? symbol;
  if (/\{(chain|token|symbol)\}/.test(template)) {
    return template.replace(/\{chain\}/g, encodeURIComponent(chain)).replace(/\{token\}/g, encodeURIComponent(token)).replace(/\{symbol\}/g, encodeURIComponent(symbol));
  }
  const u = new URL(template);
  u.searchParams.set('chain', chain);
  u.searchParams.set('token', token);
  return u.toString();
}

/** หาเลขราคาจากคำตอบรูปแบบต่างๆ: เลขล้วน, { price }, { usd }, { value }, { data: {...} }, { <token>: { usd } } */
function pickPrice(body: unknown, depth = 0): number | null {
  if (typeof body === 'number') return Number.isFinite(body) && body > 0 ? body : null;
  if (typeof body === 'string') {
    const n = Number(body);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (!body || typeof body !== 'object' || depth > 3) return null;
  const o = body as Record<string, unknown>;
  for (const k of ['price', 'usd', 'price_usd', 'priceUsd', 'value', 'rate']) if (k in o) return pickPrice(o[k], depth + 1);
  for (const k of ['data', 'result', 'token']) if (k in o) return pickPrice(o[k], depth + 1);
  const vals = Object.values(o);
  return vals.length === 1 ? pickPrice(vals[0], depth + 1) : null;
}

const pending = new Map<string, Promise<number | null>>();

/** ดึงราคาจาก URL ของผู้ใช้ (ถ้าตั้งไว้) เมื่อของในแคชเก่ากว่า 5 นาที — คำขอซ้ำในเวลาเดียวกันรวมเป็นอันเดียว */
export function refreshPrice(template: string, chain: string, tokenId: string | null, symbol: string): Promise<number | null> {
  if (!/^https:\/\//i.test(template)) return Promise.resolve(priceOf(chain, tokenId, symbol));
  const age = priceAge(chain, tokenId, symbol);
  if (age !== null && age < REFRESH_MS) return Promise.resolve(priceOf(chain, tokenId, symbol));
  const k = priceKey(chain, tokenId, symbol);
  const inflight = pending.get(k);
  if (inflight) return inflight;
  const job = (async () => {
    try {
      const res = await fetch(priceRequestUrl(template, chain, tokenId, symbol), { headers: { accept: 'application/json' } });
      if (!res.ok) return priceOf(chain, tokenId, symbol);
      const p = pickPrice(await res.json());
      if (p !== null) rememberPrice(chain, tokenId, symbol, p);
      return p ?? priceOf(chain, tokenId, symbol);
    } catch {
      return priceOf(chain, tokenId, symbol);
    } finally {
      pending.delete(k);
    }
  })();
  pending.set(k, job);
  return job;
}
