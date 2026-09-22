/**
 * แคชราคาโทเคน (USD ต่อหน่วย) — เก็บจากข้อมูลที่แหล่งข้อมูลส่งมากับแต่ละธุรกรรม
 * ไม่มีการยิงขอราคาแยก: ราคาที่รู้ล่าสุดของโทเคนนั้นถูกจำไว้ แล้วใช้เติมให้แถวที่แหล่งไม่ให้มูลค่า USD
 * จำลง localStorage ด้วย (24 ชม.) เพื่อไม่ต้องรอโหลดใหม่หลังรีเฟรช
 */
const KEY = 'xcap.scan.prices';
const TTL = 24 * 60 * 60 * 1000;

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
