/**
 * สถานะที่คงอยู่ทั้งหมดของแอป — localStorage ก้อนเดียว เวอร์ชันกำกับ
 * ไม่มีบัญชี ไม่มี sync: กระเป๋าและแหล่งข้อมูลอยู่บนเครื่องนี้เท่านั้น
 */
import { useCallback, useSyncExternalStore } from 'react';

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
}

export interface Settings {
  endpoints: Endpoint[];
  pageSize: number;
  /** URL รายชื่อเชน (ชื่อ/โลโก้/explorer) ที่ผู้ใช้วางเอง — ว่าง = ใช้ <origin>/v1/chain/list ของแต่ละแหล่ง */
  chainListUrl: string;
}

interface State {
  v: 2;
  wallets: Wallet[];
  settings: Settings;
}

const KEY = 'xcap.scan.v1';
const DEFAULT: State = { v: 2, wallets: [], settings: { endpoints: [], pageSize: 20, chainListUrl: '' } };

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
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const wallets = Array.isArray(parsed.wallets) ? (parsed.wallets as Wallet[]) : [];
    const s = (parsed.settings ?? {}) as Partial<Settings> & { endpoint?: string };
    // v1 เก็บแหล่งข้อมูลเดียวเป็นสตริง → กลายเป็นรายการหนึ่งรายการ (EVM)
    const endpoints: Endpoint[] = Array.isArray(s.endpoints) ? s.endpoints : s.endpoint ? [{ id: 'ep1', name: 'EVM', url: s.endpoint, family: 'evm', enabled: true }] : [];
    return {
      v: 2,
      wallets: wallets.flatMap((w) => {
        const p = w && typeof w.address === 'string' ? parseAddress(w.address) : null;
        return p ? [{ id: p.address, label: w.label ?? '', address: p.address, family: p.family, enabled: w.enabled !== false }] : [];
      }),
      settings: { endpoints, pageSize: typeof s.pageSize === 'number' ? s.pageSize : 20, chainListUrl: typeof s.chainListUrl === 'string' ? s.chainListUrl : '' },
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

  const addEndpoint = useCallback((e: Omit<Endpoint, 'id' | 'enabled'>) => {
    commit({ ...state, settings: { ...state.settings, endpoints: [...state.settings.endpoints, { ...e, id: uid(), enabled: true }] } });
  }, []);
  const updateEndpoint = useCallback((id: string, patch: Partial<Endpoint>) => {
    commit({ ...state, settings: { ...state.settings, endpoints: state.settings.endpoints.map((e) => (e.id === id ? { ...e, ...patch } : e)) } });
  }, []);
  const removeEndpoint = useCallback((id: string) => {
    commit({ ...state, settings: { ...state.settings, endpoints: state.settings.endpoints.filter((e) => e.id !== id) } });
  }, []);
  const setChainListUrl = useCallback((chainListUrl: string) => commit({ ...state, settings: { ...state.settings, chainListUrl: chainListUrl.trim() } }), []);
  const setPageSize = useCallback((pageSize: number) => commit({ ...state, settings: { ...state.settings, pageSize } }), []);

  return { wallets: s.wallets, settings: s.settings, addWallets, removeWallet, toggleWallet, clearWallets, addEndpoint, updateEndpoint, removeEndpoint, setPageSize, setChainListUrl };
}
