import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore, type Wallet } from '../store';
import type { WalletFeed } from '../useFeed';
import type { ChainMap } from '../chains';
import { shortAddr } from '../format';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { AddWalletDialog } from './AddWalletDialog';
import { ImportDialog } from './ImportDialog';
import { Identicon } from './Identicon';
import { ConfirmDialog, type ConfirmState } from './ConfirmDialog';

type SortKey = 'address' | 'networks' | 'tx';
const VISIBLE = 7;

/**
 * ตารางกระเป๋า (แบบ "top wallets") — คอลัมน์ Address · Networks · Transactions · การกระทำ
 * คลิกแถว = เลือกกระเป๋าแล้วโหลดตารางธุรกรรมด้านล่าง; หัวคอลัมน์เรียงได้; แสดง 7 แถวแรก แล้ว "ดูทั้งหมด"
 * ไม่มี checkbox; ตา = ซ่อน/แสดงข้อมูลในตารางธุรกรรม; ถังขยะ = ยืนยันก่อนลบ; chevron ที่หัว = ย่อ/ขยายทั้งตาราง
 */
export function WalletPanel({ feeds, chains, activeId, collapsed, onSwitch, onRemove, onToggle, hasSource }: { feeds: Record<string, WalletFeed>; chains: ChainMap; activeId: string | null; collapsed: boolean; onSwitch: (id: string | null) => void; onRemove: (id: string) => void; onToggle: () => void; hasSource: (w: Wallet) => boolean }) {
  const { t } = useI18n();
  const { wallets, removeWallet, toggleWallet, clearWallets } = useStore();
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'address', dir: 'asc' });
  const [showAll, setShowAll] = useState(false);

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
  /* เครือข่ายที่พบในธุรกรรมของกระเป๋า (ไม่ซ้ำ) พร้อมโลโก้จาก chain list หรือจากแถว */
  const networksOf = (w: Wallet) => {
    const seen = new Map<string, string | null>();
    for (const r of feeds[w.id]?.rows ?? []) if (!seen.has(r.chain)) seen.set(r.chain, chains.get(r.chain)?.logo ?? r.chainLogo ?? null);
    return [...seen.entries()].map(([id, logo]) => ({ id, name: chains.get(id)?.name ?? id, logo }));
  };

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const val = (w: Wallet) => (sort.key === 'address' ? w.label.toLowerCase() : sort.key === 'networks' ? networksOf(w).length : (feeds[w.id]?.rows.length ?? -1));
    return [...wallets].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x > y ? 1 : x < y ? -1 : 0) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets, feeds, chains, sort]);
  const visible = showAll ? sorted : sorted.slice(0, VISIBLE);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'address' ? 'asc' : 'desc' }));
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
    <section className="panel wallets-panel" aria-labelledby="wallets-h" data-collapsed={collapsed}>
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
        <button type="button" className="btn btn-icon side-chevron" aria-expanded={!collapsed} aria-controls="wallets-body" onClick={onToggle} aria-label={t(collapsed ? 'wallets.expand' : 'wallets.collapse')} title={t(collapsed ? 'wallets.expand' : 'wallets.collapse')}>
          <Icon name="chevronDown" className="chev" />
        </button>
      </div>

      <div id="wallets-body" hidden={collapsed}>
        {wallets.length === 0 ? (
          <p className="hint">{t('wallets.empty')}</p>
        ) : (
          <div className="table-wrap wtab-wrap">
            <table className="tx wtab">
              <thead>
                <tr>
                  <Th k="address" label={t('wallets.col.address')} />
                  <Th k="networks" label={t('wallets.col.networks')} num />
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
                  const nets = networksOf(w);
                  const stateText = state === 'ok' ? t('wallets.state.ok', { n: f?.rows.length ?? 0 }) : t(`wallets.state.${state}`);
                  return (
                    <tr
                      key={w.id}
                      className="tx-row wallet"
                      aria-selected={active}
                      data-hidden={hidden}
                      tabIndex={0}
                      onClick={() => onSwitch(w.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSwitch(w.id);
                        }
                      }}
                    >
                      <td>
                        <span className="wallet-cell">
                          <Identicon value={w.address} size={36} />
                          <span className="wallet-meta">
                            <span className="wallet-label">{w.label}</span>
                            <span className="wallet-addr">{shortAddr(w.address)}</span>
                          </span>
                        </span>
                      </td>
                      <td className="num">
                        {nets.length ? (
                          <span className="wallet-nets">
                            {nets.slice(0, 4).map((n) => (
                              <Logo key={n.id} src={n.logo} name={n.name} size={20} />
                            ))}
                            {nets.length > 4 && <span className="wallet-nets-more">+{nets.length - 4}</span>}
                          </span>
                        ) : (
                          <span className="hint">—</span>
                        )}
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
            {sorted.length > VISIBLE && (
              <div className="tfoot">
                <button type="button" className="btn" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                  {showAll ? t('wallets.showLess') : t('wallets.showMore', { n: sorted.length })}
                  <Icon name="chevronDown" className={showAll ? 'chev chev-up' : 'chev'} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AddWalletDialog open={adding} onClose={() => setAdding(false)} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
      <ConfirmDialog state={confirmDialog} onConfirm={confirmAction} onCancel={() => setConfirmDialog(null)} />
    </section>
  );
}
