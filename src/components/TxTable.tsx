import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import type { Wallet } from '../store';
import type { TxRow, TxType } from '../feed';
import { formatAmount, formatDate, formatUsd, shortHash } from '../format';
import { Icon } from './Icon';
import { Dropdown } from './Dropdown';
import { Logo, TokenLogo } from './Logo';
import type { ChainMap } from '../chains';

const TYPES: TxType[] = ['swap', 'send', 'receive', 'approve', 'contract'];
type SortKey = 'tx' | 'type' | 'date' | 'value' | 'balance';

/** มูลค่าสุทธิ USD ของแถว (รับ − ส่ง) */
export function netUsd(r: TxRow): number | null {
  let inUsd = 0;
  let outUsd = 0;
  let any = false;
  for (const m of r.moves) {
    if (m.usd === null) continue;
    any = true;
    if (m.dir === 'in') inUsd += m.usd;
    else outUsd += m.usd;
  }
  if (!any) return null;
  const net = inUsd - outUsd;
  // สลับที่มูลค่าเท่ากันสองฝั่ง (net ≈ 0) แสดงขนาดของธุรกรรมแทนศูนย์
  return Math.abs(net) < 0.005 ? inUsd || outUsd : net;
}

/** จำนวนโทเคนหลักของแถว (ก้อนแรกที่มีจำนวน) */
function mainMove(r: TxRow) {
  return r.moves.find((m) => m.amount !== 0) ?? r.moves[0] ?? null;
}

export function TxTable({ rows, wallets, chains: chainInfo, selected, onSelect }: { rows: TxRow[]; wallets: Wallet[]; chains: ChainMap; selected: string | null; onSelect: (r: TxRow) => void }) {
  const { t } = useI18n();
  const [q, setQ] = useState('');
  const [wallet, setWallet] = useState('');
  const [chain, setChain] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'date', dir: 'desc' });

  const labels = useMemo(() => new Map(wallets.map((w) => [w.id, w.label])), [wallets]);
  const chains = useMemo(() => [...new Set(rows.map((r) => r.chain))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (wallet && r.walletId !== wallet) return false;
      if (chain && r.chain !== chain) return false;
      if (type && r.type !== type) return false;
      if (!needle) return true;
      return r.hash.toLowerCase().includes(needle) || (r.counterparty ?? '').toLowerCase().includes(needle) || (r.counterpartyName ?? '').toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle) || r.moves.some((m) => m.symbol.toLowerCase().includes(needle));
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    const key = (r: TxRow): string | number => {
      switch (sort.key) {
        case 'tx':
          return `${labels.get(r.walletId) ?? ''} ${r.hash}`;
        case 'type':
          return r.failed ? 'zz' : r.type;
        case 'value':
          return netUsd(r) ?? Number.NEGATIVE_INFINITY;
        case 'balance':
          return mainMove(r)?.amount ?? Number.NEGATIVE_INFINITY;
        default:
          return r.time;
      }
    };
    return list.sort((a, b) => {
      const ka = key(a);
      const kb = key(b);
      const c = typeof ka === 'number' && typeof kb === 'number' ? ka - kb : String(ka).localeCompare(String(kb));
      return c * dir || b.time - a.time;
    });
  }, [rows, q, wallet, chain, type, sort, labels]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'date' || key === 'value' ? 'desc' : 'asc' }));
  }

  const Head = ({ k, label, num }: { k: SortKey; label: string; num?: boolean }) => (
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
        <label className="sr-only" htmlFor="tx-q">
          {t('tx.search')}
        </label>
        <input id="tx-q" name="q" type="search" className="input search mono" placeholder={t('tx.search')} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} />
        <Dropdown value={wallet} onChange={setWallet} label={t('tx.col.wallet')} options={[{ value: '', label: t('tx.allWallets') }, ...wallets.map((w) => ({ value: w.id, label: w.label }))]} />
        <Dropdown value={chain} onChange={setChain} label={t('tx.col.chain')} options={[{ value: '', label: t('tx.allChains') }, ...chains.map((c) => ({ value: c, label: chainInfo.get(c)?.name ?? c }))]} />
        <Dropdown value={type} onChange={setType} label={t('tx.col.type')} options={[{ value: '', label: t('tx.allTypes') }, ...TYPES.map((k) => ({ value: k, label: t(`tx.type.${k}`) }))]} />
        <span className="count" aria-live="polite">
          {t('tx.count', { n: filtered.length })}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <p>{rows.length ? t('tx.emptyFiltered') : t('tx.emptyLoaded')}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="tx">
            <thead>
              <tr>
                <Head k="tx" label={t('tx.col.tx')} />
                <Head k="type" label={t('tx.col.type')} />
                <Head k="date" label={t('tx.col.date')} />
                <Head k="value" label={t('tx.col.value')} num />
                <Head k="balance" label={t('tx.col.balance')} num />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const d = formatDate(r.time);
                const v = netUsd(r);
                const m = mainMove(r);
                const isSel = r.key === selected;
                return (
                  <tr
                    key={r.key}
                    className="tx-row"
                    tabIndex={0}
                    aria-selected={isSel}
                    onClick={() => onSelect(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(r);
                      }
                    }}
                  >
                    <td>
                      <span className="tx-id">
                        {m ? <TokenLogo token={m.logo} tokenName={m.symbol} chain={chainInfo.get(r.chain)?.logo ?? r.chainLogo ?? null} chainName={r.chain} /> : <Logo src={chainInfo.get(r.chain)?.logo ?? r.chainLogo ?? null} name={r.chain} size={28} />}
                        <span className="tx-id-text">
                          <span className="tx-wallet">{labels.get(r.walletId) ?? '—'}</span>
                          <span className="tx-hash mono" title={chainInfo.get(r.chain)?.name ?? r.chain}>
                            {shortHash(r.hash)}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className="chip" data-failed={r.failed}>
                        {r.failed ? t('tx.failed') : t(`tx.type.${r.type}`)}
                      </span>
                      {r.flagged && (
                        <span className="flag" title={t('tx.scam')}>
                          <Icon name="alert" width={12} height={12} style={{ verticalAlign: '-1px' }} />
                        </span>
                      )}
                    </td>
                    <td className="cell-time">
                      {d.date}
                      <small>{d.time}</small>
                    </td>
                    <td className="num" data-sign={v === null ? undefined : v < 0 ? 'neg' : 'pos'}>
                      {v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatUsd(Math.abs(v))}`}
                    </td>
                    <td className="num">
                      {m ? (
                        <>
                          {m.dir === 'in' ? '+' : '−'}
                          {formatAmount(m.amount)} {m.symbol}
                          {r.moves.length > 1 && <small className="more"> +{r.moves.length - 1}</small>}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
