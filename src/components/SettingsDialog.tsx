/**
 * ตั้งค่า — สองแท็บ: ทั่วไป (การแสดงผล + ป้ายบนสลิป) และ ข้อมูล (สำรอง/กู้คืน + สรุปแหล่งข้อมูล)
 * แหล่งข้อมูล/เชน/การเชื่อมต่อ มาจากค่าที่ฝังตอน build แล้ว (ดู docs/build-config.md) จึงเหลือเป็นบรรทัดสรุปอ่านอย่างเดียว
 */
import { useState, type ReactNode } from 'react';
import { useI18n, type MessageKey } from '../i18n';
import { SLIP_FIELDS, snapshot, useStore } from '../store';
import { Dialog } from './Dialog';
import { DialogTabs, type TabDef } from './DialogTabs';
import { Dropdown } from './Dropdown';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { backupFilename, buildBackup, mergeData, readBackup, BackupError, type PortableData } from '../backup';
import { decryptJson, encryptJson, keyFromPassphrase, randomSalt } from '../crypto';
import { downloadText } from '../download';

type Tab = 'general' | 'data';
type Mode = 'merge' | 'replace';

const TABS = (t: (k: MessageKey) => string): Array<TabDef<Tab>> => [
  { id: 'general', label: t('settings.tab.general'), icon: 'settings' },
  { id: 'data', label: t('settings.tab.data'), icon: 'layers' },
];

/** หนึ่งแถวของหน้าตั้งค่า: ชื่อ (+คำอธิบาย) ซ้าย ตัวควบคุมขวา */
function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="set-row">
      <span className="set-row-main">
        <span className="set-row-title">{title}</span>
        {desc && <span className="set-row-desc">{desc}</span>}
      </span>
      {children}
    </div>
  );
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="set-group">
      <h3 className="set-group-title">{title}</h3>
      <div className="set-rows">{children}</div>
      {note && <p className="hint">{note}</p>}
    </section>
  );
}

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { wallets, settings, setPageSize, setHideScam, setSlipShow, restore } = useStore();
  const [tab, setTab] = useState<Tab>('general');

  const [passphrase, setPassphrase] = useState('');
  const [mode, setMode] = useState<Mode>('merge');
  const [importPass, setImportPass] = useState('');
  const [importErr, setImportErr] = useState<string | null>(null);

  const data = (): PortableData => snapshot();

  function exportPlain() {
    downloadText(backupFilename(), JSON.stringify(buildBackup(data()), null, 2));
    toast(t('account.exported'));
  }

  async function exportEncrypted() {
    const salt = randomSalt();
    const payload = await encryptJson(await keyFromPassphrase(passphrase, salt), buildBackup(data()));
    downloadText(backupFilename(new Date(), true), JSON.stringify({ app: 'xcapscan', kind: 'backup-encrypted', v: 1, salt, payload }, null, 2));
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
        // แหล่งข้อมูล/เชน ไม่ได้อยู่ในไฟล์สำรอง — เขียนทับด้วยของว่างไม่ได้ ต้องคงของที่มากับตัวเว็บไว้
        restore({ wallets: incoming.data.wallets, settings: { ...incoming.data.settings, endpoints: settings.endpoints, chainListUrl: settings.chainListUrl, chains: settings.chains } });
        toast(t('account.restored'));
      } else {
        const { data: merged, added } = mergeData(data(), incoming.data);
        restore(merged);
        toast(t('account.merged', { n: added.wallets }));
      }
      setImportPass('');
    } catch (e) {
      setImportErr(e instanceof BackupError ? t(`account.err.${e.code}`) : t('account.err.shape'));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('settings.title')} wide>
      <DialogTabs tabs={TABS(t)} active={tab} onChange={setTab} label={t('settings.title')}>
        {tab === 'general' && (
          <>
            <Group title={t('settings.display')}>
              <Row title={t('settings.pageSize')} desc={t('settings.pageSizeDesc')}>
                <input
                  id="set-page"
                  name="pageSize"
                  type="text"
                  inputMode="numeric"
                  className="input input-sm set-num"
                  value={settings.pageSize}
                  onChange={(e) => setPageSize(Math.min(200, Math.max(5, Number(e.target.value.replace(/\D/g, '')) || 0)))}
                  aria-label={t('settings.pageSize')}
                  autoComplete="off"
                  spellCheck={false}
                />
              </Row>
              <Row title={t('tx.hideScam')} desc={t('settings.hideScamDesc')}>
                <button
                  type="button"
                  className="switch"
                  role="switch"
                  aria-checked={settings.hideScam}
                  onClick={() => setHideScam(!settings.hideScam)}
                  aria-label={t('tx.hideScam')}
                  title={t('tx.hideScam')}
                />
              </Row>
            </Group>

            <Group title={t('settings.slip')} note={t('settings.slipNote')}>
              {SLIP_FIELDS.map((f) => (
                <Row key={f} title={t(`slipField.${f}`)}>
                  <button
                    type="button"
                    className="switch"
                    role="switch"
                    aria-checked={settings.slipShow[f]}
                    onClick={() => setSlipShow(f, !settings.slipShow[f])}
                    aria-label={t(`slipField.${f}`)}
                    title={t(`slipField.${f}`)}
                  />
                </Row>
              ))}
            </Group>
          </>
        )}

        {tab === 'data' && (
          <>
            <Group title={t('account.data')} note={t('account.backupNote')}>
              <Row title={t('account.export')} desc={t('account.dataWhere', { wallets: wallets.length, sources: settings.endpoints.length })}>
                <button type="button" className="btn btn-sm btn-primary" onClick={exportPlain}>
                  <Icon name="download" />
                  {t('account.export')}
                </button>
              </Row>
              <Row title={t('account.exportEncrypted')} desc={t('account.passphrase')}>
                <span className="inline">
                  <input className="input input-sm set-pass" type="password" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} autoComplete="new-password" aria-label={t('account.passphrase')} />
                  <button type="button" className="btn btn-sm" disabled={passphrase.length < 8} onClick={() => void exportEncrypted()}>
                    <Icon name="lock" />
                    {t('account.exportEncrypted')}
                  </button>
                </span>
              </Row>
              <Row title={t('account.import')} desc={t('account.importMode')}>
                <span className="inline">
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
                  <input className="input input-sm set-pass" type="password" value={importPass} onChange={(e) => setImportPass(e.target.value)} autoComplete="off" aria-label={t('account.passphrase')} />
                  <label className="btn btn-sm">
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
                </span>
              </Row>
            </Group>
            {importErr && <span className="error">{importErr}</span>}
          </>
        )}
      </DialogTabs>
      <div className="dlg-actions">
        <button type="button" className="btn" onClick={onClose}>
          {t('dialog.close')}
        </button>
      </div>
    </Dialog>
  );
}
