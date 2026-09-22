import { rememberPrice } from './prices';
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
  /** ชื่อเต็มของโทเคน (ถ้ามี) */
  name: string | null;
  usd: number | null;
  /** ราคาต่อหน่วย (USD) ณ เวลานั้น ถ้าแหล่งข้อมูลให้มา */
  price: number | null;
  /** ที่อยู่สัญญาโทเคน (null = เหรียญพื้นเมืองของเชน) */
  tokenId: string | null;
  flagged: boolean;
  /** โลโก้โทเคนจากแหล่งข้อมูล (ถ้ามี) — ไม่มีก็ใช้ตัวอักษรแทน */
  logo: string | null;
}

export interface TxRow {
  key: string;
  hash: string;
  walletId: string;
  chain: string;
  /** โลโก้เชนจากแหล่งข้อมูล (ถ้ามี) */
  chainLogo: string | null;
  /** symbol ของเหรียญพื้นเมืองของเชน (ค่าธรรมเนียม) — จาก token_dict[chain] */
  nativeSymbol: string | null;
  time: number;
  type: TxType;
  name: string;
  failed: boolean;
  flagged: boolean;
  moves: Move[];
  counterparty: string | null;
  counterpartyName: string | null;
  /** ผู้ส่ง / ผู้รับ / สัญญาที่ถูกเรียก / nonce — ตามที่แหล่งข้อมูลให้ */
  from: string | null;
  to: string | null;
  contract: string | null;
  nonce: number | null;
  gasUsd: number | null;
  /** ค่าธรรมเนียมเป็นเหรียญพื้นเมืองของเชน (ถ้ามี) */
  gasNative: number | null;
  /** ทุกฟิลด์ที่แหล่งข้อมูลส่งมา — โชว์ในแผงรายละเอียด */
  raw: Record<string, unknown>;
}

export interface Cursor {
  /** เวลาของแถวเก่าสุดในหน้า → {start} */
  start: number;
  /** hash/signature ของแถวสุดท้าย → {cursor} (แหล่งข้อมูลบางแบบเลื่อนหน้าด้วยอันนี้) */
  cursor: string;
}

export interface Page {
  rows: TxRow[];
  /** ใช้ขอหน้าถัดไป; null = ไม่มีต่อ */
  next: Cursor | null;
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

/**
 * base URL ที่ไม่มี {address} → แอปต่อ query ให้เอง (id / start_time / page_count)
 * ต่อท้าย ? หรือ & ที่มีอยู่แล้วให้ถูกต้อง
 */
/**
 * URL ที่ไม่มี placeholder → ประกอบให้ตามตระกูล:
 *  evm: ?id={address}&start_time={start}&page_count={count}
 *  sol: ?ownerAddress={address}&limit={count}
 * แหล่งที่ใช้ชื่อพารามิเตอร์/รูปแบบอื่น → วาง URL ที่มี {address} {count} {cursor} {start} เองได้
 */
export function toTemplate(url: string, family: 'evm' | 'sol' = 'evm'): string {
  const u = url.trim();
  if (hasPlaceholder(u)) return u;
  const sep = u.endsWith('?') || u.endsWith('&') ? '' : u.includes('?') ? '&' : '?';
  if (family === 'sol') return `${u}${sep}ownerAddress={address}&limit={count}`;
  return `${u}${sep}id={address}&start_time={start}&page_count={count}`;
}

export function buildUrl(tpl: string, address: string, cur: Cursor | null, count: number, family: 'evm' | 'sol' = 'evm'): string {
  let t = toTemplate(tpl, family);
  // ไม่มี cursor → ตัดพารามิเตอร์ที่ถือ {cursor} ทิ้งทั้งคู่ (ไม่ส่ง before= ว่างๆ)
  if (!cur) t = t.replace(/[?&][^&=]+=\{cursor\}/g, (m) => (m.startsWith('?') ? '?' : '')).replace(/\?&/, '?').replace(/[?&]$/, '');
  return t
    .replaceAll('{address}', encodeURIComponent(address))
    .replaceAll('{start}', String(cur?.start ?? 0))
    .replaceAll('{cursor}', cur ? encodeURIComponent(cur.cursor) : '')
    .replaceAll('{count}', String(count));
}

export interface FetchOpts {
  family?: 'evm' | 'sol';
  /** header ยืนยันตัวตนที่ผู้ใช้ตั้งเอง (ชื่อ + ค่า) — เก็บในเครื่องเท่านั้น */
  authHeader?: string;
  apiKey?: string;
}

export async function fetchPage(tpl: string, walletId: string, address: string, cur: Cursor | null, count: number, opts: FetchOpts = {}): Promise<Page> {
  let res: Response;
  const headers: Record<string, string> = { accept: 'application/json' };
  if (opts.authHeader && opts.apiKey) headers[opts.authHeader] = opts.apiKey;
  try {
    res = await fetch(buildUrl(tpl, address, cur, count, opts.family), { headers });
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
/** รับเฉพาะ https รูปภาพจากแหล่งข้อมูล — กัน javascript:/data: ที่อาจแทรกมา */
/** symbol ที่มีอักษรนอก ASCII (เช่น Ỵ แทน Y) = ชื่อเลียนแบบ ให้ติดธงน่าสงสัยเอง */
export const lookalike = (symbol: string): boolean => /[^\x20-\x7E]/.test(symbol);
const httpUrl = (v: unknown): string | null => (typeof v === 'string' && /^https:\/\//i.test(v) ? v : null);

function normalize(body: unknown, walletId: string, address: string): Page {
  if (isObj(body) && Array.isArray(body.history_list)) return fromHistoryList(body, walletId, address);
  const list = Array.isArray(body) ? body : isObj(body) ? (['result', 'data', 'activities', 'items', 'transactions', 'txs'].map((k) => body[k]).find(Array.isArray) ?? (isObj(body.data) ? ['activities', 'items', 'list'].map((k) => (body.data as Dict)[k]).find(Array.isArray) : null) ?? null) : null;
  if (!list) throw new FeedError('shape');
  if (list.some((x) => isObj(x) && (typeof x.signature === 'string' || Array.isArray(x.tokenTransfers) || Array.isArray(x.nativeTransfers)))) return fromSignatureList(list, walletId, address);
  return fromFlatList(list, walletId, address);
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
        const symbol = str(tok.optimized_symbol) ?? str(tok.display_symbol) ?? str(tok.symbol) ?? shortId(tokenId);
        const bad = tok.is_scam === true || tok.is_suspicious === true || lookalike(symbol);
        if (bad) flagged = true;
        rememberPrice(chain, tokenId.startsWith('0x') || tokenId.length > 20 ? tokenId : null, symbol, price, time);
        moves.push({
          dir,
          amount,
          symbol,
          name: str(tok.name),
          usd: price !== null ? amount * price : null,
          price,
          tokenId: tokenId.startsWith('0x') || tokenId.length > 20 ? tokenId : null,
          flagged: bad,
          logo: httpUrl(tok.logo_url),
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
      moves.push({ dir: 'out', amount: num(approve.value) ?? 0, symbol: str(tok.optimized_symbol) ?? str(tok.symbol) ?? '', name: str(tok.name), usd: null, price: num(tok.price), tokenId: str(approve.token_id)?.startsWith('0x') ? str(approve.token_id) : null, flagged: false, logo: httpUrl(tok.logo_url) });
    }

    const projectId = str(item.project_id);
    const project = projectId && isObj(projects[projectId]) ? (projects[projectId] as Dict) : null;
    const other = str(item.other_addr) ?? (str(tx.from_addr)?.toLowerCase() === address ? str(tx.to_addr) : str(tx.from_addr));

    // เหรียญพื้นเมือง: key ใน token_dict = ชื่อเชน (hood → ETH, hyper → HYPE)
    const native = isObj(tokens[chain]) ? (tokens[chain] as Dict) : {};
    const nativeSymbol = str(native.optimized_symbol) ?? str(native.symbol);
    rememberPrice(chain, null, nativeSymbol ?? '', num(native.price), time);
    const gasNative = num(tx.eth_gas_fee);
    const gasUsd = num(tx.usd_gas_fee);
    if (gasNative && gasUsd) rememberPrice(chain, null, nativeSymbol ?? '', gasUsd / gasNative, time);
    rows.push({
      key: `${walletId}:${chain}:${hash}:${num(item.idx) ?? 0}`,
      hash,
      walletId,
      chain,
      chainLogo: httpUrl(item.chain_logo_url),
      nativeSymbol,
      time,
      type,
      name,
      failed: num(tx.status) === 0,
      flagged,
      moves,
      counterparty: other,
      counterpartyName: project ? str(project.name) : null,
      from: str(tx.from_addr),
      to: str(tx.to_addr),
      contract: projectId || approve || type === 'swap' || type === 'contract' ? str(tx.to_addr) : null,
      nonce: num(tx.nonce),
      gasUsd,
      gasNative,
      raw: item,
    });
  }
  return { rows, next: cursorOf(rows) };
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
    const flatToken = str(item.contractAddress) ?? str(item.token_id) ?? str(item.tokenAddress) ?? str(item.mint) ?? null;
    const symbol = str(item.tokenSymbol) ?? str(item.symbol) ?? (flatToken ? shortId(flatToken) : '');
    const flatChain = str(item.chain) ?? '—';
    const flatPrice = num(item.price) ?? num(item.tokenPrice);
    rememberPrice(flatChain, flatToken, symbol, flatPrice, time);
    const moves: Move[] = amount > 0 ? [{ dir: out ? 'out' : 'in', amount, symbol, name: str(item.tokenName) ?? str(item.name), usd: num(item.usd) ?? num(item.valueUsd), price: flatPrice, tokenId: flatToken, flagged: lookalike(symbol), logo: httpUrl(item.tokenLogo) ?? httpUrl(item.logo_url) ?? httpUrl(item.image) ?? httpUrl(item.logo) }] : [];
    const gasPrice = num(item.gasPrice);
    const gasUsed = num(item.gasUsed);
    rows.push({
      key: `${walletId}:${hash}:${rows.length}`,
      hash,
      walletId,
      chain: str(item.chain) ?? '—',
      chainLogo: httpUrl(item.chain_logo_url),
      nativeSymbol: str(item.nativeSymbol),
      time,
      type: moves.length ? (out ? 'send' : 'receive') : 'contract',
      name: str(item.functionName)?.split('(')[0] ?? str(item.name) ?? '',
      failed: str(item.isError) === '1' || num(item.status) === 0,
      flagged: moves.some((m) => m.flagged),
      moves,
      counterparty: out ? to || null : from || null,
      counterpartyName: null,
      from: from || null,
      to: to || null,
      contract: str(item.contractAddress),
      nonce: num(item.nonce),
      gasUsd: gasPrice !== null && gasUsed !== null ? null : num(item.usd_gas_fee),
      gasNative: gasPrice !== null && gasUsed !== null ? (gasPrice * gasUsed) / 1e18 : null,
      raw: item,
    });
  }
  return { rows, next: cursorOf(rows) };
}

/** รูปแบบ C: รายการธุรกรรมแบบ signature (เชนตระกูล Solana) — { signature, timestamp, type, fee, feePayer, nativeTransfers[], tokenTransfers[] } */
function fromSignatureList(list: unknown[], walletId: string, address: string): Page {
  const rows: TxRow[] = [];
  for (const item of list) {
    if (!isObj(item)) continue;
    const hash = str(item.signature) ?? str(item.txHash) ?? str(item.id) ?? '';
    const rawTime = num(item.timestamp) ?? num(item.blockTime) ?? num(item.time) ?? 0;
    const time = rawTime > 1e12 ? Math.floor(rawTime / 1000) : rawTime;
    const moves: Move[] = [];
    let other: string | null = null;
    const push = (list: unknown, native: boolean) => {
      if (!Array.isArray(list)) return;
      for (const m of list) {
        if (!isObj(m)) continue;
        const from = str(m.fromUserAccount) ?? str(m.from) ?? '';
        const to = str(m.toUserAccount) ?? str(m.to) ?? '';
        if (from !== address && to !== address) continue;
        const dir: Move['dir'] = from === address ? 'out' : 'in';
        other ??= dir === 'out' ? to || null : from || null;
        const amount = native ? (num(m.amount) ?? 0) / 1e9 : (num(m.tokenAmount) ?? num(m.amount) ?? 0);
        const mint = native ? null : (str(m.mint) ?? str(m.tokenAddress) ?? str(m.address));
        const symbol = native ? 'SOL' : (str(m.symbol) ?? shortId(mint ?? ''));
        const solUsd = num(m.usd);
        const solPrice = num(m.price) ?? num(m.priceUsd) ?? (solUsd !== null && amount ? solUsd / amount : null);
        rememberPrice(str(item.chain) ?? 'sol', mint, symbol, solPrice, time);
        moves.push({ dir, amount, symbol, name: str(m.name), usd: solUsd, price: solPrice, tokenId: mint, flagged: lookalike(symbol), logo: native ? null : (httpUrl(m.logo) ?? httpUrl(m.image) ?? httpUrl(m.logo_url)) });
      }
    };
    push(item.nativeTransfers, true);
    push(item.tokenTransfers, false);
    const hasIn = moves.some((m) => m.dir === 'in');
    const hasOut = moves.some((m) => m.dir === 'out');
    const kind = (str(item.type) ?? '').toLowerCase();
    const type: TxType = kind.includes('swap') || (hasIn && hasOut) ? 'swap' : hasOut ? 'send' : hasIn ? 'receive' : 'contract';
    const fee = num(item.fee);
    rows.push({
      key: `${walletId}:sol:${hash}`,
      hash,
      walletId,
      chain: str(item.chain) ?? 'sol',
      chainLogo: httpUrl(item.chain_logo_url),
      nativeSymbol: 'SOL',
      time,
      type,
      name: kind && kind !== 'unknown' ? kind : (str(item.source) ?? ''),
      failed: item.transactionError !== null && item.transactionError !== undefined && item.transactionError !== false,
      flagged: moves.some((m) => m.flagged),
      moves,
      counterparty: other,
      counterpartyName: null,
      from: str(item.feePayer),
      to: other,
      contract: str(item.source),
      nonce: null,
      gasUsd: fee !== null && str(item.feePayer) === address ? num(item.feeUsd) : null,
      gasNative: fee !== null && str(item.feePayer) === address ? fee / 1e9 : null,
      raw: item,
    });
  }
  return { rows, next: cursorOf(rows) };
}

function cursorOf(rows: TxRow[]): Cursor | null {
  if (!rows.length) return null;
  const oldest = rows.reduce((m, r) => (r.time > 0 && r.time < m.time ? r : m), rows[0]!);
  return { start: oldest.time, cursor: oldest.hash };
}

function shortId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 6)}…` : id || '?';
}

/* ----------------------------- token metadata ----------------------------- */

export interface TokenMeta {
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
}

/** โทเคนในหน้าที่ยังไม่รู้ชื่อ/สัญลักษณ์/โลโก้ — ไปขอ metadata เพิ่มจาก URL ที่ผู้ใช้ตั้ง */
export function unknownTokens(rows: TxRow[]): string[] {
  const ids = new Set<string>();
  for (const r of rows) for (const m of r.moves) if (m.tokenId && (m.name === null || m.logo === null || m.symbol.endsWith('…'))) ids.add(m.tokenId);
  return [...ids];
}

/** เติมชื่อ/สัญลักษณ์/โลโก้ลงแถว (แถวใหม่ ไม่แก้ของเดิม) */
export function applyTokenMeta(rows: TxRow[], meta: Map<string, TokenMeta>): TxRow[] {
  if (!meta.size) return rows;
  return rows.map((r) => {
    let touched = false;
    const moves = r.moves.map((m) => {
      const t = m.tokenId ? meta.get(m.tokenId) : undefined;
      if (!t) return m;
      touched = true;
      const symbol = m.symbol.endsWith('…') || !m.symbol ? (t.symbol ?? m.symbol) : m.symbol;
      return { ...m, symbol, name: m.name ?? t.name, logo: m.logo ?? t.logo, flagged: m.flagged || lookalike(symbol) };
    });
    return touched ? { ...r, moves, flagged: r.flagged || moves.some((m) => m.flagged) } : r;
  });
}

/** แปลงคำตอบ metadata ทุกรูปที่พบ: รายการ [{address,…}] หรือ map { address: {…} } หรือห่อใน data/result */
export function parseTokenMeta(body: unknown): Map<string, TokenMeta> {
  const out = new Map<string, TokenMeta>();
  let list: unknown = body;
  if (isObj(list)) list = ['data', 'result', 'tokens', 'items'].map((k) => (list as Dict)[k]).find((v) => v !== undefined) ?? list;
  const add = (addr: string | null, v: unknown) => {
    if (!addr || !isObj(v)) return;
    out.set(addr, { name: str(v.name), symbol: str(v.symbol), decimals: num(v.decimals), logo: httpUrl(v.logoURI) ?? httpUrl(v.logo_uri) ?? httpUrl(v.logo) ?? httpUrl(v.image) ?? httpUrl(v.icon) ?? httpUrl(v.logo_url) });
  };
  if (Array.isArray(list)) for (const v of list) add(isObj(v) ? (str(v.address) ?? str(v.mint) ?? str(v.tokenAddress) ?? str(v.id)) : null, v);
  else if (isObj(list)) for (const [k, v] of Object.entries(list)) add(k, v);
  return out;
}
