# Scan Transactions — design system (v4, applied from `openai-DESIGN.md`)

**Source of truth: `mockup/openai-DESIGN.md`.** This file is its application to Scan Transactions: it restates the measured tokens, records the neutrals and status colours we had to derive (and why), and maps every component onto the system. When the two disagree, `openai-DESIGN.md` wins. v3's UX structure is unchanged (hero + range seg + chart, chain chips + Hide-scam switch, 4 stat cards, transfers table with type pills, token route, holdings/counterparties, sidebar wallet list, Add-wallet and Bulk-add dialogs, settings page, bottom tab bar on phones, full-precision amounts, Undo toasts); only the visual system changed.

## Mode

**Light, flat, monochrome.** White page, white surfaces separated by 1px borders or a #f7f7f8 tint. No box-shadows, no gradients, no hairline-shadow trick, no dark-mode media query. Colour exists for money direction only (gain / loss); everything else is black, white and #8e8ea0.

## Tokens

```css
:root{
  /* measured in openai-DESIGN.md */
  --color-bg:#ffffff; --color-surface:#ffffff;
  --color-fg:#000000;                          /* body, values, headings   (spec "text-muted", used as text) */
  --color-primary:#8e8ea0; --color-on-primary:#ffffff;
  --color-muted:#8e8ea0;                       /* labels, icons, placeholders, secondary accents (spec "text") */
  --font-sans:system-ui,sans-serif;
  --radius:5px;
  --ease:ease; --dur:400ms;
  /* derived — nothing in the spec fits */
  --color-elevated:#f7f7f8;                    /* tinted surface: hover rows, table head, seg track, preview box */
  --color-text-2:#6b6b7b;                      /* primary darkened until 4.5:1 — small secondary copy (12–14px) */
  --color-primary-hover:#7d7d90;               /* primary darkened one step for hover */
  --color-border:rgba(142,142,160,.25);        /* primary @ 25% — every 1px divider and control border */
  --color-border-strong:rgba(142,142,160,.5);  /* primary @ 50% — hover borders, dialog/toast edge, chart baseline */
  --color-fill:rgba(142,142,160,.08); --color-fill-2:rgba(142,142,160,.16);  /* chart empty bars, skeleton, selection */
  --color-gain:#1f7a4d; --color-gain-tint:rgba(31,122,77,.10); --color-gain-tint-2:rgba(31,122,77,.18);
  --color-loss:#b3261e; --color-loss-tint:rgba(179,38,30,.08); --color-loss-tint-2:rgba(179,38,30,.16);
  --font-mono:ui-monospace,SFMono-Regular,Menlo,monospace;   /* addresses, hashes, token ids, request preview only */
  --text-xs:12px; --text-sm:14px; --text-base:16px; --text-md:24px; --text-lg:32px; --text-xl:48px;
  --side-w:256px; --top-h:72px; --tab-h:64px; --ctl-h:40px; --ctl-sm:32px;
}
```

`--color-subtle` remains as an alias of `--color-muted` for older inline styles.

### Why the derived colours

| Token | Reason |
|---|---|
| `--color-elevated` #f7f7f8 | The spec allows "background colour shifts" for grouping; this is the lightest tint that still reads against white without a shadow. |
| `--color-text-2` #6b6b7b | #8e8ea0 measures **3.2:1** on white (the spec's own Accessibility section flags it). It stays for 12px uppercase labels, icons, placeholders and accents, but any running secondary copy at 12–14px (sub-lines, hints, table meta, relative times) uses this darkened primary at **5.2:1**. |
| borders | Derived from the primary at low alpha so dividers, control borders and chart grid share one hue. |
| `--color-gain` #1f7a4d / `--color-loss` #b3261e | The spec has no status colours. These are the two muted, low-chroma greens/reds that pass AA on white (**5.3:1** and **6.5:1**) and on the `--color-elevated` tint. They are used only for money direction (receive / send, +/− amounts, net-flow line, delta pills, flagged-row wash) and for form errors / the Untrack action. Everything else stays monochrome. |

### Contrast (on #ffffff)

| Pair | Ratio | Use |
|---|---|---|
| #000000 text | 21:1 | body, values, headings |
| #6b6b7b text | 5.2:1 | secondary copy 12–14px |
| #8e8ea0 text / icons | 3.2:1 | 12px uppercase labels, icons, placeholders, non-text UI (passes 3:1 for UI components; **not** used for body or numbers) |
| #ffffff on #8e8ea0 | 3.2:1 | primary buttons, selected chips/segs/tabs — per spec; fails 4.5:1 for 14px text, see "Open decisions" |
| #1f7a4d / #b3261e | 5.3:1 / 6.5:1 | gain / loss text |
| focus ring #8e8ea0 | 3.2:1 | 2px outline, 2px offset; black on primary-filled controls |

## Typography

- `system-ui, sans-serif` everywhere; monospace only for identifiers. No web fonts, no `<link>` to Google Fonts.
- Line-height **1.5 at every size.** Weights: 700 (display), 600 (headings, emphasised values, control labels), 400 (body). No 500.
- Scale: **display 48/700** (hero headline; 32 below 768) · **heading 32/600** (Settings page title) · **24/600** derived subheading (wallet / token name, dialog titles, stat values) · **body 16/400** (base) · **14** (controls, table rows, sub-lines) · **12** (uppercase labels at +.04em, hints, meta, chips, pills).
- Numbers: tabular figures (`font-feature-settings:"tnum"` on body). Full-precision amounts are never rounded.

## Spacing, radius, motion, breakpoint

- **8px grid.** Paddings 8/16/24/48, gaps 8/16/24, table rows 56, table header 40, controls 40 (32 small) on desktop and 48 (44 small) below 768, chips 32, pills 24, tabs 48, sidebar 256, top bar 72 (64 on phones), tab bar 64. The only off-grid values are 44px touch targets below 768 and 1px borders.
- **Radius:** buttons, chips, pills, segmented controls and single-line inputs are fully rounded (`--radius-pill: 999px`, as on openai.com). Cards, dialogs, textareas, tables and tooltips stay 5px. Round (50%) only for avatars, identicons, token/chain/project logos and status dots.
- **Motion: 400ms `ease` for every transition and animation** (hover colour, drawer, dialog fade/slide, toast, chart bar dimming, skeleton pulse). `prefers-reduced-motion` collapses all of it.
- **One breakpoint, 768px.** ≥768: sidebar + top bar + full 8-column table. <768: sidebar becomes a drawer with scrim, bottom tab bar, single-column layout, 3-column card rows in the table, stats 2×2 (via `auto-fit, minmax(160px,1fr)` rather than a second breakpoint), 32px hero headline, 48px controls.

## Components

| Component | Spec |
|---|---|
| `.btn` | 40px (48 <768), 5px radius, 1px border, 14/600. `.primary` = primary bg + white, hover `--color-primary-hover`, focus ring black; `.outline` = white + border, hover elevated; `.ghost` = transparent, hover elevated (`.quiet` = text-2); `.danger` = white + loss border + loss text, hover loss tint; `.sm` 32px (44 <768) 12px; `.icon` square; disabled opacity .4 |
| `.input` / `.select` / `textarea.input` | 40px (48 <768), white, 1px border, hover border-strong, focus 2px primary outline + primary border, invalid loss border, placeholder muted. Select has explicit `background-color` and `color` |
| Focus | `:focus-visible{outline:2px solid #8e8ea0;outline-offset:2px}` globally; black outline on primary-filled controls (primary button, selected chip/seg/tab, toast action); inset (−2px) on seg / tab-strip buttons |
| `.chip` | 32px, 5px radius, white + border, 12/600 text-2; `.fg` black; `.pos/.neg` tint + status colour; `.sm` 24px |
| `.cchip` (chain filter) | 32px, white + border, 16px logo, count at 80%; selected (`aria-pressed`) = primary bg + white; `.scam` is a `role=switch` with the same selected style |
| `.pill` (delta) | 24px, 5px radius, 12/600, trend icon; gain/loss tint or elevated flat |
| `.tpill` (type) | 32px, 5px radius, icon + label; Receive = gain tint, Send = loss tint, Swap = white + border-strong + black, Approve / contract = white + border + text-2; 40×40 icon tile below 768 |
| `.card` / hero | white, 5px radius, 1px border, 24px padding (16 <768). Identity row (56px identicon, 24/600 name, mono address, status, chips) → chain chips → uppercase 12px label + **48/700 headline** + delta pill + 14px sub-line → range `.seg` → chart label + metric `.seg` → 224px chart (176 <768) |
| `.seg` | bordered white track, 40px options, selected = primary bg + white text |
| `.stat` | white card, 16px padding: 32px elevated icon tile (primary icon; gain/loss tint for net flow), 12px uppercase label, **24/600 value**, delta pill + 12px note. Grid `auto-fit, minmax(160px,1fr)` |
| Tabs | 48px, 14/600, text-2 → black; selected = 2px primary underline + count badge inverted to primary |
| `table.tx` | inside `.tbl-card` (white, 5px radius, 1px border); header 40px elevated tint, 12px uppercase muted, sort-active black; rows 56px, 14px, 8px cell padding, 1px dividers; hover / chart-hover = elevated tint (+2px inset primary marker); flagged rows = loss tint. Counterparty cell stacks name over short address; swap rows stack the out / in tokens (24px logos) so they line up with the two amount lines. Fits 1440 without horizontal scroll; scrolls narrower. <768: 3-column card rows (40px type tile · party + time · amount + USD) |
| Chart | net-flow line 2px gain/loss with flat 10% fill (no gradient); volume bars primary, gas bars border-strong, empty days fill; grid = border; tooltip = white + border-strong |
| Sidebar | white, 1px right border; 72px head with uppercase label; `.witem` 56px, selected = elevated + 2px primary left bar; two outline buttons "Add Wallet" / "Bulk Add"; footer Settings nav item + 12px "Local · N wallets" |
| Header | 32px primary circle mark + name + 12px uppercase section label; search 40px with `/` kbd; actions = outline Refresh / Settings / Bulk Add + primary "Add Wallet" |
| Bottom `.tabbar` | <768, 64px + safe-area, white, 1px top border; active = black text + 2px primary top border |
| Toast | bottom-right white card, 1px border-strong, primary check icon, 48px min height; optional primary action (Undo, 6s); above the tab bar on phones; `role=status aria-live=polite` |
| `.dlg` (Add Wallet) | native `<dialog>`, max-w 440, white, 1px border-strong, 5px radius, backdrop rgba(0,0,0,.4), 400ms fade + 8px slide (none under reduced motion); <768 bottom sheet. 24/600 title, 14px text-2 description, ghost × top-right (32 / 44px). Address (mono, live helper, inline `role=alert` error) + Label (optional); footer ghost Cancel + primary submit disabled until valid |
| `.dlg.wide` (Bulk Add) | same shell at 560; `.dlg-tabs` bordered seg (Upload File / Paste); `.dropz` elevated + 1px dashed border-strong, primary icon, `:focus-within` ring; preview table 40px rows with sticky elevated header; Ready = gain, Invalid = loss, Duplicate / Already tracked = text-2 (text carries the meaning) |
| Settings | 32/600 title; sections = 224px label column + body, 1px dividers, 24px padding; `.preview` boxes elevated + border; wallet list `.wtable` white + border, 56px rows, inline rename input 40px; sticky save bar with Revert (ghost) + Save Changes (primary) |

## Chains, routes, storage, conventions

Unchanged from v3: chain registry (`Chains.load()` → DeBank / Rabby / sample / embedded, cached 24h), 16px chain badge on every token logo, URL-synced chip filter (`?chain=`, `?tab=`), routes `#<walletId>` / `#token/<chain>/<tokenId>` / `?add=1` / `?import=1`, `localStorage` `scantx.v1`, flagged tokens excluded from USD totals, and the Web Interface Guidelines conventions (skip link, `aria-label` on icon buttons, explicit image dimensions, `autocomplete`/`inputmode`, inline `role=alert` errors, `translate="no"` on identifiers, `touch-action: manipulation`, `overscroll-behavior: contain`, safe-area insets, Undo for destructive actions, `beforeunload` on unsaved settings, `<meta name="theme-color" content="#ffffff">`, `color-scheme: light`).

## Open decisions

- **White on #8e8ea0 is 3.2:1**, not the ~8:1 the spec estimates. Primary buttons, selected chips/segs/tabs and the tab-bar count badge use it as the spec and brief direct; if AA for 14px text is required, switch `--color-on-primary` to #000000 (6.5:1) or darken the primary to ≈#6b6b7b for filled controls.
- Full-precision amounts plus the counterparty column make the 8-column table exactly 1150px at 1440 with the 256px sidebar; below that it scrolls horizontally until 768 (by design, single breakpoint).
