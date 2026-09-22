import { useI18n } from '../i18n';
import type { TxRow } from '../feed';
import type { Wallet } from '../store';
import type { ChainMap } from '../chains';
import { formatAmount, formatFeeNative, formatFeeUsd, formatRelative, shortAddr } from '../format';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { Identicon } from './Identicon';
import { SkeletonRows } from './Skeleton';

const LIMIT = 10;

/**
 * หน้า 1 ตารางที่ 2: ธุรกรรมล่าสุด (พรีวิว) จากทุกกระเป๋าที่โหลดแล้ว — Type · From · To · Submitted · Amount · Network fee
 * ขนาดคงที่ 10 แถว ไม่มีเลื่อนโหลดเพิ่ม (กัน rate limit) — ดูทั้งหมดของกระเป๋าได้ที่หน้า 2; คลิกแถว = เปิดแผงรายละเอียดขวา (แผงเดิม)
 */
export function RecentTable({ rows, wallets, chains, selected, onSelect, loading, onLoadAll }: { rows: TxRow[]; wallets: Wallet[]; chains: ChainMap; selected: string | null; onSelect: (r: TxRow) => void; loading: boolean; onLoadAll: () => void }) {
  const { t } = useI18n();
  const byAddr = new Map(wallets.map((w) => [w.address.toLowerCase(), w]));
  const recent = rows.slice(0, LIMIT);

  const Party = ({ addr }: { addr: string | null }) => {
    if (!addr) return <span className="hint">—</span>;
    const w = byAddr.get(addr.toLowerCase());
    return w ? (
      <span className="with-logo">
        <Identicon value={w.address} size={20} />
        <span className="wt-label">{w.label}</span>
      </span>
    ) : (
      <span className="mono" title={addr}>
        {shortAddr(addr)}
      </span>
    );
  };

  return (
    <section className="panel wallets-panel" aria-labelledby="recent-h">
      <div className="panel-head">
        <h2 id="recent-h" className="panel-title">
          {t('recent.title')}
        </h2>
        <span className="hint">{rows.length ? t('wallets.state.ok', { n: rows.length }) : ''}</span>
        <span className="top-spacer" />
        <button type="button" className="btn" disabled={loading || !wallets.length} onClick={onLoadAll}>
          <Icon name="refresh" />
          {loading ? t('wallets.loading') : t('tx.loadAll')}
        </button>
      </div>
      {recent.length === 0 && !loading ? (
        <p className="hint">{t('recent.empty')}</p>
      ) : (
        <div className="table-wrap wtab-wrap">
          <table className="tx recent">
            <thead>
              <tr>
                <th scope="col">{t('tx.col.type')}</th>
                <th scope="col">{t('tx.col.from')}</th>
                <th scope="col">{t('tx.col.to')}</th>
                <th scope="col" className="num">
                  {t('tx.col.submitted')}
                </th>
                <th scope="col" className="num">
                  {t('tx.col.amount')}
                </th>
                <th scope="col" className="num">
                  {t('tx.col.fee')}
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && loading && <SkeletonRows rows={5} cols={[120, 90, 90, 100, 110, 70]} />}
              {recent.map((r) => {
                const real = r.moves.filter((m) => m.amount !== 0);
                const ins = real.filter((m) => m.dir === 'in');
                const outs = real.filter((m) => m.dir === 'out');
                const isSwap = ins.length > 0 && outs.length > 0;
                const primary = real[0] ?? r.moves[0] ?? null;
                const chainLogo = chains.get(r.chain)?.logo ?? r.chainLogo ?? null;
                const native = r.nativeSymbol ?? chains.get(r.chain)?.symbol ?? r.chain.toUpperCase();
                const title = r.failed ? t('tx.failed') : t(`tx.type.${r.type}`);
                const subtitle = isSwap ? `${outs[0]!.symbol} → ${ins[0]!.symbol}` : primary ? (primary.name ?? primary.symbol) : r.name || '';
                return (
                  <tr
                    key={r.key}
                    className="tx-row"
                    tabIndex={0}
                    aria-selected={r.key === selected}
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
                          <span className="act-sub">{subtitle}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <Party addr={r.from} />
                    </td>
                    <td>
                      <Party addr={r.to} />
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
                        {!real.length && <span className="amt-out">—</span>}
                      </span>
                    </td>
                    <td className="num">
                      <span className="fee">
                        {r.gasUsd !== null || r.gasNative !== null ? (
                          <>
                            <span>{r.gasUsd !== null ? formatFeeUsd(r.gasUsd) : formatFeeNative(r.gasNative, native)}</span>
                            {r.gasUsd !== null && r.gasNative !== null && <small>{formatFeeNative(r.gasNative, native)}</small>}
                          </>
                        ) : (
                          <span className="amt-out">—</span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
