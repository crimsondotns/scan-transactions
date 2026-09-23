/** แท็บของหน้า (ชื่อ + จำนวน) — เส้นใต้ตัวที่เลือก ไม่มีกรอบ ไม่มีพื้นหลัง */
import type { KeyboardEvent } from 'react';
import { useI18n } from '../i18n';

export interface PageTab<V extends string> {
  value: V;
  label: string;
  count?: number;
}

export function PageTabs<V extends string>({ value, tabs, onChange, label }: { value: V; tabs: Array<PageTab<V>>; onChange: (v: V) => void; label?: string }) {
  const { t } = useI18n();
  function onKey(e: KeyboardEvent, i: number) {
    const n = tabs.length;
    const go = (k: number) => {
      const next = tabs[((k % n) + n) % n];
      if (next) onChange(next.value);
    };
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(i + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(i - 1);
    }
  }
  return (
    <nav className="ptabs" role="tablist" aria-label={label ?? t('tab.list')}>
      {tabs.map((tab, i) => (
        <button key={tab.value} type="button" role="tab" aria-selected={tab.value === value} tabIndex={tab.value === value ? 0 : -1} onClick={() => onChange(tab.value)} onKeyDown={(e) => onKey(e, i)}>
          {tab.label}
          {tab.count !== undefined && <span className="n">{tab.count}</span>}
        </button>
      ))}
    </nav>
  );
}
