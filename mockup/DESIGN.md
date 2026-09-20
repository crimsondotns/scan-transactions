# Scan Transactions — design system (v3, XCap / crystal-prism-moss-cherry)

Visual world: the user's pinned **XCap** system (Vite + Tailwind v4 + shadcn-style, `src/styles.css`). Monochrome, high-contrast, hairline-bounded surfaces; gain/loss are the only chromatic colours. v2's UX structure is unchanged (hero card, range seg, area chart, 4 stat cards, coloured type pills, 56px rows, token route, sidebar, mobile tab bar); only the visual system changed. This file mirrors the Tailwind `@theme` so the real app can use the classes directly.

## Mode

**Operate.** Quiet monochrome chrome; the headline number and the gain/loss chart are the only loud elements. Meaning is carried by contrast, weight and two semantic colours, never by hue elsewhere.

## Tokens (exact, from `styles.css`)

```css
:root{
  --color-bg:#0a0a0a; --color-surface:#111113; --color-elevated:#161618;
  --color-fg:#f4f4f5; --color-muted:#a1a1aa; --color-subtle:#71717a;
  --color-border:rgba(244,244,245,.10); --color-border-strong:rgba(244,244,245,.18);   /* fg 10% / 18% */
  --color-accent:#e8e8ec; --color-accent-fg:#0a0a0a; --color-accent-hover:#f4f4f5;      /* primary buttons are white */
  --color-gain:#34d399; --color-loss:#fb7185; --color-ring:#d4d4d8;
  /* derived, used by the mockup */
  --color-gain-tint:rgba(52,211,153,.15); --color-loss-tint:rgba(251,113,133,.15);     /* = gain/15, loss/15 */
  --color-gain-tint-2:rgba(52,211,153,.25); --color-loss-tint-2:rgba(251,113,133,.25); /* danger hover = loss/25 */
  --color-fill:rgba(244,244,245,.06); --color-fill-2:rgba(244,244,245,.12);
  --shadow-hair:0 0 0 1px rgba(244,244,245,.10); --shadow-hair-strong:0 0 0 1px rgba(244,244,245,.18);
  --shadow-pop:0 0 0 1px rgba(244,244,245,.10),0 16px 40px rgba(0,0,0,.6);
  --font-sans:"Geist","Segoe UI",system-ui,sans-serif; --font-mono:"Geist Mono",ui-monospace,"SF Mono",Menlo,Consolas,monospace;
  --radius-xs:4px; --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-xl:24px; --radius-pill:999px;
  --ease:cubic-bezier(.16,1,.3,1); --dur:.15s;
  --side-w:272px; --top-h:72px; --tab-h:64px;
}
```

Google Fonts: `Geist:wght@400;500;600`, `Geist+Mono:wght@400;500`. Body 14px / 1.5, `font-feature-settings:"tnum"`. Cards never use solid borders: `bg-surface rounded-xl shadow-[var(--shadow-hair)]`.

## Colour semantics

- **gain / loss are the only chromatic colours.** Receive · incoming · positive → gain. Send · outgoing · negative · scam · failed → loss.
- Type pills: Receive = gain/15 + gain; Send = loss/15 + loss; Swap = elevated + fg (hairline); Approve and contract calls = elevated + muted with icon.
- Delta pills: gain/15 + gain, loss/15 + loss, flat = elevated + muted.
- Links, active tab (2px white underline), selected wallet (3px white bar + elevated), sort-active header, chart-hover row inset → **fg white**, never blue.
- Chart: cumulative net flow area in gain or loss with gradient to the zero baseline; Volume bars fg, Gas bars muted; empty days fill-2.
- Text: fg on surfaces for values; muted (#a1a1aa, 7:1) for secondary body copy; subtle (#71717a, 3.9:1 on surface) **only** for 11px uppercase labels, placeholders and the tab-bar idle state. Row flag wash = loss at 6%.

## Typography

- Geist for everything; Geist Mono for addresses, hashes, token/contract ids and the request preview only. Numbers are Geist with tabular figures.
- Headline number: `--text-6xl` (60px) desktop → 48px ≤960 → 36px ≤760, weight 500, tracking −.025em, tabular-nums.
- Labels: 11px uppercase, +.06em, subtle, weight 500 (stat labels, hero label, table headers, section labels, form labels).
- Titles: page/card titles 24px/500; section titles 18px/500; sidebar/row names 14px/500. Maximum weight anywhere is 500 (600 reserved for the wordmark if needed).

## Components (as built)

| Component | Spec (mirrors `button.tsx` / `input.tsx`) |
|---|---|
| `.btn` | h-44, rounded-md (12px), text-sm 500; default/`.primary` = accent bg + accent-fg, hover fg; `.outline` = transparent + hairline, hover elevated; `.ghost` = transparent, hover elevated (`.quiet` = muted text); `.danger` = loss/15 + loss, hover loss/25; `.sm` h-36 text-xs; `.icon` square; `active:scale(.96)`; disabled opacity .4 |
| `.input` / `.select` | h-44 rounded-md bg-elevated hairline shadow; hover hairline 18%; focus 2px ring/70; invalid 1px loss; placeholder subtle |
| Focus | `box-shadow:0 0 0 2px rgba(212,212,216,.7)` everywhere (`:focus-visible`) |
| `.chip` | h-28 rounded-sm elevated + hairline, muted text; `.fg`; `.pos/.neg` tints; `.sm` h-24 |
| `.pill` | h-26 pill, text-xs 500, trend icon |
| `.card` / hero | surface, rounded-xl (24px), hairline, 28px padding; identity row → uppercase label + 60px headline + delta pill + muted sub-line; range seg; metric seg; 220px chart |
| `.seg` | elevated track + hairline, 36px options, selected = white bg + black text |
| `.stat` | surface card, 20px padding: 36px elevated icon tile (gain/loss tint for net flow), uppercase label, 30px value, delta pill + note |
| `table.tx` | inside `.tbl-card` (surface, rounded-xl, hairline); header 11px uppercase subtle; rows 56px, 14px, hairline dividers; hover elevated; chart-hover = 3px fg inset; ≤760px 3-column row grid with 40px type tiles |
| Sidebar | surface, 1px hairline edge; uppercase "Tracked wallets" label; `.witem` 56px, selected = elevated + 3px white bar; "Add wallet" = outline (primary lives in the header) |
| Header | mark (32px hairline circle) + name + 11px uppercase section label; search; actions right = outline Refresh / Settings + white "Add wallet" |
| Bottom `.tabbar` | ≤760px, 64px, surface + top hairline, active = fg |
| Toast | bottom-right elevated card with check icon and hairline; optional action button (used for Undo after removing a wallet, 6s); above the tab bar on phones |
| Add-wallet dialog `.dlg` | native `<dialog>` (top layer), centred, max-w 440, surface + hairline, 24px radius, backdrop rgba(10,10,10,.7) + 2px blur; 150ms fade + .96→1 scale in/out (none under reduced motion); ≤640px bottom sheet with top radius 24 and safe-area padding. Header = 18px/500 "Add Wallet" + muted description + ghost × (top-right, 36px). Body = Address (mono, live helper line with identicon + short address + "Already tracked as …" chip, inline `role=alert` error) and Label (optional). Footer right-aligned ghost Cancel + white primary, disabled until valid; Enter submits, Esc/backdrop/× close, focus returns to the trigger; on phones focus lands on × rather than the input |
| Sign-in card | centred max-w 400, surface, hairline, 28px padding: 48px mark, 24px title, muted copy, white Google button, "or with email" label divider, hairline inputs, outline email submit, guest link muted |

## Chains: registry, badges and the chip filter

- One request covers every chain (`id`, `start_time`, `page_count`; no `chain_id`). Chain is a property of each row, never a selector. There is no chain picker.
- `Chains.load()` (names, logos, explorer hosts only) tries `https://api.debank.com/chain/list`, then `<apiBase origin>/v1/chain/list`, then `sample/chain_list.json`, then the embedded snapshot; cached 24h in `localStorage` `scantx.chains.v1`; Settings shows count / source / cache time with Refresh.
- **Chain badge** `.tok-wrap .chain-badge`: 16px round chain logo overlaid bottom-right of every token logo (table rows, holdings, token lists, token header) with a 2px surface ring; the wrapper carries the chain name as `title`. Chain name also appears in the row's secondary line ("2h ago · Base") and holdings sub-line.
- **Chip filter** `.chain-chips`: horizontally scrollable row in the hero — `All 20` then one `.cchip` per chain seen in the loaded rows (20px logo, name, count), multi-select toggle (`aria-pressed`), selected = white on black. Selecting every chain collapses back to All. Stats, chart, tabs, tables and lists all respect it; the Transfers-tab chain `<select>` mirrors the same state; state lives in the URL (`?chain=hood,base`, `?tab=`).
- Sidebar / Settings wallet rows show a stack of the chains seen in that wallet's last loaded history (`w.seenChains`, max 4 + `+n`); nothing until loaded.
- Explorer links use the row's chain (`explorer_host/tx/hash`); no host → copy-hash button.
- Flagged tokens (`is_scam` / `is_suspicious`, including NFT collections) keep their amounts but contribute $0 to volume, net flow and holdings value; the volume card says "flagged tokens excluded". Percent pills clamp at ±999%.

## Routes (index.html)

`#<walletId>` wallet · `#token/<chain>/<tokenId>` token detail (token ids repeat across chains) (breadcrumb, header, price + 24h pill, net position, scoped chart/stats/history) · `?tab=transfers|holdings` · `?add=1` opens add-wallet.

## Motion

150ms ease-out on colour/shadow/transform; `active:scale(.96)` on buttons; drawer/toast 250ms with `--ease`; skeleton 1.2s; `prefers-reduced-motion` collapses everything.

## Breakpoints

≤1280px hide counterparty sub-address · ≤1180px stats 2×2 · ≤960px sidebar → drawer, single column, 48px headline, wordmark drops its section label · ≤760px bottom tab bar, 36px headline, row grid, header keeps mark + search + white "+" only.

## Web Interface Guidelines conventions (vercel-labs)

Skip link to `main`; every icon button has `aria-label`; decorative SVG/img carry `aria-hidden` / `alt=""` with explicit width/height; inputs have `name`, `type`/`inputmode`, `autocomplete`, `autocapitalize="off"` + `spellcheck="false"` on addresses/emails, placeholders end with `…`; errors are inline with `role="alert"` and focus the field; toasts are `role="status" aria-live="polite"`; `touch-action: manipulation` and transparent tap highlight on controls; `overscroll-behavior: contain` on dialog, drawer and chip row; safe-area insets on drawer, sheet and tab bar; buttons and headings in Title Case; identifiers (addresses, hashes, request preview) are `translate="no"`; destructive actions (untrack, remove, clear data) use Undo or a second click; unsaved Settings warn on `beforeunload`; tab and chain filter are URL-synced; token navigation uses real `<a href="#token/…">` links.
