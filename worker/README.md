# xcap-api-wrapper

ตัวกลางฝั่งเซิร์ฟเวอร์ของ XCap Scan (Cloudflare Worker) — เก็บ URL ปลายทางและกุญแจไว้ที่นี่ หน้าเว็บ static ไม่ต้องถือความลับ

รายละเอียดสถาปัตยกรรม เหตุผล และขั้นตอน deploy แบบเต็ม: [`../docs/api-wrapper.md`](../docs/api-wrapper.md)

```bash
pnpm install
cp .dev.vars.example .dev.vars   # ค่าตัวอย่าง ใส่ของจริงในเครื่อง (ไฟล์นี้ gitignore)
pnpm dev                         # wrangler dev
pnpm deploy                      # wrangler deploy
```

สัญญา: `GET /s/<alias>/<path>?<query>` → ปลายทาง `UPSTREAM_<ALIAS>_BASE` + `<path>` พร้อม header กุญแจ
ไม่มีเส้นทางอื่น ไม่มีโหมดส่งต่อ URL อิสระ
