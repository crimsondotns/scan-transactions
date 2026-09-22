/**
 * ทางผ่านคำขอ (CORS): แหล่งข้อมูลหลายแห่งไม่ส่ง Access-Control-Allow-Origin เบราว์เซอร์จึงบล็อกทั้งที่ตอบ 200
 * - ผู้ใช้ตั้ง Proxy URL ของตัวเองใน Settings (เช่น worker ที่ส่งต่อคำขอแล้วใส่ CORS header): มี {url} → แทนที่ ไม่มี → ต่อ URL เข้ารหัสท้าย
 * - ตอน dev (vite) ถ้ายังไม่ตั้ง → ใช้ middleware /__proxy ของ dev server เอง (vite.config.ts) เพื่อให้ localhost ใช้งานได้ทันที
 * - production บน static host ไม่มีเซิร์ฟเวอร์ → ไม่มี proxy = ยิงตรง (ใช้ได้เฉพาะแหล่งที่เปิด CORS)
 */
let template = '';

export function setProxy(t: string): void {
  template = t.trim();
}

export function proxied(url: string): string {
  if (template) return template.includes('{url}') ? template.replaceAll('{url}', encodeURIComponent(url)) : `${template}${encodeURIComponent(url)}`;
  // เทสต์รันใน node ไม่มี import.meta.env → ยิงตรง
  const env = (import.meta as unknown as { env?: { DEV?: boolean; BASE_URL?: string } }).env;
  if (env?.DEV) return `${env.BASE_URL ?? '/'}__proxy?url=${encodeURIComponent(url)}`;
  return url;
}
