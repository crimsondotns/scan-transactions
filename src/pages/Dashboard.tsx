/**
 * หน้าแรก — กลุ่มกระเป๋าทางซ้าย, กระแสเงินของกลุ่มด้านบน, แล้วตารางกระเป๋า/ธุรกรรมล่าสุดเป็นแท็บ
 * ตัวเลขทุกตัวคิดจากธุรกรรมที่โหลดมาแล้วในช่วงเวลาที่เลือก — ไม่มีการเดาหรือปั้นข้อมูลแทนแหล่งข้อมูล
 */
import { useMemo, useState } from 'react';
import type { TxRow } from '../feed';
import type { ChainMap } from '../chains';
import type { Wallet } from '../store';
import type { Progress, WalletFeed } from '../useFeed';
import type { WalletInfo, GroupId } from '../groups';
import { signClassOf, totals, withinDays } from '../flow';
import { formatUsdExact } from '../format';
import { useI18n } from '../i18n';
import { FlowChart, RangeChips, Stat, type Range } from '../components/FlowChart';
import { GroupRail, useGroupLabel } from '../components/GroupNav';
import { PageTabs } from '../components/PageTabs';
import { WalletTable } from '../components/WalletTable';
import { RecentTable } from '../components/RecentTable';
import { Icon } from '../components/Icon';

export function Dashboard({ all, wallets, rows, feeds, chains, group, onGroup, infoOf, range, onRange, onOpenWallet, onSwitch, onRemove, hasSource, onLoadGroup, loading, progress, onCancel, selected, onSelect }: { all: Wallet[]; wallets: Wallet[]; rows: TxRow[]; feeds: Record<string, WalletFeed>; chains: ChainMap; group: GroupId; onGroup: (g: GroupId) => void; infoOf: (w: Wallet) => WalletInfo; range: Range; onRange: (r: Range) => void; onOpenWallet: (id: string) => void; onSwitch: (id: string | null) => void; onRemove: (id: string) => void; hasSource: (w: Wallet) => boolean; onLoadGroup: () => void; loading: boolean; progress: Progress; onCancel: () => void; selected: string | null; onSelect: (r: TxRow) => void }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<'wallets' | 'recent'>('wallets');
  const label = useGroupLabel(all, group);
  const ranged = useMemo(() => withinDays(rows, range), [rows, range]);
  const sums = useMemo(() => totals(ranged), [ranged]);
  const loadedCount = wallets.filter((w) => feeds[w.id]?.loaded).length;

  return (
    <div className="cols">
      <GroupRail wallets={all} infoOf={infoOf} group={group} onChange={onGroup} chains={chains} />
      <section className="panel" aria-labelledby="group-h">
        <div className="headline">
          <span className="head-sum">
            <span className="hint" id="group-h">
              {t('group.summary', { group: label, n: wallets.length, loaded: loadedCount })}
            </span>
            <div className="big-row">
              <div className={`big ${signClassOf(sums.net)}`}>{formatUsdExact(sums.net)}</div>
              <button type="button" className="btn btn-icon" onClick={onLoadGroup} disabled={loading} aria-label={t('group.load')} title={t('group.load')}>
                <Icon name="refresh" />
              </button>
            </div>
            <span className="hint">{t('flow.net', { n: range, tx: sums.count })}</span>
          </span>
          <span className="top-spacer" />
          <RangeChips value={range} onChange={onRange} />
        </div>
        <FlowChart rows={ranged} days={range} height={240} />
        <div className="stat-row">
          <Stat label={t('flow.in')} value={formatUsdExact(sums.inUsd)} tone="is-pos" />
          <Stat label={t('flow.out')} value={formatUsdExact(sums.outUsd)} tone="is-neg" />
          <Stat label={t('flow.fee')} value={formatUsdExact(sums.fee)} />
          <Stat label={t('flow.flagged')} value={String(sums.flagged)} />
        </div>
        <PageTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'wallets', label: t('wallets.title'), count: wallets.length },
            { value: 'recent', label: t('tab.recent'), count: rows.length },
          ]}
        />
        {tab === 'wallets' ? (
          <WalletTable wallets={wallets} feeds={feeds} activeId={null} onOpen={onOpenWallet} onSwitch={onSwitch} onRemove={onRemove} hasSource={hasSource} />
        ) : (
          <RecentTable rows={rows} wallets={all} chains={chains} selected={selected} onSelect={onSelect} loading={loading} progress={progress} onLoadAll={onLoadGroup} onCancel={onCancel} />
        )}
      </section>
    </div>
  );
}
