# ค่าตั้งต้นจาก GitHub Secrets

แอปเป็นเว็บ static ล้วน ผู้ใช้กรอกแหล่งข้อมูลเองได้เสมอ — ไฟล์นี้อธิบายวิธี "ตั้งค่าไว้ให้ล่วงหน้า"
โดยไม่ต้องเก็บ URL ไว้ในซอร์สโค้ด

## ⚠️ ข้อเท็จจริงที่ต้องรู้ก่อน

ค่าที่ส่งเข้าขั้นตอน build จะถูกฝังใน `dist/assets/*.js` ซึ่งเสิร์ฟให้ทุกคนที่เปิดเว็บ
เปิด DevTools ก็อ่านได้ทันที **GitHub Secrets ช่วยแค่ไม่ให้ค่าอยู่ใน git เท่านั้น ไม่ได้ทำให้เป็นความลับหลัง deploy**
ถ้าแหล่งข้อมูลต้องใช้ API key ให้ถือว่า key นั้นสาธารณะ — ใช้เฉพาะ key ที่จำกัดสิทธิ์/หมุนได้ และอย่าใช้ key ที่เสียหายได้ถ้าหลุด

## ตั้งที่ไหน

GitHub → repo → Settings → Secrets and variables → Actions → **Secrets** → New repository secret

| ชื่อ | ค่า |
|---|---|
| `SOURCES` | JSON array ของแหล่งข้อมูล |
| `CHAIN_LIST_URL` | URL รายชื่อเชน |
| `CHAINS` | JSON array ของเชนที่กำหนดเอง |

workflow ส่งเข้า build เป็น `VITE_SOURCES`, `VITE_CHAIN_LIST_URL`, `VITE_CHAINS`

### รูปแบบ `SOURCES`

```json
[
  {
    "name": "main",
    "url": "https://<host>/<path>/{address}?limit={count}&offset={offset}",
    "family": "sol",
    "authHeader": "x-api-key",
    "apiKey": "<key>",
    "metaUrl": "https://<host>/<path>?query="
  }
]
```

`family` เป็น `evm` หรือ `sol` (ค่าเริ่มต้น `evm`) · `authHeader`/`apiKey`/`metaUrl` ใส่หรือไม่ใส่ก็ได้
placeholder ที่ใช้ได้: `{address} {start} {count} {cursor} {offset} {next}` — ไม่ใส่เลยก็ได้ แอปจะประกอบ query ให้ตามตระกูลเชน

### รูปแบบ `CHAINS`

```json
[{ "id": "sol", "name": "Solana", "logo": "https://…/sol.png", "explorer": "https://…" }]
```

`id` ถูกทำเป็นตัวพิมพ์เล็กให้เอง

## ค่าเหล่านี้มีผลเมื่อไร

- **แหล่งข้อมูล**: ใช้เป็นค่าเริ่มต้นเฉพาะเบราว์เซอร์ที่ยังไม่เคยมีข้อมูลของแอป — หลังจากนั้นสิ่งที่ผู้ใช้แก้/ลบในหน้าตั้งค่าชนะเสมอ
- **Chain list URL**: ใช้เมื่อผู้ใช้ยังไม่ได้ตั้งเอง
- **เชนที่กำหนดเอง**: เติมให้เสมอ แต่ id ที่ผู้ใช้ตั้งเองทับค่าจาก build

ค่าที่ตั้งผิดรูป (JSON พัง) จะถูกมองว่าไม่ได้ตั้ง — แอปไม่พัง

## ด่านตรวจ

`pnpm check:dist` สแกน `dist/` หาลายของกุญแจ/โทเคน ถ้าคุณตั้งใจฝัง `apiKey` ลงไป ให้ตั้ง `ALLOW_EMBEDDED_KEYS=1`
(workflow ตั้งไว้แล้ว) ด่านจะเตือนแทนที่จะทำให้ build ล้ม — แต่ข้อความเตือนย้ำว่าค่านั้นเป็นสาธารณะ
