import { useState } from 'react';
import { useI18n } from '../i18n';
import { useStore, type Wallet } from '../store';
import type { WalletFeed } from '../useFeed';
import { shortAddr } from '../format';
import { Icon } from './Icon';
import { AddWalletDialog } from './AddWalletDialog';
import { ImportDialog } from './ImportDialog';
import { Identicon } from './Identicon';
import { ConfirmDialog, type ConfirmState } from './ConfirmDialog';

/**
 * แผงกระเป๋า — ไม่พับ คลิกแถว = สลับกระเป๋าที่ดู (คลิกซ้ำ = ดูทุกกระเป๋า)
 * ไอคอนตา = ซ่อน/แสดงข้อมูลของกระเป๋านั้นในตาราง (hiddenWallets เก็บใน store เป็น enabled=false)
 * chevron ที่หัว = ย่อ/ขยายเนื้อแผง (.row-actions + .wallets) หัวแผงยังอยู่เสมอ
 */
export function WalletPanel({ feeds, activeId, onSwitch, onRemove }: { feeds: Record<string, WalletFeed>; activeId: string | null; onSwitch: (id: string | null) => void; onRemove: (id: string) => void }) {
  const { t } = useI18n();
  const { wallets, removeWallet, removeWallets, reorderWallets, toggleWallet, clearWallets } = useStore();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [expandPanel, setExpandPanel] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const [selectedWallets, setSelectedWallets] = useState<Set<string>>(new Set());
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const hiddenWallets = new Set(wallets.filter((w) => !w.enabled).map((w) => w.id));
  const activeWallet = wallets.find((w) => w.id === activeId) ?? null;

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

  /* ผู้ใช้กดยืนยัน → ทำจริง; ไม่มี dialog ค้าง → ไม่ทำอะไร */
  function confirmAction() {
    const c = confirmDialog;
    setConfirmDialog(null);
    if (!c) return null;
    if (c.type === 'deleteWallet' && c.walletId) {
      removeWallet(c.walletId);
      onRemove(c.walletId);
      if (activeId === c.walletId) onSwitch(null);
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
    }
    return c.type;
  }

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
        <ul className="wallets" role="listbox" aria-label={t('wallets.title')}>
          {wallets.map((w, i) => {
            const f = feeds[w.id];
            const hidden = hiddenWallets.has(w.id);
            const active = activeId === w.id;
            const state = f?.loading ? 'loading' : f && Object.keys(f.errors).length ? 'error' : f?.loaded ? 'ok' : 'idle';
            return (
              <li
                key={w.id}
                className="wallet"
                data-active={active}
                data-hidden={hidden}
                data-selected={selectedWallets.has(w.id)}
                data-dragover={dragOver === i && dragFrom !== i}
                draggable
                onDragStart={(e) => {
                  setDragFrom(i);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOver !== i) setDragOver(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom !== null) reorderWallets(dragFrom, i);
                  setDragFrom(null);
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
              >
                <span className="wallet-grip" title={t('wallets.drag')} aria-hidden="true">
                  <Icon name="grip" />
                </span>
                <input type="checkbox" className="wallet-select" checked={selectedWallets.has(w.id)} onChange={() => toggleSelect(w.id)} aria-label={t('wallets.select', { label: w.label })} />
                <button type="button" className="wallet-switch" role="option" aria-selected={active} onClick={() => onSwitch(active ? null : w.id)} title={w.address}>
                  <Identicon value={w.address} size={32} />
                  <span className="wallet-meta">
                    <span className="wallet-label">{w.label}</span>
                    <span className="wallet-addr">{shortAddr(w.address)}</span>
                  </span>
                  <span className="wallet-state" data-state={state} aria-live="polite">
                    {state === 'ok' ? t('wallets.state.ok', { n: f?.rows.length ?? 0 }) : t(`wallets.state.${state}`)}
                  </span>
                </button>
                <span className="wallet-actions">
                  <button type="button" className="btn btn-icon" aria-pressed={!hidden} onClick={() => toggleWallet(w.id, hidden)} aria-label={t(hidden ? 'wallets.show' : 'wallets.hide', { label: w.label })} title={t(hidden ? 'wallets.show' : 'wallets.hide', { label: w.label })}>
                    <Icon name={hidden ? 'eyeOff' : 'eye'} />
                  </button>
                  <button type="button" className="btn btn-icon" onClick={() => remove(w)} aria-label={t('wallets.remove', { label: w.label })} title={t('wallets.remove', { label: w.label })}>
                    <Icon name="trash" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        </>
      )}

      </div>

      <AddWalletDialog open={adding} onClose={() => setAdding(false)} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
      <ConfirmDialog state={confirmDialog} onConfirm={confirmAction} onCancel={() => setConfirmDialog(null)} />
    </section>
  );
}
