/** ธีมสว่าง/มืด — จำใน localStorage, ค่าเริ่มต้นตามระบบ; ตั้ง data-theme บน <html> ให้ tokens.css สลับค่า */
import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'xcap.scan.theme';
const listeners = new Set<() => void>();

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* ignore */
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

let theme: Theme = read();
document.documentElement.dataset.theme = theme;

export function useTheme(): [Theme, (t: Theme) => void] {
  const t = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => theme
  );
  const set = useCallback((next: Theme) => {
    theme = next;
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  }, []);
  return [t, set];
}
