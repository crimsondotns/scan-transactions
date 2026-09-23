import { useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { useStore } from '../store';
import { ImportError, readWalletFile, SAMPLE_CSV, type ImportRow } from '../importWallets';
import { downloadText } from '../download';
import { Icon } from './Icon';
import { Dialog } from './Dialog';
import { useToast } from './Toast';

export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { wallets, addWallets } = useStore();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setRows(null);
    setErr(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      setRows(await readWalletFile(file, new Set(wallets.map((w) => w.address))));
    } catch (e) {
      setRows(null);
      setErr(e instanceof ImportError && e.kind === 'noHeader' ? t('import.noHeader') : t('import.readFail'));
    } finally {
      setBusy(false);
    }
  }

  const ok = rows?.filter((r) => r.status === 'ok') ?? [];

  function submit() {
    const n = addWallets(ok);
    toast(t('import.done', { n }));
    reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={t('import.title')}
    >
      <div className="stack">
        <div className="field">
          <label className="label" htmlFor="import-file">
            {t('import.file')}
          </label>
          <input id="import-file" ref={fileRef} name="file" type="file" className="input" accept=".csv,.xlsx,.xlsm,.xls,text/csv" onChange={(e) => void pick(e.target.files?.[0])} />
          <span className="hint">{t('import.columns')}</span>
          <button type="button" className="btn-text" onClick={() => downloadText('xcapscan-wallets-sample.csv', SAMPLE_CSV, 'text/csv')}>
            <Icon name="download" />
            {t('import.sample')}
          </button>
          {busy && (
            <span className="hint" aria-live="polite">
              {t('import.reading')}
            </span>
          )}
          {err && (
            <span className="error" aria-live="polite">
              {err}
            </span>
          )}
        </div>

        {rows && (
          <>
            <p className="hint" aria-live="polite">
              {t('import.preview', { ok: ok.length, bad: rows.length - ok.length })}
            </p>
            <div className="preview">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t('import.col.label')}</th>
                    <th scope="col">{t('import.col.address')}</th>
                    <th scope="col">{t('import.col.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} data-bad={r.status !== 'ok'}>
                      <td>{r.label || '—'}</td>
                      <td className="mono">{r.address || '—'}</td>
                      <td>{t(r.status === 'ok' ? 'import.row.ok' : r.status === 'dupe' ? 'import.row.dupe' : 'import.row.bad')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="dlg-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            {t('dialog.cancel')}
          </button>
          <button type="button" className="btn btn-primary" disabled={!ok.length} onClick={submit}>
            {t('import.submit', { n: ok.length })}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
