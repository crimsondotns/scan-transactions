import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore, type Wallet } from '../store';
import type { WalletFeed } from '../useFeed';
import { shortAddr } from '../format';
import { Icon } from './Icon';
import { AddWalletDialog } from './AddWalletDialog';
import { ImportDialog } from './ImportDialog';
import { Identicon } from './Identicon';
import { ConfirmDialog, type ConfirmState } from './ConfirmDialog';
import { useInfinite } from '../useInfinite';
import { MoreSentinel } from './MoreSentinel';

type SortKey = 'label' | 'address' | 'tx';
const PAGE = 10;

/**
 * หน้า 1 ตารางที่ 1: รายชื่อกระเป๋า — Label · Address · Transactions · การกระทำ
 * คลิกแถว = ไปหน้า 2 (ธุรกรรมของกระเป๋านั้น); หัวคอลัมน์เรียงได้; แสดง 10 แถวแรก เลื่อนลงแล้วเพิ่มทีละ 10 (cursor = แถวสุดท้ายที่แสดง)
 * ไม่มี checkbox; ตา = ซ่อน/แสดงข้อมูลในตารางธุรกรรม; ถังขยะ = ยืนยันก่อนลบ
 */
export function WalletTable({ feeds, activeId, onOpen, onSwitch, onRemove, hasSource }: { feeds: Record<string, WalletFeed>; activeId: string | null; onOpen: (id: string) => void; onSwitch: (id: string | null) => void; onRemove: (id: string) => void; hasSource: (w: Wallet) => boolean }) {
  const { t } = useI18n();
  const { wallets, removeWallet, toggleWallet, clearWallets } = useStore();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'label', dir: 'asc' });

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

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const val = (w: Wallet) => (sort.key === 'label' ? w.label.toLowerCase() : sort.key === 'address' ? w.address.toLowerCase() : (feeds[w.id]?.rows.length ?? -1));
    return [...wallets].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x > y ? 1 : x < y ? -1 : 0) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, feeds, sort]);
  const inf = useInfinite({ total: sorted.length, page: PAGE, hasMore: false, loading: false, resetKey: `${sort.key}${sort.dir}` });
  const visible = sorted.slice(0, inf.visible);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'tx' ? 'desc' : 'asc' }));
  }
  const Th = ({ k, label, num }: { k: SortKey; label: string; num?: boolean }) => (
    <th scope="col" className={num ? 'num' : undefined} aria-sort={sort.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="th-btn" onClick={() => toggleSort(k)}>
        {label}
        <Icon name={sort.key === k ? (sort.dir === 'asc' ? 'chevronUp' : 'chevronDown') : 'chevronsUpDown'} className="th-ico" />
      </button>
    </th>
  );

  return (
    <section className="panel wallets-panel" aria-labelledby="wallets-h">
      <div className="panel-head">
        <h2 id="wallets-h" className="panel-title">
          {t('wallets.title')}
        </h2>
        <span className="hint">{t('wallets.count', { n: wallets.length })}</span>
        <span className="top-spacer" />
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
            <button type="button" className="btn btn-icon" onClick={clear} aria-label={t('wallets.clear')} title={t('wallets.clear')}>
              <Icon name="trash" />
            </button>
          )}
        </div>
      </div>

      <div>
        {wallets.length === 0 ? (
          <p className="hint">{t('wallets.empty')}</p>
        ) : (
          <div className="table-wrap wtab-wrap">
            <table className="tx wtab">
              <thead>
                <tr>
                  <Th k="label" label={t('wallets.col.label')} />
                  <Th k="address" label={t('wallets.col.address')} />
                  <Th k="tx" label={t('wallets.col.tx')} num />
                  <th scope="col" className="num">
                    <span className="sr-only">{t('wallets.title')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((w) => {
                  const f = feeds[w.id];
                  const hidden = !w.enabled;
                  const active = activeId === w.id;
                  const state = stateOf(w);
                  const stateText = state === 'ok' ? t('wallets.state.ok', { n: f?.rows.length ?? 0 }) : t(`wallets.state.${state}`);
                  return (
                    <tr
                      key={w.id}
                      className="tx-row wt-row"
                      aria-selected={active}
                      data-hidden={hidden}
                      tabIndex={0}
                      onClick={() => onOpen(w.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpen(w.id);
                        }
                      }}
                    >
                      <td>
                        <span className="wt-cell">
                          <Identicon value={w.address} size={36} />
                          <span className="wt-label">{w.label}</span>
                        </span>
                      </td>
                      <td>
                        <span className="wt-addr mono" title={w.address}>
                          {shortAddr(w.address)}
                        </span>
                      </td>
                      <td className="num">
                        <span className="wallet-state" data-state={state} aria-live="polite">
                          {state === 'loading' ? <span className="spinner" aria-hidden="true" /> : <span className="wallet-dot" aria-hidden="true" />}
                          {stateText}
                        </span>
                      </td>
                      <td className="num">
                        <span className="wallet-actions" onClick={(e) => e.stopPropagation()}>
                          <button type="button" className="btn btn-icon" onClick={() => toggleWallet(w.id, hidden)} aria-label={t(hidden ? 'wallets.show' : 'wallets.hide', { label: w.label })} title={t(hidden ? 'wallets.show' : 'wallets.hide', { label: w.label })}>
                            <Icon name={hidden ? 'eyeOff' : 'eye'} />
                          </button>
                          <button type="button" className="btn btn-icon" onClick={() => remove(w)} aria-label={t('wallets.remove', { label: w.label })} title={t('wallets.remove', { label: w.label })}>
                            <Icon name="trash" />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <MoreSentinel sentinel={inf.sentinel} loading={false} exhausted={inf.exhausted} page={PAGE} count={sorted.length} />
          </div>
        )}
      </div>

      <AddWalletDialog open={adding} onClose={() => setAdding(false)} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
      <ConfirmDialog state={confirmDialog} onConfirm={confirmAction} onCancel={() => setConfirmDialog(null)} />
    </section>
  );
}
