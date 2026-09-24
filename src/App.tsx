import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from './i18n';
import { useStore } from './store';
import { endpointsFor, hasOlder, useFeed } from './useFeed';
import { XCapMark } from './components/XCapMark';
import { Icon } from './components/Icon';
import { ImportDialog } from './components/ImportDialog';
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
import { lastTime } from './flow';
import { groupExists, matchesGroup, type GroupId } from './groups';
import { GroupMenubar } from './components/GroupNav';
import { Finder } from './components/Finder';
import { Dashboard } from './pages/Dashboard';
import { WalletPage } from './pages/WalletPage';
import { AssetPage } from './pages/AssetPage';
import type { Range } from './components/FlowChart';

/** เส้นทาง: '' = แดชบอร์ด · '<id>' = กระเป๋า · 't/<sym>' = โทเคน (ทุกกระเป๋า) · '<id>/t/<sym>' = โทเคนในกระเป๋านั้น · 'v/<code>' = ตรวจสลิป */
function parseRoute(route: string): { wallet: string | null; token: string | null; share: string | null } {
  const seg = route.split('/').filter(Boolean).map(decodeURIComponent);
  if (seg[0] === 'v') return { wallet: null, token: null, share: seg.slice(1).join('/') };
  if (seg[0] === 't') return { wallet: null, token: seg[1] ?? null, share: null };
  if (!seg[0]) return { wallet: null, token: null, share: null };
  return { wallet: seg[0], token: seg[1] === 't' ? (seg[2] ?? null) : null, share: null };
}

const walletPath = (id: string) => encodeURIComponent(id);
const tokenPath = (symbol: string, walletId: string | null) => (walletId ? `${encodeURIComponent(walletId)}/t/${encodeURIComponent(symbol)}` : `t/${encodeURIComponent(symbol)}`);

export function App() {
  const { t } = useI18n();
  const { wallets, settings } = useStore();
  // 👇 เพิ่ม fillMeta เข้าไปใน destructuring (จุดที่ 1)
  const { feeds, loadMany, loadStaggered, cancelStaggered, progress, ensure, reset, forget, fillMeta } = useFeed(settings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const route = useRoute();
  const parsed = useMemo(() => parseRoute(route), [route]);
  const pageWallet = parsed.wallet;
  const pageToken = parsed.token;
  /* /v/<code>[.<data>] = ลิงก์ตรวจสลิป → เปิดไดอะล็อกตรวจทับแดชบอร์ด */
  const share = useMemo(() => (parsed.share === null ? null : parseShare(parsed.share)), [parsed.share]);
  const [verifyOpen, setVerifyOpen] = useState(false);
  useEffect(() => {
    if (share) setVerifyOpen(true);
  }, [share]);
  const page: 'dashboard' | 'wallet' | 'asset' = pageToken ? 'asset' : pageWallet ? 'wallet' : 'dashboard';
  const [selected, setSelected] = useState<TxRow | null>(null);
  /* กลุ่มกระเป๋าที่เลือกอยู่ (แถบซ้าย/เมนูบนหัว) และช่วงเวลาของกราฟ — เป็นมุมมอง ไม่ใช่ข้อมูล จึงไม่อยู่ใน URL */
  const [group, setGroup] = useState<GroupId>('all');
  const [range, setRange] = useState<Range>(30);
  /* กระเป๋าที่กำลังดู (null = ทุกกระเป๋า) */
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
  const openWallet = useCallback(
    (id: string | null) => {
      selectWallet(id);
      navigate(id ? walletPath(id) : '');
    },
    [selectWallet]
  );
  const openToken = useCallback(
    (symbol: string, walletId: string | null) => {
      if (walletId) selectWallet(walletId);
      navigate(tokenPath(symbol, walletId));
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
  /* ลบแท็ก/กระเป๋าสุดท้ายของกลุ่มที่เลือกอยู่ → กลุ่มนั้นหายไป กลับไปที่ "ทุกกระเป๋า" */
  useEffect(() => {
    if (!groupExists(group, wallets)) setGroup('all');
  }, [group, wallets]);

  const infoOf = useCallback(
    (w: { id: string }) => ({ loaded: feeds[w.id]?.loaded === true, last: lastTime(feeds[w.id]?.rows ?? []) }),
    [feeds]
  );
  /* กระเป๋าของกลุ่มที่เลือก (ทั้งที่ซ่อนอยู่ด้วย — ตารางยังต้องเห็นเพื่อเปิดกลับ) */
  const groupWallets = useMemo(() => wallets.filter((w) => matchesGroup(group, w, infoOf(w))), [wallets, group, infoOf]);
  const rows = useMemo(() => active.flatMap((w) => feeds[w.id]?.rows ?? []).sort((a, b) => b.time - a.time), [active, feeds]);
  const groupRows = useMemo(() => {
    const ids = new Set(groupWallets.filter((w) => w.enabled).map((w) => w.id));
    return rows.filter((r) => ids.has(r.walletId));
  }, [rows, groupWallets]);

  /* เปิดแดชบอร์ด → โหลดกระเป๋าที่ยังไม่มีข้อมูลแบบเว้นจังหวะ (5 ต่อชุด เว้น 2 วิ) เริ่มครั้งเดียวต่อชุดแหล่งข้อมูล */
  const startedFor = useRef<string | null>(null);
  useEffect(() => {
    if (page !== 'dashboard' || !hasEndpoint || !active.length) return;
    if (startedFor.current === epKey) return;
    startedFor.current = epKey;
    void loadStaggered(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasEndpoint, epKey, active.length]);

  const walletRows = useMemo(() => (pageWallet ? rows.filter((r) => r.walletId === pageWallet) : rows), [rows, pageWallet]);
  const anyLoading = active.some((w) => feeds[w.id]?.loading);
  const activeWalletObj = wallets.find((w) => w.id === pageWallet) ?? null;
  const errors = active.flatMap((w) => Object.entries(feeds[w.id]?.errors ?? {}).map(([epId, e]) => ({ w, ep: settings.endpoints.find((x) => x.id === epId), e })));
  const loadGroup = useCallback(() => {
    void loadStaggered(groupWallets.filter((w) => w.enabled && !feeds[w.id]?.loaded));
  }, [groupWallets, feeds, loadStaggered]);

  function errMsg({ w, ep, e }: (typeof errors)[number]): string {
    const msg = e.kind === 'http' && e.status === 429 ? t('tx.errorRate') : e.kind === 'http' ? t('tx.errorHttp', { status: e.status }) : e.kind === 'shape' ? t('tx.errorShape') : t('tx.errorNet');
    return `${w.label} · ${ep?.name ?? '?'}: ${t('tx.error', { msg })}`;
  }

  const errorList =
    errors.length > 0 ? (
      <div className="field" aria-live="polite">
        {errors.map((x) => (
          <span key={`${x.w.id}:${x.ep?.id}`} className="error">
            {errMsg(x)}
          </span>
        ))}
      </div>
    ) : null;

  return (
    <>
      <a className="skip" href="#main">
        {t('nav.skip')}
      </a>
      <header className="top">
        <button type="button" className="brand" onClick={goDashboard} aria-label={t('nav.dashboard')}>
          <XCapMark />
          {t('app.name')} <span className="brand-sub">{t('app.sub')}</span>
        </button>
        {page !== 'dashboard' && <GroupMenubar wallets={wallets} infoOf={infoOf} group={group} onChange={(g) => { setGroup(g); goDashboard(); }} chains={chains} />}
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
        <Finder wallets={wallets} rows={rows} onWallet={(id) => openWallet(id)} onToken={openToken} />
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
              {errorList}
              <Dashboard
                all={wallets}
                wallets={groupWallets}
                rows={groupRows}
                feeds={feeds}
                chains={chains}
                group={group}
                onGroup={setGroup}
                infoOf={infoOf}
                range={range}
                onRange={setRange}
                onOpenWallet={openWallet}
                onSwitch={selectWallet}
                onRemove={forget}
                hasSource={(w) => endpointsFor(w, settings).length > 0}
                onLoadGroup={loadGroup}
                loading={anyLoading}
                progress={progress}
                onCancel={cancelStaggered}
                selected={selected?.key ?? null}
                onSelect={setSelected}
              />
            </div>
          ) : page === 'asset' && pageToken ? (
            <div className="stack-lg">
              {errorList}
              <AssetPage
                symbol={pageToken}
                wallet={activeWalletObj}
                all={wallets}
                rows={pageWallet ? walletRows : groupRows}
                chains={chains}
                group={group}
                range={range}
                onRange={setRange}
                onBack={goDashboard}
                onBackWallet={() => pageWallet && openWallet(pageWallet)}
                onWallet={(id) => openToken(pageToken, id)}
                onScopeAll={() => openToken(pageToken, null)}
                selected={selected?.key ?? null}
                onSelect={setSelected}
                loading={anyLoading}
              />
            </div>
          ) : activeWalletObj ? (
            <div className="stack-lg">
              {errorList}
              <WalletPage
                wallet={activeWalletObj}
                all={wallets}
                rows={walletRows}
                chains={chains}
                group={group}
                range={range}
                onRange={setRange}
                onBack={goDashboard}
                onWallet={(id) => openWallet(id || null)}
                onToken={(sym) => openToken(sym, activeWalletObj.id)}
                selected={selected?.key ?? null}
                onSelect={setSelected}
                loading={anyLoading}
                hasMore={hasOlder(feeds[activeWalletObj.id])}
                onMore={() => void loadMany([activeWalletObj], 'older')}
                onReload={() => void loadMany([activeWalletObj], 'reset')}
                onFetchMeta={fillMeta} /* 👈 จุดที่ 2: ส่ง fillMeta ลงไป */
              />
            </div>
          ) : null}
        </main>
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
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