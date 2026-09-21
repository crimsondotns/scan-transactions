/** แผงขวา — รายละเอียดธุรกรรมที่เลือก ครบทุกฟิลด์ที่แหล่งข้อมูลส่งมา */
import { useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import type { TxRow } from '../feed';
import type { Wallet } from '../store';
import { formatAmountFull, formatDate, formatPrice, formatUsd } from '../format';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { rowValue } from './TxTable';
import { Logo } from './Logo';
import type { ChainMap } from '../chains';

function flatten(v: unknown, prefix = '', out: Array<[string, string]> = []): Array<[string, string]> {
  if (v === null || v === undefined) out.push([prefix, '—']);
  else if (Array.isArray(v)) {
    if (!v.length) out.push([prefix, '[]']);
    v.forEach((x, i) => flatten(x, `${prefix}[${i}]`, out));
  } else if (typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) flatten(x, prefix ? `${prefix}.${k}` : k, out);
  } else out.push([prefix, String(v)]);
  return out;
}

export function DetailPanel({ row, wallets, chains, onClose }: { row: TxRow | null; wallets: Wallet[]; chains: ChainMap; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!row) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [row, onClose]);

  if (!row) return null;
  const wallet = wallets.find((w) => w.id === row.walletId);
  const chain = chains.get(row.chain);
  const chainLogo = chain?.logo ?? row.chainLogo ?? null;
  const host = chain?.explorer?.replace(/\/$/, '') ?? null;
  const explorer = host ? `${host}/tx/${row.hash}` : null;
  const addrUrl = (a: string) => (host ? `${host}/address/${a}` : null);
  const tokenUrl = (a: string) => (host ? `${host}/token/${a}` : null);
  const d = formatDate(row.time);
  const v = rowValue(row);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('tx.copied'));
    } catch {
      /* clipboard ถูกบล็อก */
    }
  }

  const Row = ({ label, children, mono, copyText, link }: { label: string; children: React.ReactNode; mono?: boolean; copyText?: string; link?: string | null }) => (
    <div className="dt-row">
      <dt>{label}</dt>
      <dd className={mono ? 'mono' : undefined}>
        {children}
        {(copyText || link) && (
          <span className="dt-actions">
            {copyText && (
              <button type="button" className="btn btn-icon" onClick={() => void copy(copyText)} aria-label={t('tx.copy', { what: label })} title={t('tx.copy', { what: label })}>
                <Icon name="copy" />
              </button>
            )}
            {link && (
              <a className="btn btn-icon" href={link} target="_blank" rel="noopener noreferrer" aria-label={t('detail.explorer', { what: label })} title={t('detail.explorer', { what: label })}>
                <Icon name="external" />
              </a>
            )}
          </span>
        )}
      </dd>
    </div>
  );

  return (
    <aside className="drawer" role="dialog" aria-modal="false" aria-labelledby="dt-h">
      <div className="drawer-head">
        <h2 id="dt-h">{t('detail.title')}</h2>
        <button ref={closeBtn} type="button" className="btn btn-icon" onClick={onClose} aria-label={t('dialog.close')}>
          <Icon name="x" />
        </button>
      </div>

      <div className="drawer-body">
        <div className="dt-hero">
          <span className="with-logo">
            <Logo src={chainLogo} name={row.chain} size={24} />
            <span className="chip" data-failed={row.failed}>
            {row.failed ? t('tx.failed') : t(`tx.type.${row.type}`)}
            </span>
          </span>
          <span className="dt-value" data-sign={v === null ? undefined : v.sign === '−' ? 'neg' : 'pos'}>
            {v === null ? '—' : `${v.sign}${formatUsd(v.value)}`}
          </span>
          <span className="hint">
            {d.date} · {d.time}
          </span>
          {row.flagged && (
            <span className="flag">
              <Icon name="alert" width={12} height={12} style={{ verticalAlign: '-1px' }} /> {t('tx.scam')}
            </span>
          )}
        </div>

        <dl className="dt">
          <Row label={t('tx.col.hash')} mono copyText={row.hash} link={explorer}>
            {row.hash}
          </Row>
          <Row label={t('tx.col.wallet')} copyText={wallet?.address} link={wallet ? addrUrl(wallet.address) : null}>
            {wallet?.label ?? '—'}
            {wallet && (
              <span className="hint mono" style={{ display: 'block' }}>
                {wallet.address}
              </span>
            )}
          </Row>
          <Row label={t('tx.col.chain')}>
            <span className="with-logo">
              <Logo src={chainLogo} name={row.chain} size={20} />
              <span>{chain?.name ?? row.chain}</span>
            </span>
          </Row>
          {row.name && <Row label={t('detail.method')}>{row.name}</Row>}
          <Row label={t('detail.status')}>{row.failed ? t('tx.failed') : t('detail.ok')}</Row>
          {(row.counterparty || row.counterpartyName) && (
            <Row label={t('tx.col.counterparty')} mono={!row.counterpartyName} copyText={row.counterparty ?? undefined} link={row.counterparty ? addrUrl(row.counterparty) : null}>
              {row.counterpartyName && <span className="cp-name">{row.counterpartyName}</span>}
              {row.counterparty && <span className="mono">{row.counterparty}</span>}
            </Row>
          )}
          <Row label={t('tx.col.gas')} mono>
            {formatUsd(row.gasUsd)}
          </Row>
        </dl>

        <h3 className="dt-sub">{t('tx.col.moves')}</h3>
        {row.moves.length === 0 ? (
          <p className="hint">—</p>
        ) : (
          <ul className="dt-moves">
            {row.moves.map((m, i) => (
              <li key={i} className="move" data-dir={m.dir}>
                <span className="amt with-logo">
                  <Logo src={m.logo} name={m.symbol} size={20} />
                  <span>
                    {m.dir === 'in' ? '+' : '−'}
                    {formatAmountFull(m.amount)} {m.symbol}
                  </span>
                  {m.tokenId && (
                    <span className="dt-actions">
                      <button type="button" className="btn btn-icon" onClick={() => void copy(m.tokenId ?? '')} aria-label={t('tx.copy', { what: t('detail.tokenAddress') })} title={`${t('tx.copy', { what: t('detail.tokenAddress') })}: ${m.tokenId}`}>
                        <Icon name="copy" />
                      </button>
                      {tokenUrl(m.tokenId) && (
                        <a className="btn btn-icon" href={tokenUrl(m.tokenId) ?? undefined} target="_blank" rel="noopener noreferrer" aria-label={t('detail.explorer', { what: t('detail.tokenAddress') })} title={t('detail.explorer', { what: t('detail.tokenAddress') })}>
                          <Icon name="external" />
                        </a>
                      )}
                    </span>
                  )}
                  {m.flagged && (
                    <span className="flag">
                      <Icon name="alert" width={12} height={12} style={{ verticalAlign: '-1px' }} /> {t('tx.scam')}
                    </span>
                  )}
                </span>
                <span className="move-right">
                  <span className="usd">{m.usd !== null ? formatUsd(m.usd) : '—'}</span>
                  <small className="hint">
                    {t('detail.price')} {formatPrice(m.price)}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        )}

        <details className="dt-raw">
          <summary>{t('detail.allFields')}</summary>
          <dl className="dt">
            {flatten(row.raw).map(([k, val]) => (
              <div className="dt-row" key={k}>
                <dt className="mono">{k}</dt>
                <dd className="mono">{val}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </aside>
  );
}
