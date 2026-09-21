import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { useStore, type Family } from '../store';
import { buildUrl, hasPlaceholder } from '../feed';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
import { useToast } from './Toast';

const SAMPLE: Record<Family, string> = { evm: '0x0000000000000000000000000000000000000000', sol: '11111111111111111111111111111111' };
const FAMILIES: Family[] = ['evm', 'sol'];

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { settings, addEndpoint, updateEndpoint, removeEndpoint, setPageSize } = useStore();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [family, setFamily] = useState<Family>('evm');
  const [url, setUrl] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const valid = /^https:\/\//i.test(url.trim()) && hasPlaceholder(url);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return setErr(t('settings.badUrl'));
    addEndpoint({ name: name.trim() || t(`family.${family}`), url: url.trim(), family });
    toast(t('settings.added'));
    setName('');
    setUrl('');
    setErr(null);
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('settings.title')}>
      <div className="stack">
        <p className="hint">{t('settings.help')}</p>

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

        <form onSubmit={submit} aria-labelledby="ep-add-h">
          <h3 id="ep-add-h" className="panel-title">
            {t('settings.add')}
          </h3>
          <div className="row-actions">
            <div className="field" style={{ flex: '1 1 140px' }}>
              <label className="label" htmlFor="ep-name">
                {t('settings.name')}
              </label>
              <input id="ep-name" name="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('settings.namePh')} autoComplete="off" maxLength={40} />
            </div>
            <div className="field" style={{ flex: '0 0 140px' }}>
              <label className="label" htmlFor="ep-family">
                {t('settings.family')}
              </label>
              <select id="ep-family" className="select" value={family} onChange={(e) => setFamily(e.target.value as Family)}>
                {FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {t(`family.${f}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="ep-url">
              {t('settings.endpoint')}
            </label>
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
              placeholder={t('settings.endpointPh')}
              autoComplete="off"
              spellCheck={false}
              required
              aria-invalid={err ? 'true' : undefined}
              aria-describedby="ep-help"
            />
            <span id="ep-help" className="hint">
              {t('settings.placeholders')}
            </span>
            {err && (
              <span className="error" aria-live="polite">
                {err}
              </span>
            )}
            {valid && <span className="hint mono">{buildUrl(url.trim(), SAMPLE[family], null, settings.pageSize)}</span>}
          </div>
          <div className="dlg-actions">
            <button type="submit" className="btn btn-primary" disabled={!valid}>
              {t('settings.addBtn')}
            </button>
          </div>
        </form>

        <div className="field" style={{ maxWidth: 160 }}>
          <label className="label" htmlFor="set-page">
            {t('settings.pageSize')}
          </label>
          <input id="set-page" name="pageSize" type="number" inputMode="numeric" min={1} max={100} className="input" value={settings.pageSize} onChange={(e) => setPageSize(Math.min(100, Math.max(1, Number(e.target.value) || 20)))} autoComplete="off" />
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
