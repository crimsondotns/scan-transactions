/**
 * อ่านไฟล์ .csv / .xlsx เป็นรายการกระเป๋า — ต้องมีคอลัมน์ Label กับ Addresses
 * ตัวอ่านสเปรดชีตโหลดแบบ dynamic import เฉพาะตอนผู้ใช้เลือกไฟล์
 */
import { parseAddress } from './store';

export interface ImportRow {
  label: string;
  address: string;
  status: 'ok' | 'dupe' | 'bad';
}

const LABEL_KEYS = ['label', 'name', 'ชื่อ', 'ป้ายชื่อ'];
const ADDRESS_KEYS = ['addresses', 'address', 'wallet', 'wallets', 'ที่อยู่', 'กระเป๋า'];

/**
 * ไฟล์ตัวอย่างให้ผู้ใช้โหลดไปกรอก — หัวตารางตรงกับที่ตัวอ่านรับ และที่อยู่ในตัวอย่างเป็นของสมมติ
 * (รูปแบบถูกต้องเพื่อให้เห็นว่าหน้าตาควรเป็นยังไง แต่ไม่ใช่กระเป๋าของใคร)
 */
export const SAMPLE_CSV = ['Label,Addresses', 'Wallet 1,0x0000000000000000000000000000000000000001', 'Wallet 2,0x0000000000000000000000000000000000000002', 'Solana wallet,So11111111111111111111111111111111111111112'].join('\r\n');

export class ImportError extends Error {
  constructor(public kind: 'noHeader' | 'readFail') {
    super(kind);
  }
}

export async function readWalletFile(file: File, existing: Set<string>): Promise<ImportRow[]> {
  let grid: string[][];
  try {
    grid = /\.(xlsx|xlsm|xls)$/i.test(file.name) ? await readSheet(file) : parseCsv(await file.text());
  } catch {
    throw new ImportError('readFail');
  }
  return toRows(grid, existing);
}

async function readSheet(file: File): Promise<string[][]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const first = wb.SheetNames[0];
  if (!first) return [];
  const sheet = wb.Sheets[first];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
  return rows.map((r) => r.map((c) => String(c ?? '')));
}

/** CSV ตาม RFC 4180: รองรับเครื่องหมายคำพูด, จุลภาคในช่อง, CRLF */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out.filter((r) => r.some((c) => c.trim() !== ''));
}

function toRows(grid: string[][], existing: Set<string>): ImportRow[] {
  const header = grid[0]?.map((h) => h.trim().toLowerCase().replace(/^﻿/, '')) ?? [];
  const li = header.findIndex((h) => LABEL_KEYS.includes(h));
  const ai = header.findIndex((h) => ADDRESS_KEYS.includes(h));
  if (li < 0 || ai < 0) throw new ImportError('noHeader');

  const seen = new Set(existing);
  const rows: ImportRow[] = [];
  for (const r of grid.slice(1)) {
    const label = (r[li] ?? '').trim();
    // ช่องที่อยู่ใส่ได้หลายค่า (ERC-20 หรือ Solana ปนกันได้) คั่นด้วยจุลภาค / ช่องว่าง / ขึ้นบรรทัดใหม่
    const parts = (r[ai] ?? '').split(/[\s,;]+/).filter(Boolean);
    if (!parts.length && !label) continue;
    parts.forEach((p, i) => {
      const parsed = parseAddress(p);
      const dupe = parsed !== null && seen.has(parsed.address);
      if (parsed) seen.add(parsed.address);
      rows.push({ label: parts.length > 1 && label ? `${label} ${i + 1}` : label, address: parsed?.address ?? p, status: !parsed ? 'bad' : dupe ? 'dupe' : 'ok' });
    });
    if (!parts.length) rows.push({ label, address: '', status: 'bad' });
  }
  return rows;
}
