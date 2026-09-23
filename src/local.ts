/**
 * คลังข้อมูลในเครื่อง (IndexedDB) — ของใหม่ที่ไม่เคยมีที่เก็บมาก่อน: ตัวตน, โปรไฟล์, รายการแพ็กเกจที่แชร์/รับมา
 *
 * ทำไมไม่ย้าย localStorage เดิมทั้งหมด: `xcap.scan.v1` (กระเป๋า + settings) ยังเป็นแหล่งความจริงของแอปอยู่
 * การย้ายมันมาทั้งก้อนคือความเสี่ยงที่ไม่ได้อะไรเพิ่ม — ผู้ใช้เดิมต้องไม่สูญข้อมูลเป็นข้อแรก
 * ที่นี่จึงเก็บเฉพาะของใหม่ และมีตัวช่วย migrate แบบ "ทำซ้ำได้ ไม่ลบของเดิม" ไว้ให้เวลาต้องใช้
 *
 * ทุกฟังก์ชันล้มแบบเงียบเป็นค่าว่างเมื่อเบราว์เซอร์ไม่มี IndexedDB (โหมดส่วนตัวบางตัว) — แอปต้องใช้งานต่อได้
 */
const DB = 'xcap.scan';
const VERSION = 1;
export const STORES = ['identity', 'profile', 'shares', 'meta'] as const;
export type StoreName = (typeof STORES)[number];

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB, VERSION);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      for (const s of STORES) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

async function tx<T>(store: StoreName, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T | null> {
  const db = await open();
  if (!db) return null;
  return new Promise((resolve) => {
    let req: IDBRequest;
    try {
      req = run(db.transaction(store, mode).objectStore(store));
    } catch {
      db.close();
      return resolve(null);
    }
    req.onsuccess = () => {
      resolve((req.result ?? null) as T | null);
      db.close();
    };
    req.onerror = () => {
      resolve(null);
      db.close();
    };
  });
}

export function getLocal<T>(store: StoreName, key: string): Promise<T | null> {
  return tx<T>(store, 'readonly', (s) => s.get(key));
}

export async function setLocal(store: StoreName, key: string, value: unknown): Promise<void> {
  await tx(store, 'readwrite', (s) => s.put(value, key));
}

export async function delLocal(store: StoreName, key: string): Promise<void> {
  await tx(store, 'readwrite', (s) => s.delete(key));
}

export async function allLocal<T>(store: StoreName): Promise<T[]> {
  return (await tx<T[]>(store, 'readonly', (s) => s.getAll())) ?? [];
}

/**
 * ทำครั้งเดียวต่อเครื่องแบบทำซ้ำได้: ถ้ามีโปรไฟล์เก่าค้างอยู่ใน localStorage ให้ยกมาไว้ที่นี่
 * ไม่ลบของเดิมทิ้ง และถ้ามีข้อมูลที่นี่อยู่แล้วจะไม่ทับ
 */
export async function migrateOnce<T>(store: StoreName, key: string, fromLocalStorage: string, parse: (raw: string) => T | null): Promise<void> {
  const done = await getLocal<boolean>('meta', `migrated.${store}.${key}`);
  if (done) return;
  const existing = await getLocal<unknown>(store, key);
  if (existing == null) {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(fromLocalStorage);
    } catch {
      /* ไม่มี storage */
    }
    const value = raw ? parse(raw) : null;
    if (value != null) await setLocal(store, key, value);
  }
  await setLocal('meta', `migrated.${store}.${key}`, true);
}
