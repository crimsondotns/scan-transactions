/** สรุปรายโทเคนของกระเป๋า — คลิกแถวเพื่อไปหน้าโทเคนนั้น */
import { useMemo } from 'react';
import type { TxRow } from '../feed';
import { tokenSummary, signClassOf } from '../flow';
import { formatUsdExact } from '../format';
import { useI18n } from '../i18n';
import { Logo } from './Logo';

export function TokenTable({ rows, onToken }: { rows: TxRow[]; onToken: (symbol: string) => void }) {
  const { t } = useI18n();
  const tokens = useMemo(() => tokenSummary(rows), [rows]);
  if (!tokens.length) return <p className="hint">{t('tx.emptyLoaded')}</p>;
  return (
    <div className="table-wrap">
      <table className="tx">
        <thead>
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
                    <span className="act-title">{k.symbol}</span>
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
