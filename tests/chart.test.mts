import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaPath, bandPath, nearestIndex, niceMax, smoothPath, tickIndexes, type Pt } from '../src/chart.ts';

const line = (ys: number[]): Pt[] => ys.map((y, i) => ({ x: i * 10, y }));
const nums = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

test('เส้นโค้งเริ่มที่จุดแรก จบที่จุดสุดท้าย และมีหนึ่งช่วงต่อหนึ่งคู่จุด', () => {
  const d = smoothPath(line([10, 30, 20]));
  assert.match(d, /^M0 10 C/);
  assert.equal(d.match(/C/g)?.length, 2);
  assert.ok(d.endsWith('20 20'));
  assert.equal(smoothPath([]), '');
  assert.equal(smoothPath([{ x: 3, y: 4 }]), 'M3 4');
});

test('เส้นโค้งไม่แกว่งเกินค่าจริง — ช่วงที่ค่าเท่ากันต้องราบสนิท', () => {
  const d = smoothPath(line([50, 50, 50, 20]));
  const ys = nums(d).filter((_, i) => i % 2 === 1);
  assert.ok(Math.max(...ys.slice(0, 5)) <= 50, 'ไม่มีจุดควบคุมที่ดีดสูงกว่าค่าจริง');
  assert.ok(Math.min(...ys) >= 20, 'ไม่มีจุดควบคุมที่ห้อยต่ำกว่าค่าต่ำสุด');
});

test('พื้นที่ใต้เส้นปิดรูปที่เส้นฐาน', () => {
  const d = areaPath(line([10, 20]), 100);
  assert.ok(d.endsWith('L10 100 L0 100 Z'));
  assert.equal(areaPath([], 100), '');
});

test('พื้นที่ระหว่างสองเส้นเดินไปตามเส้นบน แล้วย้อนกลับตามเส้นล่าง', () => {
  const d = bandPath(line([10, 20]), line([40, 50]));
  assert.match(d, /^M0 10 /);
  assert.equal(d.match(/M/g)?.length, 1, 'เส้นล่างต่อจากเส้นบน ไม่ยกปากกาขึ้นใหม่');
  assert.ok(d.endsWith('Z'));
});

test('ค่าสูงสุดของกริดเป็นเลขกลมที่ครอบข้อมูลไว้เสมอ', () => {
  assert.equal(niceMax(0), 4);
  assert.equal(niceMax(-5), 4);
  assert.ok(niceMax(97) >= 97);
  assert.equal(niceMax(97), 100);
  assert.equal(niceMax(3800), 4000);
  assert.equal(niceMax(1), 1);
});

test('ป้ายแกนวันที่เว้นระยะไม่ให้ชนกัน และจบที่วันล่าสุดเสมอ', () => {
  const wide = tickIndexes(30, 600);
  assert.equal(wide.at(-1), 29);
  assert.ok(wide.length <= 10 && wide.length >= 4, `ได้ ${wide.length} ป้าย`);
  const narrow = tickIndexes(90, 240);
  assert.ok(narrow.length <= 4, `จอแคบต้องมีป้ายน้อยลง ได้ ${narrow.length}`);
  assert.deepEqual(tickIndexes(1, 300), [0]);
  assert.deepEqual(tickIndexes(0, 300), []);
});

test('ตำแหน่งเมาส์ → วันที่ใกล้ที่สุด และไม่หลุดขอบ', () => {
  assert.equal(nearestIndex(0, 0, 100, 11), 0);
  assert.equal(nearestIndex(100, 0, 100, 11), 10);
  assert.equal(nearestIndex(46, 0, 100, 11), 5);
  assert.equal(nearestIndex(-40, 0, 100, 11), 0);
  assert.equal(nearestIndex(999, 0, 100, 11), 10);
});
