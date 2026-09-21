import { useState } from 'react';
import { useI18n } from '../i18n';
import { useStore, type Wallet } from '../store';
import type { WalletFeed } from '../useFeed';
import { shortAddr } from '../format';
import { Icon } from './Icon';
import { AddWalletDialog } from './AddWalletDialog';
import { ImportDialog } from './ImportDialog';

export function WalletPanel({ feeds, onRemove }: { feeds: Record<string, WalletFeed>; onRemove: (id: string) => void }) {
  const { t } = useI18n();
  const { wallets, removeWallet, toggleWallet, clearWallets } = useStore();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  function remove(w: Wallet) {
    removeWallet(w.id);
    onRemove(w.id);
  }

  function clear() {
    if (!wallets.length) return;
    if (!window.confirm(t('wallets.clearConfirm', { n: wallets.length }))) return;
    clearWallets();
    wallets.forEach((w) => onRemove(w.id));
  }

  return (
    <section className="panel" aria-labelledby="wallets-h">
      <div className="panel-head">
        <h2 id="wallets-h" className="panel-title">
          {t('wallets.title')}
        </h2>
        <span className="hint">{t('wallets.count', { n: wallets.length })}</span>
      </div>
      <div className="row-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={() => setImporting(true)}>
          <Icon name="upload" />
          {t('wallets.import')}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setAdding(true)}>
          <Icon name="plus" />
          {t('wallets.add')}
        </button>
        {wallets.length > 0 && (
          <button type="button" className="btn btn-sm" onClick={clear}>
            {t('wallets.clear')}
          </button>
        )}
      </div>

      {wallets.length === 0 ? (
        <p className="hint">{t('wallets.empty')}</p>
      ) : (
        <ul className="wallets">
          {wallets.map((w) => {
            const f = feeds[w.id];
            const state = f?.loading ? 'loading' : f && Object.keys(f.errors).length ? 'error' : f?.loaded ? 'ok' : 'idle';
            return (
              <li key={w.id} className="wallet">
                <label className="wallet-check">
                  <input type="checkbox" checked={w.enabled} onChange={(e) => toggleWallet(w.id, e.target.checked)} aria-label={t('wallets.toggle', { label: w.label })} />
                </label>
                <div className="wallet-meta">
                  <span className="wallet-label" title={w.label}>
                    {w.label}
                  </span>
                  <span className="wallet-addr" title={w.address}>
                    <span className="chip">{t(`family.${w.family}`)}</span> {shortAddr(w.address)}
                  </span>
                </div>
                <div className="row-actions" style={{ alignItems: 'center' }}>
                  <span className="wallet-state" data-state={state} aria-live="polite">
                    {state === 'ok' ? t('wallets.state.ok', { n: f?.rows.length ?? 0 }) : t(`wallets.state.${state}`)}
                  </span>
                  <button type="button" className="btn btn-icon" onClick={() => remove(w)} aria-label={t('wallets.remove', { label: w.label })} title={t('wallets.remove', { label: w.label })}>
                    <Icon name="trash" />
                  </button>
                </div>
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
