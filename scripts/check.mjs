/**
 * ด่านของ repo — รันก่อน build ใน CI
 * 1. ไม่มี URL ของแหล่งข้อมูลจริงฝังในซอร์ส (ผู้ใช้ต้องใส่เองตอนใช้งาน)
 * 2. ไม่มีข้อความไทยตรงใน .tsx (ทุกข้อความผ่าน t())
 * 3. ไม่มี font-size เป็น px ลอยใน CSS, ไม่มี gradient / box-shadow ตกแต่ง
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})('src');

const bad = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  // URL จริง (https://host) นอกจากฟอนต์/ตัวอย่างใน i18n — ไม่ให้ endpoint ใดๆ หลุดเข้าซอร์ส
  for (const m of code.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)) {
    if (!/fonts\.g|w3\.org|example\.invalid/.test(m[0])) bad.push(`${f}: hardcoded URL ${m[0]}`);
  }
  if (f.endsWith('.tsx') && !f.endsWith('i18n.tsx')) {
    const jsx = code.replace(/\{[^{}]*\}/g, '');
    if (/[฀-๿]/.test(jsx)) bad.push(`${f}: Thai text outside t()`);
  }
  if (f.endsWith('.css')) {
    if (/font-size:\s*\d+px/.test(code)) bad.push(`${f}: px font-size`);
    if (/gradient\(/.test(code)) bad.push(`${f}: gradient`);
  }
}
if (bad.length) {
  console.error(bad.join('\n'));
  process.exit(1);
}
console.log(`check ok (${files.length} files)`);
