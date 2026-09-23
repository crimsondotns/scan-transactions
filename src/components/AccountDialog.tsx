/**
 * บัญชี · ข้อมูลในเครื่อง · สำรอง/กู้คืน · แพ็กเกจแชร์
 * ทุกอย่างทำงานในเบราว์เซอร์ล้วน — ข้อความใน UI ต้องไม่ทำให้เข้าใจว่ามีเซิร์ฟเวอร์เก็บของให้ (ดู docs/identity-and-sharing.md)
 */
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { snapshot, useStore } from '../store';
import { Dialog } from './Dialog';
import { Dropdown } from './Dropdown';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { checkUsername, normalizeUsername, setGoogleClientId, useAccount } from '../account';
import { backupFilename, buildBackup, mergeData, readBackup, BackupError, type PortableData } from '../backup';
import { encryptJson, decryptJson, keyFromPassphrase, randomSalt } from '../crypto';
import { buildShare, openShare, sharePath, shareFilename, ShareError, type ShareRole } from '../share';
import { absoluteUrl } from '../router';

type Mode = 'merge' | 'replace';

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function readFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text());
}

export function AccountDialog({ open, onClose, incoming = null }: { open: boolean; onClose: () => void; incoming?: { pkg: unknown; key: string } | null }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { wallets, settings, restore } = useStore();
  const { state, identity, profile, mountButton, signOut, saveProfile, forgetAccount, clientId } = useAccount();

  const gbtn = useRef<HTMLDivElement>(null);
  const [clientIdText, setClientIdText] = useState(clientId);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [nameErr, setNameErr] = useState<string | null>(null);

  const [passphrase, setPassphrase] = useState('');
  const [mode, setMode] = useState<Mode>('merge');
  const [importPass, setImportPass] = useState('');
  const [importErr, setImportErr] = useState<string | null>(null);

  const [role, setRole] = useState<ShareRole>('view');
  const [days, setDays] = useState('7');
  const [note, setNote] = useState('');
  const [link, setLink] = useState<string | null>(null);
  const [shareFile, setShareFile] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState('');
  const [openErr, setOpenErr] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
    setUsername(profile?.username ?? '');
  }, [profile]);

  useEffect(() => {
    if (!open || state !== 'signedOut' || !gbtn.current) return;
    void mountButton(gbtn.current);
  }, [open, state, mountButton, clientIdText]);

  const author = { name: profile?.displayName ?? identity?.name ?? null, username: profile?.username ?? null };
  const data = (): PortableData => snapshot();

  async function exportPlain() {
    download(backupFilename(), JSON.stringify(buildBackup(data(), author), null, 2));
    toast(t('account.exported'));
  }

  async function exportEncrypted() {
    const salt = randomSalt();
    const key = await keyFromPassphrase(passphrase, salt);
    const payload = await encryptJson(key, buildBackup(data(), author));
    download(backupFilename(new Date(), true), JSON.stringify({ app: 'xcapscan', kind: 'backup-encrypted', v: 1, salt, payload }, null, 2));
    setPassphrase('');
    toast(t('account.exported'));
  }

  async function importBackup(file: File) {
    setImportErr(null);
    try {
      let raw = await readFile(file);
      if (raw && typeof raw === 'object' && (raw as { kind?: string }).kind === 'backup-encrypted') {
        const { salt, payload } = raw as { salt: string; payload: string };
        if (!importPass) return setImportErr(t('account.needPassphrase'));
        raw = await decryptJson(await keyFromPassphrase(importPass, salt), payload);
      }
      const file2 = readBackup(raw);
      if (mode === 'replace') {
        restore(file2.data);
        toast(t('account.restored'));
      } else {
        const { data: merged, added } = mergeData(data(), file2.data);
        restore(merged);
        toast(t('account.merged', { n: added.wallets + added.endpoints + added.chains }));
      }
      setImportPass('');
    } catch (e) {
      setImportErr(e instanceof BackupError ? t(`account.err.${e.code}`) : t('account.err.shape'));
    }
  }

  async function createShare() {
    const { pkg, key } = await buildShare(data(), { role, by: author, note: note.trim() || null, expiresInDays: days === '0' ? null : Number(days) });
    const path = sharePath(pkg, key);
    setLink(path ? absoluteUrl(path) : null);
    setShareFile(JSON.stringify({ pkg, key }, null, 2));
  }

  async function openPackage(file: File) {
    setOpenErr(null);
    try {
      const raw = (await readFile(file)) as { pkg?: unknown; key?: string };
      const pkg = raw && typeof raw === 'object' && 'pkg' in raw ? raw.pkg : raw;
      const key = openKey.trim() || raw?.key || '';
      const opened = await openShare(pkg, key);
      const { data: merged, added } = mergeData(data(), opened.data);
      restore(merged);
      toast(opened.expired ? t('account.openedExpired') : t('account.merged', { n: added.wallets + added.endpoints + added.chains }));
      setOpenKey('');
    } catch (e) {
      setOpenErr(e instanceof ShareError ? t(`account.err.${e.code}`) : t('account.err.shape'));
    }
  }

  async function importIncoming() {
    if (!incoming) return;
    setOpenErr(null);
    try {
      const opened = await openShare(incoming.pkg, incoming.key);
      const { data: merged, added } = mergeData(data(), opened.data);
      restore(merged);
      toast(opened.expired ? t('account.openedExpired') : t('account.merged', { n: added.wallets + added.endpoints + added.chains }));
      onClose();
    } catch (e) {
      setOpenErr(e instanceof ShareError ? t(`account.err.${e.code}`) : t('account.err.shape'));
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('account.title')}>
      <div className="stack">
        {incoming && (
          <section className="field">
            <h3 className="panel-title">{t('account.incoming')}</h3>
            <p className="hint">{t('account.incomingNote')}</p>
            <div className="inline">
              <button type="button" className="btn btn-primary" onClick={() => void importIncoming()}>
                {t('account.importShare')}
              </button>
            </div>
          </section>
        )}
        {/* บัญชี */}
        <section className="field">
          <h3 className="panel-title">{t('account.identity')}</h3>
          {state === 'ready' && identity ? (
            <div className="inline">
              {identity.picture && <img className="avatar" src={identity.picture} alt="" width={32} height={32} />}
              <span className="stack-tight">
                <strong>{identity.name ?? identity.email}</strong>
                <span className="hint">{identity.email}</span>
              </span>
              <span className="top-spacer" />
              <button type="button" className="btn" onClick={() => void signOut()}>
                {t('account.signOut')}
              </button>
            </div>
          ) : (
            <>
              {state === 'expired' && <p className="hint">{t('account.expired')}</p>}
              {!clientId ? (
                <div className="field">
                  <label className="label" htmlFor="gid">
                    {t('account.clientId')}
                  </label>
                  <div className="inline">
                    <input id="gid" className="input mono" type="text" value={clientIdText} onChange={(e) => setClientIdText(e.target.value)} autoComplete="off" spellCheck={false} />
                    <button
                      type="button"
                      className="btn"
                      disabled={!clientIdText.trim()}
                      onClick={() => {
                        setGoogleClientId(clientIdText);
                        toast(t('account.saved'));
                      }}
                    >
                      {t('settings.addBtn')}
                    </button>
                  </div>
                </div>
              ) : (
                <div ref={gbtn} className="gbtn" />
              )}
            </>
          )}
          <p className="hint">{t('account.identityNote')}</p>
        </section>

        {/* โปรไฟล์ */}
        <section className="field">
          <h3 className="panel-title">{t('account.profile')}</h3>
          <div className="inline">
            <div className="field">
              <label className="label" htmlFor="pf-name">
                {t('account.displayName')}
              </label>
              <input id="pf-name" className="input" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="off" />
            </div>
            <div className="field">
              <label className="label" htmlFor="pf-user">
                {t('account.username')}
              </label>
              <input id="pf-user" className="input mono" type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" spellCheck={false} />
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => {
                const u = normalizeUsername(username);
                const problem = u ? checkUsername(u) : null;
                if (problem) return setNameErr(t(`account.username.${problem}`));
                setNameErr(null);
                void saveProfile({ displayName: displayName.trim() || null, username: u || null });
                toast(t('account.saved'));
              }}
            >
              {t('account.save')}
            </button>
          </div>
          {nameErr && <span className="error">{nameErr}</span>}
          <p className="hint">{t('account.usernameNote')}</p>
        </section>

        {/* ข้อมูลในเครื่อง */}
        <section className="field">
          <h3 className="panel-title">{t('account.data')}</h3>
          <p className="hint">{t('account.dataWhere', { wallets: wallets.length, sources: settings.endpoints.length })}</p>
        </section>

        {/* สำรอง / กู้คืน */}
        <section className="field">
          <h3 className="panel-title">{t('account.backup')}</h3>
          <div className="inline">
            <button type="button" className="btn btn-primary" onClick={() => void exportPlain()}>
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

        {/* แพ็กเกจแชร์ */}
        <section className="field">
          <h3 className="panel-title">{t('account.share')}</h3>
          <div className="inline">
            <Dropdown
              size="sm"
              value={role}
              onChange={setRole}
              label={t('account.role')}
              options={[
                { value: 'view' as const, label: t('account.role.view') },
                { value: 'edit' as const, label: t('account.role.edit') },
              ]}
            />
            <Dropdown
              size="sm"
              value={days}
              onChange={setDays}
              label={t('account.expiry')}
              options={[
                { value: '7', label: t('account.days', { n: 7 }) },
                { value: '30', label: t('account.days', { n: 30 }) },
                { value: '0', label: t('account.noExpiry') },
              ]}
            />
            <input className="input" type="text" value={note} onChange={(e) => setNote(e.target.value)} aria-label={t('account.note')} autoComplete="off" />
            <button type="button" className="btn btn-primary" onClick={() => void createShare()}>
              {t('account.createShare')}
            </button>
          </div>
          {shareFile && (
            <div className="inline">
              {link ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    void navigator.clipboard?.writeText(link);
                    toast(t('account.linkCopied'));
                  }}
                >
                  <Icon name="link" />
                  {t('account.copyLink')}
                </button>
              ) : (
                <span className="hint">{t('account.tooBigForLink')}</span>
              )}
              <button type="button" className="btn" onClick={() => download(shareFilename(), shareFile)}>
                <Icon name="download" />
                {t('account.shareFile')}
              </button>
            </div>
          )}
          <div className="inline">
            <input className="input mono" type="text" value={openKey} onChange={(e) => setOpenKey(e.target.value)} aria-label={t('account.key')} autoComplete="off" spellCheck={false} />
            <label className="btn">
              <Icon name="upload" />
              {t('account.openShare')}
              <input
                type="file"
                accept="application/json,.json"
                className="file-hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void openPackage(f);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          {openErr && <span className="error">{openErr}</span>}
          <p className="hint">{t('account.shareNote')}</p>
        </section>

        <section className="field">
          <h3 className="panel-title">{t('account.limits')}</h3>
          <ul className="hint stack-tight">
            <li>{t('account.limit.acl')}</li>
            <li>{t('account.limit.revoke')}</li>
            <li>{t('account.limit.sync')}</li>
            <li>{t('account.limit.identity')}</li>
          </ul>
        </section>

        <div className="inline">
          <button type="button" className="btn btn-danger" onClick={() => void forgetAccount()}>
            {t('account.forget')}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
