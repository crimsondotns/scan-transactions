import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from './i18n';
import { useStore } from './store';
import { endpointsFor, hasOlder, useFeed } from './useFeed';
import { XCapMark } from './components/XCapMark';
import { Icon } from './components/Icon';
import { WalletPanel } from './components/WalletPanel';
import { TxTable } from './components/TxTable';
import { DetailPanel } from './components/DetailPanel';
import type { TxRow } from './feed';
import { useChains } from './chains';
import { SettingsDialog } from './components/SettingsDialog';
import { LangMenu } from './components/LangMenu';
import { ThemeToggle } from './components/ThemeToggle';

export function App() {
  const { t } = useI18n();
  const { wallets, settings } = useStore();
  const { feeds, loadMany, ensure, reset, forget } = useFeed(settings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<TxRow | null>(null);
  const [sideOpen, setSideOpen] = useState(true);
  /* กระเป๋าที่กำลังดู (null = ทุกกระเป๋า) — สลับจากแผงซ้ายหรือ dropdown ในตาราง */
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const closeDetail = useCallback(() => setSelected(null), []);
  /* เปิดแผงขวา → ล็อกไม่ให้หน้าหลักเลื่อน ปิดแล้วกลับเป็น auto */
  useEffect(() => {
    document.body.style.overflow = selected ? 'hidden' : 'auto';
  }, [selected]);

  const enabledEps = settings.endpoints.filter((e) => e.enabled);
  const chains = useChains(settings);
  const hasEndpoint = enabledEps.length > 0;
  const active = useMemo(() => wallets.filter((w) => w.enabled), [wallets]);

  /* โหลดแบบขี้เกียจ: ไม่ยิงตอนเปิดหน้า — ยิงเมื่อผู้ใช้เลือกกระเป๋าเท่านั้น และใช้แคชถ้าเคยโหลดแล้ว
     แหล่งข้อมูลเปลี่ยน → ล้างแคช (ไม่โหลดใหม่เอง) */
  const epKey = enabledEps.map((e) => `${e.id}:${e.url}:${e.family}`).join('|');
  const lastKey = useRef(epKey);
  useEffect(() => {
    if (lastKey.current === epKey) return;
    lastKey.current = epKey;
    reset();
  }, [epKey, reset]);

  const selectWallet = useCallback(
    (id: string | null) => {
      setActiveWallet(id);
      const w = id ? wallets.find((x) => x.id === id) : undefined;
      if (w && hasEndpoint && endpointsFor(w, settings).length) void ensure(w);
    },
    [wallets, hasEndpoint, settings, ensure]
  );

  const rows = useMemo(
    () =>
      active
        .flatMap((w) => feeds[w.id]?.rows ?? [])
        .sort((a, b) => b.time - a.time),
    [active, feeds]
  );
  const anyLoading = active.some((w) => feeds[w.id]?.loading);
  const anyOlder = active.some((w) => hasOlder(feeds[w.id]));
  const errors = active.flatMap((w) => Object.entries(feeds[w.id]?.errors ?? {}).map(([epId, e]) => ({ w, ep: settings.endpoints.find((x) => x.id === epId), e })));

  function errMsg({ w, ep, e }: (typeof errors)[number]): string {
    const msg = e.kind === 'http' ? t('tx.errorHttp', { status: e.status }) : e.kind === 'shape' ? t('tx.errorShape') : t('tx.errorNet');
    return `${w.label} · ${ep?.name ?? '?'}: ${t('tx.error', { msg })}`;
  }

  return (
    <>
      <a className="skip" href="#main">
        {t('nav.skip')}
      </a>
      <header className="top">
        <span className="brand">
          <XCapMark />
          {t('app.name')} <span className="brand-sub">{t('app.sub')}</span>
        </span>
        <span className="top-spacer" />
        <button type="button" className="btn btn-icon side-toggle" onClick={() => setSideOpen((o) => !o)} aria-pressed={sideOpen} aria-label={t('nav.toggleSide')} title={t('nav.toggleSide')}>
          <Icon name="panelLeft" />
        </button>
        <span className="top-status" data-ok={hasEndpoint}>
          {hasEndpoint ? t('status.endpointSet', { n: enabledEps.length }) : t('status.noEndpoint')}
        </span>
        <button type="button" className="btn btn-icon" onClick={() => setSettingsOpen(true)} aria-label={t('nav.settings')} title={t('nav.settings')}>
          <Icon name="settings" />
        </button>
        <ThemeToggle />
        <LangMenu />
      </header>

      <div className="layout" data-drawer={selected !== null} data-side={sideOpen}>
        <aside className="side">
          <WalletPanel feeds={feeds} activeId={activeWallet} onSwitch={selectWallet} onRemove={forget} onExpand={(w) => endpointsFor(w, settings).length && void ensure(w)} hasSource={(w) => endpointsFor(w, settings).length > 0} />
          <p className="hint">{t('foot.local')}</p>
        </aside>

        <main id="main" className="main">
          {!hasEndpoint ? (
            <div className="empty">
              <h2>{t('tx.emptyEndpoint')}</h2>
              <button type="button" className="btn btn-primary" onClick={() => setSettingsOpen(true)}>
                {t('nav.settings')}
              </button>
            </div>
          ) : wallets.length === 0 ? (
            <div className="empty">
              <h2>{t('tx.emptyWallets')}</h2>
            </div>
          ) : !activeWallet && !active.some((w) => feeds[w.id]) ? (
            <div className="empty">
              <h2>{t('tx.emptyPick')}</h2>
              <button type="button" className="btn" disabled={!active.length} onClick={() => void loadMany(active, 'reset')}>
                <Icon name="refresh" />
                {t('tx.loadAll')}
              </button>
            </div>
          ) : (
            <>
              <div className="toolbar">
                <h1 className="panel-title">{t('tx.title')}</h1>
                <span className="top-spacer" />
                <button type="button" className="btn" disabled={anyLoading || !active.length} onClick={() => void loadMany(active, 'reset')}>
                  <Icon name="refresh" />
                  {anyLoading ? t('wallets.loading') : t('tx.loadAll')}
                </button>
              </div>
              {errors.length > 0 && (
                <div className="field" style={{ marginBottom: 'var(--space-4)' }} aria-live="polite">
                  {errors.map((x) => (
                    <span key={`${x.w.id}:${x.ep?.id}`} className="error">
                      {errMsg(x)}
                    </span>
                  ))}
                </div>
              )}
              <TxTable rows={rows} wallets={active} chains={chains} wallet={activeWallet ?? ''} onWallet={(id) => selectWallet(id || null)} selected={selected?.key ?? null} onSelect={setSelected} loading={anyLoading} />
              {anyOlder && (
                <div className="tfoot">
                  <button type="button" className="btn" disabled={anyLoading} onClick={() => void loadMany(active, 'older')}>
                    {anyLoading ? t('wallets.loading') : t('tx.older')}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {selected !== null && <button type="button" className="drawer-scrim" aria-label={t('dialog.close')} onClick={closeDetail} />}
      <DetailPanel row={selected} wallets={wallets} chains={chains} settings={settings} onClose={closeDetail} />
    </>
  );
}
