import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * เสิร์ฟจาก GitHub Pages ใต้ /<repo>/ — base ต้องตรงกับชื่อ repo ไม่งั้น asset 404
 * รัน dev/preview ใช้ base เดียวกัน จะได้เห็นพาธเดียวกับตอน deploy
 * ตัวอ่านสเปรดชีตแยกเป็น chunk เองจาก dynamic import ใน importWallets.ts
 */
export default defineConfig({
  base: '/scan-transactions/',
  plugins: [react()],
  server: { port: 5174, strictPort: true },
});
