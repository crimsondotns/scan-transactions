/**
 * สำรอง / กู้คืน / รวมข้อมูล — วิธีเดียวที่ข้อมูลข้ามเครื่องได้ในแอปที่ไม่มีเซิร์ฟเวอร์
 *
 * ไม่มี "cloud sync" เพราะไม่มี cloud: ผู้ใช้กดส่งออกเป็นไฟล์ แล้วพาไฟล์ไปเองทางไหนก็ได้
 * ไฟล์มี 2 แบบ — แบบเปิดอ่านได้ (JSON ตรงๆ) กับแบบเข้ารหัสด้วยรหัสผ่าน (ดู src/crypto.ts)
 *
 * ฟังก์ชันในไฟล์นี้เป็นฟังก์ชันบริสุทธิ์ทั้งหมด (ทดสอบได้โดยไม่ต้องมีเบราว์เซอร์)
 */
import { SLIP_SHOW_DEFAULT, type Settings, type Wallet } from './store';

export const BACKUP_VERSION = 1;

/**
 * ส่วนของสถานะที่พกข้ามเครื่องได้ — แคช (ราคา/โลโก้/สลิป) ไม่รวม เพราะสร้างใหม่ได้เอง
 *
 * แหล่งข้อมูล · URL รายชื่อเชน · เชนกำหนดเอง **ไม่อยู่ในไฟล์สำรอง** ตั้งแต่รุ่นนี้:
 * มันมาจากค่าที่ฝังตอน build ไม่ใช่ของที่ผู้ใช้ตั้งเอง เครื่องปลายทางได้ของพวกนี้จากตัวเว็บอยู่แล้ว
 * และไฟล์สำรองเป็นไฟล์ที่ถูกส่งต่อ/เก็บไว้ในเครื่องได้ — ไม่ควรพา URL หรือกุญแจของแหล่งข้อมูลติดไปด้วย
 */
export interface PortableData {
  wallets: Wallet[];
  settings: Settings;
}

export interface Author {
  name: string | null;
  username: string | null;
}

export interface BackupFile {
  app: 'xcapscan';
  kind: 'backup';
  v: number;
  createdAt: string;
  by: Author | null;
  data: PortableData;
}

export type BackupErrorCode = 'shape' | 'version' | 'empty';
export class BackupError extends Error {
  constructor(readonly code: BackupErrorCode) {
    super(code);
  }
}

export function buildBackup(data: PortableData, by: Author | null = null): BackupFile {
  return { app: 'xcapscan', kind: 'backup', v: BACKUP_VERSION, createdAt: new Date().toISOString(), by, data: portable(data) };
}

/** เอาเฉพาะฟิลด์ที่รู้จัก — ไฟล์จากรุ่นอื่นจะไม่พาฟิลด์แปลกปลอมเข้ามาในสถานะ */
export function portable(d: PortableData): PortableData {
  return {
    wallets: d.wallets.map((w) => ({ id: w.id, label: w.label, address: w.address, family: w.family, enabled: w.enabled, ...(w.tags?.length ? { tags: [...w.tags] } : {}) })),
    settings: {
      pageSize: d.settings.pageSize,
      hideScam: d.settings.hideScam,
      slipShow: { ...d.settings.slipShow },
      priceUrl: d.settings.priceUrl,
      proxyUrl: d.settings.proxyUrl,
      // ค่าที่มาจากตอน build — เขียนเป็นค่าว่างไว้ให้รูปร่างไฟล์คงเดิม แต่ไม่พาค่าจริงออกไป
      endpoints: [],
      chainListUrl: '',
      chains: [],
    },
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** อ่านไฟล์ที่ผู้ใช้เลือกมา — ผิดรูป/คนละรุ่น = โยน BackupError ไม่แตะสถานะเดิม */
export function readBackup(raw: unknown): BackupFile {
  if (!isObj(raw) || raw.app !== 'xcapscan' || raw.kind !== 'backup') throw new BackupError('shape');
  if (typeof raw.v !== 'number' || raw.v > BACKUP_VERSION) throw new BackupError('version');
  const data = raw.data;
  if (!isObj(data) || !Array.isArray(data.wallets) || !isObj(data.settings)) throw new BackupError('shape');
  const wallets = (data.wallets as Wallet[]).filter((w) => isObj(w) && typeof w.address === 'string');
  // ไฟล์รุ่นเก่ามีแหล่งข้อมูล/เชนติดมาด้วย — ทิ้งตั้งแต่ตอนอ่าน ไม่ให้ย้อนกลับเข้าสถานะ
  const s = data.settings as Partial<Settings>;
  const settings = portable({
    wallets,
    settings: {
      endpoints: [],
      chains: [],
      chainListUrl: '',
      pageSize: typeof s.pageSize === 'number' ? s.pageSize : 20,
      hideScam: s.hideScam === true,
      slipShow: { ...SLIP_SHOW_DEFAULT, ...((isObj(s.slipShow) ? s.slipShow : {}) as Partial<Settings['slipShow']>) },
      priceUrl: typeof s.priceUrl === 'string' ? s.priceUrl : '',
      proxyUrl: typeof s.proxyUrl === 'string' ? s.proxyUrl : '',
    },
  }).settings;
  if (!wallets.length) throw new BackupError('empty');
  return {
    app: 'xcapscan',
    kind: 'backup',
    v: raw.v,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
    by: isObj(raw.by) ? { name: typeof raw.by.name === 'string' ? raw.by.name : null, username: typeof raw.by.username === 'string' ? raw.by.username : null } : null,
    data: { wallets, settings },
  };
}

export interface MergeReport {
  wallets: number;
}

/**
 * รวมของใหม่เข้ากับของเดิมโดยไม่ลบอะไรเลย (นำเข้าไฟล์เดิมซ้ำ = ไม่มีอะไรเปลี่ยน)
 *  - กระเป๋า: เทียบด้วยที่อยู่; มีอยู่แล้วคงป้ายเดิมไว้ เว้นแต่ป้ายเดิมว่าง ส่วนแท็กรวมกันทั้งสองฝั่ง
 *  - ค่าตั้งอื่น: ของเดิมชนะเสมอ ยกเว้นค่าที่ยังว่างอยู่
 *  - แหล่งข้อมูล/เชน: ไม่อยู่ในไฟล์สำรองแล้ว (มาจากค่าที่ฝังตอน build) จึงไม่มีอะไรให้รวม
 */
export function mergeData(current: PortableData, incoming: PortableData): { data: PortableData; added: MergeReport } {
  const wallets = [...current.wallets];
  const byAddress = new Map(wallets.map((w, i) => [w.address.toLowerCase(), i]));
  let addedWallets = 0;
  for (const w of incoming.wallets) {
    const at = byAddress.get(w.address.toLowerCase());
    if (at === undefined) {
      wallets.push({ ...w });
      byAddress.set(w.address.toLowerCase(), wallets.length - 1);
      addedWallets++;
      continue;
    }
    const have = wallets[at]!;
    const tags = [...new Set([...(have.tags ?? []), ...(w.tags ?? [])])];
    wallets[at] = {
      ...have,
      ...(!have.label.trim() && w.label.trim() ? { label: w.label } : {}),
      ...(tags.length ? { tags } : {}),
    };
  }

  const pick = (a: string, b: string) => (a.trim() ? a : b);
  const settings: Settings = {
    ...current.settings,
    priceUrl: pick(current.settings.priceUrl, incoming.settings.priceUrl ?? ''),
    proxyUrl: pick(current.settings.proxyUrl, incoming.settings.proxyUrl ?? ''),
  };
  return { data: { wallets, settings }, added: { wallets: addedWallets } };
}

/** ชื่อไฟล์ที่เสนอตอนบันทึก — วันที่ในชื่อช่วยให้ผู้ใช้รู้ว่าไฟล์ไหนใหม่กว่า */
export function backupFilename(now = new Date(), encrypted = false): string {
  const d = now.toISOString().slice(0, 10);
  return `xcapscan-backup-${d}${encrypted ? '.enc' : ''}.json`;
}
