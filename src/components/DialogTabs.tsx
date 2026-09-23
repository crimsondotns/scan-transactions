/**
 * ไดอะล็อกแบบมีแถบหัวข้อด้านซ้าย (จอแคบ = แถบเลื่อนแนวนอนด้านบน)
 * ปุ่มหัวข้อเป็น role="tab" จริง ลูกศรขึ้น/ลง (หรือซ้าย/ขวาตอนแนวนอน) เลื่อนหัวข้อได้ตามมาตรฐาน
 */
import { useRef, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export interface TabDef<T extends string> {
  id: T;
  label: string;
  icon: IconName;
}

export function DialogTabs<T extends string>({ tabs, active, onChange, label, children }: { tabs: Array<TabDef<T>>; active: T; onChange: (id: T) => void; label: string; children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => {
    const i = tabs.findIndex((x) => x.id === active);
    const next = tabs[(i + dir + tabs.length) % tabs.length]!;
    onChange(next.id);
    rail.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
  };
  return (
    <div className="dlg-tabs">
      <div ref={rail} className="dlg-rail" role="tablist" aria-orientation="vertical" aria-label={label}>
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            data-tab={tb.id}
            className="tab-item"
            aria-selected={tb.id === active}
            tabIndex={tb.id === active ? 0 : -1}
            onClick={() => onChange(tb.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                move(1);
              } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                move(-1);
              }
            }}
          >
            <Icon name={tb.icon} />
            <span className="tab-label">{tb.label}</span>
          </button>
        ))}
      </div>
      <div className="dlg-panel" role="tabpanel" aria-label={tabs.find((x) => x.id === active)?.label ?? label}>
        {children}
      </div>
    </div>
  );
}
