# API wrapper — เก็บกุญแจไว้ฝั่งเซิร์ฟเวอร์

หน้าเว็บของ XCap Scan เป็นไฟล์ static บน GitHub Pages จึง **ไม่มีที่เก็บความลับ**
ทุกอย่างที่ถูก build เข้า `dist/` (รวมค่า `VITE_*`) เปิดอ่านได้จาก DevTools การ “ซ่อน” ด้วย Base64/obfuscation/minify ไม่นับเป็นการป้องกัน

ถ้าแหล่งข้อมูลต้องใช้กุญแจ ให้ตั้งตัวกลาง (wrapper) ที่รันฝั่งเซิร์ฟเวอร์ แล้วให้หน้าเว็บคุยกับตัวกลางเท่านั้น

```
GitHub Pages (static)            Cloudflare Worker                 External API
  หน้าเว็บ  ──GET /s/<alias>/<path>──►  ใส่กุญแจจาก secret  ──►  ปลายทางจริง
            ◄──── JSON ─────────────   ไม่ส่งกุญแจกลับ    ◄──
```

- หน้าเว็บรู้แค่ **ชื่อย่อ (alias)** ไม่รู้ URL จริงของแหล่งข้อมูล และไม่เคยถือกุญแจ
- ที่อยู่ของ wrapper เป็นข้อมูล **สาธารณะ** (เห็นใน DevTools อยู่แล้ว) — ไม่ใช่ความลับ เก็บเป็น repository *variable*
- กุญแจและ URL ปลายทางอยู่ใน secret store ของ wrapper เท่านั้น

## ฝั่ง wrapper (worker/)

โค้ดอยู่ที่ [`worker/`](../worker) แยกจาก `src/` โดยสิ้นเชิง สรุปกติกาที่บังคับในโค้ด:

| ข้อกำหนด | ทำที่ไหน |
|---|---|
| ไม่มีโหมดส่งต่อ URL อิสระ (`?url=`) → ไม่เป็น open proxy | `parseRoute()` รับเฉพาะ `/s/<alias>/<path>` |
| ปลายทางมาจากฝั่งเซิร์ฟเวอร์ | `UPSTREAM_<ALIAS>_BASE` (secret) |
| ชื่อเส้นทางที่เห็นในเบราว์เซอร์ไม่บอกว่าปลายทางเป็นเจ้าไหน | `UPSTREAM_<ALIAS>_ROUTES` (secret) แปลง `t` → `v1/transfers` |
| กุญแจเติมฝั่งเซิร์ฟเวอร์ | `UPSTREAM_<ALIAS>_AUTH_HEADER` + `UPSTREAM_<ALIAS>_KEY` |
| ไคลเอนต์ห้ามส่งกุญแจเอง | มี `authorization`/`x-api-key`/`cookie` → 400 |
| CORS เฉพาะ origin ที่ตั้งไว้ | `ALLOWED_ORIGINS` (ไม่มี wildcard) |
| ตรวจพารามิเตอร์ | `safeQuery()` — จำกัดจำนวน/ความยาว ตัดคีย์ที่เป็นข้อมูลยืนยันตัวตนทิ้ง |
| กันยิงรัว | `RATE_LIMIT_PER_MIN` ต่อ IP (หรือ binding `RATE_LIMITER` ถ้าเปิด) |
| ไม่ log และไม่ส่งกุญแจกลับ | log แค่ `{alias,status}` และส่งกลับเฉพาะ `content-type` |

## ตั้งค่า

1) deploy wrapper

```bash
cd worker
pnpm install                 # หรือ npm i
cp .dev.vars.example .dev.vars   # สำหรับ wrangler dev เท่านั้น (ไฟล์นี้ถูก gitignore)
npx wrangler deploy
```

2) ตั้งความลับฝั่ง wrapper (ไม่เข้า git)

```bash
npx wrangler secret put UPSTREAM_MAIN_BASE     # URL ฐานของ API ภายนอก
npx wrangler secret put UPSTREAM_MAIN_KEY      # กุญแจ
# ชื่อ header ไม่ลับ ใส่ใน wrangler.toml ได้: UPSTREAM_MAIN_AUTH_HEADER = "x-api-key"
```

ใน `wrangler.toml` ตั้ง `ALLOWED_ORIGINS` เป็น origin ของหน้าเว็บ (เช่น origin ของ GitHub Pages ของคุณ และ `http://localhost:5174` ตอน dev)

3) บอกที่อยู่ wrapper ให้หน้าเว็บ

- GitHub → repo → Settings → Secrets and variables → Actions → **Variables** → `API_WRAPPER_URL` = `https://<worker>.workers.dev`
  (เป็น *variable* ไม่ใช่ *secret* — ค่านี้จะอยู่ใน bundle โดยตั้งใจ)
- ตอน dev: `.env.local` (ห้าม commit) ใส่ `VITE_WRAPPER_URL=https://<worker>.workers.dev`

4) ให้หน้าเว็บรู้จัก wrapper

- GitHub → repo → Settings → Secrets and variables → Actions → **Variables** → `API_WRAPPER_URL` = `https://<worker>.workers.dev`
  (เป็น *variable* ไม่ใช่ *secret* — ที่อยู่นี้เห็นได้ใน DevTools อยู่แล้ว ไม่ใช่ความลับ)
- ตอน dev: `.env.local` (ไม่ commit) ใส่ `VITE_WRAPPER_URL=https://<worker>.workers.dev`

5) เขียนแหล่งข้อมูลใน secret `SOURCES` เป็นชื่อย่อแทน URL เต็ม

```json
[{ "name": "transfers", "family": "sol", "url": "a/t/{address}?limit={count}&offset={offset}" }]
```

`a` = ชื่อย่อ, `t` = ชื่อเส้นทาง ทั้งคู่ตั้งเองได้ตามใจ ตราบใดที่ตรงกับ secret ของ worker
เลือกให้เป็นตัวอักษรกลางๆ จะได้ไม่บอกใบ้ว่าปลายทางเป็นใคร (ถ้าไม่ตั้ง `_ROUTES` path จะถูกส่งผ่านตามที่เขียนไว้)

- `url` ที่ไม่ขึ้นต้นด้วย `https://` = "<ชื่อย่อ>/<path>" → แอปต่อเป็น `<wrapper>/s/<ชื่อย่อ>/<path>`
- เบราว์เซอร์จึงเห็นแค่ที่อยู่ wrapper ใน DevTools ส่วน host จริงของแหล่งข้อมูลอยู่ใน secret ของ worker
- เมื่อใช้รูปแบบนี้ แอปจะ **ไม่** ส่ง header กุญแจจากเบราว์เซอร์ (กุญแจถูกเติมฝั่งเซิร์ฟเวอร์)
- `metaUrl` เขียนแบบเดียวกันได้ เช่น `"metaUrl": "main/v1/assets/search?query="`

placeholder ทั้งหมด (`{address} {start} {count} {cursor} {offset} {next}`) การรวมหน้า และ normalizer ทำงานเหมือนเดิมทุกอย่าง

## ด่านกันความลับหลุด

- `pnpm check` — ห้าม URL ของแหล่งข้อมูลจริงอยู่ใน `src/`
- `pnpm check:dist` (รันอัตโนมัติท้าย `pnpm build` และใน CI) — สแกน `dist/` หาลายของกุญแจ/โทเคน/ตัวแปร `VITE_*` ที่ชื่อส่อว่าเป็นความลับ พบ = build ล้ม
- workflow ส่งเข้า build เฉพาะ `VITE_WRAPPER_URL` จาก *variable* เท่านั้น ไม่มี secret ใดถูกส่งเข้าขั้นตอน build
