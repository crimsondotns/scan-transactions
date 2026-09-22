import { fallbackProxy } from './proxy';
/**
 * คิวคำขอกันโดน rate limit (429): ทั้งแอปยิงพร้อมกันไม่เกิน 2 คำขอ เว้นอย่างน้อย 500ms ระหว่างคำขอ
 * โดน 429 → หยุดทั้งคิว (ตาม Retry-After ถ้ามี ไม่มีก็ 5s แล้วเพิ่มเป็น 2 เท่า สูงสุด 60s) แล้วลองคำขอนั้นใหม่ให้เอง สูงสุด 4 ครั้ง
 * จึงไม่ต้องให้ผู้ใช้เห็น "HTTP 429" ยกเว้นแหล่งบล็อกยาวจริงๆ
 */
const CONCURRENCY = 2;
const MAX_RETRY = 4;
let GAP_MS = 500;
let BASE_PAUSE_MS = 5000;
const MAX_PAUSE_MS = 60000;

/** เทสต์เท่านั้น: ย่นเวลารอ */
export function setLimiterTiming(t: { gapMs?: number; basePauseMs?: number }): void {
  if (t.gapMs !== undefined) GAP_MS = t.gapMs;
  if (t.basePauseMs !== undefined) BASE_PAUSE_MS = t.basePauseMs;
}

let active = 0;
let lastStart = 0;
let pausedUntil = 0;
let strikes = 0;
const waiting: Array<() => void> = [];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function acquire(): Promise<void> {
  if (active >= CONCURRENCY) await new Promise<void>((r) => waiting.push(r));
  active++;
  for (;;) {
    const now = Date.now();
    const wait = Math.max(pausedUntil - now, lastStart + GAP_MS - now);
    if (wait <= 0) break;
    await sleep(wait);
  }
  lastStart = Date.now();
}

function release(): void {
  active--;
  waiting.shift()?.();
}

/** แหล่งบอกให้รอ (429) — หยุดคิวทั้งหมด */
export function backoff(retryAfterHeader: string | null): number {
  const hinted = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN;
  const ms = Number.isFinite(hinted) && hinted > 0 ? Math.min(hinted, MAX_PAUSE_MS) : Math.min(BASE_PAUSE_MS * 2 ** strikes, MAX_PAUSE_MS);
  strikes = Math.min(strikes + 1, 4);
  pausedUntil = Math.max(pausedUntil, Date.now() + ms);
  return ms;
}

/** ยิงผ่านคิว; 429 → รอแล้วยิงซ้ำให้เอง (คืน Response 429 สุดท้ายถ้ายังไม่ผ่านหลังครบจำนวน) */
export async function limitedFetch(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    await acquire();
    let res: Response;
    try {
      try {
        res = await fetch(url, init);
      } catch (e) {
        // ยิงตรงโดน CORS/เครือข่ายบล็อก → ลองผ่าน proxy ของ dev (ถ้ามี) ก่อนยอมแพ้
        const alt = fallbackProxy(url);
        if (!alt) throw e;
        url = alt;
        res = await fetch(url, init);
      }
    } finally {
      release();
    }
    if (res.status !== 429 || attempt >= MAX_RETRY) {
      if (res.ok) strikes = Math.max(0, strikes - 1);
      return res;
    }
    backoff(res.headers.get('retry-after'));
  }
}

/** ให้เทสต์/ฟีเจอร์อื่นดูว่าตอนนี้ถูกพักอยู่ไหม */
export function pausedFor(): number {
  return Math.max(0, pausedUntil - Date.now());
}
