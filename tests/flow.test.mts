import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cumulative, lastTime, netUsd, rowsOfToken, signClassOf, tokenSummary, totals, withinDays } from '../src/flow.ts';
import { matchesGroup, groupExists, tagsOf, familiesOf, ACTIVE_DAYS } from '../src/groups.ts';
import type { Move, TxRow } from '../src/feed.ts';
import type { Wallet } from '../src/store.ts';

const NOW = Date.UTC(2026, 0, 31, 12, 0, 0);
const day = (n: number) => NOW / 1000 - n * 86400;

const move = (over: Partial<Move> = {}): Move => ({ dir: 'in', amount: 1, symbol: 'AAA', name: 'Token A', usd: 100, price: 100, tokenId: null, flagged: false, logo: null, ...over });
const row = (over: Partial<TxRow> = {}): TxRow => ({
  key: Math.random().toString(36).slice(2),
  hash: '0xabc',
  walletId: 'w1',
  chain: 'eth',
  chainLogo: null,
  nativeSymbol: 'ETH',
  time: day(1),
  type: 'receive',
  name: '',
  failed: false,
  flagged: false,
  moves: [move()],
  counterparty: null,
  counterpartyName: null,
  from: null,
  to: null,
  contract: null,
  nonce: null,
  gasUsd: 1,
  gasNative: null,
  raw: {},
  ...over,
});

test('สุทธิของแถว: เข้า − ออก และไม่นับ approve หรือก้อนที่ไม่มีราคา', () => {
  assert.equal(netUsd(row({ moves: [move({ usd: 100 })] })), 100);
  assert.equal(netUsd(row({ moves: [move({ dir: 'out', usd: 40 })] })), -40);
  assert.equal(netUsd(row({ moves: [move({ usd: 100 }), move({ dir: 'out', usd: 30 })] })), 70);
  assert.equal(netUsd(row({ moves: [move({ usd: 100, approve: true })] })), 0);
  assert.equal(netUsd(row({ moves: [move({ usd: null })] })), 0, 'แหล่งข้อมูลไม่ให้ราคา = 0 ไม่ใช่เดาแทน');
  assert.equal(netUsd(row({ moves: [move({ amount: 0, usd: 100 })] })), 0);
});

test('ยอดรวมแยกเข้า/ออก/ค่าเครือข่าย/ติดธง', () => {
  const s = totals([row({ moves: [move({ usd: 100 })] }), row({ moves: [move({ dir: 'out', usd: 25 })], flagged: true, gasUsd: 2 })]);
  assert.deepEqual(s, { net: 75, inUsd: 100, outUsd: -25, fee: 3, flagged: 1, count: 2 });
});

test('เส้นสะสมยาวเท่าจำนวนวันเสมอ และสะสมต่อเนื่อง', () => {
  const rows = [row({ time: day(0), moves: [move({ usd: 10 })] }), row({ time: day(2), moves: [move({ usd: 5 })] }), row({ time: day(99), moves: [move({ usd: 1000 })] })];
  const c = cumulative(rows, 7, NOW);
  assert.equal(c.length, 7);
  assert.equal(c.at(-1), 15, 'แถวที่เก่ากว่าช่วงที่ขอ ไม่ถูกนับ');
  assert.deepEqual(c.slice(0, 4), [0, 0, 0, 0]);
  assert.equal(c[4], 5);
  assert.equal(c[5], 5, 'วันที่ไม่มีธุรกรรม เส้นราบ ไม่ตกลงศูนย์');
});

test('กรองตามช่วงวันและหาเวลาล่าสุด', () => {
  const rows = [row({ time: day(1) }), row({ time: day(40) })];
  assert.equal(withinDays(rows, 30, NOW).length, 1);
  assert.equal(lastTime(rows), day(1));
  assert.equal(lastTime([]), null);
});

test('สรุปรายโทเคน รวมจำนวนและยอดทั้งสองทิศ', () => {
  const rows = [
    row({ moves: [move({ symbol: 'AAA', amount: 2, usd: 200 }), move({ dir: 'out', symbol: 'BBB', amount: 1, usd: 150, name: 'Token B' })] }),
    row({ moves: [move({ dir: 'out', symbol: 'AAA', amount: 1, usd: 100 })] }),
  ];
  const [first, second] = tokenSummary(rows);
  assert.equal(first?.symbol, 'AAA');
  assert.equal(first?.inUsd, 200);
  assert.equal(first?.outUsd, 100);
  assert.equal(first?.inAmount, 2);
  assert.equal(first?.count, 2);
  assert.equal(second?.symbol, 'BBB');
  assert.equal(rowsOfToken(rows, 'BBB').length, 1);
});

test('คลาสสีตามทิศทางเงิน', () => {
  assert.equal(signClassOf(1), 'is-pos');
  assert.equal(signClassOf(-1), 'is-neg');
  assert.equal(signClassOf(0), '');
});

const wallet = (over: Partial<Wallet> = {}): Wallet => ({ id: '0xa', label: 'A', address: '0xa', family: 'erc20', enabled: true, ...over });

test('กลุ่ม: โหลดแล้ว/ยังไม่โหลด/เคลื่อนไหว/แท็ก/ตระกูลเชน', () => {
  const w = wallet({ tag: 'เก็บยาว' });
  const loadedRecently = { loaded: true, last: day(1) };
  const loadedOld = { loaded: true, last: day(ACTIVE_DAYS + 3) };
  assert.equal(matchesGroup('all', w, { loaded: false, last: null }, NOW), true);
  assert.equal(matchesGroup('loaded', w, loadedRecently, NOW), true);
  assert.equal(matchesGroup('unloaded', w, loadedRecently, NOW), false);
  assert.equal(matchesGroup('active', w, loadedRecently, NOW), true);
  assert.equal(matchesGroup('active', w, loadedOld, NOW), false);
  assert.equal(matchesGroup('tag:เก็บยาว', w, loadedRecently, NOW), true);
  assert.equal(matchesGroup('tag:อื่น', w, loadedRecently, NOW), false);
  assert.equal(matchesGroup('chain:erc20', w, loadedRecently, NOW), true);
  assert.equal(matchesGroup('chain:sol', w, loadedRecently, NOW), false);
});

test('รายชื่อแท็ก/ตระกูลเชนมาจากกระเป๋าจริง และกลุ่มที่ไม่มีแล้วถือว่าหายไป', () => {
  const list = [wallet({ id: '1', tag: 'ข' }), wallet({ id: '2', tag: 'ก' }), wallet({ id: '3' })];
  assert.deepEqual(tagsOf(list), ['ก', 'ข']);
  assert.deepEqual(familiesOf(list), ['erc20']);
  assert.equal(groupExists('tag:ก', list), true);
  assert.equal(groupExists('tag:ไม่มี', list), false);
  assert.equal(groupExists('chain:sol', list), false);
  assert.equal(groupExists('all', list), true);
});
