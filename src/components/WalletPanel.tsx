import { useState } from 'react';
import { useI18n } from '../i18n';
import { useStore, type Wallet } from '../store';
import type { WalletFeed } from '../useFeed';
import { shortAddr } from '../format';
import { Icon } from './Icon';
import { AddWalletDialog } from './AddWalletDialog';
import { ImportDialog } from './ImportDialog';
import { Identicon } from './Identicon';

/**
 * แผงกระเป๋า — ไม่พับ คลิกแถว = สลับกระเป๋าที่ดู (คลิกซ้ำ = ดูทุกกระเป๋า)
 * ไอคอนตา = ซ่อน/แสดงข้อมูลของกระเป๋านั้นในตาราง (hiddenWallets เก็บใน store เป็น enabled=false)
 */
export function WalletPanel({ feeds, activeId, onSwitch, onRemove }: { feeds: Record<string, WalletFeed>; activeId: string | null; onSwitch: (id: string | null) => void; onRemove: (id: string) => void }) {
  const { t } = useI18n();
  const { wallets, removeWallet, toggleWallet, clearWallets } = useStore();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const hiddenWallets = new Set(wallets.filter((w) => !w.enabled).map((w) => w.id));
  const activeWallet = wallets.find((w) => w.id === activeId) ?? null;

  function remove(w: Wallet) {
    removeWallet(w.id);
    onRemove(w.id);
    if (activeId === w.id) onSwitch(null);
  }

  function clear() {
    if (!wallets.length) return;
    if (!window.confirm(t('wallets.clearConfirm', { n: wallets.length }))) return;
    clearWallets();
    wallets.forEach((w) => onRemove(w.id));
    onSwitch(null);
  }

  return (
    <section className="panel" aria-labelledby="wallets-h">
      <div className="panel-head">
        <h2 id="wallets-h" className="panel-title with-logo">
          {activeWallet ? <Identicon value={activeWallet.address} size={28} /> : null}
          {activeWallet ? activeWallet.label : t('wallets.title')}
        </h2>
        <span className="hint">{activeWallet ? shortAddr(activeWallet.address) : t('wallets.count', { n: wallets.length })}</span>
      </div>
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
        <ul className="wallets" role="listbox" aria-label={t('wallets.title')}>
          {wallets.map((w) => {
            const f = feeds[w.id];
            const hidden = hiddenWallets.has(w.id);
            const active = activeId === w.id;
            const state = f?.loading ? 'loading' : f && Object.keys(f.errors).length ? 'error' : f?.loaded ? 'ok' : 'idle';
            return (
              <li key={w.id} className="wallet" data-active={active} data-hidden={hidden}>
                <button type="button" className="wallet-switch" role="option" aria-selected={active} onClick={() => onSwitch(active ? null : w.id)} title={w.address}>
                  <Identicon value={w.address} size={40} />
                  <span className="wallet-meta">
                    <span className="wallet-label">{w.label}</span>
                    <span className="wallet-addr">
                      <span className="chip">{t(`family.${w.family}`)}</span> {shortAddr(w.address)}
                    </span>
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
      )}

      <AddWalletDialog open={adding} onClose={() => setAdding(false)} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
    </section>
  );
}
