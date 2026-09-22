# CLAUDE.md

XCap Scan — static multi-wallet transaction list (React 19 + Vite, GitHub Pages, no backend, no auth).

## Design system — mandatory

**Before any UI change, new element, or edit: read `docs/design-system.md` and match it.** It is the single source of truth for colour, type, spacing, radius, elevation, components, motion and accessibility. Tokens live in `src/styles/tokens.css` and map 1:1 to that file; never invent values outside it.

Key rules from it: white canvas / black ink, neutral surfaces only, semantic colour only for real status; Suisse Intl ONLY, including numbers and hashes (no monospace): Regular 400 body / Book 500 secondary / Medium 600 labels-buttons-headings; files in public/assets/fonts/ (not committed); `!important` override in fonts.css; Thai glyphs fall to system only because the font lacks them, sentence case, weight 500 for labels/buttons; pill buttons and pill inputs (every text field is full-round), 12px cards, 8–16px containers; hairline borders instead of shadows; 44px minimum control height; visible 2px focus outline; `prefers-reduced-motion` honoured.

Dark theme: the file's neutrals inverted but never pure black — bg #171717, soft #262626, hover #303030, ink #f5f5f5 (`:root[data-theme='dark']` in `tokens.css`); never use raw colours in components so both themes stay in sync.

## Before every delivery — mandatory audit

1. Re-read `docs/design-system.md` (must be byte-identical to `/Users/Kakachi/Downloads/DesignSystem/OpenAI/openai.com-design-system.md`; `diff -q` them).
2. Audit every screen and state — default, hover, focus-visible, active/selected, disabled, error, empty, loading — **in both Light and Dark theme** against the file **exactly**: colours from tokens only, type scale/weights, spacing steps, radii (pill controls, 12px cards, 16px large surfaces), hairline borders, shadow only on floating panels, 44px primary controls / 40px inputs and dropdown triggers (user override of the file's 48px — keep), 2px focus outline, motion 120/180/280ms standard easing, sentence case.
3. Hover check is done with every `:hover` rule forced on (scratch copy of dist, not in repo) in both themes: no control may blend into its background or lose its text; primary hover uses `--color-ink-hover`, everything else `--color-hover` / `--color-line-hover`. Never let a generic `.btn:hover` outrank `.btn-primary`.
4. Any mismatch = fix first, then re-run `pnpm typecheck && pnpm check && pnpm test && pnpm build`. Never skip, never deliver with a known deviation.

## Responsive (user spec, 2026-09-21)

Breakpoints: mobile < 640, tablet 640–1024, desktop > 1024. Tokens in `tokens.css` switch per breakpoint: body 14px below 1024 / 16px above; section spacing 12 / 16 / 24; controls 48px / 40px / 40px. Mobile: single column, full-width inputs, Network fee column hidden, table scrolls inside its card, dialogs are full-width bottom sheets, detail panel full-screen. Tablet: wallets panel collapsible via the header toggle, panel 80% width. Desktop: sticky wallets panel, all columns. `html, body { overflow-x: clip }` (never `hidden` — that makes body a scroll container and breaks every sticky element) — nothing may scroll the page sideways. Table header sticks under the 64px site header on wide screens; below 1024px the table scrolls inside its wrapper instead.

## Transaction table (user spec, 2026-09-21)

Four columns, all sortable: **Type** (token icon 40px, or two 28px overlapping icons for a swap, chain badge bottom-right; title = type, subtitle = wallet · token name or `OUT → IN`), **Submitted** (relative time: `29 min ago`, `15:04, yesterday`, `17:48, 17 Sep 26`), **Amount** (compact in the table, full precision only in the detail panel; incoming legs first in `--color-positive` green/medium, outgoing below in muted/caption), **Network fee** (USD, native amount, short hash linking to the chain explorer). No borders, no shadow; row click opens the detail panel.

## Wallets panel (user spec, 2026-09-21)

Never collapses. Each row is a button: click = switch the active wallet (table filters to it; click again = all wallets); the eye icon toggles hide/show that wallet's data (`enabled` in the store = not hidden; the panel derives a `hiddenWallets` Set). Icons: `eye` (shown) / `eyeOff` (hidden). Trash removes. No checkboxes.

## Hard rules

- Never hardcode or name any external history source in code, comments, docs or tests — the user pastes URLs at runtime. `pnpm check` enforces this.
- Chain names/logos/explorer links come from the user-pasted **Chain list URL** in Settings first, then `<origin of each pasted source>/v1/chain/list` (`src/chains.ts`), cached 24h; failure is silent (lettered fallback). No chain list host may be hardcoded or bundled. Chain logo priority: chain list → feed `chain_logo_url` → initials; never the native token's logo.
- Data sources are added from a URL only: name and chain family are auto-detected (`detectEndpoint` in `store.ts`); never add manual name/chain fields back.
- **Zero hints to the client.** No placeholder text, helper text, example URLs, placeholder syntax (`{address}` etc.), chain explanations or request previews in the UI or README. Labels only; errors are generic ("Invalid URL"). The user is expected to know.
- All UI text goes through `t()` in `src/i18n.tsx` (Thai key + English pair). No literal Thai in `.tsx`.
- No `px` font-size in CSS; use `--size-*` tokens. No gradients.
- Icons only via `components/Icon.tsx`.
- No `type="number"` inputs (spinner arrows banned): numeric fields are `type="text" inputMode="numeric"`, typed by hand.
- No native `<select>`; every dropdown uses `components/Dropdown.tsx` (pill trigger + floating 12px panel).

## Commands

```bash
pnpm dev · pnpm typecheck · pnpm check · pnpm test · pnpm build
```

Do not declare work done while any of these is red.

## Lazy loading (2026-09-22)

- (อัปเดต 2026-09-22) เปิดแดชบอร์ด → `loadStaggered`: โหลดกระเป๋าที่ยังไม่มีข้อมูล **ทีละ 5 พร้อมกัน เว้น 2 วิ** ระหว่างชุด (`useFeed` BATCH/BATCH_GAP_MS) เริ่มครั้งเดียวต่อชุดแหล่งข้อมูล; หยุดเองเมื่อเจอ HTTP 429; ผู้ใช้กด Cancel ได้; แสดง "N/M wallets loaded" ที่หัวตารางธุรกรรมล่าสุด — คลิกกระเป๋า/หน้า 2 ยังใช้ `ensure` (แคช) เหมือนเดิม
- `useFeed.feeds[walletId]` คือแคชในหน่วยความจำ: `ensure(w)` โหลดเฉพาะเมื่อยัง `loaded`/`loading` ไม่เป็นจริง; แหล่งข้อมูลเปลี่ยน → `reset()` ล้างแคช ไม่โหลดใหม่เอง
- สถานะโหลดต่อกระเป๋า: วงหมุน `.spinner` ในแถวกระเป๋า ตารางขึ้น "Loading…" ระหว่างรอ

## โครงหน้า 2 หน้า (2026-09-22)

- เส้นทางใน hash: `#/` = แดชบอร์ด, `#/w/<walletId>` = ธุรกรรมของกระเป๋า (ปุ่มย้อนกลับเบราว์เซอร์ใช้ได้; เปิด URL ตรงจะเลือกกระเป๋าให้)
- ไม่มี sidebar (ผู้ใช้ให้ลบ 2026-09-22) — Import/Add/Clear อยู่ที่หัวตารางกระเป๋าในหน้า 1
- หน้า 1 (`WalletTable` + `RecentTable`): ตารางกระเป๋า Label · Address · Transactions · ตา/ถังขยะ (เรียงได้, 7 แถว + Show all) คลิกแถว = หน้า 2; ตารางธุรกรรมล่าสุด 10 แถวจากทุกกระเป๋าที่โหลดแล้ว Type · From · To · Submitted · Amount · Network fee (+ ปุ่ม Load all wallets) คลิกแถว = แผงขวา
- หน้า 2: ปุ่มกลับ + ชื่อกระเป๋า + Reload, `TxTable` เดิม (Type · Submitted · Amount · Network fee + ตัวกรอง) เฉพาะกระเป๋านั้น, Load older; คลิกแถว = แผงขวา
- แผงขวา `DetailPanel` เป็น overlay ทั้งสองหน้า; ไม่มี checkbox ที่ไหนเลย
- ปุ่ม "View on <explorer>" ในแผงรายละเอียดต้องมีเสมอ: chain list → URL ที่แถวแนบมา → ปุ่ม disabled "No explorer for this chain"; chain list โหลดใหม่ไม่ได้ → ใช้ชุดเก่าต่อ

## Infinite scroll (2026-09-22)

- `src/useInfinite.ts` + `MoreSentinel`: โชว์ทีละชุดจากรายการในเครื่อง (ตารางกระเป๋า 10 · ธุรกรรมของกระเป๋า 25) — **ตารางธุรกรรมล่าสุดในหน้า 1 คงที่ 10 แถว ไม่มีเลื่อนโหลด (กัน rate limit)** sentinel ท้ายตารางเข้าใกล้จอ (~80%) → เพิ่มชุดถัดไป; โชว์หมดแล้วและ `hasOlder` → ขอชุดเก่ากว่าจากแหล่ง (cursor ต่อกระเป๋าใน `feeds[id].next`) ระหว่างโหลดไม่ยิงซ้ำ ท้ายตารางมี "Loading more…" ความสูงคงที่ (ไม่กระโดด) และ "All loaded" เฉพาะเมื่อเคยโหลดเพิ่ม
- ปุ่ม Load older ถูกแทนด้วยการเลื่อน; `resetKey` (ตัวกรอง/เรียง/กระเป๋า) รีเซ็ตจำนวนที่โชว์

## Skeleton / header (2026-09-22)

- `components/Skeleton.tsx`: `SkeletonRows` (แถว shimmer สูง 64px เท่าแถวจริง) ใช้ในตารางธุรกรรมทั้งสองตอนโหลดครั้งแรก, `SkeletonBar` ในช่อง Transactions ของตารางกระเป๋าตอนกระเป๋านั้นโหลด; shimmer ทำด้วย pseudo-element เลื่อน + pulse 1.5s (ห้าม gradient ตาม check)
- ปุ่ม Import file อยู่ที่หัวเว็บ (XCap · Import · Settings); ตารางกระเป๋ามี Add/Clear
- หัวคอลัมน์ตาราง padding 16px แนวตั้ง, เซลล์ 12px

## แผงขวา + Settings (2026-09-22)

- `DetailPanel` และ `.drawer-scrim` render ผ่าน `createPortal(…, document.body)` — เป็น sibling ของ `#root` ไม่อยู่ในกล่องตาราง; `.drawer` fixed `top/right/bottom: 0; width: min(440px,100vw)` z-index 1000, scrim 999; **ห้ามมีกติกาดัน layout** (เอา `.layout[data-drawer]` margin ออกแล้ว) — ตารางต้องนิ่งเมื่อเปิดแผง
- Settings = "settings panel": แถวแหล่งข้อมูลไม่มีกรอบรอบการ์ด คั่นด้วย hairline: grip ลากจัดลำดับ (`reorderEndpoints`) · ไอคอนชนิด · ชื่อ + dropdown รูปแบบที่อยู่ · "Priority N · URL" · สวิตช์ `.switch` (role=switch) · ลบ

## Token metadata + สลิป (2026-09-22)
- แหล่งข้อมูลแต่ละอันมี `metaUrl` (เลือกใส่) — หลังโหลดหน้า โทเคนที่ยังไม่รู้ชื่อ/สัญลักษณ์/โลโก้ (`unknownTokens`) ถูกขอเป็นชุด ≤50 ที่อยู่ เว้น 1.5 วิ (`src/tokens.ts`, แคช localStorage 7 วัน `xcap.scan.tokens`) แล้วเติมลงแถวก่อนแสดง (`applyTokenMeta`) — ไม่ยิงขอราคา/metadata แยกตอน render
- Solana-family ที่ไม่มี placeholder ประกอบเป็น `?ownerAddress={address}&limit={count}`; แหล่งที่ใช้ path/พารามิเตอร์อื่นให้ผู้ใช้วาง URL ที่มี `{address}` `{count}` `{cursor}` เอง
- สลิป (`src/slip.ts`): แบบ Thermal receipt (mock 2a ผู้ใช้เลือก 2026-09-22) กว้าง 320 ขอบล่างหยัก เส้นประ — XCap Scan กลาง → เช็คเขียว/กากบาทแดง + Transaction successful/failed → Received/Sent ตัวเลขใหญ่ (เขียวเฉพาะขาเข้า ตรงนี้ที่เดียว) → บล็อกสินทรัพย์ (โลโก้โทเคน + ตราเชน จำนวนสีหมึก) + fee/ส่วนต่างสวอป → Wallet/To/Status → hash เต็ม → QR → รหัส; ไม่มีจุด/สัญลักษณ์สีเชน; วาดด้วย Canvas 2D พื้นขาวเสมอ + QR (`qrcode`) ของลิงก์ explorer หรือ hash; รหัสยืนยัน = SHA-256 ของฟิลด์เนื้อหา (ชื่อเชน/ป้ายกระเป๋า/ลิงก์ไม่อยู่ในแฮช); สำเนาใน `xcap.scan.slips` ไม่เขียนทับ; ลิงก์แชร์ `#/v/<code>.<base64url(json)>` พกข้อมูลไปเอง → ตรวจได้ทุกเครื่องที่เปิดแอปนี้ ไม่มีเซิร์ฟเวอร์ ไม่มี RPC
- ชั้นโมดัลทุกชนิด (Dialog / แผงขวา `DrawerLayer` / `SlipLightbox`) portal ไป body และเรียก `useModalLayer` (`src/modal.ts`): ชั้นบนสุดเท่านั้นที่มีชีวิต ลูกอื่นของ body ติด `inert` + body ล็อกสกรอลล์ (ยกเว้น `.toasts`) — ห้ามตั้ง body.style.overflow เองที่อื่น
- Settings → "Slip labels": สวิตช์ซ่อน/แสดง 13 ส่วนของสลิป (`settings.slipShow`, `SLIP_FIELDS` ใน store.ts) — `renderSlip(..., show)` ข้ามส่วนที่ปิดและไม่วาดเส้นประของกลุ่มว่าง
- ปุ่ม Slip ท้ายแผงขวา (คู่กับ View on explorer) → เปิดภาพสลิปแบบ **lightbox** (`SlipLightbox`: portal ไป body z 1100, ม่าน `--color-lightbox`, ภาพ 360px กลาง, ปุ่มปิดมุมขวาบน ไม่มีแถบปุ่มใดๆ; Esc/คลิกม่านปิด) — ไม่ใช่ไดอะล็อก ไม่สลับเนื้อหาแผง; ตรวจสลิปจากไอคอนโล่บนหัว (`#/v/<code>.<data>` เปิดไดอะล็อกตรวจ)
