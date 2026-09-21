import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../src/importWallets.ts';
import { detectEndpoint, parseAddress } from '../src/store.ts';
import { buildUrl, fetchPage, toTemplate } from '../src/feed.ts';

const ME = '0x42a8000000000000000000000000000000000000';
const fixture = {
  cate_dict: {},
  project_dict: { arb_dex: { id: 'arb_dex', chain: 'arb', name: 'Some DEX' } },
  token_dict: {
    arb: { id: 'arb', chain: 'arb', symbol: 'ETH', price: 2000, is_scam: false, logo_url: 'https://img.invalid/eth.png' },
    '0xaaaa': { id: '0xaaaa', chain: 'arb', symbol: 'USDC', optimized_symbol: 'USDC', price: 1 },
    '0xbad0': { id: '0xbad0', chain: 'base', symbol: 'AIRDROP', price: 0, is_scam: true },
  },
  history_list: [
    { id: '0x01', idx: 0, chain: 'arb', time_at: 1700000300, project_id: 'arb_dex', other_addr: '0xrouter', sends: [{ amount: 0.5, token_id: 'arb', price: 2000 }], receives: [{ amount: 1000, token_id: '0xaaaa', price: 1 }], tx: { name: 'swap', status: 1, usd_gas_fee: 0.12 } },
    { id: '0x02', idx: 0, chain: 'base', time_at: 1700000200, is_scam: true, other_addr: '0xspam', sends: [], receives: [{ amount: 1e6, token_id: '0xbad0', price: 0 }], tx: { name: 'batchTransfer', status: 1 } },
    { id: '0x03', idx: 0, chain: 'arb', time_at: 1700000100, sends: [], receives: [], token_approve: { spender: '0xrouter', token_id: '0xaaaa', value: 1e9 }, tx: { name: 'approve', status: 1, usd_gas_fee: 0.05 } },
    { id: '0x04', idx: 0, chain: 'arb', time_at: 1700000000, sends: [{ amount: 1, token_id: 'arb' }], receives: [], tx: { name: '', status: 0, from_addr: ME, to_addr: '0xfriend' } },
  ],
};

const mock = (body: unknown, ok = true, status = 200) => {
  (globalThis as { fetch: unknown }).fetch = async () => ({ ok, status, json: async () => body });
};

test('history_list shape → rows, types, flags, cursor', async () => {
  mock(fixture);
  const page = await fetchPage('https://x.invalid/h?id={address}&s={start}&c={count}', 'w1', ME, null, 4);
  assert.deepEqual(page.rows.map((r) => r.type), ['swap', 'receive', 'approve', 'send']);
  assert.equal(page.rows[0]!.counterpartyName, 'Some DEX');
  assert.equal(page.rows[0]!.moves[1]!.usd, 1000);
  assert.equal(page.rows[0]!.moves[0]!.logo, 'https://img.invalid/eth.png');
  assert.equal(page.rows[0]!.chainLogo, 'https://img.invalid/eth.png');
  assert.equal(page.rows[0]!.moves[1]!.logo, null);
  assert.equal(page.rows[1]!.flagged, true);
  assert.equal(page.rows[3]!.failed, true);
  assert.equal(page.rows[3]!.counterparty, '0xfriend');
  assert.deepEqual(page.next, { start: 1700000000, cursor: '0x04' });
});

test('flat list shape (result[]) with wei values', async () => {
  mock({ result: [{ hash: '0xabc', from: '0xaa', to: '0xbb', value: '1000000000000000000', timeStamp: '1700000000', isError: '0' }] });
  const page = await fetchPage('https://x.invalid/{address}', 'w', '0xaa', null, 20);
  assert.equal(page.rows[0]!.type, 'send');
  assert.equal(page.rows[0]!.moves[0]!.amount, 1);
});

test('unknown shape and HTTP errors are typed', async () => {
  mock({ hello: 1 });
  await assert.rejects(fetchPage('https://x.invalid/{address}', 'w', '0xaa', null, 20), { kind: 'shape' });
  mock({}, false, 404);
  await assert.rejects(fetchPage('https://x.invalid/{address}', 'w', '0xaa', null, 20), { kind: 'http', status: 404 });
});

test('csv: quotes, embedded commas, CRLF, multi-line cell', () => {
  const g = parseCsv('Label,Addresses\r\n"Main, one",0x1111111111111111111111111111111111111111\nTwo,"0x2222222222222222222222222222222222222222\n0x3333333333333333333333333333333333333333"\n');
  assert.deepEqual(g[0], ['Label', 'Addresses']);
  assert.equal(g[1]![0], 'Main, one');
  assert.equal(g.length, 3);
  assert.ok(g[2]![1]!.includes('\n'));
});

test('buildUrl fills every placeholder', () => {
  assert.equal(buildUrl('https://a.invalid/?id={address}&s={start}&c={count}&b={cursor}', '0xAB', { start: 5, cursor: 'sig' }, 9), 'https://a.invalid/?id=0xAB&s=5&c=9&b=sig');
  assert.equal(buildUrl('https://a.invalid/{address}?s={start}&b={cursor}', 'x', null, 9), 'https://a.invalid/x?s=0&b=');
});

const SOL = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
test('signature-list shape (Solana family)', async () => {
  mock([
    { signature: 'sigA', timestamp: 1700000500, type: 'SWAP', fee: 5000, feePayer: SOL, nativeTransfers: [{ fromUserAccount: SOL, toUserAccount: 'pool', amount: 2e9 }], tokenTransfers: [{ fromUserAccount: 'pool', toUserAccount: SOL, tokenAmount: 100, mint: 'MintAAAAAAAA', symbol: 'USDC' }] },
    { signature: 'sigB', timestamp: 1700000400, type: 'TRANSFER', fee: 5000, feePayer: 'someone', transactionError: null, nativeTransfers: [{ fromUserAccount: 'someone', toUserAccount: SOL, amount: 5e8 }], tokenTransfers: [] },
  ]);
  const page = await fetchPage('https://x.invalid/{address}?before={cursor}', 'w', SOL, null, 20);
  assert.deepEqual(page.rows.map((r) => r.type), ['swap', 'receive']);
  assert.equal(page.rows[0]!.moves[0]!.amount, 2);
  assert.equal(page.rows[1]!.moves[0]!.amount, 0.5);
  assert.equal(page.rows[1]!.counterparty, 'someone');
  assert.deepEqual(page.next, { start: 1700000400, cursor: 'sigB' });
});

test('parseAddress: EVM lowercased, Solana kept as-is, junk rejected', () => {
  assert.deepEqual(parseAddress(' 0xABCDEFabcdef0123456789ABCDEFabcdef012345 '), { address: '0xabcdefabcdef0123456789abcdefabcdef012345', family: 'evm' });
  assert.deepEqual(parseAddress(SOL), { address: SOL, family: 'sol' });
  assert.equal(parseAddress('0x123'), null);
  assert.equal(parseAddress('0OIl' + 'a'.repeat(30)), null);
});

test('detectEndpoint: family and name from the URL alone', () => {
  assert.deepEqual(detectEndpoint('https://api.example.com/v1/history?id={address}'), { name: 'example.com', family: 'evm' });
  assert.deepEqual(detectEndpoint('https://solana.example.org/{address}'), { name: 'solana.example.org', family: 'sol' });
  assert.deepEqual(detectEndpoint('https://example.net/sol/txs?a={address}'), { name: 'example.net', family: 'sol' });
  assert.equal(detectEndpoint('http://example.com/{address}'), null);
  assert.equal(detectEndpoint('not a url'), null);
});

test('base URL without placeholders gets the query composed', () => {
  assert.equal(toTemplate('https://a.invalid/v1/history?'), 'https://a.invalid/v1/history?id={address}&start_time={start}&page_count={count}');
  assert.equal(toTemplate('https://a.invalid/v1/history'), 'https://a.invalid/v1/history?id={address}&start_time={start}&page_count={count}');
  assert.equal(toTemplate('https://a.invalid/h?x=1'), 'https://a.invalid/h?x=1&id={address}&start_time={start}&page_count={count}');
  assert.equal(toTemplate('https://a.invalid/h?id={address}'), 'https://a.invalid/h?id={address}');
  assert.equal(buildUrl('https://a.invalid/v1/history?', '0xAB', null, 20), 'https://a.invalid/v1/history?id=0xAB&start_time=0&page_count=20');
});
