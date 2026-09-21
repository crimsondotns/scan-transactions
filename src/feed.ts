/**
 * ดึงประวัติจาก URL แม่แบบที่ผู้ใช้ใส่เอง แล้วแปลงเป็นแถวกลางของแอป
 *
 * แอปไม่รู้จักแหล่งข้อมูลใดๆ ล่วงหน้า — รู้แค่ว่าแม่แบบมี {address} {start} {count}
 * และคำตอบเป็น JSON รูปแบบใดรูปแบบหนึ่งด้านล่าง ถ้าไม่ตรงก็รายงานว่าไม่รู้จัก
 */

export type TxType = 'swap' | 'send' | 'receive' | 'approve' | 'contract';

export interface Move {
  dir: 'in' | 'out';
  amount: number;
  symbol: string;
  usd: number | null;
  flagged: boolean;
}

export interface TxRow {
  key: string;
  hash: string;
  walletId: string;
  chain: string;
  time: number;
  type: TxType;
  name: string;
  failed: boolean;
  flagged: boolean;
  moves: Move[];
  counterparty: string | null;
  counterpartyName: string | null;
  gasUsd: number | null;
}

export interface Page {
  rows: TxRow[];
  /** เวลาของแถวเก่าสุดในหน้า ใช้เป็น {start} ของหน้าถัดไป; null = ไม่มีต่อ */
  next: number | null;
}

export class FeedError extends Error {
  constructor(
    public kind: 'http' | 'net' | 'shape',
    public status = 0
  ) {
    super(kind);
  }
}

export function hasPlaceholder(tpl: string): boolean {
  return tpl.includes('{address}');
}

export function buildUrl(tpl: string, address: string, start: number, count: number): string {
  return tpl
    .replaceAll('{address}', encodeURIComponent(address))
    .replaceAll('{start}', String(start))
    .replaceAll('{count}', String(count));
}

export async function fetchPage(tpl: string, walletId: string, address: string, start: number, count: number): Promise<Page> {
  let res: Response;
  try {
    res = await fetch(buildUrl(tpl, address, start, count), { headers: { accept: 'application/json' } });
  } catch {
    throw new FeedError('net');
  }
  if (!res.ok) throw new FeedError('http', res.status);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new FeedError('shape');
  }
  return normalize(body, walletId, address);
}

/* ----------------------------- normalizer ----------------------------- */

type Dict = Record<string, unknown>;
const isObj = (v: unknown): v is Dict => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

function normalize(body: unknown, walletId: string, address: string): Page {
  if (isObj(body) && Array.isArray(body.history_list)) return fromHistoryList(body, walletId, address);
  const list = Array.isArray(body) ? body : isObj(body) && Array.isArray(body.result) ? body.result : null;
  if (list) return fromFlatList(list, walletId, address);
  throw new FeedError('shape');
}

/** รูปแบบ A: { history_list[], token_dict, project_dict } */
function fromHistoryList(body: Dict, walletId: string, address: string): Page {
  const tokens = isObj(body.token_dict) ? body.token_dict : {};
  const projects = isObj(body.project_dict) ? body.project_dict : {};
  const rows: TxRow[] = [];
  for (const item of body.history_list as unknown[]) {
    if (!isObj(item)) continue;
    const hash = str(item.id) ?? '';
    const time = num(item.time_at) ?? 0;
    const tx = isObj(item.tx) ? item.tx : {};
    const chain = str(item.chain) ?? '—';
    const moves: Move[] = [];
    let flagged = item.is_scam === true;
    const push = (dir: Move['dir'], list: unknown) => {
      if (!Array.isArray(list)) return;
      for (const m of list) {
        if (!isObj(m)) continue;
        const tokenId = str(m.token_id) ?? '';
        const tok = isObj(tokens[tokenId]) ? (tokens[tokenId] as Dict) : {};
        const amount = num(m.amount) ?? 0;
        const price = num(m.price) ?? num(tok.price);
        const bad = tok.is_scam === true || tok.is_suspicious === true;
        if (bad) flagged = true;
        moves.push({
          dir,
          amount,
          symbol: str(tok.optimized_symbol) ?? str(tok.display_symbol) ?? str(tok.symbol) ?? shortId(tokenId),
          usd: price !== null ? amount * price : null,
          flagged: bad,
        });
      }
    };
    push('out', item.sends);
    push('in', item.receives);

    const approve = isObj(item.token_approve) ? item.token_approve : null;
    const name = str(tx.name) ?? '';
    const type: TxType = approve ? 'approve' : moves.some((m) => m.dir === 'in') && moves.some((m) => m.dir === 'out') ? 'swap' : moves.some((m) => m.dir === 'out') ? 'send' : moves.some((m) => m.dir === 'in') ? 'receive' : 'contract';
    if (approve) {
      const tok = isObj(tokens[str(approve.token_id) ?? '']) ? (tokens[str(approve.token_id) ?? ''] as Dict) : {};
      moves.push({ dir: 'out', amount: num(approve.value) ?? 0, symbol: str(tok.optimized_symbol) ?? str(tok.symbol) ?? '', usd: null, flagged: false });
    }

    const projectId = str(item.project_id);
    const project = projectId && isObj(projects[projectId]) ? (projects[projectId] as Dict) : null;
    const other = str(item.other_addr) ?? (str(tx.from_addr)?.toLowerCase() === address ? str(tx.to_addr) : str(tx.from_addr));

    rows.push({
      key: `${walletId}:${chain}:${hash}:${num(item.idx) ?? 0}`,
      hash,
      walletId,
      chain,
      time,
      type,
      name,
      failed: num(tx.status) === 0,
      flagged,
      moves,
      counterparty: other,
      counterpartyName: project ? str(project.name) : null,
      gasUsd: num(tx.usd_gas_fee),
    });
  }
  const oldest = rows.reduce((m, r) => (r.time > 0 && r.time < m ? r.time : m), Infinity);
  return { rows, next: rows.length && Number.isFinite(oldest) ? oldest : null };
}

/** รูปแบบ B: รายการแบน [{ hash, from, to, value, timeStamp, … }] หรือ { result: [...] } */
function fromFlatList(list: unknown[], walletId: string, address: string): Page {
  const rows: TxRow[] = [];
  for (const item of list) {
    if (!isObj(item)) continue;
    const hash = str(item.hash) ?? str(item.txHash) ?? str(item.id) ?? '';
    const from = (str(item.from) ?? str(item.from_addr) ?? '').toLowerCase();
    const to = (str(item.to) ?? str(item.to_addr) ?? '').toLowerCase();
    const rawTime = num(item.timeStamp) ?? num(item.timestamp) ?? num(item.time_at) ?? 0;
    const time = rawTime > 1e12 ? Math.floor(rawTime / 1000) : rawTime;
    const decimals = num(item.tokenDecimal) ?? 18;
    const raw = num(item.value) ?? 0;
    const amount = str(item.tokenDecimal) || raw > 1e15 ? raw / 10 ** decimals : raw;
    const out = from === address;
    const symbol = str(item.tokenSymbol) ?? str(item.symbol) ?? '';
    const moves: Move[] = amount > 0 ? [{ dir: out ? 'out' : 'in', amount, symbol, usd: null, flagged: false }] : [];
    const gasPrice = num(item.gasPrice);
    const gasUsed = num(item.gasUsed);
    rows.push({
      key: `${walletId}:${hash}:${rows.length}`,
      hash,
      walletId,
      chain: str(item.chain) ?? '—',
      time,
      type: moves.length ? (out ? 'send' : 'receive') : 'contract',
      name: str(item.functionName)?.split('(')[0] ?? str(item.name) ?? '',
      failed: str(item.isError) === '1' || num(item.status) === 0,
      flagged: false,
      moves,
      counterparty: out ? to || null : from || null,
      counterpartyName: null,
      gasUsd: gasPrice !== null && gasUsed !== null ? null : num(item.usd_gas_fee),
    });
  }
  const oldest = rows.reduce((m, r) => (r.time > 0 && r.time < m ? r.time : m), Infinity);
  return { rows, next: rows.length && Number.isFinite(oldest) ? oldest : null };
}

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 6)}…` : id || '?';
}
