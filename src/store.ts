/**
 * สถานะที่คงอยู่ทั้งหมดของแอป — localStorage ก้อนเดียว เวอร์ชันกำกับ
 * ไม่มีบัญชี ไม่มี sync: กระเป๋าและ URL แหล่งข้อมูลอยู่บนเครื่องนี้เท่านั้น
 */
import { useCallback, useSyncExternalStore } from 'react';

export interface Wallet {
  id: string;
  label: string;
  address: string;
  enabled: boolean;
}

export interface Settings {
  /** แม่แบบ URL ที่ผู้ใช้ใส่เอง ต้องมี {address}; {start} และ {count} เลือกใส่ได้ */
  endpoint: string;
  pageSize: number;
}

interface State {
  v: 1;
  wallets: Wallet[];
  settings: Settings;
}

const KEY = 'xcap.scan.v1';
const DEFAULT: State = { v: 1, wallets: [], settings: { endpoint: '', pageSize: 20 } };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<State>;
    if (parsed.v !== 1 || !Array.isArray(parsed.wallets)) return DEFAULT;
    return {
      v: 1,
      wallets: parsed.wallets.filter((w) => w && typeof w.address === 'string'),
      settings: { ...DEFAULT.settings, ...(parsed.settings ?? {}) },
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

export const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function normalizeAddress(a: string): string {
  return a.trim().toLowerCase();
}

export function useStore() {
  const s = useSyncExternalStore(subscribe, () => state);

  const addWallets = useCallback((items: Array<{ label: string; address: string }>): number => {
    const have = new Set(state.wallets.map((w) => w.address));
    const fresh: Wallet[] = [];
    for (const it of items) {
      const address = normalizeAddress(it.address);
      if (!ADDRESS_RE.test(address) || have.has(address)) continue;
      have.add(address);
      fresh.push({ id: `${address}`, label: it.label.trim() || address.slice(0, 8), address, enabled: true });
    }
    if (fresh.length) commit({ ...state, wallets: [...state.wallets, ...fresh] });
    return fresh.length;
  }, []);

  const removeWallet = useCallback((id: string) => {
    commit({ ...state, wallets: state.wallets.filter((w) => w.id !== id) });
  }, []);

  const toggleWallet = useCallback((id: string, enabled: boolean) => {
    commit({ ...state, wallets: state.wallets.map((w) => (w.id === id ? { ...w, enabled } : w)) });
  }, []);

  const clearWallets = useCallback(() => commit({ ...state, wallets: [] }), []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    commit({ ...state, settings: { ...state.settings, ...patch } });
  }, []);

  return { wallets: s.wallets, settings: s.settings, addWallets, removeWallet, toggleWallet, clearWallets, setSettings };
}
