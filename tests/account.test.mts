import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decryptJson, encryptJson, exportKey, importKey, keyFromPassphrase, randomKey, randomSalt } from '../src/crypto.ts';
import { BackupError, buildBackup, mergeData, readBackup, type PortableData } from '../src/backup.ts';
import { buildShare, openShare, parseSharePath, sharePath, ShareError } from '../src/share.ts';
import { checkUsername, identityExpired, normalizeUsername, profileFromIdentity, readIdToken, type Identity } from '../src/account.ts';
import { SLIP_SHOW_DEFAULT, type Settings } from '../src/store.ts';

const settings = (over: Partial<Settings> = {}): Settings => ({
  endpoints: [],
  pageSize: 20,
  chainListUrl: '',
  priceUrl: '',
  hideScam: false,
  slipShow: SLIP_SHOW_DEFAULT,
  proxyUrl: '',
  chains: [],
  ...over,
});

const data = (over: Partial<PortableData> = {}): PortableData => ({
  wallets: [{ id: '0xaaa', label: 'One', address: '0xAAA', family: 'evm', enabled: true }],
  settings: settings(),
  ...over,
});

/* ----------------------------- encryption ----------------------------- */

test('encrypt/decrypt round-trip, wrong key and tampering both fail', async () => {
  const key = await randomKey();
  const payload = await encryptJson(key, { hello: 'world', n: 7 });
  assert.deepEqual(await decryptJson(key, payload), { hello: 'world', n: 7 });

  const other = await randomKey();
  await assert.rejects(decryptJson(other, payload));

  const bytes = [...payload];
  bytes[bytes.length - 2] = bytes[bytes.length - 2] === 'A' ? 'B' : 'A';
  await assert.rejects(decryptJson(key, bytes.join('')));
  await assert.rejects(decryptJson(key, 'AAAA'));
});

test('key export/import survives a round-trip; a passphrase derives a usable key', async () => {
  const key = await randomKey();
  const again = await importKey(await exportKey(key));
  const payload = await encryptJson(key, ['a', 'b']);
  assert.deepEqual(await decryptJson(again, payload), ['a', 'b']);

  const salt = randomSalt();
  const pw = await keyFromPassphrase('correct horse battery', salt);
  const enc = await encryptJson(pw, { ok: true });
  assert.deepEqual(await decryptJson(await keyFromPassphrase('correct horse battery', salt), enc), { ok: true });
  await assert.rejects(decryptJson(await keyFromPassphrase('wrong passphrase', salt), enc));
});

/* ----------------------------- backup ----------------------------- */

test('backup file round-trips and rejects files it cannot trust', () => {
  const file = buildBackup(data(), { name: 'Ann', username: 'ann' });
  const read = readBackup(JSON.parse(JSON.stringify(file)));
  assert.equal(read.data.wallets.length, 1);
  assert.deepEqual(read.by, { name: 'Ann', username: 'ann' });

  assert.throws(() => readBackup({ app: 'other', kind: 'backup', v: 1, data: {} }), (e) => (e as BackupError).code === 'shape');
  assert.throws(() => readBackup({ ...file, v: 99 }), (e) => (e as BackupError).code === 'version');
  assert.throws(() => readBackup({ ...file, data: { wallets: [], settings: settings() } }), (e) => (e as BackupError).code === 'empty');
});

test('merge adds what is missing, keeps what exists, and importing twice changes nothing', () => {
  const current = data({ wallets: [{ id: '0xaaa', label: '', address: '0xAAA', family: 'evm', enabled: true }] });
  const incoming = data({
    wallets: [
      { id: '0xaaa', label: 'From file', address: '0xaaa', family: 'evm', enabled: true },
      { id: '0xbbb', label: 'Two', address: '0xBBB', family: 'evm', enabled: true },
    ],
    settings: settings({ endpoints: [{ id: 'e1', name: 'src', url: 'https://example.invalid/{address}', family: 'evm', enabled: true }], chains: [{ id: 'sol', name: 'Solana' }], priceUrl: 'https://example.invalid/p' }),
  });

  const first = mergeData(current, incoming);
  assert.deepEqual(first.added, { wallets: 1, endpoints: 1, chains: 1 });
  // ป้ายที่ว่างอยู่ถูกเติมจากไฟล์ ส่วนค่าที่ตั้งไว้แล้วไม่ถูกทับ
  assert.equal(first.data.wallets[0]?.label, 'From file');
  assert.equal(first.data.settings.priceUrl, 'https://example.invalid/p');

  const second = mergeData(first.data, incoming);
  assert.deepEqual(second.added, { wallets: 0, endpoints: 0, chains: 0 });
  assert.deepEqual(second.data.wallets, first.data.wallets);
  assert.deepEqual(second.data.settings.endpoints, first.data.settings.endpoints);
});

test('merge never drops the data already on this device', () => {
  const current = data({ wallets: [{ id: '0xccc', label: 'Mine', address: '0xCCC', family: 'evm', enabled: true }] });
  const merged = mergeData(current, data());
  assert.ok(merged.data.wallets.some((w) => w.address === '0xCCC'));
});

/* ----------------------------- sharing ----------------------------- */

test('share package round-trips through link and file, and states its role', async () => {
  const { pkg, key } = await buildShare(data(), { role: 'view', by: { name: 'Ann', username: 'ann' }, expiresInDays: 7 });
  const opened = await openShare(pkg, key);
  assert.equal(opened.role, 'view');
  assert.equal(opened.expired, false);
  assert.equal(opened.data.wallets.length, 1);

  const path = sharePath(pkg, key)!;
  assert.ok(path.startsWith('s/'));
  const parsed = parseSharePath(path.split('#')[0]!, `#${path.split('#')[1]}`)!;
  assert.deepEqual(await openShare(parsed.pkg, parsed.key).then((o) => o.data.wallets.length), 1);
});

test('a wrong key, an altered payload and a foreign file are all refused', async () => {
  const { pkg } = await buildShare(data(), { role: 'view' });
  const other = await exportKey(await randomKey());
  await assert.rejects(openShare(pkg, other), (e) => (e as ShareError).code === 'key');
  await assert.rejects(openShare(pkg, 'not-a-key'), (e) => (e as ShareError).code === 'key');
  await assert.rejects(openShare({ app: 'other' }, other), (e) => (e as ShareError).code === 'shape');
  await assert.rejects(openShare({ ...pkg, v: 99 }, other), (e) => (e as ShareError).code === 'version');
});

test('expiry is a flag the recipient app reads, not a lock', async () => {
  const past = new Date(Date.now() - 10 * 86_400_000);
  const { pkg, key } = await buildShare(data(), { role: 'view', expiresInDays: 1, now: past });
  const opened = await openShare(pkg, key);
  // เปิดได้อยู่ (ไม่มีเซิร์ฟเวอร์มากั้น) แต่ติดธงให้ UI เตือน — ตรงกับที่เอกสารบอก
  assert.equal(opened.expired, true);
  assert.equal(opened.data.wallets.length, 1);
});

test('a package too large for a URL asks to be sent as a file', async () => {
  const many = Array.from({ length: 400 }, (_, i) => ({ id: `0x${i}`, label: `Wallet ${i}`, address: `0x${String(i).padStart(40, '0')}`, family: 'evm' as const, enabled: true }));
  const { pkg, key } = await buildShare(data({ wallets: many }), { role: 'view' });
  assert.equal(sharePath(pkg, key), null);
});

test('share paths that are not ours are ignored', () => {
  assert.equal(parseSharePath('v/ABC', '#k'), null);
  assert.equal(parseSharePath('s/', '#k'), null);
  assert.equal(parseSharePath('s/%%%', '#k'), null);
  assert.equal(parseSharePath('s/abc', ''), null);
});

/* ----------------------------- identity ----------------------------- */

const idToken = (claims: Record<string, unknown>) => {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'RS256' })}.${b64(claims)}.signature`;
};

test('an ID token is read for its claims only, and a broken one yields nothing', () => {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const id = readIdToken(idToken({ sub: '123', email: 'a@example.invalid', name: 'Ann', picture: 'https://img.invalid/a.png', exp }))!;
  assert.equal(id.providerUserId, '123');
  assert.equal(id.email, 'a@example.invalid');
  assert.equal(id.picture, 'https://img.invalid/a.png');
  assert.equal(identityExpired(id), false);

  assert.equal(readIdToken('nonsense'), null);
  assert.equal(readIdToken(idToken({ email: 'a@example.invalid' })), null, 'no sub / no exp');
  // รูปที่ไม่ใช่ https ไม่ถูกนำมาใช้
  assert.equal(readIdToken(idToken({ sub: '1', exp, picture: 'javascript:alert(1)' }))!.picture, null);
});

test('an expired sign-in is reported as expired, not as signed in', () => {
  const old = readIdToken(idToken({ sub: '1', exp: Math.floor(Date.now() / 1000) - 60 }))!;
  assert.equal(identityExpired(old), true);
});

test('username rules match what the UI promises', () => {
  assert.equal(normalizeUsername('  @Ann_B  '), 'ann_b');
  assert.equal(checkUsername('ann_b'), null);
  assert.equal(checkUsername('ab'), 'length');
  assert.equal(checkUsername('a'.repeat(21)), 'length');
  assert.equal(checkUsername('ann..b'), 'chars');
  assert.equal(checkUsername('-ann'), 'chars');
  assert.equal(checkUsername('settings'), 'reserved');
});

test('profile keeps what the person edited when they sign in again', () => {
  const id: Identity = { provider: 'google', providerUserId: '123', email: 'a@example.invalid', name: 'Google Name', picture: null, signedInAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-01T01:00:00.000Z' };
  const first = profileFromIdentity(id, null, new Date('2026-01-01T00:00:00.000Z'));
  assert.equal(first.displayName, 'Google Name');
  const edited = { ...first, displayName: 'Ann', username: 'ann' };
  const again = profileFromIdentity(id, edited, new Date('2026-02-01T00:00:00.000Z'));
  assert.equal(again.displayName, 'Ann');
  assert.equal(again.username, 'ann');
  assert.equal(again.createdAt, first.createdAt);
  assert.notEqual(again.updatedAt, first.updatedAt);
});
