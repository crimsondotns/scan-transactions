import { useState, type FormEvent } from 'react';
import { useI18n } from '../i18n';
import { ADDRESS_RE, normalizeAddress, useStore } from '../store';
import { Dialog } from './Dialog';
import { useToast } from './Toast';

export function AddWalletDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { wallets, addWallets } = useStore();
  const { toast } = useToast();
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [err, setErr] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const a = normalizeAddress(address);
    if (!ADDRESS_RE.test(a)) return setErr(t('add.badAddress'));
    if (wallets.some((w) => w.address === a)) return setErr(t('add.dupe'));
    addWallets([{ label, address: a }]);
    toast(t('add.done'));
    setLabel('');
    setAddress('');
    setErr(null);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('add.title')}>
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="add-label">
            {t('add.label')}
          </label>
          <input id="add-label" name="label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t('add.labelPh')} autoComplete="off" maxLength={64} />
        </div>
        <div className="field">
          <label className="label" htmlFor="add-address">
            {t('add.address')}
          </label>
          <input
            id="add-address"
            name="address"
            className="input mono"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setErr(null);
            }}
            placeholder={t('add.addressPh')}
            autoComplete="off"
            spellCheck={false}
            required
            aria-invalid={err ? 'true' : undefined}
            aria-describedby={err ? 'add-err' : undefined}
          />
          {err && (
            <span id="add-err" className="error" aria-live="polite">
              {err}
            </span>
          )}
        </div>
        <div className="dlg-actions">
          <button type="button" className="btn" onClick={onClose}>
            {t('dialog.cancel')}
          </button>
          <button type="submit" className="btn btn-primary">
            {t('add.submit')}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
