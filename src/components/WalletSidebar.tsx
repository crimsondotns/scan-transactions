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
 * แผงกระเป๋า (sidebar) — คลิกแถว = เลือกกระเป๋าแล้วโหลดตารางขวา ไม่มี checkbox ไม่มีขยายในแถว
 * ไอคอนตา = ซ่อน/แสดงข้อมูลของกระเป๋านั้นในตาราง (enabled=false ใน store), ถังขยะ = ยืนยันก่อนลบ
 * collapsed = โหมดไอคอนอย่างเดียว (60px) — ปุ่ม chevron ที่หัวแผงและหัวเว็บสลับกัน
 */
export function WalletSidebar({ feeds, activeId, collapsed, onSwitch, onRemove, onToggle, hasSource }: { feeds: Record<string, WalletFeed>; activeId: string | null; collapsed: boolean; onSwitch: (id: string | null) => void; onRemove: (id: string) => void; onToggle: () => void; hasSource: (w: Wallet) => boolean }) {
  const { t } = useI18n();
  const { wallets, removeWallet, toggleWallet, clearWallets } = useStore();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);

  function remove(w: Wallet) {
    setConfirmDialog({ type: 'deleteWallet', title: t('confirm.deleteTitle'), message: t('confirm.deleteMsg', { label: w.label }), walletId: w.id });
  }
  function clear() {
    if (!wallets.length) return;
    setConfirmDialog({ type: 'clearAll', title: t('confirm.clearTitle'), message: t('wallets.clearConfirm', { n: wallets.length }), walletId: null });
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
    } else if (c.type === 'clearAll') {
      clearWallets();
      wallets.forEach((w) => onRemove(w.id));
      onSwitch(null);
    }
    return c.type;
  }

  const stateOf = (w: Wallet) => {
    const f = feeds[w.id];
    if (!f && !hasSource(w)) return 'nosource';
    return f?.loading ? 'loading' : f && Object.keys(f.errors).length ? 'error' : f?.loaded ? 'ok' : 'idle';
  };

  return (
    <section className="panel wallets-panel" aria-labelledby="wallets-h" data-collapsed={collapsed}>
      <div className="panel-head">
        <h2 id="wallets-h" className="panel-title">
          {t('wallets.title')}
        </h2>
        <span className="hint">{t('wallets.count', { n: wallets.length })}</span>
        <button type="button" className="btn btn-icon side-chevron" aria-expanded={!collapsed} onClick={onToggle} aria-label={t(collapsed ? 'wallets.expand' : 'wallets.collapse')} title={t(collapsed ? 'wallets.expand' : 'wallets.collapse')}>
          <Icon name="chevronLeft" className="chev" />
        </button>
      </div>
      <div className="row-actions">
        <button type="button" className="btn btn-primary" onClick={() => setImporting(true)}>
          <Icon name="upload" />
          {t('wallets.import')}
        </button>
        <button type="button" className="btn btn-icon" onClick={() => setAdding(true)} aria-label={t('wallets.add')} title={t('wallets.add')}>
          <Icon name="plus" />
        </button>
        {wallets.length > 0 && (
          <button type="button" className="btn btn-icon" onClick={clear} aria-label={t('wallets.clear')} title={t('wallets.clear')}>
            <Icon name="trash" />
          </button>
        )}
      </div>

      {wallets.length === 0 ? (
        <p className="hint">{t('wallets.empty')}</p>
      ) : (
        <ul className="wallets" aria-label={t('wallets.title')}>
          {wallets.map((w) => {
            const f = feeds[w.id];
            const hidden = !w.enabled;
            const active = activeId === w.id;
            const state = stateOf(w);
            const stateText = state === 'ok' ? t('wallets.state.ok', { n: f?.rows.length ?? 0 }) : t(`wallets.state.${state}`);
            return (
              <li key={w.id} className="wallet" data-active={active} data-hidden={hidden}>
                <button type="button" className="wallet-switch" aria-pressed={active} onClick={() => onSwitch(w.id)} title={`${w.label} · ${shortAddr(w.address)} · ${stateText}`}>
                  <span className="wallet-avatar">
                    <Identicon value={w.address} size={32} />
                    {f?.loaded && <span className="wallet-badge">{f.rows.length}</span>}
                  </span>
                  <span className="wallet-meta">
                    <span className="wallet-label">{w.label}</span>
                    <span className="wallet-addr">{shortAddr(w.address)}</span>
                    <span className="wallet-state" data-state={state} aria-live="polite">
                      {state === 'loading' ? <span className="spinner" aria-hidden="true" /> : <span className="wallet-dot" aria-hidden="true" />}
                      {stateText}
                    </span>
                  </span>
                </button>
                <span className="wallet-actions">
                  <button type="button" className="btn btn-icon" onClick={() => toggleWallet(w.id, hidden)} aria-label={t(hidden ? 'wallets.show' : 'wallets.hide', { label: w.label })} title={t(hidden ? 'wallets.show' : 'wallets.hide', { label: w.label })}>
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
      )}

      <AddWalletDialog open={adding} onClose={() => setAdding(false)} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
      <ConfirmDialog state={confirmDialog} onConfirm={confirmAction} onCancel={() => setConfirmDialog(null)} />
    </section>
  );
}
