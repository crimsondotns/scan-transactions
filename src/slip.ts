/**
 * สลิปธุรกรรม — ข้อมูลที่แสดงบนสลิป, รหัสยืนยัน (SHA-256 ของข้อมูล), เก็บสำเนาในเครื่อง, และวาดเป็นภาพ
 *
 * ทุกอย่างอยู่ในเบราว์เซอร์: ไม่มีเซิร์ฟเวอร์เซ็น ไม่มี URL ตรวจกลาง — รหัสยืนยันคือแฮชของเนื้อหา
 * ใครมีลิงก์แชร์ (ซึ่งพกข้อมูลไปเอง) เปิดในแอปนี้แล้วตรวจได้ว่าเนื้อหายังตรงกับรหัสหรือถูกแก้
 * สำเนาที่เก็บในเครื่องไม่ถูกเขียนทับ (รหัสเดิม = ระเบียนเดิม)
 */
import QRCode from 'qrcode';
import type { TxRow } from './feed';
import { formatAmountFull, formatFeeNative, formatStamp, formatUsdExact, shortAddr } from './format';
import { chainStyle, tokenColor } from './chainStyle';
import { identiconHue } from './components/Identicon';

export interface SlipMove {
  dir: 'in' | 'out';
  amount: number;
  symbol: string;
  /** แสดงผลอย่างเดียว ไม่อยู่ในแฮช */
  usd?: number | null;
  logo?: string | null;
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
  /** โลโก้โทเคนหลัก / โลโก้เชน (https) — แสดงผลอย่างเดียว ไม่อยู่ในแฮช */
  tokenLogo?: string | null;
  chainLogo?: string | null;
  /** เวลาออกสลิป (ms) */
  issued: number;
}

export interface SlipRecord {
  code: string;
  data: SlipData;
}

const KEY = 'xcap.scan.slips';
const MAX_BYTES = 4 * 1024 * 1024;

export function slipData(row: TxRow, wallet: { address: string; label: string } | undefined, chainName: string, native: string, url: string | null, chainLogo: string | null = null, usdOfMove: (m: TxRow['moves'][number]) => number | null = () => null): SlipData {
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
    moves: row.moves.filter((m) => m.amount !== 0).map((m) => ({ dir: m.dir, amount: m.amount, symbol: m.symbol, usd: usdOfMove(m), logo: m.logo })),
    fee: row.gasNative,
    feeSymbol: native,
    time: row.time,
    url,
    tokenLogo: (row.moves.find((m) => m.amount !== 0 && m.logo) ?? row.moves.find((m) => m.logo))?.logo ?? null,
    chainLogo,
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

export type SlipAction = 'download' | 'copy' | 'print' | 'share' | 'verify';
/* สีประจำฟังก์ชัน/เชน — ค่าจริงอ่านจาก tokens.css ตอนวาด ตรงนี้แค่ค่าสำรอง */
const FN_FALLBACK: Record<SlipAction, string> = { download: '#0066ff', copy: '#059669', print: '#9333ea', share: '#f59e0b', verify: '#10b981' };
const FN_GLYPH: Record<SlipAction, string> = { download: '⤓', copy: '❐', print: '⎙', share: '⤴', verify: '✓' };

interface Labels {
  title: string;
  /** คำว่า "on" ในชื่อเรื่อง NEST on HyperEVM */
  on: string;
  action: Record<SlipAction, string>;
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

/** โหลดรูปแบบ CORS-safe (ไม่งั้น canvas จะ taint แล้ว export ไม่ได้) — โหลดไม่ได้/ช้าเกิน 4 วิ → null แล้วใช้ตัวอักษรแทน */
function loadImage(url: string | null | undefined): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const done = (v: HTMLImageElement | null) => {
      clearTimeout(timer);
      res(v);
    };
    const timer = setTimeout(() => done(null), 4000);
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = url;
  });
}

const STRIPE = 6;

/** รูปวงกลม — ไม่มีรูปก็วาดวงกลมสีพร้อมตัวอักษรแรก (เหมือน <Logo>) */
function circleImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, size: number, name: string, color: string, dry: boolean) {
  if (dry) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  if (img) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x, y, size, size);
    ctx.drawImage(img, x, y, size, size);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 ${Math.round(size * 0.42)}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((name[0] ?? '?').toUpperCase(), x + size / 2, y + size / 2 + 1);
  }
  ctx.restore();
}

/** วาดสลิปลง canvas ใหม่ (ความละเอียด 2 เท่า) — สีขาว/ดำเสมอ ไม่ตามธีมหน้าจอ เพราะเป็นเอกสาร */
export async function renderSlip(rec: SlipRecord, L: Labels, action: SlipAction | null = null): Promise<HTMLCanvasElement> {
  try {
    await Promise.all([document.fonts.load(`400 16px ${FONT}`), document.fonts.load(`600 16px ${FONT}`)]);
  } catch {
    /* ฟอนต์ไม่มา → ใช้สำรอง */
  }
  const d = rec.data;
  const cs = chainStyle(d.chain, d.chainName);
  const [tokenImg, chainImg, ...moveImgs] = await Promise.all([loadImage(d.tokenLogo), loadImage(d.chainLogo), ...d.moves.map((m) => loadImage(m.logo))]);
  const POSITIVE = tokenColor('positive', '#16a34a');
  const primary = d.moves.find((m) => m.dir === 'out') ?? d.moves[0] ?? null;
  const swapIn = d.moves.find((m) => m.dir === 'in');
  const isSwap = !!primary && !!swapIn && primary.dir === 'out';
  const titleText = primary ? (isSwap ? `${primary.symbol} → ${swapIn!.symbol}` : primary.symbol) : L.title;
  // สีเฉพาะสลิป: เชน → พื้นหัวสลิปย้อมจาง, โทเคน → แถบ accent ซ้าย (hue จากสัญลักษณ์ เหมือน identicon)
  const chainColor = cs ? tokenColor(cs.token, '#000000') : '#000000';
  const tokenAccent = `hsl(${identiconHue(primary?.symbol ?? d.chain)} 60% 52%)`;
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, d.url ?? d.hash, { margin: 0, width: 104, color: { dark: INK, light: '#ffffff' } });

  // วัดสูงก่อน: วาดสองรอบ (รอบแรก dry run บน canvas ชั่วคราว)
  let headerBottom = 0;
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

    // แถบ accent ของโทเคน (ซ้ายเต็มความสูง) + พื้นหัวสลิปย้อมสีเชน — วาดหลังรู้ความสูงจริง (ใน finish)
    // หัว: เครื่องหมาย + XCap ซ้าย, โลโก้เชน 32px มุมขวาบน
    mark(PAD, y, 28);
    text('XCap', PAD + 36, y + 21, 20, 600);
    circleImage(ctx, chainImg, W - PAD - 32, y - 2, 32, d.chainName, chainColor, dry);
    y += 52;
    // โลโก้โทเคน 48px + ชื่อเรื่อง "NEST on HyperEVM" + วันเวลา/สถานะ
    circleImage(ctx, tokenImg, PAD, y, 48, primary?.symbol ?? d.chain, tokenAccent, dry);
    const tx = PAD + 60;
    text(`${titleText} ${L.on} ${d.chainName}`, tx, y + 22, 24, 600);
    text(formatStamp(d.time), tx, y + 44, 13, 400, MUTED);
    ctx.font = `500 13px ${FONT}`;
    const stW = ctx.measureText(L.status).width + 24;
    if (!dry) {
      ctx.strokeStyle = LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(W - PAD - stW, y + 11, stW, 26, 13);
      ctx.stroke();
    }
    text(L.status, W - PAD - stW / 2, y + 29, 13, 500, INK, 'center');
    y += 72;
    headerBottom = y;
    y += 24;

    // สินทรัพย์ — โครงเดียวกับแผงรายละเอียด (โลโก้+ตราเชน / สัญลักษณ์ / on เชน / จำนวนเต็มทศนิยม + USD) แต่ไม่มีพื้นเทา
    // สวอป: ขาออกก่อน แล้วเส้นเชื่อม + ⇄ แล้วขาเข้า
    const ordered = [...d.moves.filter((m) => m.dir === 'out'), ...d.moves.filter((m) => m.dir === 'in')];
    ordered.forEach((m, i) => {
      if (i > 0 && !dry) {
        // เส้นเชื่อมจากโลโก้บนถึงโลโก้ล่าง + ไอคอน ⇄ ตรงกลาง
        ctx.fillStyle = tokenColor('divider', '#d9d9d9');
        ctx.fillRect(PAD + 20, y - 4, 1, 44);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(PAD + 9, y + 9, 22, 18);
        text('⇄', PAD + 20, y + 24, 16, 400, MUTED, 'center');
      }
      if (i > 0) y += 40;
      const img = moveImgs[d.moves.indexOf(m)] ?? null;
      circleImage(ctx, img, PAD, y, 40, m.symbol, tokenAccent, dry);
      if (!dry) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(PAD + 32, y + 32, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      circleImage(ctx, chainImg, PAD + 24, y + 24, 16, d.chainName, chainColor, dry);
      text(m.symbol, PAD + 52, y + 18, 20, 600);
      text(`${L.on} ${d.chainName}`, PAD + 52, y + 36, 13, 400, MUTED);
      const sign = m.dir === 'in' ? '+' : '−';
      text(`${sign}${formatAmountFull(m.amount)}`, W - PAD, y + 20, 22, 600, m.dir === 'in' ? POSITIVE : INK, 'right');
      if (m.usd !== null && m.usd !== undefined) text(formatUsdExact(m.usd), W - PAD, y + 38, 12, 400, MUTED, 'right');
      y += 44;
    });
    if (!ordered.length) y += 8;
    y += 16;
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
    // เชน: สัญลักษณ์สีประจำเชนหน้าชื่อ (สีเดียวกับในแผงรายละเอียด)
    text(L.chain, PAD, y + 13, 13, 500, MUTED);
    text(d.chainName, W - PAD, y + 13, 14, 400, INK, 'right');
    if (cs) {
      ctx.font = `400 14px ${FONT}`;
      const nameW = ctx.measureText(d.chainName).width;
      text(cs.glyph, W - PAD - nameW - 8, y + 13, 16, 700, tokenColor(cs.token, '#000000'), 'right');
    }
    y += 30;
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
    y += 24;
    // ตราฟังก์ชันที่ทำกับสลิปนี้ (Downloaded ⤓ / Verified ✓ …) — สีประจำฟังก์ชัน
    if (action) {
      const color = tokenColor(`fn-${action}`, FN_FALLBACK[action]);
      ctx.font = `600 13px ${FONT}`;
      const label = `${L.action[action]} ${FN_GLYPH[action]}`;
      const lw = ctx.measureText(label).width + 28;
      if (!dry) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(W - PAD - lw, y, lw, 28, 14);
        ctx.stroke();
      }
      text(label, W - PAD - lw / 2, y + 19, 13, 600, color, 'center');
      y += 40;
    }
    y += 16;
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
  // พื้นหัวสลิปย้อมสีเชน (โปร่ง 8%) + แถบ accent โทเคนซ้าย
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = chainColor;
  ctx.fillRect(0, 0, W, headerBottom);
  ctx.globalAlpha = 1;
  ctx.fillStyle = tokenAccent;
  ctx.fillRect(0, 0, STRIPE, H);
  draw(ctx, false);
  return canvas;
}

export function canvasBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png'));
}
