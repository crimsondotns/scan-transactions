import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore, type Wallet } from '../store';
import type { WalletFeed } from '../useFeed';
import { formatRelative, formatUsdExact, shortAddr } from '../format';
import { Icon } from './Icon';
import { AddWalletDialog } from './AddWalletDialog';
import { Identicon } from './Identicon';
import { ConfirmDialog, type ConfirmState } from './ConfirmDialog';
import { useInfinite } from '../useInfinite';
import { MoreSentinel } from './MoreSentinel';
import { SkeletonBar } from './Skeleton';
import { useStickyHead } from '../useStickyHead';
import { Logo } from './Logo';
import { chainOf, type ChainInfo, type ChainMap } from '../chains';
import { lastTime, netUsd, signClassOf } from '../flow';

type SortKey = 'label' | 'tag' | 'tx' | 'net' | 'last';
const PAGE = 20;

/** ชุด chain เริ่มต้นต่อตระกูล — โชว์ตอนยังไม่โหลดว่า wallet นี้อยู่บนเครือข่ายอะไรได้บ้าง */
const DEFAULT_CHAINS: Record<string, string[]> = {
  erc20: ['eth', 'arb', 'base', 'op', 'bsc'],
  sol: ['sol'],
};

/**
 * โลโก้เชนในคอลัมน์ Support — กระเป๋าที่โหลดแล้วแสดงโลโก้เชนจริงจากธุรกรรม
 * กระเป๋าที่ยังไม่โหลดแสดงชุด chain ของตระกูลนั้น (EVM: eth/arb/base/op/bsc, Solana: sol)
 * ถ้า chain list ยังไม่มา ใช้จุดสีตามตระกูลแทน
 */
function WalletMarks({ family, chainIds, chains }: { family: string; chainIds: string[]; chains: ChainMap }) {
  // โหลดแล้ว → โลโก้เชนจริงจากธุรกรรม
  if (chainIds.length) {
    return (
      <span className="chain-marks">
        {chainIds.slice(0, 5).map((c) => {
          const info = chainOf(chains, c);
          return <Logo key={c} src={info?.logo ?? null} name={info?.name ?? c} size={18} />;
        })}
        {chainIds.length > 5 && <span className="idle">+{chainIds.length - 5}</span>}
      </span>
    );
  }

  // ยังไม่โหลด → แสดงชุด chain เริ่มต้นของตระกูลนั้น
  const defaults = DEFAULT_CHAINS[family] ?? [];
  const infos = defaults.map((id) => chainOf(chains, id)).filter((c): c is ChainInfo => !!c?.logo);
  if (infos.length) {
    return (
      <span className="chain-marks">
        {infos.slice(0, 5).map((c) => (
          <Logo key={c.id} src={c.logo} name={c.name} size={18} />
        ))}
      </span>
    );
  }

  // chain list ยังไม่มา → วงกลมสีตามตระกูล
  const isSol = family === 'sol';
  const label = isSol ? 'Solana' : 'ERC-20';
  return (
    <span
      title={label}
      aria-label={label}
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: isSol ? 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)' : '#627EEA',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15)',
      }}
    />
  );
}

/**
 * ตารางกระเป๋าของกลุ่มที่เลือก — กระเป๋า · แท็ก · ธุรกรรม · สุทธิ · ล่าสุด
 * คลิกแถว = ไปหน้ากระเป๋า; หัวคอลัมน์เรียงได้; แสดงทีละ 20 แถว เลื่อนลงแล้วเพิ่มเอง
 * ไม่มี checkbox; ตา = ซ่อน/แสดงข้อมูลในตารางธุรกรรม; ถังขยะ = ยืนยันก่อนลบ
 */
export function WalletTable({ wallets, feeds, chains, activeId, onOpen, onSwitch, onRemove, hasSource }: { wallets: Wallet[]; feeds: Record<string, WalletFeed>; chains: ChainMap; activeId: string | null; onOpen: (id: string) => void; onSwitch: (id: string | null) => void; onRemove: (id: string) => void; hasSource: (w: Wallet) => boolean }) {
  const { t } = useI18n();
  const { wallets: all, removeWallet, toggleWallet, clearWallets } = useStore();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'label', dir: 'asc' });
  const head = useStickyHead();

  function remove(w: Wallet) {
    setConfirmDialog({ type: 'deleteWallet', title: t('confirm.deleteTitle'), message: t('confirm.deleteMsg', { label: w.label }), walletId: w.id });
  }
  function clear() {
    if (!all.length) return;
    setConfirmDialog({ type: 'clearAll', title: t('confirm.clearTitle'), message: t('wallets.clearConfirm', { n: all.length }), walletId: null });
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
      all.forEach((w) => onRemove(w.id));
      onSwitch(null);
    }
    return c.type;
  }

  const stateOf = (w: Wallet) => {
    const f = feeds[w.id];
    if (!f && !hasSource(w)) return 'nosource';
    return f?.loading ? 'loading' : f && Object.keys(f.errors).length ? 'error' : f?.loaded ? 'ok' : 'idle';
  };
  const rowsOf = (w: Wallet) => feeds[w.id]?.rows ?? [];
  /* เชนที่กระเป๋าใบนี้มีธุรกรรมจริง (จากที่โหลดมาแล้ว) — โลโก้อย่างเดียว ไม่ใส่ชื่อ */
  const chainsOf = (w: Wallet) => [...new Set(rowsOf(w).map((r) => r.chain))];
  const netOf = (w: Wallet) => rowsOf(w).reduce((s, r) => s + netUsd(r), 0);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return wallets;
    return wallets.filter((w) => w.label.toLowerCase().includes(needle) || w.address.toLowerCase().includes(needle) || (w.tags ?? []).some((x) => x.toLowerCase().includes(needle)));
  }, [wallets, q]);

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const val = (w: Wallet): string | number => {
      switch (sort.key) {
        case 'tag':
          return (w.tags ?? []).join(' ').toLowerCase();
        case 'tx':
          return feeds[w.id]?.rows.length ?? -1;
        case 'net':
          return feeds[w.id] ? netOf(w) : Number.NEGATIVE_INFINITY;
        case 'last':
          return lastTime(rowsOf(w)) ?? Number.NEGATIVE_INFINITY;
        default:
          return w.label.toLowerCase();
      }
    };
    return [...filtered].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x > y ? 1 : x < y ? -1 : 0) * dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, feeds, sort]);
  const inf = useInfinite({ total: sorted.length, page: PAGE, hasMore: false, loading: false, resetKey: `${sort.key}${sort.dir}${q}` });
  const visible = sorted.slice(0, inf.visible);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'label' || key === 'tag' ? 'asc' : 'desc' }));
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
    <>
      <div className="toolbar" role="search">
        <label className="sr-only" htmlFor="wallet-q">
          {t('wallets.title')}
        </label>
        <input id="wallet-q" name="wq" type="search" className="input search mono" placeholder={t('tx.search')} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} />
        <div className="row-actions">
          <button type="button" className="btn" onClick={() => setAdding(true)}>
            <Icon name="plus" />
            {t('wallets.add')}
          </button>
          {all.length > 0 && (
            <button type="button" className="btn btn-icon" onClick={clear} aria-label={t('wallets.clear')} title={t('wallets.clear')}>
              <Icon name="trash" />
            </button>
          )}
        </div>
        <span className="count" aria-live="polite">
          {t('wallets.count', { n: sorted.length })}
        </span>
      </div>

      {sorted.length === 0 ? (
        <p className="hint">{t('wallets.empty')}</p>
      ) : (
        <div className="table-wrap wtab-wrap">
          <table className="tx wtab">
            <thead ref={head.ref} data-stuck={head.stuck}>
              <tr>
                <Th k="label" label={t('wallets.col.label')} />
                <Th k="tag" label={t('wallets.col.tag')} />
                <th scope="col">{t('wallets.col.support')}</th>
                <Th k="tx" label={t('wallets.col.tx')} num />
                <Th k="net" label={t('wallets.col.net')} num />
                <Th k="last" label={t('wallets.col.last')} num />
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
                const rows = rowsOf(w);
                const net = netOf(w);
                const last = lastTime(rows);
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
                        <span className="act-text">
                          <span className="act-title wt-label">{w.label}</span>
                          <span className="act-sub mono">{shortAddr(w.address)}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      {w.tags?.length ? (
                        <span className="tag-list">
                          {w.tags.map((tag) => (
                            <span key={tag} className="tag">
                              {tag}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="idle">{t('wallets.noTag')}</span>
                      )}
                    </td>
                    <td>
                      {state === 'loading' ? <SkeletonBar width={64} /> : <WalletMarks family={w.family} chainIds={chainsOf(w)} chains={chains} />}
                    </td>
                    <td className="num">
                      {state === 'loading' ? (
                        <SkeletonBar width={72} />
                      ) : state === 'ok' || state === 'error' ? (
                        <span className="wallet-state" data-state={state} aria-live="polite">
                          <span className="wallet-dot" aria-hidden="true" />
                          {state === 'ok' ? rows.length : t('wallets.state.error')}
                        </span>
                      ) : (
                        <span className="idle">{t(`wallets.state.${state === 'nosource' ? 'nosource' : 'idle'}`)}</span>
                      )}
                    </td>
                    <td className="num">{state === 'loading' ? <SkeletonBar width={84} /> : f?.loaded ? <span className={signClassOf(net)}>{formatUsdExact(net)}</span> : <span className="idle">—</span>}</td>
                    <td className="num cell-time">{state === 'loading' ? <SkeletonBar width={64} /> : last === null ? <span className="idle">—</span> : formatRelative(last, t)}</td>
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

      <AddWalletDialog open={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog state={confirmDialog} onConfirm={confirmAction} onCancel={() => setConfirmDialog(null)} />
    </>
  );
}