import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { detectEndpoint, useStore, type Family } from '../store';
import { Dropdown } from './Dropdown';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { useToast } from './Toast';

const FAMILIES: Family[] = ['evm', 'sol'];

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { settings, addEndpoint, updateEndpoint, removeEndpoint, setPageSize, setChainListUrl, setPriceUrl } = useStore();
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [family, setFamily] = useState<Family | 'auto'>('auto');
  const [chainUrl, setChainUrl] = useState(settings.chainListUrl);
  const [chainErr, setChainErr] = useState<string | null>(null);
  const [priceUrl, setPriceUrlText] = useState(settings.priceUrl);
  const [priceErr, setPriceErr] = useState<string | null>(null);

  /* ปุ่มเพิ่มติดทันทีที่มีข้อความ — ตรวจความถูกต้องตอนกดส่ง ไม่ใช่ตอนพิมพ์ */
  function submit(e: FormEvent) {
    e.preventDefault();
    const detected = detectEndpoint(url);
    if (!detected) return setErr(t('settings.badUrl'));
    addEndpoint({ ...detected, family: family === 'auto' ? detected.family : family, url: url.trim() });
    toast(t('settings.added'));
    setUrl('');
    setErr(null);
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('settings.title')}>
      <div className="stack">
        {settings.endpoints.length === 0 ? (
          <p className="hint">{t('settings.none')}</p>
        ) : (
          <ul className="sources" aria-label={t('settings.list')}>
            {settings.endpoints.map((ep) => (
              <li key={ep.id} className="source">
                <label className="wallet-check">
                  <input type="checkbox" checked={ep.enabled} onChange={(e) => updateEndpoint(ep.id, { enabled: e.target.checked })} aria-label={t('settings.enable', { name: ep.name })} />
                </label>
                <div className="wallet-meta">
                  <span className="wallet-label">
                    {ep.name}
                  </span>
                  <span className="wallet-addr" title={ep.url}>
                    {ep.url}
                  </span>
                </div>
                <Dropdown size="sm" align="right" value={ep.family} onChange={(f) => updateEndpoint(ep.id, { family: f })} label={t('settings.family')} options={FAMILIES.map((f) => ({ value: f, label: t(`family.${f}`) }))} />
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
              <Dropdown size="sm" value={family} onChange={setFamily} label={t('settings.family')} options={[{ value: 'auto' as const, label: t('family.auto') }, ...FAMILIES.map((f) => ({ value: f, label: t(`family.${f}`) }))]} />
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
        <div className="dlg-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t('dialog.close')}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
