/** เมนูเลือกภาษาแบบ dropdown — ปิดเมื่อคลิกนอก / Esc, ลูกศรเลื่อนรายการ */
import { useEffect, useRef, useState } from 'react';
import { useI18n, type Lang } from '../i18n';
import { Icon } from './Icon';

const LANGS: Array<{ code: Lang; name: string }> = [
  { code: 'th', name: 'ไทย' },
  { code: 'en', name: 'English' },
];

export function LangMenu() {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const items = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    items.current[LANGS.findIndex((l) => l.code === lang)]?.focus();
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, lang]);

  function onListKey(e: React.KeyboardEvent, i: number) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = (i + (e.key === 'ArrowDown' ? 1 : -1) + LANGS.length) % LANGS.length;
      items.current[n]?.focus();
    }
  }

  return (
    <div className="menu" ref={root}>
      <button type="button" className="btn btn-sm" aria-haspopup="menu" aria-expanded={open} aria-label={t('nav.lang')} onClick={() => setOpen((o) => !o)}>
        {lang.toUpperCase()}
        <Icon name="chevronDown" />
      </button>
      {open && (
        <ul className="menu-list" role="menu" aria-label={t('nav.lang')}>
          {LANGS.map((l, i) => (
            <li key={l.code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={l.code === lang}
                className="menu-item"
                ref={(el) => {
                  items.current[i] = el;
                }}
                onKeyDown={(e) => onListKey(e, i)}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
              >
                {l.name}
                <small>{l.code.toUpperCase()}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
