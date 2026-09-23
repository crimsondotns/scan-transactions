/**
 * ทางผ่านคำขอ (CORS): แหล่งข้อมูลหลายแห่งไม่ส่ง Access-Control-Allow-Origin เบราว์เซอร์จึงบล็อกทั้งที่ตอบ 200
 * - ผู้ใช้ตั้ง Proxy URL ของตัวเองใน Settings (เช่น worker ที่ส่งต่อคำขอแล้วใส่ CORS header): มี {url} → แทนที่ ไม่มี → ต่อ URL เข้ารหัสท้าย
 * - ตอน dev (vite) ถ้ายังไม่ตั้ง → ยิงตรงก่อน; โดน CORS ค่อยตกไปใช้ middleware /__proxy ของ dev server (vite.config.ts) และจำ origin นั้นไว้
 * - production บน static host ไม่มีเซิร์ฟเวอร์ → ไม่มี proxy = ยิงตรง (ใช้ได้เฉพาะแหล่งที่เปิด CORS)
 */
let template = '';

export function setProxy(t: string): void {
  template = t.trim();
}

const env = (import.meta as unknown as { env?: { DEV?: boolean; BASE_URL?: string; VITE_WRAPPER_URL?: string } }).env;

/*
 * API wrapper (ดู worker/) — ที่อยู่สาธารณะ ไม่ใช่ความลับ จึงฝังตอน build ได้ผ่าน VITE_WRAPPER_URL
 * ความลับอยู่ฝั่ง wrapper เท่านั้น: หน้าเว็บไม่เคยถือกุญแจ ไม่รู้ URL จริงของแหล่งข้อมูล และไม่ส่ง header ยืนยันตัวตนไปที่ wrapper
 * แม่แบบของแหล่งข้อมูลที่ไม่ได้ขึ้นต้นด้วย https:// ถือเป็น "<ชื่อย่อ>/<path>" ของ wrapper
 */
const trimEnd = (u: string) => u.trim().replace(/\/+$/, '');
let wrapper = trimEnd(env?.VITE_WRAPPER_URL ?? '');

/** ตั้งที่อยู่ wrapper เอง (เทสต์/ตั้งค่าภายหลัง) */
export function setWrapper(u: string): void {
  wrapper = trimEnd(u);
}

export function wrapperBase(): string {
  return wrapper;
}

/** แม่แบบนี้วิ่งผ่าน wrapper ไหม (ไม่ใช่ URL เต็ม = ใช่) */
export function viaWrapper(tpl: string): boolean {
  return !/^https?:\/\//i.test(tpl.trim());
}

/** "<ชื่อย่อ>/<path>" → URL เต็มของ wrapper; URL เต็มอยู่แล้ว → คืนเดิม */
export function resolveUrl(tpl: string): string {
  const u = tpl.trim();
  if (!viaWrapper(u)) return u;
  if (!wrapper) return u;
  return `${wrapper}/s/${u.replace(/^\/+/, '')}`;
}
/** origin ที่ยิงตรงแล้วโดน CORS/เครือข่ายบล็อก → ครั้งต่อไปใช้ proxy เลย ไม่ต้องลองตรงซ้ำ */
const needsProxy = new Set<string>();

function devProxyUrl(url: string): string {
  return `${env?.BASE_URL ?? '/'}__proxy?url=${encodeURIComponent(url)}`;
}

/** URL ที่ควรยิง: ผู้ใช้ตั้ง proxy → ผ่าน proxy เสมอ; dev → ยิงตรงก่อน (แหล่งที่เปิด CORS จะได้เห็น origin/UA จริง ไม่โดนนับเป็นบอท) ตกค่อยผ่าน /__proxy */
export function proxied(url: string): string {
  if (template) return template.includes('{url}') ? template.replaceAll('{url}', encodeURIComponent(url)) : `${template}${encodeURIComponent(url)}`;
  if (env?.DEV) {
    try {
      if (needsProxy.has(new URL(url).origin)) return devProxyUrl(url);
    } catch {
      /* URL เพี้ยน → ยิงตรงให้พังเอง */
    }
  }
  return url;
}

/** แม่แบบนี้ยิงได้ไหม — URL เต็ม หรือ path ของ wrapper ที่ตั้ง wrapper ไว้แล้ว */
export function usableUrl(tpl: string): boolean {
  const u = tpl.trim();
  return /^https:\/\//i.test(u) || (u !== '' && wrapper !== '');
}

/** URL ที่ควรยิงจริง: ผ่าน wrapper ถ้าเป็นแม่แบบแบบชื่อย่อ แล้วค่อยผ่านชั้น CORS */
export function requestUrl(tpl: string): string {
  return proxied(resolveUrl(tpl));
}

/** ยิงตรงล้มเหลว (TypeError = CORS/เครือข่าย) ตอน dev → จำ origin ไว้ แล้วคืน URL ผ่าน proxy ให้ลองใหม่; ไม่มีทางอื่น → null */
export function fallbackProxy(url: string): string | null {
  if (template || !env?.DEV) return null;
  try {
    const origin = new URL(url).origin;
    if (needsProxy.has(origin)) return null;
    needsProxy.add(origin);
    return devProxyUrl(url);
  } catch {
    return null;
  }
}
