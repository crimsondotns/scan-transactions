import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../src/chains.ts';

/* ที่อยู่ในเทสต์เป็นโดเมนตัวอย่างเท่านั้น (example.invalid) — ห้ามมีแหล่งข้อมูลจริงในซอร์ส */
const EX = 'https://scan.example.invalid';

test('รับได้ทั้งอาร์เรย์ตรงๆ และที่ห่อใน data / data.chains / chains', () => {
  const one = [{ id: 'eth', name: 'Ethereum', explorer_host: EX }];
  for (const body of [one, { data: one }, { data: { chains: one } }, { chains: one }]) {
    const [c] = normalize(body);
    assert.equal(c?.id, 'eth');
    assert.equal(c?.explorer, EX);
  }
  assert.deepEqual(normalize({ nope: 1 }), []);
});

test('ชื่อฟิลด์ explorer ต่างกันในแต่ละเจ้า — ต้องอ่านได้ทุกแบบ', () => {
  for (const key of ['explorer_host', 'explorer', 'explorer_url', 'explorerUrl', 'browser', 'block_explorer', 'blockExplorer']) {
    const [c] = normalize([{ id: 'x', [key]: EX }]);
    assert.equal(c?.explorer, EX, `ฟิลด์ ${key}`);
  }
  const [fromList] = normalize([{ id: 'x', explorers: [{ url: EX }] }]);
  assert.equal(fromList?.explorer, EX, 'รูปแบบ explorers[]');
});

test('รายชื่อที่ไม่มี explorer เลย = null ไม่ใช่เดาให้', () => {
  const [c] = normalize([{ id: 'eth', name: 'Ethereum', logo_url: `${EX}/logo.png` }]);
  assert.equal(c?.explorer, null);
  assert.equal(c?.logo, `${EX}/logo.png`);
});

test('โลโก้/สัญลักษณ์/ชื่อ อ่านได้หลายชื่อฟิลด์ และ http ธรรมดาไม่รับ', () => {
  const [c] = normalize([{ chainId: 'sol', chainName: 'Solana', logoURI: `${EX}/sol.png`, nativeSymbol: 'SOL' }]);
  assert.equal(c?.id, 'sol');
  assert.equal(c?.name, 'Solana');
  assert.equal(c?.logo, `${EX}/sol.png`);
  assert.equal(c?.symbol, 'SOL');
  const [insecure] = normalize([{ id: 'x', logo_url: 'http://scan.example.invalid/a.png', explorer: 'http://scan.example.invalid' }]);
  assert.equal(insecure?.logo, null);
  assert.equal(insecure?.explorer, null);
});

test('แถวที่ไม่มี id ถูกข้าม ไม่ทำให้ทั้งรายการพัง', () => {
  const out = normalize([{ name: 'ไม่มี id' }, 'ขยะ', { id: 'ok' }]);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.id, 'ok');
});
