import { useState, type DragEvent, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { WALLET_VIEWS, useStore, type Wallet, type WalletView } from '../store';
import type { WalletFeed } from '../useFeed';
import { useBreakpoint, type Breakpoint } from '../useBreakpoint';
import { formatAmount, formatRelative, shortAddr } from '../format';
import { Icon } from './Icon';
import { AddWalletDialog } from './AddWalletDialog';
import { ImportDialog } from './ImportDialog';
import { Identicon } from './Identicon';
import { ConfirmDialog, type ConfirmState } from './ConfirmDialog';
import { Dropdown } from './Dropdown';
import { Dialog } from './Dialog';
import { CopyButton } from './CopyButton';

type Variant = Exclude<WalletView, 'auto'>;

/** ค่าเริ่มต้นตามขนาดจอ: มือถือ = กะทัดรัด · แท็บเล็ต = การ์ด · เดสก์ท็อป = รายการ */
const AUTO: Record<Breakpoint, Variant> = { mobile: 'compact', tablet: 'card', desktop: 'list' };

/**
 * แผงกระเป๋า 5 รูปแบบ (compact / list / card / grid / accordion) โครงข้อมูลเดียวกัน
 * ทุกแบบ: ขยาย/ย่อได้, ช่องเลือก, ที่จับลาก, โหลดธุรกรรมเมื่อขยาย (lazy)
 * compact/list/accordion ขยายในที่; card/grid เปิดเป็นแผ่นล่าง (มือถือ) หรือโมดัล
 * ไอคอนตา = ซ่อน/แสดงข้อมูลของกระเป๋านั้นในตาราง (enabled=false ใน store)
 */
export function WalletPanel({ feeds, activeId, onSwitch, onRemove, onExpand }: { feeds: Record<string, WalletFeed>; activeId: string | null; onSwitch: (id: string | null) => void; onRemove: (id: string) => void; onExpand: (w: Wallet) => void }) {
  const { t } = useI18n();
  const { wallets, settings, setWalletView, removeWallet, removeWallets, reorderWallets, toggleWallet, clearWallets } = useStore();
  const bp = useBreakpoint();
  const variant: Variant = settings.walletView === 'auto' ? AUTO[bp] : settings.walletView;
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expandPanel, setExpandPanel] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const [selectedWallets, setSelectedWallets] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const hiddenWallets = new Set(wallets.filter((w) => !w.enabled).map((w) => w.id));
  const activeWallet = wallets.find((w) => w.id === activeId) ?? null;
  const sheetWallet = wallets.find((w) => w.id === sheet) ?? null;

  function remove(w: Wallet) {
    setConfirmDialog({ type: 'deleteWallet', title: t('confirm.deleteTitle'), message: t('confirm.deleteMsg', { label: w.label }), walletId: w.id });
  }
  function clear() {
    if (!wallets.length) return;
    setConfirmDialog({ type: 'clearAll', title: t('confirm.clearTitle'), message: t('wallets.clearConfirm', { n: wallets.length }), walletId: null });
  }
  function toggleSelect(id: string) {
    setSelectedWallets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function deleteSelected() {
    if (!selectedWallets.size) return;
    setConfirmDialog({ type: 'deleteSelected', title: t('confirm.selectedTitle'), message: t('confirm.selectedMsg', { n: selectedWallets.size }), walletId: null });
  }

  /* ขยาย = โหลดธุรกรรมของกระเป๋านั้นถ้ายังไม่มี (lazy); accordion เปิดได้ทีละอัน; card/grid เปิดแผ่น/โมดัล */
  function toggleExpand(w: Wallet) {
    if (variant === 'card' || variant === 'grid') {
      setSheet(w.id);
      onExpand(w);
      return;
    }
    const open = expanded.has(w.id);
    setExpanded(() => {
      const next = variant === 'accordion' ? new Set<string>() : new Set(expanded);
      if (open) next.delete(w.id);
      else next.add(w.id);
      return next;
    });
    if (!open) onExpand(w);
  }

  /* ผู้ใช้กดยืนยัน → ทำจริง; ไม่มี dialog ค้าง → ไม่ทำอะไร */
  function confirmAction() {
    const c = confirmDialog;
    setConfirmDialog(null);
    if (!c) return null;
    if (c.type === 'deleteWallet' && c.walletId) {
      removeWallet(c.walletId);
      onRemove(c.walletId);
      if (activeId === c.walletId) onSwitch(null);
      if (sheet === c.walletId) setSheet(null);
    } else if (c.type === 'deleteSelected') {
      const ids = new Set(selectedWallets);
      removeWallets(ids);
      ids.forEach((id) => onRemove(id));
      if (activeId && ids.has(activeId)) onSwitch(null);
      setSelectedWallets(new Set());
    } else if (c.type === 'clearAll') {
      clearWallets();
      wallets.forEach((w) => onRemove(w.id));
      onSwitch(null);
      setSheet(null);
    }
    return c.type;
  }

  const stateOf = (w: Wallet) => {
    const f = feeds[w.id];
    return f?.loading ? 'loading' : f && Object.keys(f.errors).length ? 'error' : f?.loaded ? 'ok' : 'idle';
  };

  const State = ({ w }: { w: Wallet }) => {
    const state = stateOf(w);
    return (
      <span className="wallet-state" data-state={state} aria-live="polite">
        {state === 'loading' && <span className="spinner" aria-hidden="true" />}
        {state === 'ok' ? t('wallets.state.ok', { n: feeds[w.id]?.rows.length ?? 0 }) : t(`wallets.state.${state}`)}
      </span>
    );
  };

  const Actions = ({ w }: { w: Wallet }) => {
    const hidden = hiddenWallets.has(w.id);
    return (
      <span className="wallet-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn btn-icon" aria-pressed={!hidden} onClick={() => toggleWallet(w.id, hidden)} aria-label={t(hidden ? 'wallets.show' : 'wallets.hide', { label: w.label })} title={t(hidden ? 'wallets.show' : 'wallets.hide', { label: w.label })}>
          <Icon name={hidden ? 'eyeOff' : 'eye'} />
        </button>
        <button type="button" className="btn btn-icon" onClick={() => remove(w)} aria-label={t('wallets.remove', { label: w.label })} title={t('wallets.remove', { label: w.label })}>
          <Icon name="trash" />
        </button>
      </span>
    );
  };

  const Chevron = ({ w, open }: { w: Wallet; open: boolean }) => (
    <button
      type="button"
      className="btn btn-icon wallet-chevron"
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation();
        toggleExpand(w);
      }}
      aria-label={t(open ? 'wallets.collapseRow' : 'wallets.expandRow', { label: w.label })}
      title={t(open ? 'wallets.collapseRow' : 'wallets.expandRow', { label: w.label })}
    >
      <Icon name="chevronDown" className="chev" />
    </button>
  );

  /* รายละเอียดเมื่อขยาย: ที่อยู่ + คัดลอก, สถานะ, ธุรกรรมล่าสุด 5 รายการ, ปุ่มดูในตาราง */
  const Detail = ({ w }: { w: Wallet }) => {
    const f = feeds[w.id];
    const rows = (f?.rows ?? []).slice(0, 5);
    return (
      <div className="wallet-detail">
        <div className="wallet-detail-addr">
          <span className="mono" title={w.address}>
            {shortAddr(w.address)}
          </span>
          <CopyButton text={w.address} label={t('tx.copy', { what: t('tx.col.wallet') })} />
          <State w={w} />
        </div>
        {f?.loaded && rows.length === 0 ? (
          <p className="hint">{t('wallets.noTx')}</p>
        ) : rows.length > 0 ? (
          <ul className="wallet-tx" aria-label={t('wallets.recent')}>
            {rows.map((r) => {
              const m = r.moves.find((x) => x.amount !== 0) ?? r.moves[0];
              return (
                <li key={r.key} className="wallet-tx-row">
                  <span className="wallet-tx-type">{r.failed ? t('tx.failed') : t(`tx.type.${r.type}`)}</span>
                  <span className="wallet-tx-time">{formatRelative(r.time, t)}</span>
                  {m && (
                    <span className="wallet-tx-amt" data-dir={m.dir}>
                      {m.dir === 'in' ? '+' : '−'}
                      {formatAmount(m.amount)} {m.symbol}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="wallet-detail-foot">
          <button type="button" className="btn btn-sm" onClick={() => onSwitch(w.id)}>
            {t('wallets.showInTable')}
          </button>
          <Actions w={w} />
        </div>
      </div>
    );
  };

  const dragProps = (i: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      setDragFrom(i);
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      if (dragOver !== i) setDragOver(i);
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      if (dragFrom !== null) reorderWallets(dragFrom, i);
      setDragFrom(null);
      setDragOver(null);
    },
    onDragEnd: () => {
      setDragFrom(null);
      setDragOver(null);
    },
  });

  const Grip = () => (
    <span className="wallet-grip" title={t('wallets.drag')} aria-hidden="true">
      <Icon name="grip" />
    </span>
  );
  const Check = ({ w }: { w: Wallet }) => <input type="checkbox" className="wallet-select" checked={selectedWallets.has(w.id)} onChange={() => toggleSelect(w.id)} onClick={(e) => e.stopPropagation()} aria-label={t('wallets.select', { label: w.label })} />;

  /* หนึ่งกระเป๋า — markup ต่างกันตามรูปแบบ แต่ data-* เหมือนกัน */
  const Item = ({ w, i }: { w: Wallet; i: number }) => {
    const open = expanded.has(w.id);
    const meta = (
      <span className="wallet-meta">
        <span className="wallet-label">{w.label}</span>
        <span className="wallet-addr">{shortAddr(w.address)}</span>
      </span>
    );
    const expand = (
      <div className="wallet-expand" aria-hidden={!open}>
        <div className="wallet-expand-inner">{open && <Detail w={w} />}</div>
      </div>
    );
    let body: ReactNode;
    if (variant === 'compact') {
      body = (
        <>
          <div className="wallet-row" onClick={() => toggleExpand(w)}>
            <Grip />
            <Check w={w} />
            <Identicon value={w.address} size={28} />
            <span className="wallet-label">{w.label}</span>
            <Chevron w={w} open={open} />
          </div>
          {expand}
        </>
      );
    } else if (variant === 'list') {
      body = (
        <>
          <div className="wallet-row">
            <Grip />
            <Check w={w} />
            <button type="button" className="wallet-switch" role="option" aria-selected={activeId === w.id} onClick={() => toggleExpand(w)} title={w.address}>
              <Identicon value={w.address} size={32} />
              {meta}
            </button>
            <Actions w={w} />
            <Chevron w={w} open={open} />
          </div>
          {expand}
        </>
      );
    } else if (variant === 'accordion') {
      body = (
        <>
          <div className="wallet-row" onClick={() => toggleExpand(w)}>
            <Grip />
            <Check w={w} />
            <Identicon value={w.address} size={32} />
            {meta}
            <State w={w} />
            <Chevron w={w} open={open} />
          </div>
          {expand}
        </>
      );
    } else {
      /* card / grid: กดการ์ด = เปิดแผ่นล่าง/โมดัล */
      body = (
        <div className="wallet-card" role="button" tabIndex={0} onClick={() => toggleExpand(w)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggleExpand(w))} aria-haspopup="dialog" title={w.address}>
          <span className="wallet-card-top">
            <Grip />
            <Check w={w} />
          </span>
          <Identicon value={w.address} size={variant === 'grid' ? 40 : 48} />
          {meta}
          {variant === 'card' && <State w={w} />}
        </div>
      );
    }
    return (
      <li className="wallet" data-variant={variant} data-active={activeId === w.id} data-hidden={hiddenWallets.has(w.id)} data-selected={selectedWallets.has(w.id)} data-open={open} data-dragover={dragOver === i && dragFrom !== i} {...dragProps(i)}>
        {body}
      </li>
    );
  };

  return (
    <section className="panel" aria-labelledby="wallets-h">
      <div className="panel-head">
        <h2 id="wallets-h" className="panel-title with-logo">
          {activeWallet ? <Identicon value={activeWallet.address} size={28} /> : null}
          {activeWallet ? activeWallet.label : t('wallets.title')}
        </h2>
        <span className="hint">{activeWallet ? shortAddr(activeWallet.address) : t('wallets.count', { n: wallets.length })}</span>
        <button type="button" className="btn btn-icon panel-chevron" aria-expanded={expandPanel} aria-controls="wallets-body" onClick={() => setExpandPanel((o) => !o)} aria-label={t(expandPanel ? 'wallets.collapse' : 'wallets.expand')} title={t(expandPanel ? 'wallets.collapse' : 'wallets.expand')}>
          <Icon name="chevronDown" className="chev" />
        </button>
      </div>
      <div id="wallets-body" className="panel-body" hidden={!expandPanel}>
        <div className="row-actions">
          <button type="button" className="btn btn-primary" onClick={() => setImporting(true)}>
            <Icon name="upload" />
            {t('wallets.import')}
          </button>
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            <Icon name="plus" />
            {t('wallets.add')}
          </button>
          {wallets.length > 0 && (
            <button type="button" className="btn" onClick={clear}>
              {t('wallets.clear')}
            </button>
          )}
        </div>

        {wallets.length === 0 ? (
          <p className="hint">{t('wallets.empty')}</p>
        ) : (
          <>
            <div className="wallets-tools">
              <button type="button" className="btn-text" onClick={() => setSelectedWallets(new Set(wallets.map((w) => w.id)))}>
                {t('wallets.selectAll')}
              </button>
              <button type="button" className="btn-text" onClick={() => setSelectedWallets(new Set())} disabled={selectedWallets.size === 0}>
                {t('wallets.deselectAll')}
              </button>
              <span className="top-spacer" />
              <Dropdown size="sm" align="right" value={settings.walletView} onChange={setWalletView} label={t('wallets.view')} options={WALLET_VIEWS.map((v) => ({ value: v, label: t(`wallets.view.${v}`) }))} />
            </div>
            {selectedWallets.size > 0 && (
              <div className="select-bar" role="status">
                <span>{t('wallets.selected', { n: selectedWallets.size })}</span>
                <button type="button" className="btn-text btn-text-danger" onClick={deleteSelected}>
                  <Icon name="trash" />
                  {t('wallets.deleteSelected')}
                </button>
              </div>
            )}
            <ul className="wallets" data-variant={variant} aria-label={t('wallets.title')}>
              {wallets.map((w, i) => (
                <Item key={w.id} w={w} i={i} />
              ))}
            </ul>
          </>
        )}
      </div>

      <Dialog open={sheetWallet !== null} onClose={() => setSheet(null)} title={sheetWallet?.label ?? ''}>
        {sheetWallet && (
          <div className="stack">
            <div className="with-logo">
              <Identicon value={sheetWallet.address} size={40} />
              <span className="wallet-meta">
                <span className="wallet-label">{sheetWallet.label}</span>
                <span className="wallet-addr">{shortAddr(sheetWallet.address)}</span>
              </span>
            </div>
            <Detail w={sheetWallet} />
          </div>
        )}
      </Dialog>
      <AddWalletDialog open={adding} onClose={() => setAdding(false)} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
      <ConfirmDialog state={confirmDialog} onConfirm={confirmAction} onCancel={() => setConfirmDialog(null)} />
    </section>
  );
}
