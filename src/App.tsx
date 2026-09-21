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
import { SettingsDialog } from './components/SettingsDialog';
import { LangMenu } from './components/LangMenu';
import { ThemeToggle } from './components/ThemeToggle';

export function App() {
  const { t } = useI18n();
  const { wallets, settings } = useStore();
  const { feeds, loadMany, forget } = useFeed(settings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<TxRow | null>(null);
  const closeDetail = useCallback(() => setSelected(null), []);

  const enabledEps = settings.endpoints.filter((e) => e.enabled);
  const hasEndpoint = enabledEps.length > 0;
  const active = useMemo(() => wallets.filter((w) => w.enabled), [wallets]);

  /* กระเป๋าใหม่ที่ยังไม่เคยโหลด → โหลดให้เองเมื่อมีแหล่งข้อมูล; แหล่งข้อมูลเปลี่ยน → โหลดใหม่ทั้งหมด */
  const epKey = enabledEps.map((e) => `${e.id}:${e.url}:${e.family}`).join('|');
  const lastKey = useRef(epKey);
  useEffect(() => {
    if (!hasEndpoint) return;
    const changed = lastKey.current !== epKey;
    lastKey.current = epKey;
    const todo = (changed ? active : active.filter((w) => !feeds[w.id])).filter((w) => endpointsFor(w, settings).length);
    if (todo.length) void loadMany(todo, 'reset');
    // feeds ตั้งใจไม่อยู่ใน deps — ไม่งั้นวนโหลดซ้ำทุกครั้งที่ state เปลี่ยน
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEndpoint, epKey, active, loadMany]);

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
        <span className="top-status" data-ok={hasEndpoint}>
          {hasEndpoint ? t('status.endpointSet', { n: enabledEps.length }) : t('status.noEndpoint')}
        </span>
        <button type="button" className="btn btn-icon" onClick={() => setSettingsOpen(true)} aria-label={t('nav.settings')} title={t('nav.settings')}>
          <Icon name="settings" />
        </button>
        <ThemeToggle />
        <LangMenu />
      </header>

      <div className="layout" data-drawer={selected !== null}>
        <aside className="side">
          <WalletPanel feeds={feeds} onRemove={forget} />
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
              <TxTable rows={rows} wallets={active} selected={selected?.key ?? null} onSelect={setSelected} />
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
      <DetailPanel row={selected} wallets={wallets} onClose={closeDetail} />
    </>
  );
}
