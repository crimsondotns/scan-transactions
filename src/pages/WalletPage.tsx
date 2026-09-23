/**
 * หน้ากระเป๋าหนึ่งใบ — สรุปกระแสเงินของกระเป๋านี้ แล้วเลือกดูเป็นรายโทเคนหรือรายธุรกรรม
 * แท็กแก้ได้ตรงนี้ (ที่เดียวที่ตั้งได้) เพราะมันคือที่ที่ผู้ใช้กำลังดูกระเป๋าใบนั้นอยู่
 */
import { useMemo, useState } from 'react';
import type { TxRow } from '../feed';
import type { ChainMap } from '../chains';
import { useStore, type Wallet } from '../store';
import type { GroupId } from '../groups';
import { signClassOf, tokenSummary, totals, withinDays } from '../flow';
import { formatUsdExact, shortAddr } from '../format';
import { useI18n } from '../i18n';
import { FlowChart, RangeChips, Stat, type Range } from '../components/FlowChart';
import { useGroupLabel } from '../components/GroupNav';
import { PageTabs } from '../components/PageTabs';
import { TokenTable } from '../components/TokenTable';
import { TxTable } from '../components/TxTable';
import { Identicon } from '../components/Identicon';
import { Icon } from '../components/Icon';

export function WalletPage({ wallet, all, rows, chains, group, range, onRange, onBack, onWallet, onToken, selected, onSelect, loading, hasMore, onMore, onReload }: { wallet: Wallet; all: Wallet[]; rows: TxRow[]; chains: ChainMap; group: GroupId; range: Range; onRange: (r: Range) => void; onBack: () => void; onWallet: (id: string) => void; onToken: (symbol: string) => void; selected: string | null; onSelect: (r: TxRow) => void; loading: boolean; hasMore: boolean; onMore: () => void; onReload: () => void }) {
  const { t } = useI18n();
  const { setWalletTag } = useStore();
  const [tab, setTab] = useState<'tokens' | 'history'>('tokens');
  const [tag, setTag] = useState(wallet.tag ?? '');
  const groupLabel = useGroupLabel(all, group);
  const ranged = useMemo(() => withinDays(rows, range), [rows, range]);
  const sums = useMemo(() => totals(ranged), [ranged]);
  const tokens = useMemo(() => tokenSummary(ranged), [ranged]);

  return (
    <>
      <nav className="crumbs" aria-label={t('nav.back')}>
        <button type="button" onClick={onBack}>
          {groupLabel}
        </button>
        <span aria-hidden="true">›</span>
        <span>{wallet.label}</span>
      </nav>
      <section className="panel">
        <div className="headline">
          <span className="who">
            <Identicon value={wallet.address} size={40} />
            <span className="act-text">
              <span className="act-title head-name">{wallet.label}</span>
              <span className="act-sub mono">
                {shortAddr(wallet.address)} · {t(`family.${wallet.family}`)}
              </span>
            </span>
          </span>
          <span className="top-spacer" />
          <span className="field-inline">
            <label className="label" htmlFor="wallet-tag">
              {t('wallets.col.tag')}
            </label>
            <input
              id="wallet-tag"
              name="tag"
              type="text"
              className="input input-sm"
              placeholder={t('wallets.noTag')}
              value={tag}
              autoComplete="off"
              onChange={(e) => setTag(e.target.value)}
              onBlur={() => setWalletTag(wallet.id, tag)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
            />
          </span>
          <button type="button" className="btn btn-icon" disabled={loading} onClick={onReload} aria-label={t('tx.reload')} title={t('tx.reload')}>
            <Icon name="refresh" />
          </button>
          <RangeChips value={range} onChange={onRange} />
        </div>
        <div className="stat-row">
          <Stat label={t('flow.netShort', { n: range })} value={formatUsdExact(sums.net)} tone={signClassOf(sums.net)} />
          <Stat label={t('wallets.col.tx')} value={String(sums.count)} />
          <Stat label={t('flow.feeTotal')} value={formatUsdExact(sums.fee)} />
          <Stat label={t('token.active')} value={String(tokens.length)} />
        </div>
        <FlowChart rows={ranged} days={range} height={150} />
        <PageTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'tokens', label: t('tab.tokens'), count: tokens.length },
            { value: 'history', label: t('tab.history'), count: rows.length },
          ]}
        />
        {tab === 'tokens' ? <TokenTable rows={ranged} onToken={onToken} /> : <TxTable rows={rows} wallets={all} chains={chains} wallet={wallet.id} onWallet={(id) => onWallet(id)} onToken={onToken} selected={selected} onSelect={onSelect} loading={loading} hasMore={hasMore} onMore={onMore} />}
      </section>
    </>
  );
}
