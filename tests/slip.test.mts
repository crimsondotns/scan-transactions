import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCode, parseShare, slipCode, type SlipData } from '../src/slip.ts';

const data: SlipData = { v: 1, hash: '0xabc', chain: 'arb', chainName: 'Arbitrum', type: 'send', status: 'ok', wallet: '0x1', walletLabel: 'Main', from: '0x1', to: '0x2', moves: [{ dir: 'out', amount: 0.5, symbol: 'ETH' }], fee: 0.00001, feeSymbol: 'ETH', time: 1700000000, url: null, issued: 1700000001000 };

test('slip code: deterministic SHA-256, changes when content changes', async () => {
  const a = await slipCode(data);
  assert.match(a, /^[0-9A-F]{5}(-[0-9A-F]{5}){3}$/);
  assert.equal(await slipCode({ ...data }), a);
  assert.notEqual(await slipCode({ ...data, moves: [{ dir: 'out', amount: 0.6, symbol: 'ETH' }] }), a);
  // ฟิลด์แสดงผลอย่างเดียว (ชื่อเชน/ป้ายกระเป๋า/ลิงก์) ไม่อยู่ในแฮช
  assert.equal(await slipCode({ ...data, chainName: 'x', walletLabel: 'y', url: 'https://e.invalid' }), a);
});

test('normalizeCode accepts loose input; parseShare round-trips data in the fragment', async () => {
  assert.equal(normalizeCode(' abcde12345abcde12345 '), 'ABCDE-12345-ABCDE-12345');
  assert.equal(normalizeCode('abc'), '');
  const code = await slipCode(data);
  const b64 = Buffer.from(JSON.stringify(data)).toString('base64url');
  const p = parseShare(`${code}.${b64}`);
  assert.equal(p?.code, code);
  assert.deepEqual(p?.data, data);
  assert.equal(parseShare(code)?.data, null);
  assert.equal(parseShare('nope'), null);
});
