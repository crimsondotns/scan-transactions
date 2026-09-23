/**
 * กระแสเงิน (net flow) ของกระเป๋า/กลุ่ม — ตรรกะล้วน ไม่มี React ไม่มี DOM จึงเทสต์ได้ตรงๆ
 *
 * "สุทธิ" = ยอดที่เข้า − ยอดที่ออก (USD) นับเฉพาะก้อนที่แหล่งข้อมูลให้ราคามา
 * ก้อน approve (อนุมัติวงเงิน) ไม่ใช่เงินที่เคลื่อนจริง จึงไม่นับ — เหมือนที่ตารางธุรกรรมทำ
 * แหล่งข้อมูลไม่ให้ราคา → ทั้งแถวเป็น 0 ไม่ใช่เดาแทน
 */
import type { TxRow } from './feed';

/** สุทธิของแถวเดียว (USD) — บวก = เงินเข้า, ลบ = เงินออก */
export function netUsd(r: TxRow): number {
  let net = 0;
  for (const m of r.moves) {
    if (m.usd === null || m.amount === 0 || m.approve) continue;
    net += m.dir === 'in' ? m.usd : -m.usd;
  }
  return net;
}

export interface FlowTotals {
  /** ผลรวมสุทธิของทุกแถว */
  net: number;
  /** ผลรวมเฉพาะแถวที่เป็นเงินเข้า */
  inUsd: number;
  /** ผลรวมเฉพาะแถวที่เป็นเงินออก (ค่าลบ) */
  outUsd: number;
  fee: number;
  flagged: number;
  count: number;
}

export function totals(rows: TxRow[]): FlowTotals {
  const out: FlowTotals = { net: 0, inUsd: 0, outUsd: 0, fee: 0, flagged: 0, count: rows.length };
  for (const r of rows) {
    const v = netUsd(r);
    out.net += v;
    if (v > 0) out.inUsd += v;
    else out.outUsd += v;
    out.fee += r.gasUsd ?? 0;
    if (r.flagged) out.flagged += 1;
  }
  return out;
}

/** แถวที่อยู่ในช่วง n วันล่าสุด (เวลาเป็นวินาที) */
export function withinDays(rows: TxRow[], days: number, now = Date.now()): TxRow[] {
  const from = now / 1000 - days * 86400;
  return rows.filter((r) => r.time >= from);
}

/**
 * เส้นสะสมรายวัน: ช่อง i = สุทธิสะสมตั้งแต่ต้นช่วงจนจบวันนั้น (ช่องสุดท้าย = วันนี้)
 * วันไหนไม่มีธุรกรรม เส้นก็ราบ — ยาว days ช่องเสมอ ให้กราฟกว้างเท่ากันทุกช่วงเวลา
 */
export function cumulative(rows: TxRow[], days: number, now = Date.now()): number[] {
  const buckets = new Array<number>(days).fill(0);
  for (const r of rows) {
    const age = Math.floor((now / 1000 - r.time) / 86400);
    if (age < 0 || age >= days) continue;
    const i = days - 1 - age;
    buckets[i] = (buckets[i] ?? 0) + netUsd(r);
  }
  let acc = 0;
  return buckets.map((v) => (acc += v));
}

export interface TokenRow {
  symbol: string;
  name: string | null;
  logo: string | null;
  tokenId: string | null;
  chain: string;
  inUsd: number;
  outUsd: number;
  inAmount: number;
  outAmount: number;
  count: number;
}

/** สรุปรายโทเคนของชุดแถว — เรียงตามเงินที่เคลื่อนมากไปน้อย */
export function tokenSummary(rows: TxRow[]): TokenRow[] {
  const map = new Map<string, TokenRow>();
  for (const r of rows) {
    for (const m of r.moves) {
      if (m.amount === 0 || m.approve) continue;
      const cur = map.get(m.symbol) ?? { symbol: m.symbol, name: m.name, logo: m.logo, tokenId: m.tokenId, chain: r.chain, inUsd: 0, outUsd: 0, inAmount: 0, outAmount: 0, count: 0 };
      if (m.dir === 'in') {
        cur.inUsd += m.usd ?? 0;
        cur.inAmount += m.amount;
      } else {
        cur.outUsd += m.usd ?? 0;
        cur.outAmount += m.amount;
      }
      cur.name ??= m.name;
      cur.logo ??= m.logo;
      cur.count += 1;
      map.set(m.symbol, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.inUsd + b.outUsd - (a.inUsd + a.outUsd));
}

/** แถวที่แตะโทเคนตัวนี้ (ใช้กับหน้าโทเคน) */
export function rowsOfToken(rows: TxRow[], symbol: string): TxRow[] {
  return rows.filter((r) => r.moves.some((m) => m.symbol === symbol && m.amount !== 0));
}

/** คลาสสีตามทิศทางเงิน — ใช้กับตัวเลขใหญ่ กราฟ และช่องสรุป (สีมีความหมาย ไม่ใช่ตกแต่ง) */
export const signClassOf = (n: number): string => (n > 0 ? 'is-pos' : n < 0 ? 'is-neg' : '');

/** เวลาล่าสุดของชุดแถว (วินาที) — ไม่มีแถว = null */
export function lastTime(rows: TxRow[]): number | null {
  let last: number | null = null;
  for (const r of rows) if (last === null || r.time > last) last = r.time;
  return last;
}
