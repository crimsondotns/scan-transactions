/**
 * ด่านหลัง build — ต้องไม่มีความลับหลุดเข้า dist/
 * หน้าเว็บเป็น static ทุกไบต์ใน dist/ ถือว่าสาธารณะ: กุญแจ/โทเคน/URL ของแหล่งข้อมูลจริงต้องไม่อยู่ในนี้
 * (ที่อยู่ของ API wrapper ไม่ใช่ความลับ จึงอนุญาต — ดู docs/api-wrapper.md)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
if (!existsSync(DIST)) {
  console.error(`${DIST} not found — run the build first`);
  process.exit(1);
}

const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|css|html|json|map)$/.test(p)) files.push(p);
  }
})(DIST);

/** ลายของความลับที่พบบ่อย — ตรวจแบบหยาบแต่ดักของจริงได้ */
const PATTERNS = [
  [/\bsk-[A-Za-z0-9_-]{16,}/, 'API key (sk-…)'],
  [/\bsb_secret_[A-Za-z0-9_-]{8,}/, 'Supabase secret key'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/, 'GitHub token'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, 'JWT'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
  // ชื่อตัวแปรที่แปลว่ามีคนยัดความลับเข้า build
  [/VITE_[A-Z0-9_]*(SECRET|TOKEN|PRIVATE|APIKEY|API_KEY|KEY)\b/, 'VITE_* secret variable'],
  [/\b(api[_-]?secret|client[_-]?secret)["'\s:=]+[A-Za-z0-9_-]{12,}/i, 'secret literal'],
];

const bad = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const [re, what] of PATTERNS) {
    const m = re.exec(src);
    // ไม่พิมพ์ค่าที่เจอออกมา (ไม่ทำให้ความลับไปโผล่ใน log ของ CI) — บอกแค่ไฟล์กับชนิด
    if (m) bad.push(`${f}: looks like a ${what}`);
  }
}
if (bad.length) {
  console.error(bad.join('\n'));
  process.exit(1);
}
console.log(`dist clean (${files.length} files)`);
