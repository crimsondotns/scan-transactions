/**
 * การเข้ารหัสของแพ็กเกจที่ส่งออกจากเครื่อง (สำรองข้อมูล / แชร์)
 *
 * ใช้ Web Crypto ของเบราว์เซอร์ล้วนๆ ไม่คิดอัลกอริทึมเอง:
 *   - AES-GCM 256 บิต (เข้ารหัสพร้อมตรวจความถูกต้องในตัว — แก้ไบต์เดียวก็ถอดไม่ผ่าน)
 *   - กุญแจสุ่มต่อหนึ่งแพ็กเกจ หรือกุญแจที่ได้จากรหัสผ่านด้วย PBKDF2-SHA256
 *   - IV สุ่มใหม่ทุกครั้ง (12 ไบต์ ตามที่ GCM กำหนด)
 *
 * สิ่งที่ "ไม่" ได้ป้องกัน: ผู้รับที่ถอดรหัสได้แล้วจะคัดลอก/ส่งต่อเนื้อหาได้เสมอ
 * และกุญแจที่ใส่ไว้ท้ายลิงก์ (#) ถูกส่งให้ใครก็ได้ที่ได้ลิงก์นั้นไป
 */
const KDF_ITERATIONS = 250_000;
const IV_BYTES = 12;
const SALT_BYTES = 16;

const subtle = (): SubtleCrypto => crypto.subtle;

export function toBase64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** กุญแจสุ่มหนึ่งอันต่อหนึ่งแพ็กเกจ — ไม่เคยถูกเก็บไว้กับตัวข้อมูล */
export function randomKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  return toBase64url(new Uint8Array(await subtle().exportKey('raw', key)));
}

export function importKey(raw: string): Promise<CryptoKey> {
  const bytes = fromBase64url(raw);
  if (bytes.length !== 32) return Promise.reject(new Error('key'));
  return subtle().importKey('raw', bytes as unknown as ArrayBuffer, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

export function randomSalt(): string {
  return toBase64url(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

/** กุญแจจากรหัสผ่านที่ผู้ใช้ตั้งเอง — เกลือ (salt) เก็บไปกับไฟล์ได้ รหัสผ่านห้ามเก็บ */
export async function keyFromPassphrase(passphrase: string, salt: string): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', new TextEncoder().encode(passphrase) as unknown as ArrayBuffer, 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: fromBase64url(salt) as unknown as ArrayBuffer, iterations: KDF_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/** ข้อมูล → ข้อความเข้ารหัส (iv ต่อหน้า ciphertext แล้วเข้ารหัสเป็น base64url) */
export async function encryptJson(key: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new TextEncoder().encode(JSON.stringify(value));
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: iv as unknown as ArrayBuffer }, key, data as unknown as ArrayBuffer));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv, 0);
  out.set(ct, iv.length);
  return toBase64url(out);
}

/** ถอดรหัส — กุญแจผิดหรือข้อมูลถูกแก้ = โยน Error เสมอ (ไม่คืนข้อมูลครึ่งๆ กลางๆ) */
export async function decryptJson(key: CryptoKey, payload: string): Promise<unknown> {
  const all = fromBase64url(payload);
  if (all.length <= IV_BYTES) throw new Error('payload');
  const iv = all.slice(0, IV_BYTES);
  const ct = all.slice(IV_BYTES);
  const plain = await subtle().decrypt({ name: 'AES-GCM', iv: iv as unknown as ArrayBuffer }, key, ct as unknown as ArrayBuffer);
  return JSON.parse(new TextDecoder().decode(plain));
}

/** ลายนิ้วมือของเนื้อหา (SHA-256 ย่อ) — ให้ผู้รับเทียบได้ว่าไฟล์ตรงกับที่ผู้ส่งบอก */
export async function fingerprint(value: unknown): Promise<string> {
  const buf = await subtle().digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)) as unknown as ArrayBuffer);
  return toBase64url(new Uint8Array(buf)).slice(0, 16);
}
