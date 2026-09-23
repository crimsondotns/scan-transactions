/**
 * หน้าโทเคนหนึ่งตัว — ประวัติเฉพาะโทเคนนั้น ดูได้ทั้งแบบทุกกระเป๋าและเฉพาะกระเป๋าที่เข้ามา
 * ข้อมูลมาจากธุรกรรมที่โหลดไว้แล้วเท่านั้น ไม่มีการยิงคำขอเพิ่มของหน้านี้เอง
 */
import { useMemo, useState } from 'react';
import type { TxRow } from '../feed';
import type { ChainMap } from '../chains';
import type { Wallet } from '../store';
import type { GroupId } from '../groups';
import { lastTime, netUsd, rowsOfToken, signClassOf, tokenSummary, totals, withinDays } from '../flow';
import { formatAmount, formatPrice, formatRelative, formatUsdExact, shortAddr } from '../format';
import { useI18n } from '../i18n';
import { FlowChart, RangeChips, Stat, type Range } from '../components/FlowChart';
import { useGroupLabel } from '../components/GroupNav';
import { PageTabs } from '../components/PageTabs';
import { TxTable } from '../components/TxTable';
import { TokenLogo } from '../components/Logo';
import { Identicon } from '../components/Identicon';
import { chainOf } from '../chains';
import { priceOf } from '../prices';

export function AssetPage({ symbol, wallet, all, rows, chains, group, range, onRange, onBack, onBackWallet, onWallet, onScopeAll, selected, onSelect, loading }: { symbol: string; wallet: Wallet | null; all: Wallet[]; rows: TxRow[]; chains: ChainMap; group: GroupId; range: Range; onRange: (r: Range) => void; onBack: () => void; onBackWallet: () => void; onWallet: (id: string) => void; onScopeAll: () => void; selected: string | null; onSelect: (r: TxRow) => void; loading: boolean }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<'history' | 'holders'>('history');
  const groupLabel = useGroupLabel(all, group);
  const list = useMemo(() => rowsOfToken(rows, symbol), [rows, symbol]);
  const ranged = useMemo(() => withinDays(list, range), [list, range]);
  const token = useMemo(() => tokenSummary(ranged).find((k) => k.symbol === symbol) ?? tokenSummary(list).find((k) => k.symbol === symbol) ?? null, [ranged, list, symbol]);
  const sums = useMemo(() => totals(ranged), [ranged]);
  const chain = token ? chainOf(chains, token.chain) : undefined;
  const price = token ? priceOf(token.chain, token.tokenId, token.symbol) : null;
  const holders = useMemo(() => {
    const ids = [...new Set(ranged.map((r) => r.walletId))];
    return ids.map((id) => {
      const sub = ranged.filter((r) => r.walletId === id);
      return { id, wallet: all.find((w) => w.id === id) ?? null, count: sub.length, net: sub.reduce((s, r) => s + netUsd(r), 0), last: lastTime(sub) };
    }).sort((a, b) => b.count - a.count);
  }, [ranged, all]);

  return (
    <>
      <nav className="crumbs" aria-label={t('nav.back')}>
        <button type="button" onClick={onBack}>
          {groupLabel}
        </button>
        <span aria-hidden="true">›</span>
        {wallet && (
          <>
            <button type="button" onClick={onBackWallet}>
              {wallet.label}
            </button>
            <span aria-hidden="true">›</span>
          </>
        )}
        <span>{symbol}</span>
      </nav>
      <section className="panel">
        <div className="headline">
          <span className="who">
            <TokenLogo token={token?.logo ?? null} tokenName={symbol} chain={chain?.logo ?? null} chainName={chain?.name ?? token?.chain ?? ''} size={44} />
            <span className="act-text">
              <span className="act-title head-name">{symbol}</span>
              <span className="act-sub">
                {[token?.name ?? null, chain?.name ?? token?.chain ?? null, price === null ? null : t('token.perUnit', { price: formatPrice(price) })].filter(Boolean).join(' · ')}
              </span>
            </span>
          </span>
          <span className="top-spacer" />
          {wallet && (
            <span className="chips" role="group" aria-label={t('token.scopeLabel')}>
              <button type="button" aria-pressed={true}>
                {t('token.scopeWallet', { label: wallet.label })}
              </button>
              <button type="button" aria-pressed={false} onClick={onScopeAll}>
                {t('token.scopeAll')}
              </button>
            </span>
          )}
          <RangeChips value={range} onChange={onRange} />
        </div>
        <div className="stat-row">
          <Stat label={t('token.received')} value={`${formatAmount(token?.inAmount ?? 0)} ${symbol}`} tone="is-pos" sub={formatUsdExact(token?.inUsd ?? 0)} />
          <Stat label={t('token.sent')} value={`${formatAmount(token?.outAmount ?? 0)} ${symbol}`} tone="is-neg" sub={formatUsdExact(token?.outUsd ?? 0)} />
          <Stat label={t('token.net')} value={formatUsdExact((token?.inUsd ?? 0) - (token?.outUsd ?? 0))} tone={signClassOf((token?.inUsd ?? 0) - (token?.outUsd ?? 0))} sub={`${formatAmount((token?.inAmount ?? 0) - (token?.outAmount ?? 0))} ${symbol}`} />
          <Stat label={t('token.holders')} value={String(holders.length)} sub={t('flow.net', { n: range, tx: sums.count })} />
        </div>
        <FlowChart rows={ranged} days={range} height={150} />
        <PageTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'history', label: t('token.history', { sym: symbol }), count: list.length },
            { value: 'holders', label: t('tab.holders'), count: holders.length },
          ]}
        />
        {tab === 'history' ? (
          <TxTable rows={list} wallets={all} chains={chains} wallet={wallet?.id ?? ''} onWallet={(id) => (id ? onWallet(id) : onScopeAll())} selected={selected} onSelect={onSelect} loading={loading} />
        ) : (
          <div className="table-wrap">
            <table className="tx">
              <thead>
                <tr>
                  <th scope="col">{t('tx.col.wallet')}</th>
                  <th scope="col" className="num">
                    {t('token.times')}
                  </th>
                  <th scope="col" className="num">
                    {t('token.net')}
                  </th>
                  <th scope="col" className="num">
                    {t('wallets.col.last')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {holders.map((h) => (
                  <tr
                    key={h.id}
                    className="tx-row"
                    tabIndex={0}
                    onClick={() => onWallet(h.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onWallet(h.id);
                      }
                    }}
                  >
                    <td>
                      <span className="who">
                        <Identicon value={h.wallet?.address ?? h.id} size={28} />
                        <span className="act-text">
                          <span className="act-title">{h.wallet?.label ?? shortAddr(h.id)}</span>
                          <span className="act-sub mono">{shortAddr(h.wallet?.address ?? h.id)}</span>
                        </span>
                      </span>
                    </td>
                    <td className="num">{h.count}</td>
                    <td className="num">
                      <span className={signClassOf(h.net)}>{formatUsdExact(h.net)}</span>
                    </td>
                    <td className="num cell-time">{h.last === null ? '—' : formatRelative(h.last, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
