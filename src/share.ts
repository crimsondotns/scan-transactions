/**
 * แพ็กเกจแชร์ — ส่ง "ภาพถ่าย ณ เวลาหนึ่ง" ของข้อมูลให้คนอื่น โดยแอปนี้ไม่มีเซิร์ฟเวอร์
 *
 * รูปแบบ: ข้อมูล → เข้ารหัส AES-GCM ด้วยกุญแจสุ่มหนึ่งอันต่อแพ็กเกจ → ห่อเป็นซอง (ข้อมูลบรรยาย + payload)
 *   - ลิงก์:  <base>s/<ซองที่เข้ารหัส base64url>#<กุญแจ>   ← ส่วนหลัง # เบราว์เซอร์ไม่ส่งไปให้โฮสต์
 *   - ไฟล์:  xcapscan-share.json (+ กุญแจแยกให้ผู้ใช้ส่งคนละทาง)
 *
 * สิ่งที่บังคับได้จริงกับที่บังคับไม่ได้ (ต้องบอกผู้ใช้ตรงๆ ใน UI — ดู docs/identity-and-sharing.md)
 *   บังคับได้  : ใครไม่มีกุญแจ อ่านไม่ได้เลย (เข้ารหัสจริง) และเนื้อหาถูกแก้ระหว่างทาง = ถอดไม่ผ่าน
 *   บังคับไม่ได้: ยกเลิกลิงก์ที่แจกไปแล้ว, ห้ามผู้รับคัดลอก/ส่งต่อ, บทบาท view/edit (เป็นคำประกาศ ไม่ใช่กำแพง)
 *                 วันหมดอายุตรวจได้เฉพาะในแอปของผู้รับ — ใครเก็บไฟล์ไว้ก่อนก็เปิดเองได้ตลอด
 */
import { decryptJson, encryptJson, exportKey, fromBase64url, importKey, randomKey, toBase64url } from './crypto';
import { readBackup, type Author, type PortableData } from './backup';

export const SHARE_VERSION = 1;
/** ยาวกว่านี้ใส่ลิงก์ไม่ไหว (เบราว์เซอร์/แอปแชตตัดทิ้ง) → ให้ส่งเป็นไฟล์แทน */
export const MAX_LINK_CHARS = 6000;

export type ShareRole = 'view' | 'edit';

export interface SharePackage {
  app: 'xcapscan';
  kind: 'share';
  v: number;
  id: string;
  role: ShareRole;
  by: Author | null;
  note: string | null;
  createdAt: string;
  /** วันหมดอายุที่ "แอปของผู้รับ" จะเคารพ — ไม่ใช่การเพิกถอนจริง */
  expiresAt: string | null;
  payload: string;
}

export type ShareErrorCode = 'shape' | 'version' | 'key';
export class ShareError extends Error {
  constructor(readonly code: ShareErrorCode) {
    super(code);
  }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const randomId = () => toBase64url(crypto.getRandomValues(new Uint8Array(9)));

export async function buildShare(
  data: PortableData,
  opts: { role: ShareRole; by?: Author | null; note?: string | null; expiresInDays?: number | null; now?: Date }
): Promise<{ pkg: SharePackage; key: string }> {
  const key = await randomKey();
  const now = opts.now ?? new Date();
  const expiresAt = opts.expiresInDays != null ? new Date(now.getTime() + opts.expiresInDays * 86_400_000).toISOString() : null;
  // ห่อเนื้อหาเป็นรูปเดียวกับไฟล์สำรอง → ผู้รับนำเข้าด้วยเส้นทางเดียวกัน (readBackup/mergeData)
  const inner = { app: 'xcapscan' as const, kind: 'backup' as const, v: 1, createdAt: now.toISOString(), by: opts.by ?? null, data };
  return {
    pkg: {
      app: 'xcapscan',
      kind: 'share',
      v: SHARE_VERSION,
      id: randomId(),
      role: opts.role,
      by: opts.by ?? null,
      note: opts.note ?? null,
      createdAt: now.toISOString(),
      expiresAt,
      payload: await encryptJson(key, inner),
    },
    key: await exportKey(key),
  };
}

export interface OpenedShare {
  id: string;
  role: ShareRole;
  by: Author | null;
  note: string | null;
  createdAt: string;
  expiresAt: string | null;
  expired: boolean;
  data: PortableData;
}

/** เปิดแพ็กเกจ — กุญแจผิด/เนื้อหาถูกแก้ = ShareError('key'); หมดอายุยัง "เปิดได้" แต่ติดธงให้ UI เตือน */
export async function openShare(raw: unknown, keyText: string, now = new Date()): Promise<OpenedShare> {
  if (!isObj(raw) || raw.app !== 'xcapscan' || raw.kind !== 'share' || typeof raw.payload !== 'string') throw new ShareError('shape');
  if (typeof raw.v !== 'number' || raw.v > SHARE_VERSION) throw new ShareError('version');
  let key: CryptoKey;
  try {
    key = await importKey(keyText.trim());
  } catch {
    throw new ShareError('key');
  }
  let inner: unknown;
  try {
    inner = await decryptJson(key, raw.payload);
  } catch {
    throw new ShareError('key');
  }
  const file = readBackup(inner);
  const expiresAt = typeof raw.expiresAt === 'string' ? raw.expiresAt : null;
  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    role: raw.role === 'edit' ? 'edit' : 'view',
    by: file.by,
    note: typeof raw.note === 'string' ? raw.note : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : file.createdAt,
    expiresAt,
    expired: expiresAt !== null && Date.parse(expiresAt) < now.getTime(),
    data: file.data,
  };
}

/** เส้นทางของลิงก์ (ไม่มี base): s/<ซอง>#<กุญแจ> — null เมื่อยาวเกินไปจนต้องส่งเป็นไฟล์ */
export function sharePath(pkg: SharePackage, key: string): string | null {
  const body = toBase64url(new TextEncoder().encode(JSON.stringify(pkg)));
  const path = `s/${body}#${key}`;
  return path.length > MAX_LINK_CHARS ? null : path;
}

/** อ่านลิงก์ที่ผู้รับเปิด: ส่วนพาธ = ซอง, ส่วนหลัง # = กุญแจ */
export function parseSharePath(route: string, hash: string): { pkg: unknown; key: string } | null {
  if (!route.startsWith('s/')) return null;
  const body = route.slice(2);
  const key = hash.replace(/^#/, '');
  if (!body || !key) return null;
  try {
    return { pkg: JSON.parse(new TextDecoder().decode(fromBase64url(body))), key };
  } catch {
    return null;
  }
}

export function shareFilename(now = new Date()): string {
  return `xcapscan-share-${now.toISOString().slice(0, 10)}.json`;
}
