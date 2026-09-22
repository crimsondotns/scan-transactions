/** แผงขวา — รายละเอียดธุรกรรมโครงเดียวกับหน้าอ้างอิง: หัว (ชนิด/เวลา/สถานะ) → สินทรัพย์ → แถวข้อมูล */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import type { Move, TxRow } from '../feed';
import type { Settings, Wallet } from '../store';
import type { ChainMap } from '../chains';
import { REFRESH_MS, priceOf, refreshPrice, usdOf } from '../prices';
import { formatPrice, formatAmount, formatAmountFull, formatAmountShort, formatFeeNative, formatFeeUsd, formatStamp, formatUsd, formatUsdExact, shortAddr, shortHash } from '../format';
import { Icon } from './Icon';
import { CopyButton } from './CopyButton';
import { Logo } from './Logo';
import { Identicon } from './Identicon';
import { useToast } from './Toast';

export function DetailPanel({ row, wallets, chains, settings, onClose }: { row: TxRow | null; wallets: Wallet[]; chains: ChainMap; settings: Settings; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  /* คลิกตัวเลข → คัดลอกค่าเต็มความละเอียด (ไม่ใช่ที่แสดง) */
  async function copyValue(v: string) {
    try {
      await navigator.clipboard.writeText(v);
      toast(t('tx.copied'));
    } catch {
      /* clipboard ถูกบล็อก */
    }
  }
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [, setTick] = useState(0);
  /* ราคาเป็น USD ของโทเคนในธุรกรรมนี้ — ใช้แคชก่อน แล้วดึงใหม่จาก URL ราคา (ถ้าตั้ง) ทุก 5 นาทีระหว่างเปิดแผง */
  useEffect(() => {
    if (!row) return;
    const template = settings.priceUrl;
    const tokens = [...row.moves.map((m) => ({ tokenId: m.tokenId, symbol: m.symbol })), { tokenId: null, symbol: row.nativeSymbol ?? '' }];
    let alive = true;
    const run = () => void Promise.all(tokens.map((x) => refreshPrice(template, row.chain, x.tokenId, x.symbol))).then(() => alive && setTick((n) => n + 1));
    run();
    const id = setInterval(run, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [row, settings.priceUrl]);

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
  const chainName = chain?.name ?? row.chain;
  const native = row.nativeSymbol ?? chain?.symbol ?? row.chain.toUpperCase();
  /* ลิงก์ explorer: จาก chain list ก่อน ไม่มีค่อยดูว่าแหล่งข้อมูลแนบ URL มากับแถวไหม; ไม่มีทั้งคู่ → ปุ่มปิด (ไม่ซ่อน) */
  const rawUrl = ['tx_url', 'explorer_url', 'url', 'link'].map((k) => row.raw[k]).find((v): v is string => typeof v === 'string' && /^https:\/\//i.test(v)) ?? null;
  const host = chain?.explorer?.replace(/\/$/, '') ?? (rawUrl ? new URL(rawUrl).origin : null);
  const txUrl = chain?.explorer ? `${host}/tx/${row.hash}` : rawUrl;
  const explorerName = host ? host.replace(/^https?:\/\/(www\.)?/, '') : '';

  const real = row.moves.filter((m) => m.amount !== 0);
  const ins = real.filter((m) => m.dir === 'in');
  const outs = real.filter((m) => m.dir === 'out');
  const isSwap = ins.length > 0 && outs.length > 0;
  // อัตราแลกเปลี่ยนแสดงเป็น USD ต่อ 1 หน่วยของแต่ละโทเคนในธุรกรรม (ไม่แสดงสัดส่วนโทเคนต่อโทเคน)
  const rateRows = real
    .filter((m, i, arr) => arr.findIndex((y) => y.symbol === m.symbol) === i)
    .map((m) => ({ symbol: m.symbol, price: priceOf(row.chain, m.tokenId, m.symbol) ?? m.price }))
    .filter((x): x is { symbol: string; price: number } => x.price !== null && x.price > 0)
    .map((x) => ({ symbol: x.symbol, price: Number(x.price.toPrecision(12)) }));
  const single = real[0] ?? row.moves[0] ?? null;
  // ค่าใช้จ่ายของสวอป: มูลค่าที่ส่งออก − มูลค่าที่ได้รับ (ค่าธรรมเนียมสวอป/slippage/ราคาขยับ) แยกจากค่าเครือข่าย
  // มูลค่า USD ของแต่ละขา: ที่แหล่งให้มาก่อน ไม่มีค่อยใช้ราคาล่าสุดจากแคช (ไม่ยิงขอราคาแยก)
  const moveUsd = (m: Move) => usdOf(m.amount, m.usd, row.chain, m.tokenId, m.symbol);
  const sumUsd = (ms: Move[]) => (ms.every((m) => moveUsd(m) !== null) ? ms.reduce((a, m) => a + (moveUsd(m) ?? 0), 0) : null);
  const sentUsd = isSwap ? sumUsd(outs) : null;
  const recvUsd = isSwap ? sumUsd(ins) : null;
  const swapCost = sentUsd !== null && recvUsd !== null ? sentUsd - recvUsd : null;
  const swapPct = swapCost !== null && sentUsd ? (swapCost / sentUsd) * 100 : null;
  const gasUsd = row.gasNative !== null ? usdOf(row.gasNative, row.gasUsd, row.chain, null, native) : row.gasUsd;
  const totalCost = swapCost !== null ? swapCost + (gasUsd ?? 0) : gasUsd;

  const Asset = ({ m }: { m: Move }) => (
    <div className="ev-asset">
      <span className="ev-asset-icon">
        <Logo src={m.logo} name={m.symbol} size={40} />
        <span className="logo-badge">
          <Logo src={chainLogo} name={row.chain} size={16} />
        </span>
      </span>
      <span className="ev-asset-info">
        <span className="ev-symbol">{m.symbol}</span>
        <span className="ev-net">{t('detail.on', { chain: chainName })}</span>
      </span>
      <span className="ev-amount-wrap">
        <button
          type="button"
          className="ev-amount copyable-number"
          data-dir={m.dir}
          data-value={String(m.amount)}
          title={`${m.dir === 'in' ? '+' : '−'}${formatAmountFull(m.amount)} ${m.symbol}`}
          aria-label={t('tx.copy', { what: `${formatAmountFull(m.amount)} ${m.symbol}` })}
          onClick={(e) => void copyValue(e.currentTarget.dataset.value ?? '')}
        >
          {m.dir === 'in' ? '+' : '−'}
          {formatAmountShort(m.amount)}
        </button>
        {moveUsd(m) !== null && <span className="ev-amount-usd">{formatUsdExact(moveUsd(m) as number)}</span>}
      </span>
    </div>
  );

  const Row = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
    <div className="ev-row">
      <span className="ev-label">{label}</span>
      <span className="ev-value">{children}</span>
    </div>
  );

  const known = (a: string) => wallets.find((w) => w.address.toLowerCase() === a.toLowerCase())?.label;
  const AddrRow = ({ label, addr, short }: { label: ReactNode; addr: string; short?: ReactNode }) => {
    short ??= known(addr);
    return (
      <Row label={label}>
        <span className="ev-addr">
          <span className="mono" title={addr}>
            {short ?? shortAddr(addr)}
          </span>
          <CopyButton text={addr} label={t('tx.copy', { what: String(label) })} onCopied={() => toast(t('tx.copied'))} />
        </span>
      </Row>
    );
  };

  return (
    <aside className="drawer" role="dialog" aria-modal="false" aria-labelledby="dt-h">
      <div className="drawer-head">
        <div className="ev-head">
          <h2 id="dt-h" className="ev-title">
            {t(`tx.type.${row.type}`)}
            {row.flagged && (
              <span className="flag" title={t('tx.scam')}>
                <Icon name="alert" width={12} height={12} style={{ verticalAlign: '-1px' }} />
              </span>
            )}
          </h2>
          <span className="ev-sub">
            <span>{formatStamp(row.time)}</span>
            <span className="ev-status" data-failed={row.failed}>
              <Icon name={row.failed ? 'x' : 'check'} />
              {row.failed ? t('tx.failed') : t('detail.executed')}
            </span>
          </span>
        </div>
        <button ref={closeBtn} type="button" className="btn btn-icon" onClick={onClose} aria-label={t('dialog.close')}>
          <Icon name="x" />
        </button>
      </div>

      <div className="drawer-body">
        {isSwap ? (
          <div className="ev-pair">
            <Asset m={outs[0]!} />
            <div className="ev-divider">
              <span className="ev-divider-icon">
                <Icon name="swap" />
              </span>
            </div>
            <Asset m={ins[0]!} />
          </div>
        ) : single ? (
          <Asset m={single} />
        ) : null}

        <div className="ev-rows">
          {wallet && (
            <AddrRow
              label={t('tx.col.wallet')}
              addr={wallet.address}
              short={
                <span className="with-logo">
                  <Identicon value={wallet.address} size={20} />
                  {wallet.label}
                </span>
              }
            />
          )}
          {rateRows.map((x) => (
            <Row key={x.symbol} label={t('detail.rate', { symbol: x.symbol })}>
              <button type="button" className="copyable-number copyable-price" data-value={String(x.price)} title={String(x.price)} aria-label={t('tx.copy', { what: String(x.price) })} onClick={(e) => void copyValue(e.currentTarget.dataset.value ?? '')}>
                {formatPrice(x.price)}
              </button>
            </Row>
          ))}
          {!isSwap && row.from && <AddrRow label={t('detail.from')} addr={row.from} />}
          {!isSwap && row.to && <AddrRow label={t('detail.to')} addr={row.to} />}
          {row.contract && <AddrRow label={t('detail.contract')} addr={row.contract} />}
          <Row label={t('tx.col.hash')}>
            <span className="ev-addr">
              <span className="mono" title={row.hash}>
                {shortHash(row.hash)}
              </span>
              <CopyButton text={row.hash} label={t('tx.copy', { what: t('tx.col.hash') })} onCopied={() => toast(t('tx.copied'))} />
            </span>
          </Row>
          {row.nonce !== null && <Row label={t('detail.nonce')}>{row.nonce}</Row>}
        </div>

        <div className="ev-rows ev-group" aria-labelledby="ev-fees">
          <div id="ev-fees" className="ev-group-title">
            {t('detail.fees')}
          </div>
          {isSwap && sentUsd !== null && <Row label={t('detail.sentValue')}>{formatUsd(sentUsd)}</Row>}
          {isSwap && recvUsd !== null && <Row label={t('detail.receivedValue')}>{formatUsd(recvUsd)}</Row>}
          {swapCost !== null && (
            <Row label={t('detail.swapCost')}>
              <span>
                {formatUsdExact(swapCost)}
                {swapPct !== null && ` (${swapPct.toFixed(2)}%)`}
                <span className="ev-sub">{t('detail.swapCostHint')}</span>
              </span>
            </Row>
          )}
          <Row label={t('detail.networkFee')}>
            {row.gasNative !== null ? (
              <span>
                {formatFeeNative(row.gasNative, native)}
                {gasUsd !== null && ` (${formatFeeUsd(gasUsd)})`}
              </span>
            ) : gasUsd !== null ? (
              <span>{formatFeeUsd(gasUsd)}</span>
            ) : (
              <span className="ev-sub">{t('detail.feePaidBySender')}</span>
            )}
          </Row>
          {totalCost !== null && (
            <Row label={t('detail.totalCost')}>
              <span className="ev-total">{formatUsdExact(totalCost)}</span>
            </Row>
          )}
        </div>

      </div>

      <div className="drawer-foot">
        {txUrl ? (
          <a className="btn btn-primary" href={txUrl} target="_blank" rel="noopener noreferrer">
            {t('detail.viewOn', { name: explorerName })}
          </a>
        ) : (
          <button type="button" className="btn btn-primary" disabled title={t('detail.noExplorer')}>
            {t('detail.noExplorer')}
          </button>
        )}
      </div>
    </aside>
  );
}
