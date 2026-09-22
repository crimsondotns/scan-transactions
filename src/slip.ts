/**
 * สลิปธุรกรรม — ข้อมูลที่แสดงบนสลิป, รหัสยืนยัน (SHA-256 ของข้อมูล), เก็บสำเนาในเครื่อง, และวาดเป็นภาพ
 *
 * ทุกอย่างอยู่ในเบราว์เซอร์: ไม่มีเซิร์ฟเวอร์เซ็น ไม่มี URL ตรวจกลาง — รหัสยืนยันคือแฮชของเนื้อหา
 * ใครมีลิงก์แชร์ (ซึ่งพกข้อมูลไปเอง) เปิดในแอปนี้แล้วตรวจได้ว่าเนื้อหายังตรงกับรหัสหรือถูกแก้
 * สำเนาที่เก็บในเครื่องไม่ถูกเขียนทับ (รหัสเดิม = ระเบียนเดิม)
 */
import QRCode from 'qrcode';
import type { TxRow } from './feed';
import { formatAmountFull, formatFeeNative, formatStamp, shortAddr } from './format';

export interface SlipMove {
  dir: 'in' | 'out';
  amount: number;
  symbol: string;
}

/** เนื้อหาสลิป — ค่าที่ถูกแฮชเป็นรหัสยืนยัน (ลำดับ key คงที่) */
export interface SlipData {
  v: 1;
  hash: string;
  chain: string;
  chainName: string;
  type: string;
  status: 'ok' | 'failed';
  wallet: string;
  walletLabel: string;
  from: string | null;
  to: string | null;
  moves: SlipMove[];
  fee: number | null;
  feeSymbol: string;
  time: number;
  /** ลิงก์ explorer ของธุรกรรม (ถ้ามี) — ใส่ใน QR */
  url: string | null;
  /** เวลาออกสลิป (ms) */
  issued: number;
}

export interface SlipRecord {
  code: string;
  data: SlipData;
}

const KEY = 'xcap.scan.slips';
const MAX_BYTES = 4 * 1024 * 1024;

export function slipData(row: TxRow, wallet: { address: string; label: string } | undefined, chainName: string, native: string, url: string | null): SlipData {
  return {
    v: 1,
    hash: row.hash,
    chain: row.chain,
    chainName,
    type: row.type,
    status: row.failed ? 'failed' : 'ok',
    wallet: wallet?.address ?? row.walletId,
    walletLabel: wallet?.label ?? '',
    from: row.from,
    to: row.to,
    moves: row.moves.filter((m) => m.amount !== 0).map((m) => ({ dir: m.dir, amount: m.amount, symbol: m.symbol })),
    fee: row.gasNative,
    feeSymbol: native,
    time: row.time,
    url,
    issued: Date.now(),
  };
}

/** สตริงที่แฮช: JSON ของฟิลด์ตามลำดับที่กำหนด (ไม่ขึ้นกับลำดับ key ของอ็อบเจ็กต์) */
function canonical(d: SlipData): string {
  return JSON.stringify([d.v, d.hash, d.chain, d.type, d.status, d.wallet, d.from, d.to, d.moves.map((m) => [m.dir, m.amount, m.symbol]), d.fee, d.feeSymbol, d.time, d.issued]);
}

export async function slipCode(d: SlipData): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(d)));
  const hex = [...new Uint8Array(buf)]
    .slice(0, 10)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return hex.match(/.{1,5}/g)!.join('-');
}

export function normalizeCode(s: string): string {
  const hex = s.toUpperCase().replace(/[^0-9A-F]/g, '');
  return hex.length === 20 ? hex.match(/.{1,5}/g)!.join('-') : '';
}

/* ----------------------------- เก็บในเครื่อง ----------------------------- */

function loadAll(): SlipRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list as SlipRecord[]).filter((r) => r && typeof r.code === 'string' && r.data && r.data.v === 1) : [];
  } catch {
    return [];
  }
}

/** เก็บสำเนา — รหัสที่มีอยู่แล้วไม่ถูกแทนที่; เกินโควตาตัดของเก่าสุดทิ้ง */
export function saveSlip(rec: SlipRecord): void {
  const all = loadAll();
  if (all.some((r) => r.code === rec.code)) return;
  all.push(rec);
  let json = JSON.stringify(all);
  while (json.length > MAX_BYTES && all.length > 1) {
    all.shift();
    json = JSON.stringify(all);
  }
  try {
    localStorage.setItem(KEY, json);
  } catch {
    /* เต็มหรือถูกบล็อก */
  }
}

export function findSlip(code: string): SlipRecord | null {
  return loadAll().find((r) => r.code === code) ?? null;
}

export function listSlips(): SlipRecord[] {
  return loadAll().slice().reverse();
}

/* ----------------------------- ลิงก์แชร์ ----------------------------- */

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

/** ลิงก์พกข้อมูลไปเอง: #/v/<code>.<base64url(json)> — เปิดในแอปนี้ที่ไหนก็ตรวจได้ */
export function shareLink(rec: SlipRecord): string {
  return `${location.origin}${location.pathname}#/v/${rec.code}.${b64(JSON.stringify(rec.data))}`;
}

export function parseShare(fragment: string): { code: string; data: SlipData | null } | null {
  const m = /^([0-9A-F-]+)(?:\.([A-Za-z0-9_-]+))?$/.exec(fragment.trim());
  if (!m) return null;
  const code = normalizeCode(m[1]!);
  if (!code) return null;
  let data: SlipData | null = null;
  if (m[2]) {
    try {
      const d = JSON.parse(unb64(m[2])) as SlipData;
      if (d && d.v === 1 && typeof d.hash === 'string') data = d;
    } catch {
      /* ข้อมูลในลิงก์เสีย */
    }
  }
  return { code, data };
}

export type Verdict = 'valid' | 'tampered' | 'unknown';

/** ตรวจ: มีข้อมูล (จากลิงก์หรือสำเนาในเครื่อง) → แฮชใหม่เทียบรหัส */
export async function verifySlip(code: string, data: SlipData | null): Promise<{ verdict: Verdict; data: SlipData | null; stored: boolean }> {
  const stored = findSlip(code);
  const d = data ?? stored?.data ?? null;
  if (!d) return { verdict: 'unknown', data: null, stored: false };
  const ok = (await slipCode(d)) === code;
  return { verdict: ok ? 'valid' : 'tampered', data: d, stored: !!stored };
}

/* ----------------------------- วาดภาพ ----------------------------- */

const FONT = "'Suisse Intl', -apple-system, BlinkMacSystemFont, sans-serif";
const W = 640;
const PAD = 44;
const INK = '#000000';
const MUTED = 'rgba(0,0,0,0.6)';
const LINE = 'rgba(0,0,0,0.12)';

interface Labels {
  title: string;
  wallet: string;
  from: string;
  to: string;
  hash: string;
  fee: string;
  time: string;
  chain: string;
  code: string;
  issued: string;
  type: string;
  status: string;
  verifyHint: string;
}

/** วาดสลิปลง canvas ใหม่ (ความละเอียด 2 เท่า) — สีขาว/ดำเสมอ ไม่ตามธีมหน้าจอ เพราะเป็นเอกสาร */
export async function renderSlip(rec: SlipRecord, L: Labels): Promise<HTMLCanvasElement> {
  try {
    await Promise.all([document.fonts.load(`400 16px ${FONT}`), document.fonts.load(`600 16px ${FONT}`)]);
  } catch {
    /* ฟอนต์ไม่มา → ใช้สำรอง */
  }
  const d = rec.data;
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, d.url ?? d.hash, { margin: 0, width: 104, color: { dark: INK, light: '#ffffff' } });

  // วัดสูงก่อน: วาดสองรอบ (รอบแรก dry run บน canvas ชั่วคราว)
  const draw = (ctx: CanvasRenderingContext2D, dry: boolean): number => {
    let y = PAD;
    const text = (s: string, x: number, yy: number, size: number, weight = 400, color = INK, align: CanvasTextAlign = 'left') => {
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      if (!dry) ctx.fillText(s, x, yy);
    };
    const wrap = (s: string, x: number, yy: number, size: number, maxW: number, weight = 400, color = INK): number => {
      ctx.font = `${weight} ${size}px ${FONT}`;
      const lines: string[] = [];
      let cur = '';
      for (const ch of s.includes(' ') ? s.split(' ').map((w, i) => (i ? ` ${w}` : w)) : [...s]) {
        if (ctx.measureText(cur + ch).width > maxW && cur) {
          lines.push(cur);
          cur = ch.trimStart();
        } else cur += ch;
      }
      if (cur) lines.push(cur);
      lines.forEach((ln, i) => text(ln, x, yy + i * size * 1.4, size, weight, color));
      return lines.length * size * 1.4;
    };
    const rule = (yy: number) => {
      if (dry) return;
      ctx.fillStyle = LINE;
      ctx.fillRect(PAD, yy, W - PAD * 2, 1);
    };
    const mark = (x: number, yy: number, s: number) => {
      if (dry) return;
      const k = s / 32;
      ctx.strokeStyle = INK;
      ctx.fillStyle = INK;
      ctx.lineWidth = Math.max(1, k);
      ctx.beginPath();
      ctx.arc(x + 16 * k, yy + 16 * k, 14.5 * k, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(x + 13.2 * k, yy + 13.2 * k, 5.6 * k, 5.6 * k);
      for (const [cx, cy] of [
        [8, 8],
        [21, 8],
        [8, 21],
        [21, 21],
      ] as const)
        ctx.strokeRect(x + cx * k, yy + cy * k, 3 * k, 3 * k);
    };

    // หัว: เครื่องหมาย + XCap ซ้าย, สถานะขวา
    mark(PAD, y, 28);
    text('XCap', PAD + 36, y + 21, 20, 600);
    ctx.font = `500 13px ${FONT}`;
    const stW = ctx.measureText(L.status).width + 24;
    if (!dry) {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(W - PAD - stW, y + 2, stW, 26, 13);
      ctx.stroke();
    }
    text(L.status, W - PAD - stW / 2, y + 20, 13, 500, INK, 'center');
    y += 56;
    text(L.title, PAD, y + 22, 28, 600);
    text(formatStamp(d.time), W - PAD, y + 22, 14, 400, MUTED, 'right');
    y += 44;
    rule(y);
    y += 28;

    // จำนวน
    text(L.type, PAD, y + 12, 13, 500, MUTED);
    for (const m of d.moves) {
      text(`${m.dir === 'in' ? '+' : '−'}${formatAmountFull(m.amount)} ${m.symbol}`, W - PAD, y + 12, 22, 600, INK, 'right');
      y += 32;
    }
    if (!d.moves.length) y += 32;
    y += 8;
    rule(y);
    y += 24;

    // แถวข้อมูล
    const row = (label: string, value: string | null, long = false) => {
      if (!value) return;
      text(label, PAD, y + 13, 13, 500, MUTED);
      if (long) y += wrap(value, PAD, y + 36, 14, W - PAD * 2) + 24;
      else {
        text(value, W - PAD, y + 13, 14, 400, INK, 'right');
        y += 30;
      }
    };
    row(L.chain, d.chainName);
    row(L.wallet, d.walletLabel ? `${d.walletLabel} · ${shortAddr(d.wallet)}` : shortAddr(d.wallet));
    row(L.from, d.from ? shortAddr(d.from) : null);
    row(L.to, d.to ? shortAddr(d.to) : null);
    row(L.fee, d.fee !== null ? formatFeeNative(d.fee, d.feeSymbol) : null);
    row(L.time, formatStamp(d.time));
    row(L.hash, d.hash, true);
    y += 4;
    rule(y);
    y += 24;

    // ท้าย: QR + รหัสยืนยัน
    if (!dry) ctx.drawImage(qr, PAD, y, 104, 104);
    const fx = PAD + 124;
    text(L.code, fx, y + 14, 13, 500, MUTED);
    text(rec.code, fx, y + 40, 18, 600);
    text(`${L.issued} ${formatStamp(Math.floor(d.issued / 1000))}`, fx, y + 66, 12, 400, MUTED);
    y += 78 + wrap(L.verifyHint, fx, y + 88, 12, W - fx - PAD, 400, MUTED);
    y += 40;
    return y;
  };

  const probe = document.createElement('canvas').getContext('2d')!;
  const H = Math.ceil(draw(probe, true));
  const canvas = document.createElement('canvas');
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);
  draw(ctx, false);
  return canvas;
}

export function canvasBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png'));
}
