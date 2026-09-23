/** สรุปรายโทเคนของกระเป๋า — คลิกแถวเพื่อไปหน้าโทเคนนั้น */
import { useMemo } from 'react';
import type { TxRow } from '../feed';
import { tokenSummary, signClassOf } from '../flow';
import { formatUsdExact } from '../format';
import { useI18n } from '../i18n';
import { useCopy } from '../copy';
import { Logo } from './Logo';
import { useStickyHead } from '../useStickyHead';
import { SkeletonRows } from './Skeleton';

export function TokenTable({ rows, onToken, loading = false }: { rows: TxRow[]; onToken: (symbol: string) => void; loading?: boolean }) {
  const { t } = useI18n();
  const copy = useCopy();
  const tokens = useMemo(() => tokenSummary(rows), [rows]);
  const head = useStickyHead();
  if (!tokens.length && !loading) return <p className="hint">{t('tx.emptyLoaded')}</p>;
  return (
    <div className="table-wrap">
      <table className="tx">
        <thead ref={head.ref} data-stuck={head.stuck}>
          <tr>
            <th scope="col">{t('tab.tokens')}</th>
            <th scope="col" className="num">
              {t('flow.in')}
            </th>
            <th scope="col" className="num">
              {t('flow.out')}
            </th>
            <th scope="col" className="num">
              {t('token.net')}
            </th>
            <th scope="col" className="num">
              {t('token.times')}
            </th>
          </tr>
        </thead>
        <tbody>
          {tokens.length === 0 && loading && <SkeletonRows rows={5} cols={[150, 90, 90, 90, 50]} />}
          {tokens.map((k) => (
            <tr
              key={k.symbol}
              className="tx-row"
              tabIndex={0}
              onClick={() => onToken(k.symbol)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToken(k.symbol);
                }
              }}
            >
              <td>
                <span className="who">
                  <Logo src={k.logo} name={k.symbol} size={28} />
                  <span className="act-text">
                    {k.tokenId ? (
                      <button
                        type="button"
                        className="act-title copy-name"
                        title={t('token.copyAddress', { sym: k.symbol })}
                        aria-label={t('token.copyAddress', { sym: k.symbol })}
                        onClick={(e) => {
                          e.stopPropagation();
                          copy(k.tokenId ?? '');
                        }}
                      >
                        {k.symbol}
                      </button>
                    ) : (
                      <span className="act-title" title={t('token.native')}>
                        {k.symbol}
                      </span>
                    )}
                    <span className="act-sub">{k.name ?? k.chain}</span>
                  </span>
                </span>
              </td>
              <td className="num">{formatUsdExact(k.inUsd)}</td>
              <td className="num">{formatUsdExact(k.outUsd)}</td>
              <td className="num">
                <span className={signClassOf(k.inUsd - k.outUsd)}>{formatUsdExact(k.inUsd - k.outUsd)}</span>
              </td>
              <td className="num">{k.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
