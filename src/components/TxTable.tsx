import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import type { Wallet } from '../store';
import type { TxRow, TxType } from '../feed';
import { formatAmount, formatDate, formatUsd, shortAddr, shortHash } from '../format';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { Dropdown } from './Dropdown';

const TYPES: TxType[] = ['swap', 'send', 'receive', 'approve', 'contract'];

export function TxTable({ rows, wallets }: { rows: TxRow[]; wallets: Wallet[] }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [wallet, setWallet] = useState('');
  const [chain, setChain] = useState('');
  const [type, setType] = useState('');

  const labels = useMemo(() => new Map(wallets.map((w) => [w.id, w.label])), [wallets]);
  const chains = useMemo(() => [...new Set(rows.map((r) => r.chain))].sort(), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (wallet && r.walletId !== wallet) return false;
      if (chain && r.chain !== chain) return false;
      if (type && r.type !== type) return false;
      if (!needle) return true;
      return r.hash.includes(needle) || (r.counterparty ?? '').includes(needle) || (r.counterpartyName ?? '').toLowerCase().includes(needle) || r.name.toLowerCase().includes(needle) || r.moves.some((m) => m.symbol.toLowerCase().includes(needle));
    });
  }, [rows, q, wallet, chain, type]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('tx.copied'));
    } catch {
      /* clipboard ถูกบล็อก — ผู้ใช้ยังเลือกข้อความจาก title ได้ */
    }
  }

  return (
    <>
      <div className="toolbar" role="search">
        <label className="sr-only" htmlFor="tx-q">
          {t('tx.search')}
        </label>
        <input id="tx-q" name="q" type="search" className="input search mono" placeholder={t('tx.search')} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" spellCheck={false} />
        <Dropdown
          value={wallet}
          onChange={setWallet}
          label={t('tx.col.wallet')}
          options={[{ value: '', label: t('tx.allWallets') }, ...wallets.map((w) => ({ value: w.id, label: w.label }))]}
        />
        <Dropdown value={chain} onChange={setChain} label={t('tx.col.chain')} options={[{ value: '', label: t('tx.allChains') }, ...chains.map((c) => ({ value: c, label: c }))]} />
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
                <th scope="col">{t('tx.col.time')}</th>
                <th scope="col">{t('tx.col.wallet')}</th>
                <th scope="col">{t('tx.col.chain')}</th>
                <th scope="col">{t('tx.col.type')}</th>
                <th scope="col">{t('tx.col.moves')}</th>
                <th scope="col">{t('tx.col.counterparty')}</th>
                <th scope="col" className="num">
                  {t('tx.col.gas')}
                </th>
                <th scope="col">{t('tx.col.hash')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const d = formatDate(r.time);
                return (
                  <tr key={r.key}>
                    <td className="cell-time">
                      {d.date}
                      <small>{d.time}</small>
                    </td>
                    <td className="cell-wallet" title={labels.get(r.walletId)}>
                      {labels.get(r.walletId) ?? '—'}
                    </td>
                    <td>
                      <span className="chip">{r.chain}</span>
                    </td>
                    <td>
                      <span className="chip" data-failed={r.failed}>
                        {r.failed ? t('tx.failed') : t(`tx.type.${r.type}`)}
                      </span>
                      {r.name && r.type === 'contract' && (
                        <small className="hint" style={{ display: 'block' }}>
                          {r.name}
                        </small>
                      )}
                    </td>
                    <td>
                      <div className="moves">
                        {r.moves.map((m, i) => (
                          <span key={i} className="move" data-dir={m.dir}>
                            <span className="amt">
                              {m.dir === 'in' ? '+' : '−'}
                              {formatAmount(m.amount)} {m.symbol}
                              {m.usd !== null && m.usd !== 0 && <span className="usd"> {formatUsd(m.usd)}</span>}
                            </span>
                            {m.flagged && (
                              <span className="flag" title={t('tx.scam')}>
                                <Icon name="alert" width={12} height={12} style={{ verticalAlign: '-1px' }} /> {t('tx.scam')}
                              </span>
                            )}
                          </span>
                        ))}
                        {r.moves.length === 0 && <span className="hint">—</span>}
                      </div>
                    </td>
                    <td>
                      {r.counterpartyName && <span className="cp-name">{r.counterpartyName}</span>}
                      {r.counterparty ? (
                        <span className="addr" title={r.counterparty}>
                          {shortAddr(r.counterparty)}
                          <button type="button" className="btn btn-icon" onClick={() => void copy(r.counterparty ?? '')} aria-label={t('tx.copy', { what: t('tx.col.counterparty') })}>
                            <Icon name="copy" />
                          </button>
                        </span>
                      ) : (
                        !r.counterpartyName && '—'
                      )}
                    </td>
                    <td className="num">{formatUsd(r.gasUsd)}</td>
                    <td>
                      <span className="addr" title={r.hash}>
                        {shortHash(r.hash)}
                        <button type="button" className="btn btn-icon" onClick={() => void copy(r.hash)} aria-label={t('tx.copy', { what: t('tx.col.hash') })}>
                          <Icon name="copy" />
                        </button>
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
