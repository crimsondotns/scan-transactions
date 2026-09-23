/**
 * เส้นกระแสเงินสุทธิสะสม — ไม่มีไลบรารีกราฟ วาดเป็น path เดียวจาก cumulative()
 * สีมาจากทิศทางของค่าสุดท้าย (บวก/ลบ) ผ่าน currentColor เส้นและพื้นจึงเปลี่ยนพร้อมกัน
 */
import { useMemo } from 'react';
import { cumulative, signClassOf } from '../flow';
import type { TxRow } from '../feed';
import { useI18n } from '../i18n';
import { formatUsdExact } from '../format';

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];

export function RangeChips({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const { t } = useI18n();
  return (
    <span className="chips" role="group" aria-label={t('flow.rangeLabel')}>
      {RANGES.map((r) => (
        <button key={r} type="button" aria-pressed={r === value} onClick={() => onChange(r)}>
          {t('flow.range', { n: r })}
        </button>
      ))}
    </span>
  );
}

export function FlowChart({ rows, days, height = 160 }: { rows: TxRow[]; days: number; height?: number }) {
  const { t } = useI18n();
  const points = useMemo(() => cumulative(rows, days), [rows, days]);
  const w = 1000;
  const pad = 22;
  const last = points.at(-1) ?? 0;
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const x = (i: number) => pad + (i * (w - pad * 2)) / Math.max(1, days - 1);
  const y = (v: number) => height - 22 - ((v - min) / (max - min || 1)) * (height - 44);
  const d = points.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <figure className="chart">
      <svg className={`flow ${signClassOf(last)}`} viewBox={`0 0 ${w} ${height}`} width="100%" height={height} role="img" aria-label={`${t('flow.chart')} ${formatUsdExact(last)}`}>
        <line className="zero" x1={pad} y1={y(0)} x2={w - pad} y2={y(0)} />
        <path className="area" d={`${d} L${x(days - 1)} ${y(0)} L${pad} ${y(0)} Z`} />
        <path className="curve" d={d} />
        <text x={pad} y={height - 4}>
          {t('flow.daysAgo', { n: days })}
        </text>
        <text x={w - pad} y={height - 4} textAnchor="end">
          {t('flow.today')}
        </text>
      </svg>
    </figure>
  );
}

/** ช่องสรุปสี่ช่องใต้กราฟ — ค่าที่สองบรรทัดล่างเป็นบริบท ไม่ใช่ตัวเลขหลัก */
export function Stat({ label, value, tone, sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="stat">
      <span className="hint">{label}</span>
      <b className={tone}>{value}</b>
      {sub !== undefined && <span className="hint">{sub}</span>}
    </div>
  );
}
