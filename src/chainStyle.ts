/**
 * สัญลักษณ์ + สีประจำเชน (สเปกผู้ใช้ 2026-09-22) — จับจาก id/ชื่อเชนที่แหล่งข้อมูลให้มา
 * สีอยู่ใน tokens.css (--color-chain-*); เชนที่ไม่รู้จัก → ไม่มีสัญลักษณ์
 */
export interface ChainStyle {
  glyph: string;
  /** ชื่อโทเคนสี (ไม่มี --color- นำหน้า) */
  token: 'chain-eth' | 'chain-sol' | 'chain-hyper' | 'chain-polygon' | 'chain-bnb';
}

const RULES: Array<[RegExp, ChainStyle]> = [
  [/hyper/i, { glyph: '◈', token: 'chain-hyper' }],
  [/^(eth|ethereum|mainnet)$|ethereum/i, { glyph: '⟠', token: 'chain-eth' }],
  [/^sol$|solana/i, { glyph: '◆', token: 'chain-sol' }],
  [/matic|polygon/i, { glyph: '⬢', token: 'chain-polygon' }],
  [/^bsc$|^bnb$|binance|bnb/i, { glyph: '⬡', token: 'chain-bnb' }],
];

export function chainStyle(id: string, name?: string | null): ChainStyle | null {
  for (const [re, st] of RULES) if (re.test(id) || (name && re.test(name))) return st;
  return null;
}

/** อ่านค่าสีจริงของโทเคน (ไว้วาดบน canvas) */
export function tokenColor(token: string, fallback: string): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(`--color-${token}`).trim() || fallback;
  } catch {
    return fallback;
  }
}
