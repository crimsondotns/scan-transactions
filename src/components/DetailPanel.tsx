/** แผงขวา — รายละเอียดธุรกรรมโครงเดียวกับหน้าอ้างอิง: หัว (ชนิด/เวลา/สถานะ) → สินทรัพย์ → แถวข้อมูล */
import { useEffect, useRef, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import type { Move, TxRow } from '../feed';
import type { Wallet } from '../store';
import type { ChainMap } from '../chains';
import { formatAmount, formatAmountFull, formatFeeNative, formatStamp, shortAddr, shortHash } from '../format';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { useToast } from './Toast';

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
  const chainName = chain?.name ?? row.chain;
  const native = chain?.symbol ?? row.chain.toUpperCase();
  const host = chain?.explorer?.replace(/\/$/, '') ?? null;
  const txUrl = host ? `${host}/tx/${row.hash}` : null;
  const addrUrl = (a: string) => (host ? `${host}/address/${a}` : null);

  const real = row.moves.filter((m) => m.amount !== 0);
  const ins = real.filter((m) => m.dir === 'in');
  const outs = real.filter((m) => m.dir === 'out');
  const isSwap = ins.length > 0 && outs.length > 0;
  const single = real[0] ?? row.moves[0] ?? null;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('tx.copied'));
    } catch {
      /* clipboard ถูกบล็อก */
    }
  }

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
      <span className="ev-amount" data-dir={m.dir} title={`${m.dir === 'in' ? '+' : '−'}${formatAmountFull(m.amount)} ${m.symbol}`}>
        {m.dir === 'in' ? '+' : '−'}
        {formatAmountFull(m.amount)}
      </span>
    </div>
  );

  const Row = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
    <div className="ev-row">
      <span className="ev-label">{label}</span>
      <span className="ev-value">{children}</span>
    </div>
  );

  const AddrRow = ({ label, addr, short }: { label: ReactNode; addr: string; short?: string }) => {
    const url = addrUrl(addr);
    return (
      <Row label={label}>
        <span className="ev-addr">
          <span className="mono" title={addr}>
            {short ?? shortAddr(addr)}
          </span>
          <button type="button" className="btn btn-icon" onClick={() => void copy(addr)} aria-label={t('tx.copy', { what: String(label) })} title={t('tx.copy', { what: String(label) })}>
            <Icon name="copy" />
          </button>
          {url && (
            <a className="btn btn-icon" href={url} target="_blank" rel="noopener noreferrer" aria-label={t('detail.explorer', { what: String(label) })} title={t('detail.explorer', { what: String(label) })}>
              <Icon name="external" />
            </a>
          )}
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
          {wallet && <AddrRow label={t('tx.col.wallet')} addr={wallet.address} />}
          {isSwap && (
            <>
              <Row label={`1 ${ins[0]!.symbol}`}>
                {formatAmount(outs[0]!.amount / ins[0]!.amount)} {outs[0]!.symbol}
              </Row>
              <Row label={`1 ${outs[0]!.symbol}`}>
                {formatAmount(ins[0]!.amount / outs[0]!.amount)} {ins[0]!.symbol}
              </Row>
            </>
          )}
          {!isSwap && row.from && <AddrRow label={t('detail.from')} addr={row.from} />}
          {!isSwap && row.to && <AddrRow label={t('detail.to')} addr={row.to} />}
          {row.contract && <AddrRow label={t('detail.contract')} addr={row.contract} />}
          <Row label={t('tx.col.hash')}>
            <span className="ev-addr">
              <span className="mono" title={row.hash}>
                {shortHash(row.hash)}
              </span>
              <button type="button" className="btn btn-icon" onClick={() => void copy(row.hash)} aria-label={t('tx.copy', { what: t('tx.col.hash') })} title={t('tx.copy', { what: t('tx.col.hash') })}>
                <Icon name="copy" />
              </button>
              {txUrl && (
                <a className="btn btn-icon" href={txUrl} target="_blank" rel="noopener noreferrer" aria-label={t('detail.explorer', { what: t('tx.col.hash') })} title={t('detail.explorer', { what: t('tx.col.hash') })}>
                  <Icon name="external" />
                </a>
              )}
            </span>
          </Row>
          {row.gasNative !== null && <Row label={t('detail.networkFee')}>{formatFeeNative(row.gasNative, native)}</Row>}
          {row.nonce !== null && <Row label={t('detail.nonce')}>{row.nonce}</Row>}
        </div>

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
