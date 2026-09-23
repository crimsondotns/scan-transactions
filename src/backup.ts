/**
 * สำรอง / กู้คืน / รวมข้อมูล — วิธีเดียวที่ข้อมูลข้ามเครื่องได้ในแอปที่ไม่มีเซิร์ฟเวอร์
 *
 * ไม่มี "cloud sync" เพราะไม่มี cloud: ผู้ใช้กดส่งออกเป็นไฟล์ แล้วพาไฟล์ไปเองทางไหนก็ได้
 * ไฟล์มี 2 แบบ — แบบเปิดอ่านได้ (JSON ตรงๆ) กับแบบเข้ารหัสด้วยรหัสผ่าน (ดู src/crypto.ts)
 *
 * ฟังก์ชันในไฟล์นี้เป็นฟังก์ชันบริสุทธิ์ทั้งหมด (ทดสอบได้โดยไม่ต้องมีเบราว์เซอร์)
 */
import type { ChainOverride, Endpoint, Settings, Wallet } from './store';

export const BACKUP_VERSION = 1;

/** ส่วนของสถานะที่พกข้ามเครื่องได้ — แคช (ราคา/โลโก้/สลิป) ไม่รวม เพราะสร้างใหม่ได้เอง */
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
    wallets: d.wallets.map((w) => ({ id: w.id, label: w.label, address: w.address, family: w.family, enabled: w.enabled })),
    settings: { ...d.settings, endpoints: d.settings.endpoints.map((e) => ({ ...e })), chains: d.settings.chains.map((c) => ({ ...c })) },
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
  const s = data.settings as Partial<Settings>;
  const settings = {
    ...(s as Settings),
    endpoints: (Array.isArray(s.endpoints) ? s.endpoints : []).filter((e) => isObj(e) && typeof (e as Endpoint).url === 'string'),
    chains: (Array.isArray(s.chains) ? s.chains : []).filter((c) => isObj(c) && typeof (c as ChainOverride).id === 'string'),
  } as Settings;
  if (!wallets.length && !settings.endpoints.length) throw new BackupError('empty');
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
  endpoints: number;
  chains: number;
}

/**
 * รวมของใหม่เข้ากับของเดิมโดยไม่ลบอะไรเลย (นำเข้าไฟล์เดิมซ้ำ = ไม่มีอะไรเปลี่ยน)
 *  - กระเป๋า: เทียบด้วยที่อยู่; มีอยู่แล้วคงป้ายเดิมไว้ เว้นแต่ป้ายเดิมว่าง
 *  - แหล่งข้อมูล: เทียบด้วย url + ตระกูล
 *  - เชนที่ตั้งเอง: เทียบด้วย id (ของเดิมชนะ)
 *  - ค่าตั้งอื่น: ของเดิมชนะเสมอ ยกเว้นค่าที่ยังว่างอยู่
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
    } else if (!wallets[at]!.label.trim() && w.label.trim()) {
      wallets[at] = { ...wallets[at]!, label: w.label };
    }
  }

  const endpoints = [...current.settings.endpoints];
  const epKey = (e: Endpoint) => `${e.family}|${e.url.trim()}`;
  const haveEp = new Set(endpoints.map(epKey));
  let addedEndpoints = 0;
  for (const e of incoming.settings.endpoints) {
    if (haveEp.has(epKey(e))) continue;
    haveEp.add(epKey(e));
    endpoints.push({ ...e, id: `${e.id}-${endpoints.length}` });
    addedEndpoints++;
  }

  const chains = [...current.settings.chains];
  const haveChain = new Set(chains.map((c) => c.id.toLowerCase()));
  let addedChains = 0;
  for (const c of incoming.settings.chains) {
    if (haveChain.has(c.id.toLowerCase())) continue;
    haveChain.add(c.id.toLowerCase());
    chains.push({ ...c });
    addedChains++;
  }

  const pick = (a: string, b: string) => (a.trim() ? a : b);
  const settings: Settings = {
    ...current.settings,
    endpoints,
    chains,
    chainListUrl: pick(current.settings.chainListUrl, incoming.settings.chainListUrl ?? ''),
    priceUrl: pick(current.settings.priceUrl, incoming.settings.priceUrl ?? ''),
    proxyUrl: pick(current.settings.proxyUrl, incoming.settings.proxyUrl ?? ''),
  };
  return { data: { wallets, settings }, added: { wallets: addedWallets, endpoints: addedEndpoints, chains: addedChains } };
}

/** ชื่อไฟล์ที่เสนอตอนบันทึก — วันที่ในชื่อช่วยให้ผู้ใช้รู้ว่าไฟล์ไหนใหม่กว่า */
export function backupFilename(now = new Date(), encrypted = false): string {
  const d = now.toISOString().slice(0, 10);
  return `xcapscan-backup-${d}${encrypted ? '.enc' : ''}.json`;
}
