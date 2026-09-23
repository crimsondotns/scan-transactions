/**
 * ข้อมูลในเครื่อง · สำรองและกู้คืน
 * ไม่มีบัญชี ไม่มีการแชร์ — ข้อมูลอยู่ในเบราว์เซอร์นี้ ย้ายเครื่องด้วยไฟล์สำรองเท่านั้น
 */
import { useState } from 'react';
import { useI18n } from '../i18n';
import { snapshot, useStore } from '../store';
import { Dialog } from './Dialog';
import { Dropdown } from './Dropdown';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { backupFilename, buildBackup, mergeData, readBackup, BackupError, type PortableData } from '../backup';
import { decryptJson, encryptJson, keyFromPassphrase, randomSalt } from '../crypto';

type Mode = 'merge' | 'replace';

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DataDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { wallets, settings, restore } = useStore();
  const [passphrase, setPassphrase] = useState('');
  const [mode, setMode] = useState<Mode>('merge');
  const [importPass, setImportPass] = useState('');
  const [importErr, setImportErr] = useState<string | null>(null);

  const data = (): PortableData => snapshot();

  function exportPlain() {
    download(backupFilename(), JSON.stringify(buildBackup(data()), null, 2));
    toast(t('account.exported'));
  }

  async function exportEncrypted() {
    const salt = randomSalt();
    const key = await keyFromPassphrase(passphrase, salt);
    const payload = await encryptJson(key, buildBackup(data()));
    download(backupFilename(new Date(), true), JSON.stringify({ app: 'xcapscan', kind: 'backup-encrypted', v: 1, salt, payload }, null, 2));
    setPassphrase('');
    toast(t('account.exported'));
  }

  async function importBackup(file: File) {
    setImportErr(null);
    try {
      let raw: unknown = JSON.parse(await file.text());
      if (raw && typeof raw === 'object' && (raw as { kind?: string }).kind === 'backup-encrypted') {
        const { salt, payload } = raw as { salt: string; payload: string };
        if (!importPass) return setImportErr(t('account.needPassphrase'));
        raw = await decryptJson(await keyFromPassphrase(importPass, salt), payload);
      }
      const incoming = readBackup(raw);
      if (mode === 'replace') {
        restore(incoming.data);
        toast(t('account.restored'));
      } else {
        const { data: merged, added } = mergeData(data(), incoming.data);
        restore(merged);
        toast(t('account.merged', { n: added.wallets + added.endpoints + added.chains }));
      }
      setImportPass('');
    } catch (e) {
      setImportErr(e instanceof BackupError ? t(`account.err.${e.code}`) : t('account.err.shape'));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('account.title')}>
      <div className="stack">
        <section className="field">
          <h3 className="panel-title">{t('account.data')}</h3>
          <p className="hint">{t('account.dataWhere', { wallets: wallets.length, sources: settings.endpoints.length })}</p>
        </section>

        <section className="field">
          <h3 className="panel-title">{t('account.backup')}</h3>
          <div className="inline">
            <button type="button" className="btn btn-primary" onClick={exportPlain}>
              <Icon name="download" />
              {t('account.export')}
            </button>
            <input className="input" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} autoComplete="new-password" aria-label={t('account.passphrase')} />
            <button type="button" className="btn" disabled={passphrase.length < 8} onClick={() => void exportEncrypted()}>
              <Icon name="lock" />
              {t('account.exportEncrypted')}
            </button>
          </div>
          <div className="inline">
            <Dropdown
              size="sm"
              value={mode}
              onChange={setMode}
              label={t('account.importMode')}
              options={[
                { value: 'merge' as const, label: t('account.merge') },
                { value: 'replace' as const, label: t('account.replace') },
              ]}
            />
            <input className="input" type="password" value={importPass} onChange={(e) => setImportPass(e.target.value)} autoComplete="off" aria-label={t('account.passphrase')} />
            <label className="btn">
              <Icon name="upload" />
              {t('account.import')}
              <input
                type="file"
                accept="application/json,.json"
                className="file-hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importBackup(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {importErr && <span className="error">{importErr}</span>}
          <p className="hint">{t('account.backupNote')}</p>
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
