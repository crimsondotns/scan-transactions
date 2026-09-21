import { useEffect, useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { buildUrl, hasPlaceholder } from '../feed';
import { Dialog } from './Dialog';
import { useToast } from './Toast';

const SAMPLE = '0x0000000000000000000000000000000000000000';

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { settings, setSettings } = useStore();
  const { toast } = useToast();
  const [endpoint, setEndpoint] = useState(settings.endpoint);
  const [pageSize, setPageSize] = useState(String(settings.pageSize));
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEndpoint(settings.endpoint);
      setPageSize(String(settings.pageSize));
      setErr(null);
    }
  }, [open, settings]);

  const valid = /^https:\/\//i.test(endpoint.trim()) && hasPlaceholder(endpoint);
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20));

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return setErr(t('settings.badUrl'));
    setSettings({ endpoint: endpoint.trim(), pageSize: size });
    toast(t('settings.saved'));
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('settings.title')}>
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="set-endpoint">
            {t('settings.endpoint')}
          </label>
          <input
            id="set-endpoint"
            name="endpoint"
            type="url"
            inputMode="url"
            className="input mono"
            value={endpoint}
            onChange={(e) => {
              setEndpoint(e.target.value);
              setErr(null);
            }}
            placeholder={t('settings.endpointPh')}
            autoComplete="off"
            spellCheck={false}
            required
            aria-invalid={err ? 'true' : undefined}
            aria-describedby="set-help"
          />
          <span id="set-help" className="hint">
            {t('settings.help')}
          </span>
          {err && (
            <span className="error" aria-live="polite">
              {err}
            </span>
          )}
        </div>
        <div className="field">
          <label className="label" htmlFor="set-page">
            {t('settings.pageSize')}
          </label>
          <input id="set-page" name="pageSize" type="number" inputMode="numeric" min={1} max={100} className="input" value={pageSize} onChange={(e) => setPageSize(e.target.value)} autoComplete="off" />
        </div>
        {valid && (
          <div className="field">
            <span className="label">{t('settings.preview')}</span>
            <span className="hint mono">{buildUrl(endpoint.trim(), SAMPLE, 0, size)}</span>
          </div>
        )}
        <div className="dlg-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t('settings.save')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
