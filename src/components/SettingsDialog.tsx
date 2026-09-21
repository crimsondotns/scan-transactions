import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { detectEndpoint, useStore } from '../store';
import { hasPlaceholder } from '../feed';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { useToast } from './Toast';

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { settings, addEndpoint, updateEndpoint, removeEndpoint, setPageSize } = useStore();
  const { toast } = useToast();
  const [url, setUrl] = useState('');
  const [err, setErr] = useState<string | null>(null);

  /* ปุ่มเพิ่มติดทันทีที่มีข้อความ — ตรวจความถูกต้องตอนกดส่ง ไม่ใช่ตอนพิมพ์ */
  function submit(e: FormEvent) {
    e.preventDefault();
    const detected = hasPlaceholder(url) ? detectEndpoint(url) : null;
    if (!detected) return setErr(t('settings.badUrl'));
    addEndpoint({ ...detected, url: url.trim() });
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
          <ul className="wallets" aria-label={t('settings.list')}>
            {settings.endpoints.map((ep) => (
              <li key={ep.id} className="wallet">
                <label className="wallet-check">
                  <input type="checkbox" checked={ep.enabled} onChange={(e) => updateEndpoint(ep.id, { enabled: e.target.checked })} aria-label={t('settings.enable', { name: ep.name })} />
                </label>
                <div className="wallet-meta">
                  <span className="wallet-label">
                    {ep.name} <span className="chip">{t(`family.${ep.family}`)}</span>
                  </span>
                  <span className="wallet-addr" title={ep.url}>
                    {ep.url}
                  </span>
                </div>
                <button type="button" className="btn btn-icon" onClick={() => removeEndpoint(ep.id)} aria-label={t('settings.remove', { name: ep.name })} title={t('settings.remove', { name: ep.name })}>
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

        <div className="field" style={{ maxWidth: 120 }}>
          <label className="label" htmlFor="set-page">
            {t('settings.pageSize')}
          </label>
          <input id="set-page" name="pageSize" type="text" inputMode="numeric" pattern="[0-9]*" className="input" value={settings.pageSize} onChange={(e) => setPageSize(Math.min(100, Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 20)))} autoComplete="off" spellCheck={false} />
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
