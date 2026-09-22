import { useEffect, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { SLIP_FIELDS, detectEndpoint, useStore, type Family } from '../store';
import { Dropdown } from './Dropdown';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { useToast } from './Toast';

const FAMILIES: Family[] = ['evm', 'sol'];

/* Token metadata URL ต่อแหล่ง — แก้ได้หลังเพิ่มแหล่งแล้ว (ปุ่ม Add ติดเมื่อค่าเปลี่ยน; ล้างค่าแล้วกด = เอาออก) */
function MetaField({ id, value, onSave }: { id: string; value: string; onSave: (v: string) => void }) {
  const { t } = useI18n();
  const [text, setText] = useState(value);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setText(value), [value]);
  return (
    <form
      className="source-meta"
      onSubmit={(e) => {
        e.preventDefault();
        const v = text.trim();
        if (v && !/^https:\/\//i.test(v)) return setErr(t('settings.badUrl'));
        setErr(null);
        onSave(v);
      }}
      noValidate
    >
      <label className="label" htmlFor={`meta-${id}`}>
        {t('settings.metaUrl')}
      </label>
      <div className="inline">
        <input
          id={`meta-${id}`}
          name="metaUrl"
          type="url"
          inputMode="url"
          className="input input-sm mono"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setErr(null);
          }}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={err ? 'true' : undefined}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={text.trim() === value}>
          {t('settings.addBtn')}
        </button>
      </div>
      {err && (
        <span className="error" aria-live="polite">
          {err}
        </span>
      )}
    </form>
  );
}

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { settings, addEndpoint, updateEndpoint, reorderEndpoints, removeEndpoint, setPageSize, setChainListUrl, setPriceUrl, setSlipShow, setProxyUrl, setChain, removeChain } = useStore();
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [family, setFamily] = useState<Family | 'auto'>('auto');
  const [authHeader, setAuthHeader] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [metaUrl, setMetaUrl] = useState('');
  const [metaErr, setMetaErr] = useState<string | null>(null);
  const [chainUrl, setChainUrl] = useState(settings.chainListUrl);
  const [chainErr, setChainErr] = useState<string | null>(null);
  const [priceUrl, setPriceUrlText] = useState(settings.priceUrl);
  const [priceErr, setPriceErr] = useState<string | null>(null);
  const [chainId, setChainId] = useState('');
  const [chainName, setChainName] = useState('');
  const [chainLogo, setChainLogo] = useState('');
  const [chainExplorer, setChainExplorer] = useState('');
  const [chainFormErr, setChainFormErr] = useState<string | null>(null);
  const [proxyUrl, setProxyUrlText] = useState(settings.proxyUrl);
  const [proxyErr, setProxyErr] = useState<string | null>(null);

  /* ปุ่มเพิ่มติดทันทีที่มีข้อความ — ตรวจความถูกต้องตอนกดส่ง ไม่ใช่ตอนพิมพ์ */
  function submit(e: FormEvent) {
    e.preventDefault();
    const detected = detectEndpoint(url);
    if (!detected) return setErr(t('settings.badUrl'));
    if (metaUrl.trim() && !/^https:\/\//i.test(metaUrl.trim())) return setMetaErr(t('settings.badUrl'));
    addEndpoint({
      ...detected,
      family: family === 'auto' ? detected.family : family,
      url: url.trim(),
      authHeader: authHeader.trim() || undefined,
      apiKey: apiKey.trim() || undefined,
      metaUrl: metaUrl.trim() || undefined,
    });
    toast(t('settings.added'));
    setUrl('');
    setMetaUrl('');
    setAuthHeader('');
    setApiKey('');
    setErr(null);
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('settings.title')}>
      <div className="stack">
        {settings.endpoints.length === 0 ? (
          <p className="hint">{t('settings.none')}</p>
        ) : (
          <ul className="sources" aria-label={t('settings.list')}>
            {settings.endpoints.map((ep, i) => (
              <li
                key={ep.id}
                className="source"
                data-off={!ep.enabled}
                data-dragover={dragOver === i && dragFrom !== i}
                draggable
                onDragStart={(e) => {
                  setDragFrom(i);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOver !== i) setDragOver(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom !== null) reorderEndpoints(dragFrom, i);
                  setDragFrom(null);
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
              >
                <span className="source-grip" title={t('settings.dragHint')} aria-hidden="true">
                  <Icon name="grip" />
                </span>
                <span className="source-icon" data-on={ep.enabled}>
                  <Icon name={ep.family === 'sol' ? 'layers' : 'hexagon'} />
                </span>
                <div className="wallet-meta">
                  <span className="wallet-label with-logo">
                    {ep.name}
                    <Dropdown
                      size="sm"
                      value={ep.family}
                      onChange={(f) => updateEndpoint(ep.id, { family: f })}
                      label={t('settings.family')}
                      options={FAMILIES.map((f) => ({ value: f, label: t(`family.${f}`) }))}
                    />
                  </span>
                  <span className="wallet-addr" title={ep.url}>
                    {ep.apiKey && <Icon name="lock" width={12} height={12} style={{ verticalAlign: '-1px', marginRight: 4 }} />}
                    {ep.metaUrl && <Icon name="layers" width={12} height={12} style={{ verticalAlign: '-1px', marginRight: 4 }} />}
                    {ep.enabled ? t('settings.priority', { n: settings.endpoints.filter((x) => x.enabled).indexOf(ep) + 1 }) : t('settings.disabled')} · {ep.url}
                  </span>
                  <MetaField id={ep.id} value={ep.metaUrl ?? ''} onSave={(v) => updateEndpoint(ep.id, { metaUrl: v || undefined })} />
                </div>
                <button
                  type="button"
                  className="switch"
                  role="switch"
                  aria-checked={ep.enabled}
                  onClick={() => updateEndpoint(ep.id, { enabled: !ep.enabled })}
                  aria-label={t('settings.enable', { name: ep.name })}
                  title={t('settings.enable', { name: ep.name })}
                />
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => removeEndpoint(ep.id)}
                  aria-label={t('settings.remove', { name: ep.name })}
                  title={t('settings.remove', { name: ep.name })}
                >
                  <Icon name="trash" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={submit} aria-labelledby="ep-add-h" noValidate>
          <h3 id="ep-add-h" className="panel-title">
            {t('settings.add')}
          </h3>
          <div className="field">
            <label className="label" htmlFor="ep-url">
              {t('settings.endpoint')}
            </label>
            <div className="inline">
              <input
                id="ep-url"
                name="url"
                type="url"
                inputMode="url"
                className="input mono"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setErr(null);
                }}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={err ? 'true' : undefined}
              />
              <Dropdown
                size="sm"
                value={family}
                onChange={setFamily}
                label={t('settings.family')}
                options={[{ value: 'auto' as const, label: t('family.auto') }, ...FAMILIES.map((f) => ({ value: f, label: t(`family.${f}`) }))]}
              />
              <button type="submit" className="btn btn-primary" disabled={url.trim() === ''}>
                {t('settings.addBtn')}
              </button>
            </div>
            {err && (
              <span className="error" aria-live="polite">
                {err}
              </span>
            )}
          </div>
          <div className="inline auth-row">
            <div className="field">
              <label className="label" htmlFor="ep-hdr">
                {t('settings.authHeader')}
              </label>
              <input id="ep-hdr" name="authHeader" type="text" className="input mono" value={authHeader} onChange={(e) => setAuthHeader(e.target.value)} autoComplete="off" spellCheck={false} />
            </div>
            <div className="field">
              <label className="label" htmlFor="ep-key">
                {t('settings.apiKey')}
              </label>
              <input id="ep-key" name="apiKey" type="password" className="input mono" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" spellCheck={false} />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="ep-meta">
              {t('settings.metaUrl')}
            </label>
            <input
              id="ep-meta"
              name="metaUrl"
              type="url"
              inputMode="url"
              className="input mono"
              value={metaUrl}
              onChange={(e) => {
                setMetaUrl(e.target.value);
                setMetaErr(null);
              }}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={metaErr ? 'true' : undefined}
            />
            {metaErr && (
              <span className="error" aria-live="polite">
                {metaErr}
              </span>
            )}
          </div>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^https:\/\//i.test(chainUrl.trim())) return setChainErr(t('settings.badUrl'));
            setChainListUrl(chainUrl);
            setChainErr(null);
            toast(t('settings.chainListSaved'));
          }}
          noValidate
        >
          <div className="field">
            <label className="label" htmlFor="set-chains">
              {t('settings.chainList')}
            </label>
            <div className="inline">
              <input
                id="set-chains"
                name="chainList"
                type="url"
                inputMode="url"
                className="input mono"
                value={chainUrl}
                onChange={(e) => {
                  setChainUrl(e.target.value);
                  setChainErr(null);
                }}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={chainErr ? 'true' : undefined}
              />
              <button type="submit" className="btn btn-primary" disabled={chainUrl.trim() === '' || chainUrl.trim() === settings.chainListUrl}>
                {t('settings.addBtn')}
              </button>
            </div>
            {chainErr && (
              <span className="error" aria-live="polite">
                {chainErr}
              </span>
            )}
            {settings.chainListUrl && (
              <span className="hint with-logo">
                <span className="mono">{settings.chainListUrl}</span>
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => {
                    setChainListUrl('');
                    setChainUrl('');
                  }}
                  aria-label={t('settings.remove', { name: t('settings.chainList') })}
                  title={t('settings.remove', { name: t('settings.chainList') })}
                >
                  <Icon name="trash" />
                </button>
              </span>
            )}
          </div>
        </form>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^https:\/\//i.test(priceUrl.trim())) return setPriceErr(t('settings.badUrl'));
            setPriceUrl(priceUrl);
            setPriceErr(null);
            toast(t('settings.priceUrlSaved'));
          }}
          noValidate
        >
          <div className="field">
            <label className="label" htmlFor="set-price">
              {t('settings.priceUrl')}
            </label>
            <div className="inline">
              <input
                id="set-price"
                name="priceUrl"
                type="url"
                inputMode="url"
                className="input mono"
                value={priceUrl}
                onChange={(e) => {
                  setPriceUrlText(e.target.value);
                  setPriceErr(null);
                }}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={priceErr ? 'true' : undefined}
              />
              <button type="submit" className="btn btn-primary" disabled={priceUrl.trim() === '' || priceUrl.trim() === settings.priceUrl}>
                {t('settings.addBtn')}
              </button>
            </div>
            {priceErr && (
              <span className="error" aria-live="polite">
                {priceErr}
              </span>
            )}
            {settings.priceUrl && (
              <span className="hint with-logo">
                <span className="mono">{settings.priceUrl}</span>
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => {
                    setPriceUrl('');
                    setPriceUrlText('');
                  }}
                  aria-label={t('settings.remove', { name: t('settings.priceUrl') })}
                  title={t('settings.remove', { name: t('settings.priceUrl') })}
                >
                  <Icon name="trash" />
                </button>
              </span>
            )}
          </div>
        </form>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!/^https:\/\//i.test(proxyUrl.trim())) return setProxyErr(t('settings.badUrl'));
            setProxyUrl(proxyUrl);
            setProxyErr(null);
            toast(t('settings.proxySaved'));
          }}
          noValidate
        >
          <div className="field">
            <label className="label" htmlFor="set-proxy">
              {t('settings.proxy')}
            </label>
            <div className="inline">
              <input
                id="set-proxy"
                name="proxy"
                type="url"
                inputMode="url"
                className="input mono"
                value={proxyUrl}
                onChange={(e) => {
                  setProxyUrlText(e.target.value);
                  setProxyErr(null);
                }}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={proxyErr ? 'true' : undefined}
              />
              <button type="submit" className="btn btn-primary" disabled={proxyUrl.trim() === '' || proxyUrl.trim() === settings.proxyUrl}>
                {t('settings.addBtn')}
              </button>
            </div>
            {proxyErr && (
              <span className="error" aria-live="polite">
                {proxyErr}
              </span>
            )}
            {settings.proxyUrl && (
              <span className="hint with-logo">
                <span className="mono">{settings.proxyUrl}</span>
                <button
                  type="button"
                  className="btn btn-icon"
                  onClick={() => {
                    setProxyUrl('');
                    setProxyUrlText('');
                  }}
                  aria-label={t('settings.remove', { name: t('settings.proxy') })}
                  title={t('settings.remove', { name: t('settings.proxy') })}
                >
                  <Icon name="x" />
                </button>
              </span>
            )}
          </div>
        </form>
        <div className="field" style={{ maxWidth: 120 }}>
          <label className="label" htmlFor="set-page">
            {t('settings.pageSize')}
          </label>
          <input
            id="set-page"
            name="pageSize"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            className="input"
            value={settings.pageSize}
            onChange={(e) => setPageSize(Math.min(100, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 20)))}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {/* เชนกำหนดเอง: โลโก้/explorer ต่อ chain id — ใช้ก่อน chain list (เช่นเชนที่ chain list ไม่มี) */}
        <form
          aria-labelledby="chains-h"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const id = chainId.trim().toLowerCase();
            if (!/^[a-z0-9_-]{1,32}$/.test(id)) return setChainFormErr(t('settings.badChain'));
            for (const v of [chainLogo, chainExplorer]) if (v.trim() && !/^https:\/\//i.test(v.trim())) return setChainFormErr(t('settings.badUrl'));
            setChain({ id, name: chainName.trim() || undefined, logo: chainLogo.trim() || undefined, explorer: chainExplorer.trim() || undefined });
            setChainId('');
            setChainName('');
            setChainLogo('');
            setChainExplorer('');
            setChainFormErr(null);
            toast(t('settings.chainSaved'));
          }}
        >
          <h3 id="chains-h" className="panel-title">
            {t('settings.chains')}
          </h3>
          {settings.chains.length > 0 && (
            <ul className="sources slip-fields" aria-label={t('settings.chains')}>
              {settings.chains.map((c) => (
                <li key={c.id} className="source">
                  <span className="source-icon" data-on="true">
                    {c.logo ? <Logo src={c.logo} name={c.name ?? c.id} size={20} /> : <Icon name="hexagon" />}
                  </span>
                  <div className="wallet-meta">
                    <span className="wallet-label">
                      {c.name ?? c.id} <span className="hint mono">{c.id}</span>
                    </span>
                    <span className="wallet-addr" title={c.explorer ?? ''}>
                      {c.explorer ?? '—'}
                    </span>
                  </div>
                  <button type="button" className="btn btn-icon" onClick={() => removeChain(c.id)} aria-label={t('settings.remove', { name: c.id })} title={t('settings.remove', { name: c.id })}>
                    <Icon name="trash" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="inline auth-row">
            <div className="field" style={{ maxWidth: 140 }}>
              <label className="label" htmlFor="ch-id">
                {t('settings.chainId')}
              </label>
              <input
                id="ch-id"
                name="chainId"
                type="text"
                className="input mono"
                value={chainId}
                onChange={(e) => {
                  setChainId(e.target.value);
                  setChainFormErr(null);
                }}
                autoComplete="off"
                spellCheck={false}
                aria-invalid={chainFormErr ? 'true' : undefined}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="ch-name">
                {t('settings.chainName')}
              </label>
              <input id="ch-name" name="chainName" type="text" className="input" value={chainName} onChange={(e) => setChainName(e.target.value)} autoComplete="off" spellCheck={false} />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="ch-logo">
              {t('settings.chainLogo')}
            </label>
            <input
              id="ch-logo"
              name="chainLogo"
              type="url"
              inputMode="url"
              className="input mono"
              value={chainLogo}
              onChange={(e) => {
                setChainLogo(e.target.value);
                setChainFormErr(null);
              }}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="ch-exp">
              {t('settings.chainExplorer')}
            </label>
            <div className="inline">
              <input
                id="ch-exp"
                name="chainExplorer"
                type="url"
                inputMode="url"
                className="input mono"
                value={chainExplorer}
                onChange={(e) => {
                  setChainExplorer(e.target.value);
                  setChainFormErr(null);
                }}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="btn btn-primary" disabled={chainId.trim() === ''}>
                {t('settings.addBtn')}
              </button>
            </div>
            {chainFormErr && (
              <span className="error" aria-live="polite">
                {chainFormErr}
              </span>
            )}
          </div>
        </form>
        {/* ป้ายบนสลิป: สวิตช์ต่อรายการ (ไม่มี checkbox) — มีผลกับสลิปที่เปิดครั้งถัดไป */}
        <section aria-labelledby="slip-h">
          <h3 id="slip-h" className="panel-title">
            {t('settings.slip')}
          </h3>
          <ul className="sources slip-fields" aria-label={t('settings.slip')}>
            {SLIP_FIELDS.map((f) => (
              <li key={f} className="source" data-off={!settings.slipShow[f]}>
                <div className="wallet-meta">
                  <span className="wallet-label">{t(`slipField.${f}`)}</span>
                </div>
                <button
                  type="button"
                  className="switch"
                  role="switch"
                  aria-checked={settings.slipShow[f]}
                  onClick={() => setSlipShow(f, !settings.slipShow[f])}
                  aria-label={t(`slipField.${f}`)}
                  title={t(`slipField.${f}`)}
                />
              </li>
            ))}
          </ul>
        </section>
        <div className="dlg-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t('dialog.close')}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
