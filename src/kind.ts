/**
 * ชนิดของโปรโตคอลที่ธุรกรรมไปแตะ — เดาจากสิ่งที่แหล่งข้อมูลให้มาเท่านั้น ไม่มีตารางชื่อแบรนด์:
 *  1. หมวดที่แหล่งบอกเอง (cate_id / cate_dict) ถ้ามี
 *  2. คำในชื่อฟังก์ชัน (tx.name) และ project_id: bridge/crosschain/… → Bridge, aggregat/router/multihop/… → Aggregator, lend/borrow/… → Lending, stake/… → Staking
 *  3. รูปทรงการโอน: มีทั้งขาเข้าและขาออกบนเชนเดียว + มีโปรโตคอล → Swap (DEX)
 * แยก "Aggregator" กับ "DEX" ได้เฉพาะเมื่อชื่อฟังก์ชัน/โปรเจกต์บอกใบ้ — ไม่งั้นเป็น Swap
 */
import type { TxRow } from './feed';

export type ProtocolKind = 'bridge' | 'aggregator' | 'dex' | 'lending' | 'staking' | 'nft';

const RULES: Array<[ProtocolKind, RegExp]> = [
  ['bridge', /bridge|xchain|cross.?chain|relay|portal|outbound|teleport|warp|hop(?![a-z])|l1.?to.?l2|l2.?to.?l1/i],
  ['aggregator', /aggregat|router(?!v2)|multihop|multi.?hop|fill.?quote|fill.?order|uno.?swap|clipper|best.?rate|meta.?swap|smart.?swap|route/i],
  ['lending', /lend|borrow|repay|supply|collateral|liquidat|flash.?loan/i],
  ['staking', /stak|unstak|delegat|restake|validator/i],
  ['nft', /nft|erc721|erc1155|mint(?!ing)|collection/i],
  ['dex', /swap|exchange|dex|pool|liquidity|amm/i],
];

/** ข้อความที่ใช้เดา: หมวดจากแหล่ง → ชื่อฟังก์ชัน → project_id → ชื่อโปรโตคอล */
export function protocolKind(row: Pick<TxRow, 'raw' | 'name' | 'counterpartyName' | 'moves' | 'type'>): ProtocolKind | null {
  const raw = row.raw;
  const cate = typeof raw.cate_id === 'string' ? raw.cate_id : '';
  const project = typeof raw.project_id === 'string' ? raw.project_id : '';
  const probe = [cate, row.name, project, row.counterpartyName ?? ''].join(' ');
  if (!probe.trim()) return null;
  // bridge ชนะทุกอย่าง (swapAndStartBridgeTokens… = สวอปแล้วส่งข้ามเชน)
  for (const [kind, re] of RULES) if (re.test(probe)) return kind;
  // ไม่มีคำใบ้ แต่รูปทรงเป็นสวอปกับโปรโตคอล → DEX
  if (row.type === 'swap' && (project || row.counterpartyName)) return 'dex';
  return null;
}
