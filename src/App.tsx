import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from './i18n';
import { useStore } from './store';
import { endpointsFor, hasOlder, useFeed } from './useFeed';
import { XCapMark } from './components/XCapMark';
import { Icon } from './components/Icon';
import { Identicon } from './components/Identicon';
import { shortAddr } from './format';
import { WalletTable } from './components/WalletTable';
import { RecentTable } from './components/RecentTable';
import { ImportDialog } from './components/ImportDialog';
import { TxTable } from './components/TxTable';
import { DetailPanel } from './components/DetailPanel';
import type { TxRow } from './feed';
import { useChains } from './chains';
import { SettingsDialog } from './components/SettingsDialog';
import { VerifyDialog } from './components/VerifyDialog';
import { parseShare } from './slip';
import { LangMenu } from './components/LangMenu';
import { ThemeToggle } from './components/ThemeToggle';
import { useModalLayer } from './modal';
import { setProxy } from './proxy';
import { navigate, useRoute } from './router';

export function App() {
  const { t } = useI18n();
  const { wallets, settings } = useStore();
  const { feeds, loadMany, loadStaggered, cancelStaggered, progress, ensure, reset, forget } = useFeed(settings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  /* หน้า: / = แดชบอร์ด, /<id> = ธุรกรรมของกระเป๋า (v/ สงวนให้ลิงก์ตรวจสลิป) — path จริง (History API) ปุ่มย้อนกลับใช้ได้ */
  const route = useRoute();
  const pageWallet = route && !route.startsWith('v/') ? decodeURIComponent(route) : null;
  /* /v/<code>[.<data>] = ลิงก์ตรวจสลิป → เปิดไดอะล็อกตรวจทับแดชบอร์ด */
  const share = useMemo(() => (route.startsWith('v/') ? parseShare(decodeURIComponent(route.slice(2))) : null), [route]);
  const [verifyOpen, setVerifyOpen] = useState(false);
  useEffect(() => {
    if (share) setVerifyOpen(true);
  }, [share]);
  const page: 'dashboard' | 'wallet' = pageWallet ? 'wallet' : 'dashboard';
  const [selected, setSelected] = useState<TxRow | null>(null);
  /* กระเป๋าที่กำลังดู (null = ทุกกระเป๋า) — สลับจากแผงซ้ายหรือ dropdown ในตาราง */
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const closeDetail = useCallback(() => setSelected(null), []);

  /* ทางผ่านคำขอ (CORS) — ตั้งครั้งเดียวต่อค่าใน settings ให้ทุกตัวดึงข้อมูลใช้ */
  setProxy(settings.proxyUrl);
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
  /* ไปหน้า 2 ของกระเป๋า (จาก sidebar หรือแถวในตารางกระเป๋า) */
  const openWallet = useCallback(
    (id: string | null) => {
      selectWallet(id);
      navigate(id ? encodeURIComponent(id) : '');
    },
    [selectWallet]
  );
  const goDashboard = useCallback(() => {
    navigate('');
  }, []);
  /* เปิดด้วย URL ที่ชี้กระเป๋า → เลือกกระเป๋านั้นให้ (ถ้ายังมีอยู่) */
  useEffect(() => {
    if (!pageWallet) return;
    if (!wallets.some((w) => w.id === pageWallet)) return goDashboard();
    if (activeWallet !== pageWallet) selectWallet(pageWallet);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageWallet, wallets]);

  const rows = useMemo(
    () =>
      active
        .flatMap((w) => feeds[w.id]?.rows ?? [])
        .sort((a, b) => b.time - a.time),
    [active, feeds]
  );
  /* เปิดแดชบอร์ด → โหลดกระเป๋าที่ยังไม่มีข้อมูลแบบเว้นจังหวะ (5 ต่อชุด เว้น 2 วิ) เริ่มครั้งเดียวต่อชุดแหล่งข้อมูล */
  const startedFor = useRef<string | null>(null);
  useEffect(() => {
    if (page !== 'dashboard' || !hasEndpoint || !active.length) return;
    if (startedFor.current === epKey) return;
    startedFor.current = epKey;
    void loadStaggered(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasEndpoint, epKey, active.length]);

  /* chain id ที่พบในข้อมูลจริง — โชว์ใน Settings ให้ผู้ใช้ตั้ง Custom chains ด้วย id ที่ตรง */
  const seenChains = useMemo(() => [...new Set(rows.map((r) => r.chain))].sort(), [rows]);
  const walletRows = useMemo(() => (pageWallet ? rows.filter((r) => r.walletId === pageWallet) : rows), [rows, pageWallet]);
  const anyLoading = active.some((w) => feeds[w.id]?.loading);
  const activeWalletObj = wallets.find((w) => w.id === pageWallet) ?? null;
  const errors = active.flatMap((w) => Object.entries(feeds[w.id]?.errors ?? {}).map(([epId, e]) => ({ w, ep: settings.endpoints.find((x) => x.id === epId), e })));

  function errMsg({ w, ep, e }: (typeof errors)[number]): string {
    const msg = e.kind === 'http' && e.status === 429 ? t('tx.errorRate') : e.kind === 'http' ? t('tx.errorHttp', { status: e.status }) : e.kind === 'shape' ? t('tx.errorShape') : t('tx.errorNet');
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
        <button type="button" className="btn btn-primary" onClick={() => setImporting(true)}>
          <Icon name="upload" />
          {t('wallets.import')}
        </button>
        <span className="top-status" data-ok={hasEndpoint}>
          {hasEndpoint ? t('status.endpointSet', { n: enabledEps.length }) : t('status.noEndpoint')}
        </span>
        <button type="button" className="btn btn-icon" data-fn="verify" onClick={() => setVerifyOpen(true)} aria-label={t('slip.verify')} title={t('slip.verify')}>
          <Icon name="shield" />
        </button>
        <button type="button" className="btn btn-icon" onClick={() => setSettingsOpen(true)} aria-label={t('nav.settings')} title={t('nav.settings')}>
          <Icon name="settings" />
        </button>
        <ThemeToggle />
        <LangMenu />
      </header>

      <div className="layout">
        <main id="main" className="main">
          {!hasEndpoint ? (
            <div className="empty">
              <h2>{t('tx.emptyEndpoint')}</h2>
              <button type="button" className="btn btn-primary" onClick={() => setSettingsOpen(true)}>
                {t('nav.settings')}
              </button>
            </div>
          ) : page === 'dashboard' ? (
            <div className="stack-lg">
              <WalletTable feeds={feeds} activeId={pageWallet} onOpen={openWallet} onSwitch={selectWallet} onRemove={forget} hasSource={(w) => endpointsFor(w, settings).length > 0} />
              {errors.length > 0 && (
                <div className="field" aria-live="polite">
                  {errors.map((x) => (
                    <span key={`${x.w.id}:${x.ep?.id}`} className="error">
                      {errMsg(x)}
                    </span>
                  ))}
                </div>
              )}
              <RecentTable rows={rows} wallets={wallets} chains={chains} selected={selected?.key ?? null} onSelect={setSelected} loading={anyLoading} progress={progress} onLoadAll={() => void loadStaggered(active.filter((w) => !feeds[w.id]?.loaded))} onCancel={cancelStaggered} />
            </div>
          ) : (
            <>
              <div className="toolbar">
                <button type="button" className="btn btn-icon" onClick={goDashboard} aria-label={t('nav.back')} title={t('nav.back')}>
                  <Icon name="chevronLeft" />
                </button>
                <h1 className="panel-title with-logo">
                  {activeWalletObj ? <Identicon value={activeWalletObj.address} size={28} /> : null}
                  {activeWalletObj?.label ?? t('tx.title')}
                </h1>
                {activeWalletObj && <span className="hint mono">{shortAddr(activeWalletObj.address)}</span>}
                <span className="top-spacer" />
                <button type="button" className="btn" disabled={anyLoading || !activeWalletObj} onClick={() => activeWalletObj && void loadMany([activeWalletObj], 'reset')}>
                  <Icon name="refresh" />
                  {anyLoading ? t('wallets.loading') : t('tx.reload')}
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
              <TxTable rows={walletRows} wallets={active} chains={chains} wallet={pageWallet ?? ''} onWallet={(id) => openWallet(id || null)} selected={selected?.key ?? null} onSelect={setSelected} loading={anyLoading} hasMore={!!activeWalletObj && hasOlder(feeds[activeWalletObj.id])} onMore={() => activeWalletObj && void loadMany([activeWalletObj], 'older')} />
            </>
          )}
        </main>
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} seenChains={seenChains} />
      <ImportDialog open={importing} onClose={() => setImporting(false)} />
      <VerifyDialog
        open={verifyOpen}
        initial={share}
        onClose={() => {
          setVerifyOpen(false);
          if (share) navigate('', true);
        }}
        seen={(h) => rows.some((r) => r.hash === h)}
      />
      {/* แผงขวา + ม่าน: portal ไป body — เป็น sibling ของทั้งหน้า ไม่อยู่ในกล่องตาราง จึงไม่ดันตาราง */}
      {createPortal(
        <DrawerLayer active={selected !== null}>
          {selected !== null && <button type="button" className="drawer-scrim" aria-label={t('dialog.close')} onClick={closeDetail} />}
          <DetailPanel row={selected} wallets={wallets} chains={chains} settings={settings} onClose={closeDetail} />
        </DrawerLayer>,
        document.body
      )}
    </>
  );
}

/* กล่องชั้นของแผงขวา (ม่าน + แผง) — เปิดแล้วส่วนอื่นของหน้า inert; ปิดแล้วเป็น div ว่างที่ไม่กินที่ */
function DrawerLayer({ active, children }: { active: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useModalLayer(ref, active);
  return (
    <div ref={ref} className="drawer-layer" data-active={active}>
      {children}
    </div>
  );
}
