/**
 * สถานะที่คงอยู่ทั้งหมดของแอป — localStorage ก้อนเดียว เวอร์ชันกำกับ
 * ไม่มีบัญชี ไม่มี sync: กระเป๋าและแหล่งข้อมูลอยู่บนเครื่องนี้เท่านั้น
 */
import { useCallback, useSyncExternalStore } from 'react';
import { configuredChainListUrl, configuredEndpoints, withConfiguredChains } from './config';

export type Family = 'evm' | 'sol';

export interface Wallet {
  id: string;
  label: string;
  address: string;
  family: Family;
  enabled: boolean;
}

export interface Endpoint {
  id: string;
  name: string;
  /** แม่แบบ URL ที่ผู้ใช้ใส่เอง ต้องมี {address}; {start} {count} {cursor} เลือกใส่ได้ */
  url: string;
  family: Family;
  enabled: boolean;
  /** header ยืนยันตัวตน (เลือกใส่) — อยู่ใน localStorage เครื่องนี้เท่านั้น */
  authHeader?: string;
  apiKey?: string;
  /** URL ขอ metadata โทเคน (ชื่อ/สัญลักษณ์/โลโก้) เป็นชุด — ว่าง = ไม่ขอ */
  metaUrl?: string;
}

/** ส่วนบนสลิปที่ซ่อน/แสดงได้ (ตั้งค่า) */
export const SLIP_FIELDS = ['headline', 'assets', 'usd', 'fee', 'swapCost', 'wallet', 'walletLabel', 'protocol', 'to', 'status', 'hash', 'qr', 'code', 'issued'] as const;
export type SlipField = (typeof SLIP_FIELDS)[number];
export type SlipShow = Record<SlipField, boolean>;
export const SLIP_SHOW_DEFAULT: SlipShow = Object.fromEntries(SLIP_FIELDS.map((f) => [f, true])) as SlipShow;

/** ข้อมูลเชนที่ผู้ใช้ใส่เอง (ทับ/เติม chain list): โลโก้ + explorer ต่อ chain id */
export interface ChainOverride {
  id: string;
  name?: string;
  logo?: string;
  explorer?: string;
}

export interface Settings {
  endpoints: Endpoint[];
  pageSize: number;
  /** URL รายชื่อเชน (ชื่อ/โลโก้/explorer) ที่ผู้ใช้วางเอง — ว่าง = ใช้ <origin>/v1/chain/list ของแต่ละแหล่ง */
  chainListUrl: string;
  /** URL ราคาโทเคนที่ผู้ใช้วางเอง — ว่าง = ใช้แค่ราคาที่มากับธุรกรรม */
  priceUrl: string;
  /** ซ่อนแถวที่ติดธงน่าสงสัย/หลอกลวง */
  hideScam: boolean;
  /** ป้ายบนสลิปที่แสดง (ค่าเริ่มต้นแสดงทั้งหมด) */
  slipShow: SlipShow;
  /** ทางผ่านคำขอของผู้ใช้เอง (CORS) — ว่าง = ยิงตรง (dev ใช้ /__proxy ของ vite) */
  proxyUrl: string;
  /** เชนที่ผู้ใช้กำหนดเอง (โลโก้/explorer) — ใช้ก่อน chain list */
  chains: ChainOverride[];
}

interface State {
  v: 2;
  wallets: Wallet[];
  settings: Settings;
}

const KEY = 'xcap.scan.v1';
const DEFAULT: State = { v: 2, wallets: [], settings: { endpoints: [], pageSize: 20, chainListUrl: '', priceUrl: '', hideScam: false, slipShow: SLIP_SHOW_DEFAULT, proxyUrl: '', chains: [] } };

export const EVM_RE = /^0x[0-9a-fA-F]{40}$/;
export const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** ตรวจว่าเป็นที่อยู่แบบไหน — EVM ปรับเป็นตัวพิมพ์เล็ก, Solana ต้องคงตัวพิมพ์เดิม (base58 แยกตัวพิมพ์) */
export function parseAddress(raw: string): { address: string; family: Family } | null {
  const a = raw.trim();
  if (EVM_RE.test(a)) return { address: a.toLowerCase(), family: 'evm' };
  if (SOL_RE.test(a)) return { address: a, family: 'sol' };
  return null;
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    // เบราว์เซอร์นี้ยังไม่เคยมีข้อมูล → เริ่มจากค่าที่ตั้งไว้ตอน build (ถ้ามี) จากนั้นผู้ใช้แก้ได้เองตลอด
    if (!raw) return { ...DEFAULT, settings: { ...DEFAULT.settings, endpoints: configuredEndpoints(), chainListUrl: configuredChainListUrl(), chains: withConfiguredChains([]) } };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const wallets = Array.isArray(parsed.wallets) ? (parsed.wallets as Wallet[]) : [];
    const s = (parsed.settings ?? {}) as Partial<Settings> & { endpoint?: string };
    // v1 เก็บแหล่งข้อมูลเดียวเป็นสตริง → กลายเป็นรายการหนึ่งรายการ (EVM)
    const saved: Endpoint[] = Array.isArray(s.endpoints) ? s.endpoints : s.endpoint ? [{ id: 'ep1', name: 'EVM', url: s.endpoint, family: 'evm', enabled: true }] : [];
    // เคยเปิดเว็บไว้ตอนยังไม่ได้ตั้งค่า (เบราว์เซอร์จึงมีสถานะที่ไม่มีแหล่งข้อมูลค้างอยู่)
    // → เติมจากค่าที่ฝังตอน build ให้ ไม่งั้นต้องล้างข้อมูลเบราว์เซอร์เองถึงจะเห็น
    const endpoints: Endpoint[] = saved.length ? saved : configuredEndpoints();
    return {
      v: 2,
      wallets: wallets.flatMap((w) => {
        const p = w && typeof w.address === 'string' ? parseAddress(w.address) : null;
        return p ? [{ id: p.address, label: w.label ?? '', address: p.address, family: p.family, enabled: w.enabled !== false }] : [];
      }),
      settings: { endpoints, pageSize: typeof s.pageSize === 'number' ? s.pageSize : 20, chainListUrl: typeof s.chainListUrl === 'string' && s.chainListUrl ? s.chainListUrl : configuredChainListUrl(), priceUrl: typeof s.priceUrl === 'string' ? s.priceUrl : '', hideScam: s.hideScam === true, slipShow: { ...SLIP_SHOW_DEFAULT, ...(typeof s.slipShow === 'object' && s.slipShow ? s.slipShow : {}) }, proxyUrl: typeof s.proxyUrl === 'string' ? s.proxyUrl : '', chains: withConfiguredChains(Array.isArray(s.chains) ? (s.chains as ChainOverride[]).filter((c) => c && typeof c.id === 'string') : []) },
    };
  } catch {
    return DEFAULT;
  }
}

let state: State = load();
const listeners = new Set<() => void>();

function commit(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode — แอปยังใช้ได้ในหน่วยความจำ */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * ตรวจแหล่งข้อมูลจาก URL ที่ผู้ใช้วาง — ไม่มีการตั้งค่ามือ
 * ตระกูลเชน: มีคำว่า sol/solana ใน host หรือ path → Solana, นอกนั้น EVM
 * ชื่อ: host โดยตัด www./api. ข้างหน้า
 */
export function detectEndpoint(url: string): { name: string; family: Family } | null {
  let u: URL;
  try {
    u = new URL(url.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || !u.hostname.includes('.')) return null;
  const probe = `${u.hostname}${u.pathname}`.toLowerCase();
  const family: Family = /\bsol(ana)?\b|solana|[/._-]sol[/._-]/.test(probe) ? 'sol' : 'evm';
  const name = u.hostname.replace(/^(www|api)\./, '') || u.hostname;
  return { name, family };
}

/** ข้อมูลที่พกข้ามเครื่องได้ (สำรอง/แชร์) — อ่านสถานะปัจจุบันแบบไม่ผูกกับ React */
export function snapshot(): { wallets: Wallet[]; settings: Settings } {
  return { wallets: state.wallets, settings: state.settings };
}

/** เขียนสถานะกลับทั้งก้อน (กู้คืน/รวมข้อมูล) — ผ่าน commit ตัวเดียวกับที่ UI ใช้ จึงบันทึกและแจ้งทุกหน้าจอเอง */
export function applySnapshot(next: { wallets: Wallet[]; settings: Settings }): void {
  commit({ v: 2, wallets: next.wallets, settings: next.settings });
}

export function useStore() {
  const s = useSyncExternalStore(subscribe, () => state);

  const addWallets = useCallback((items: Array<{ label: string; address: string }>): number => {
    const have = new Set(state.wallets.map((w) => w.address));
    const fresh: Wallet[] = [];
    for (const it of items) {
      const p = parseAddress(it.address);
      if (!p || have.has(p.address)) continue;
      have.add(p.address);
      fresh.push({ id: p.address, label: it.label.trim() || p.address.slice(0, 8), address: p.address, family: p.family, enabled: true });
    }
    if (fresh.length) commit({ ...state, wallets: [...state.wallets, ...fresh] });
    return fresh.length;
  }, []);

  const removeWallet = useCallback((id: string) => commit({ ...state, wallets: state.wallets.filter((w) => w.id !== id) }), []);
  const toggleWallet = useCallback((id: string, enabled: boolean) => commit({ ...state, wallets: state.wallets.map((w) => (w.id === id ? { ...w, enabled } : w)) }), []);
  const clearWallets = useCallback(() => commit({ ...state, wallets: [] }), []);
  const removeWallets = useCallback((ids: Set<string>) => commit({ ...state, wallets: state.wallets.filter((w) => !ids.has(w.id)) }), []);
  /* ลากเรียงลำดับ: ย้ายรายการจาก index หนึ่งไปอีก index */
  const reorderWallets = useCallback((from: number, to: number) => {
    if (from === to) return;
    const next = [...state.wallets];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    commit({ ...state, wallets: next });
  }, []);

  const addEndpoint = useCallback((e: Omit<Endpoint, 'id' | 'enabled'>) => {
    commit({ ...state, settings: { ...state.settings, endpoints: [...state.settings.endpoints, { ...e, id: uid(), enabled: true }] } });
  }, []);
  const updateEndpoint = useCallback((id: string, patch: Partial<Endpoint>) => {
    commit({ ...state, settings: { ...state.settings, endpoints: state.settings.endpoints.map((e) => (e.id === id ? { ...e, ...patch } : e)) } });
  }, []);
  const reorderEndpoints = useCallback((from: number, to: number) => {
    if (from === to) return;
    const next = [...state.settings.endpoints];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    commit({ ...state, settings: { ...state.settings, endpoints: next } });
  }, []);
  const removeEndpoint = useCallback((id: string) => {
    commit({ ...state, settings: { ...state.settings, endpoints: state.settings.endpoints.filter((e) => e.id !== id) } });
  }, []);
  const setChainListUrl = useCallback((chainListUrl: string) => commit({ ...state, settings: { ...state.settings, chainListUrl: chainListUrl.trim() } }), []);
  const setPriceUrl = useCallback((priceUrl: string) => commit({ ...state, settings: { ...state.settings, priceUrl: priceUrl.trim() } }), []);
  const setHideScam = useCallback((hideScam: boolean) => commit({ ...state, settings: { ...state.settings, hideScam } }), []);
  const setProxyUrl = useCallback((proxyUrl: string) => commit({ ...state, settings: { ...state.settings, proxyUrl: proxyUrl.trim() } }), []);
  /* เชนกำหนดเอง: id เดิม = แทนที่ */
  const setChain = useCallback((c: ChainOverride) => {
    const id = c.id.trim().toLowerCase();
    if (!id) return;
    const rest = state.settings.chains.filter((x) => x.id !== id);
    commit({ ...state, settings: { ...state.settings, chains: [...rest, { ...c, id }] } });
  }, []);
  const removeChain = useCallback((id: string) => commit({ ...state, settings: { ...state.settings, chains: state.settings.chains.filter((x) => x.id !== id) } }), []);
  const setSlipShow = useCallback((field: SlipField, on: boolean) => commit({ ...state, settings: { ...state.settings, slipShow: { ...state.settings.slipShow, [field]: on } } }), []);
  const setPageSize = useCallback((pageSize: number) => commit({ ...state, settings: { ...state.settings, pageSize } }), []);

  const restore = useCallback((next: { wallets: Wallet[]; settings: Settings }) => applySnapshot(next), []);

  return { wallets: s.wallets, settings: s.settings, restore, addWallets, removeWallet, removeWallets, reorderWallets, toggleWallet, clearWallets, addEndpoint, updateEndpoint, reorderEndpoints, removeEndpoint, setPageSize, setChainListUrl, setPriceUrl, setHideScam, setSlipShow, setProxyUrl, setChain, removeChain };
}
