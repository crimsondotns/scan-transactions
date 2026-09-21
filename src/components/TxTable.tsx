import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore, type Wallet } from '../store';
import type { TxRow, TxType } from '../feed';
import { formatAmount, formatFeeNative, formatFeeUsd, formatRelative } from '../format';
import { Icon } from './Icon';
import { Dropdown } from './Dropdown';
import { Logo } from './Logo';
import type { ChainMap } from '../chains';

const TYPES: TxType[] = ['swap', 'send', 'receive', 'approve', 'contract'];
type SortKey = 'type' | 'date' | 'amount' | 'fee';

/**
 * มูลค่าของแถว (USD) — "เงินที่เคลื่อน" ไม่ใช่ผลต่างสุทธิ
 * ส่งอย่างเดียว → −ยอดส่ง, รับอย่างเดียว → +ยอดรับ,
 * ทั้งส่งและรับ (สลับ) → ขนาดของธุรกรรม (ฝั่งที่ใหญ่กว่า) ไม่มีเครื่องหมาย
 * ก้อนที่จำนวน 0 หรือไม่มีราคา ไม่นับ
 */
export function rowValue(r: TxRow): { value: number; sign: '+' | '−' | '' } | null {
  let inUsd = 0;
  let outUsd = 0;
  let hasIn = false;
  let hasOut = false;
  for (const m of r.moves) {
    if (m.usd === null || m.amount === 0) continue;
    if (m.dir === 'in') {
      inUsd += m.usd;
      hasIn = true;
    } else {
      outUsd += m.usd;
      hasOut = true;
    }
  }
  if (hasIn && hasOut) return { value: Math.max(inUsd, outUsd), sign: '' };
  if (hasOut) return { value: outUsd, sign: '−' };
  if (hasIn) return { value: inUsd, sign: '+' };
  return null;
}

/** จำนวนโทเคนหลักของแถว (ก้อนแรกที่มีจำนวน) */
function mainMove(r: TxRow) {
  const real = r.moves.filter((m) => m.amount !== 0);
  return real.find((m) => m.usd !== null) ?? real[0] ?? r.moves[0] ?? null;
}

export function TxTable({ rows, wallets, chains: chainInfo, selected, onSelect }: { rows: TxRow[]; wallets: Wallet[]; chains: ChainMap; selected: string | null; onSelect: (r: TxRow) => void }) {
  const { t } = useI18n();
  const { settings, setHideScam } = useStore();
  const hideScam = settings.hideScam;
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
      if (hideScam && r.flagged) return false;
      if (!needle) return true;
      return r.hash.toLowerCase().includes(needle) || (r.counterparty ?? '').toLowerCase().includes(needle) || (r.counterpartyName ?? '').toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle) || r.moves.some((m) => m.symbol.toLowerCase().includes(needle));
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    const key = (r: TxRow): string | number => {
      switch (sort.key) {
        case 'type':
          return r.failed ? 'zz' : r.type;
        case 'amount': {
          const v = rowValue(r);
          return v ? (v.sign === '−' ? -v.value : v.value) : Number.NEGATIVE_INFINITY;
        }
        case 'fee':
          return r.gasUsd ?? Number.NEGATIVE_INFINITY;
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
  }, [rows, q, wallet, chain, type, sort, labels, hideScam]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'type' ? 'asc' : 'desc' }));
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
        <button type="button" className="btn toggle" aria-pressed={hideScam} onClick={() => setHideScam(!hideScam)}>
          <Icon name="eyeOff" />
          {t('tx.hideScam')}
        </button>
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
                <Head k="type" label={t('tx.col.type')} />
                <Head k="date" label={t('tx.col.submitted')} num />
                <Head k="amount" label={t('tx.col.amount')} num />
                <Head k="fee" label={t('tx.col.fee')} num />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const real = r.moves.filter((m) => m.amount !== 0);
                const ins = real.filter((m) => m.dir === 'in');
                const outs = real.filter((m) => m.dir === 'out');
                const isSwap = ins.length > 0 && outs.length > 0;
                const primary = mainMove(r);
                const chainLogo = chainInfo.get(r.chain)?.logo ?? r.chainLogo ?? null;
                const title = r.failed ? t('tx.failed') : t(`tx.type.${r.type}`);
                const subtitle = isSwap ? `${outs[0]!.symbol} → ${ins[0]!.symbol}` : primary ? (primary.name ?? primary.symbol) : r.name || (r.counterpartyName ?? '');
                const native = chainInfo.get(r.chain)?.symbol ?? r.chain.toUpperCase();
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
                      <span className="act">
                        <span className="act-icon">
                          {isSwap ? (
                            <span className="pair">
                              <Logo src={outs[0]!.logo} name={outs[0]!.symbol} size={28} />
                              <Logo src={ins[0]!.logo} name={ins[0]!.symbol} size={28} />
                            </span>
                          ) : (
                            <Logo src={primary?.logo ?? null} name={primary?.symbol ?? r.chain} size={40} />
                          )}
                          <span className="logo-badge">
                            <Logo src={chainLogo} name={r.chain} size={16} />
                          </span>
                        </span>
                        <span className="act-text">
                          <span className="act-title">
                            {title}
                            {r.flagged && (
                              <span className="flag" title={t('tx.scam')}>
                                <Icon name="alert" width={12} height={12} style={{ verticalAlign: '-1px' }} />
                              </span>
                            )}
                          </span>
                          <span className="act-sub" title={labels.get(r.walletId)}>
                            {subtitle}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="num cell-time">{formatRelative(r.time, t)}</td>
                    <td className="num">
                      <span className="amts">
                        {ins.map((m, i) => (
                          <span key={`i${i}`} className="amt-in">
                            +{formatAmount(m.amount)} {m.symbol}
                          </span>
                        ))}
                        {outs.map((m, i) => (
                          <span key={`o${i}`} className="amt-out">
                            −{formatAmount(m.amount)} {m.symbol}
                          </span>
                        ))}
                        {real.length === 0 && <span className="amt-out">—</span>}
                      </span>
                    </td>
                    <td className="num">
                      <span className="fee">
                        <span>{formatFeeUsd(r.gasUsd)}</span>
                        {r.gasNative !== null && <span className="amt-out">{formatFeeNative(r.gasNative, native)}</span>}
                      </span>
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
