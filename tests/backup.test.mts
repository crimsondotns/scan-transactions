import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decryptJson, encryptJson, exportKey, importKey, keyFromPassphrase, randomKey, randomSalt } from '../src/crypto.ts';
import { BackupError, buildBackup, mergeData, readBackup, type PortableData } from '../src/backup.ts';
import { configuredChainListUrl, configuredChains, configuredEndpoints, withConfiguredChains } from '../src/config.ts';
import { SLIP_SHOW_DEFAULT, type Settings } from '../src/store.ts';

const settings = (over: Partial<Settings> = {}): Settings => ({ endpoints: [], pageSize: 20, chainListUrl: '', priceUrl: '', hideScam: false, slipShow: SLIP_SHOW_DEFAULT, proxyUrl: '', chains: [], ...over });
const data = (over: Partial<PortableData> = {}): PortableData => ({ wallets: [{ id: '0xaaa', label: 'One', address: '0xAAA', family: 'erc20', enabled: true }], settings: settings(), ...over });

test('encrypt/decrypt round-trip; wrong key and tampering both fail', async () => {
  const key = await randomKey();
  const payload = await encryptJson(key, { hello: 'world' });
  assert.deepEqual(await decryptJson(key, payload), { hello: 'world' });
  await assert.rejects(decryptJson(await randomKey(), payload));
  const bytes = [...payload];
  bytes[bytes.length - 2] = bytes[bytes.length - 2] === 'A' ? 'B' : 'A';
  await assert.rejects(decryptJson(key, bytes.join('')));
});

test('a key survives export/import and a passphrase derives a usable one', async () => {
  const key = await randomKey();
  const again = await importKey(await exportKey(key));
  assert.deepEqual(await decryptJson(again, await encryptJson(key, [1, 2])), [1, 2]);
  const salt = randomSalt();
  const enc = await encryptJson(await keyFromPassphrase('right pass', salt), { ok: true });
  assert.deepEqual(await decryptJson(await keyFromPassphrase('right pass', salt), enc), { ok: true });
  await assert.rejects(decryptJson(await keyFromPassphrase('wrong pass', salt), enc));
});

test('backup file round-trips and files it cannot trust are refused', () => {
  const file = buildBackup(data());
  assert.equal(readBackup(JSON.parse(JSON.stringify(file))).data.wallets.length, 1);
  assert.throws(() => readBackup({ app: 'other', kind: 'backup', v: 1, data: {} }), (e) => (e as BackupError).code === 'shape');
  assert.throws(() => readBackup({ ...file, v: 99 }), (e) => (e as BackupError).code === 'version');
  assert.throws(() => readBackup({ ...file, data: { wallets: [], settings: settings() } }), (e) => (e as BackupError).code === 'empty');
});

test('merge adds what is missing, keeps what exists, and importing twice changes nothing', () => {
  const current = data({ wallets: [{ id: '0xaaa', label: '', address: '0xAAA', family: 'erc20', enabled: true }] });
  const incoming = data({
    wallets: [
      { id: '0xaaa', label: 'From file', address: '0xaaa', family: 'erc20', enabled: true },
      { id: '0xbbb', label: 'Two', address: '0xBBB', family: 'erc20', enabled: true },
    ],
    settings: settings({ endpoints: [{ id: 'e1', name: 'src', url: 'https://example.invalid/{address}', family: 'erc20', enabled: true }], chains: [{ id: 'sol', name: 'Solana' }] }),
  });
  const first = mergeData(current, incoming);
  assert.deepEqual(first.added, { wallets: 1, endpoints: 1, chains: 1 });
  assert.equal(first.data.wallets[0]?.label, 'From file');
  const second = mergeData(first.data, incoming);
  assert.deepEqual(second.added, { wallets: 0, endpoints: 0, chains: 0 });
});

/* ----------------------------- ค่าที่ฝังตอน build ----------------------------- */

test('sources configured at build time are read, and broken values are ignored', () => {
  const raw = JSON.stringify([
    { name: 'main', url: 'https://example.invalid/v1/{address}', family: 'sol', authHeader: 'x-api-key', apiKey: 'demo', metaUrl: 'https://example.invalid/meta?query=' },
    { name: 'no url' },
  ]);
  const eps = configuredEndpoints(raw);
  assert.equal(eps.length, 1);
  assert.deepEqual({ ...eps[0], id: 'cfg0' }, { id: 'cfg0', name: 'main', url: 'https://example.invalid/v1/{address}', family: 'sol', enabled: true, authHeader: 'x-api-key', apiKey: 'demo', metaUrl: 'https://example.invalid/meta?query=' });
  assert.deepEqual(configuredEndpoints('not json'), []);
  assert.deepEqual(configuredEndpoints(undefined), []);
  assert.deepEqual(configuredEndpoints('{}'), []);
});

test('chain list url and chains come through, lowercased, with the user winning', () => {
  assert.equal(configuredChainListUrl('  https://example.invalid/chains  '), 'https://example.invalid/chains');
  assert.equal(configuredChainListUrl(''), '');
  const chains = configuredChains(JSON.stringify([{ id: 'ETH', name: 'Ethereum', explorer: 'https://example.invalid' }, { name: 'no id' }]));
  assert.deepEqual(chains, [{ id: 'eth', name: 'Ethereum', explorer: 'https://example.invalid' }]);
  const merged = withConfiguredChains([{ id: 'eth', name: 'Mine' }], chains);
  assert.deepEqual(merged, [{ id: 'eth', name: 'Mine' }]);
  assert.deepEqual(withConfiguredChains([], chains), chains);
});
