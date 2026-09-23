/**
 * ค้นหาทั้งเว็บจากหัวเว็บ — กระเป๋า (ชื่อ/ที่อยู่) · โทเคน (สัญลักษณ์/ชื่อ) · ธุรกรรม (hash)
 * ค้นจากข้อมูลที่โหลดมาแล้วในเครื่องเท่านั้น ไม่ยิงคำขอใหม่
 */
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useI18n } from '../i18n';
import type { Wallet } from '../store';
import type { TxRow } from '../feed';
import { shortAddr, shortHash } from '../format';
import { tokenSummary } from '../flow';

export interface Hit {
  key: string;
  kind: 'wallet' | 'token' | 'tx';
  label: string;
  sub: string;
  go: () => void;
}

const LIMIT = { wallet: 5, token: 4, tx: 3 };

export function Finder({ wallets, rows, onWallet, onToken }: { wallets: Wallet[]; rows: TxRow[]; onWallet: (id: string) => void; onToken: (symbol: string, walletId: string | null) => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  const hits = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const out: Hit[] = [];
    for (const w of wallets) {
      if (out.length >= LIMIT.wallet) break;
      if (w.label.toLowerCase().includes(needle) || w.address.toLowerCase().includes(needle)) out.push({ key: `w:${w.id}`, kind: 'wallet', label: w.label || shortAddr(w.address), sub: shortAddr(w.address), go: () => onWallet(w.id) });
    }
    const tokens = tokenSummary(rows).filter((k) => k.symbol.toLowerCase().includes(needle) || (k.name ?? '').toLowerCase().includes(needle));
    for (const k of tokens.slice(0, LIMIT.token)) out.push({ key: `t:${k.symbol}`, kind: 'token', label: k.symbol, sub: k.name ?? k.chain, go: () => onToken(k.symbol, null) });
    const txs = rows.filter((r) => r.hash.toLowerCase().includes(needle)).slice(0, LIMIT.tx);
    for (const r of txs) {
      const w = wallets.find((x) => x.id === r.walletId);
      out.push({ key: `x:${r.key}`, kind: 'tx', label: shortHash(r.hash), sub: `${t(`tx.type.${r.type}`)} · ${w?.label ?? shortAddr(r.walletId)}`, go: () => onWallet(r.walletId) });
    }
    return out;
  }, [q, wallets, rows, onWallet, onToken, t]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function pick(h: Hit | undefined) {
    if (!h) return;
    h.go();
    setQ('');
    setOpen(false);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!hits.length) return;
      setOpen(true);
      setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length);
    } else if (e.key === 'Enter') {
      if (open && hits.length) {
        e.preventDefault();
        pick(hits[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const shown = open && q.trim() !== '';
  return (
    <div className="finder" ref={root}>
      <label className="sr-only" htmlFor="finder">
        {t('find.label')}
      </label>
      <input
        id="finder"
        name="find"
        type="search"
        className="input search mono"
        placeholder={t('find.placeholder')}
        value={q}
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={shown}
        aria-controls={shown ? listId : undefined}
        aria-autocomplete="list"
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
      />
      {shown && (
        <div className="results" id={listId} role="listbox" aria-label={t('find.label')}>
          {hits.length === 0 ? (
            <p className="hint">{t('find.empty')}</p>
          ) : (
            hits.map((h, i) => (
              <button key={h.key} type="button" role="option" aria-selected={i === active} data-active={i === active} onMouseEnter={() => setActive(i)} onClick={() => pick(h)}>
                <span className="act-text">
                  <span className="act-title">{h.label}</span>
                  <span className="act-sub">{h.sub}</span>
                </span>
                <span className="kind">{t(`find.${h.kind}`)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
