/**
 * เหตุผลที่ธุรกรรมถูกติดธง — ประกอบจากสิ่งที่รู้จริงเท่านั้น (ไม่เดา): สัญลักษณ์เลียนแบบ, ธงจากแหล่งข้อมูล,
 * airdrop (ขารับอย่างเดียวจากคนที่ไม่รู้จัก), ไม่มีราคา — ใช้ทั้งแผงขวาและกล่อง "Why this is flagged" บนสลิป
 */
import type { TxRow } from './feed';
import { lookalike, worthlessAirdrop } from './feed';
import type { Wallet } from './store';
import type { MessageKey } from './i18n';

type T = (k: MessageKey, v?: Record<string, string | number>) => string;

export function riskReasons(row: TxRow, wallets: Wallet[], t: T): string[] {
  if (!row.flagged) return [];
  const out: string[] = [];
  for (const m of row.moves) {
    if (!lookalike(m.symbol)) continue;
    const ch = [...m.symbol].find((c) => c.charCodeAt(0) > 0x7e) ?? '';
    const ascii = m.symbol.normalize('NFKD').replace(/[^\x20-\x7E]/g, '');
    out.push(t('risk.lookalike', { symbol: m.symbol, char: ch, code: ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0'), ascii: ascii || '?' }));
  }
  const raw = row.raw;
  if (raw.is_scam === true || row.moves.some((m) => m.flagged && !lookalike(m.symbol))) out.push(t('risk.source'));
  const mine = new Set(wallets.map((w) => w.address.toLowerCase()));
  if (row.type === 'receive' && row.from && !mine.has(row.from.toLowerCase())) out.push(t('risk.airdrop'));
  if (worthlessAirdrop(row)) out.push(t('risk.worthless'));
  else if (row.moves.length && row.moves.every((m) => (m.usd === null || m.usd === 0) && (m.price === null || m.price === 0))) out.push(t('risk.noPrice'));
  return out;
}
