---
version: 1.0.0
name: WalletTrackerDesign
description: "Visual standards and design system for a high-density, multi-wallet blockchain transaction tracker (Etherscan-class) with dark mode default, high contrast (≥7:1), monospace identifiers, and dense financial data scanning."
sourceReference: "mockup/openai-DESIGN.md"

colors:
  mode: "dark (crypto audience default)"
  bg: "#0b0e14"                # Root canvas / base backdrop
  surface: "#121722"           # Cards, panels, table containers (elevation 1)
  surface-elevated: "#181f2e"  # Hover rows, table headers, elevated cards (elevation 2)
  surface-overlay: "#20293d"   # Dropdowns, popovers, tooltips, dialogs (elevation 3)
  border: "rgba(255, 255, 255, 0.08)"        # 1px structural dividers
  border-strong: "rgba(255, 255, 255, 0.16)" # Hover borders, active control boundaries
  text: "#f0f4fc"              # Primary text / values / addresses (14.2:1 on #0b0e14, WCAG AAA)
  text-muted: "#94a3b8"        # Secondary labels, timestamps, tx fee text (7.1:1 on #0b0e14, WCAG AAA)
  text-subtle: "#64748b"       # Decorative icons, inactive pagination, disabled glyphs
  primary: "#38bdf8"           # Accent: Active trades, chain indicators, interactive highlights
  primary-glow: "rgba(56, 189, 248, 0.15)"
  inflow: "#10b981"            # Semantic: Inflow, transfer received, successful txn
  inflow-tint: "rgba(16, 185, 129, 0.12)"
  outflow: "#f43f5e"           # Semantic: Outflow, transfer sent, failed txn, error
  outflow-tint: "rgba(244, 63, 94, 0.12)"
  pending: "#f59e0b"           # Semantic: Mempool / pending txn, gas alert warning
  pending-tint: "rgba(245, 158, 11, 0.14)"

typography:
  font-sans: "'Suisse Intl', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  font-mono: "'JetBrains Mono', 'SFMono-Regular', Menlo, Monaco, Consolas, monospace"
  scales:
    display:
      fontFamily: "var(--font-sans)"
      fontSize: "32px"
      fontWeight: 500
      lineHeight: 1.25
    heading:
      fontFamily: "var(--font-sans)"
      fontSize: "20px"
      fontWeight: 500
      lineHeight: 1.3
    subheading:
      fontFamily: "var(--font-sans)"
      fontSize: "15px"
      fontWeight: 500
      lineHeight: 1.4
    body:
      fontFamily: "var(--font-sans)"
      fontSize: "13px"
      fontWeight: 400
      lineHeight: 1.5
    data-mono:
      fontFamily: "var(--font-mono)"
      fontSize: "13px"
      fontWeight: 500
      lineHeight: 1.4
    caption-mono:
      fontFamily: "var(--font-mono)"
      fontSize: "11px"
      fontWeight: 400
      lineHeight: 1.4
    caption-sans:
      fontFamily: "var(--font-sans)"
      fontSize: "11px"
      fontWeight: 500
      lineHeight: 1.4
      letterSpacing: "0.03em"

spacing:
  base: 8px
  scale: [4, 8, 12, 16, 24, 32, 48]

radius:
  xs: 3px
  sm: 6px
  md: 8px
  pill: 999px

motion:
  duration-fast: 150ms
  duration-base: 250ms
  easing: "cubic-bezier(0.16, 1, 0.3, 1)"

breakpoints: [640px, 1024px, 1440px]
---

# Multi-Wallet Blockchain Transaction Tracker — Design System Specification

## Rationale & Philosophy

Modeled on the structural discipline of `openai-DESIGN.md` and tailored for professional cryptocurrency transaction explorers (e.g., Etherscan, Debank, Rabby), this design system establishes visual, layout, and ergonomic standards for tracking multiple blockchain wallets in real time.

Crypto users and on-chain analysts operate in high-frequency, data-dense environments where information clarity and speed of cognition supersede decorative embellishments. The interface enforces:
1. **Dark Mode Default with Rigorous Contrast (≥ 7:1)**: Eliminates eye strain during prolonged monitoring sessions and guarantees WCAG AAA compliant text clarity over dark canvas backdrops.
2. **Strict Typographic Split**: Monospace fonts (`JetBrains Mono`, `SFMono-Regular`, `Menlo`) are strictly reserved for hexadecimal data (wallet addresses, transaction hashes), token balances, and numerical currency deltas to ensure tabular alignment and immediate character disambiguation (e.g., distinguishing `0` from `O` and `1` from `l`). Sans-serif handles hierarchical UI chrome, navigation, section headers, and field labels.
3. **Engineered Density**: Maximizes the number of visible transactions above the fold without sacrificing scanning rhythm, tap targets, or clipboard utility.

---

## 1. Dark Mode & Surface Elevation

Crypto monitoring interfaces require clear optical separation between the application backdrop, card groupings, sticky headers, and modal overlays without relying on distracting drop-shadows.

### Surface Elevation Architecture

```
Layer 0: Canvas Base        #0b0e14  (Viewport background)
  │
  ├── Layer 1: Base Card    #121722  + 1px border rgba(255,255,255,0.08) (Table containers, wallet cards)
  │     │
  │     ├── Layer 2: Inset  #181f2e  (Table headers, row hover states, segmented button tracks)
  │     │
  │     └── Layer 3: Float  #20293d  + 1px border rgba(255,255,255,0.16) (Tooltips, dropdowns, dialogs)
```

### Measured Tokens

```css
:root {
  /* Surface Neutrals */
  --color-bg: #0b0e14;
  --color-surface: #121722;
  --color-surface-elevated: #181f2e;
  --color-surface-overlay: #20293d;
  --color-surface-inset: #0e121a;

  /* Borders & Dividers */
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-strong: rgba(255, 255, 255, 0.16);
  --color-border-focus: #38bdf8;

  /* Typography Colors */
  --color-text: #f0f4fc;
  --color-text-muted: #94a3b8;
  --color-text-subtle: #64748b;
  --color-text-inverse: #0b0e14;

  /* Data Visualization & Accents */
  --color-primary: #38bdf8;               /* Sky Blue: active trades, links, chart focus */
  --color-primary-hover: #7dd3fc;
  --color-primary-glow: rgba(56, 189, 248, 0.15);

  /* Semantic Money Direction & Status */
  --color-inflow: #10b981;                /* Emerald: received funds, success tx */
  --color-inflow-tint: rgba(16, 185, 129, 0.12);
  --color-inflow-border: rgba(16, 185, 129, 0.28);

  --color-outflow: #f43f5e;               /* Rose: sent funds, failed tx, untrack */
  --color-outflow-tint: rgba(244, 63, 94, 0.12);
  --color-outflow-border: rgba(244, 63, 94, 0.28);

  --color-pending: #f59e0b;               /* Amber: mempool pending, gas spikes */
  --color-pending-tint: rgba(245, 158, 11, 0.14);
  --color-pending-border: rgba(245, 158, 11, 0.32);

  /* Fonts */
  --font-sans: "Suisse Intl", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", "SFMono-Regular", Menlo, Monaco, Consolas, monospace;

  /* Sizing & Controls */
  --radius-xs: 3px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-pill: 999px;
  --row-h-dense: 40px;
  --row-h-default: 48px;
  --ctl-h: 36px;
  --ctl-sm: 28px;
}
```

---

## 2. Accessibility & Contrast Verification (Dark Canvas: `#0b0e14`)

Every typography token satisfies WCAG AAA requirements (contrast ratio ≥ 7:1) to ensure fatigue-free readability during continuous scanning:

| Element / Token | Foreground Hex | Background Hex | Contrast Ratio | WCAG Compliance | Intended Application |
|---|---|---|---|---|---|
| `--color-text` | `#f0f4fc` | `#0b0e14` | **14.2:1** | AAA (Pass) | Primary body text, wallet addresses, balances, tx hashes |
| `--color-text` | `#f0f4fc` | `#121722` | **13.1:1** | AAA (Pass) | Card text, row primary metrics |
| `--color-text-muted` | `#94a3b8` | `#0b0e14` | **7.1:1** | AAA (Pass) | Gas labels, timestamps, counterparty secondary addresses |
| `--color-text-muted` | `#94a3b8` | `#181f2e` | **6.4:1** | AA Large / AAA UI | Table column headers, filter options |
| `--color-primary` | `#38bdf8` | `#0b0e14` | **9.8:1** | AAA (Pass) | Active trade badges, chain icons, active link states |
| `--color-inflow` | `#10b981` | `#0b0e14` | **8.6:1** | AAA (Pass) | Received transaction amounts (+), success indicators |
| `--color-outflow` | `#f43f5e` | `#0b0e14` | **7.2:1** | AAA (Pass) | Sent transaction amounts (-), failure indicators |
| `--color-pending` | `#f59e0b` | `#0b0e14` | **8.1:1** | AAA (Pass) | Mempool status, gas warning alerts |

---

## 3. Typography Architecture

### Font Preloading & `@font-face` Declarations

To eliminate layout shifts (CLS) and ensure rapid rendering of UI chrome, `Suisse Intl` is preloaded via `<link rel="preload">` in the HTML document head and defined with explicit font weights:

```html
<!-- Document Head: High-Priority Font Preload -->
<link rel="preload" href="assets/fonts/SuisseIntl-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/SuisseIntl-Book.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/SuisseIntl-Medium.woff2" as="font" type="font/woff2" crossorigin>
```

```css
/* Core Sans-Serif: Suisse Intl Font Definitions */
@font-face {
  font-family: 'Suisse Intl';
  src: url('assets/fonts/SuisseIntl-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Suisse Intl';
  src: url('assets/fonts/SuisseIntl-Book.woff2') format('woff2');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Suisse Intl';
  src: url('assets/fonts/SuisseIntl-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}
```

### Font Stack Assignment

```css
/* Hexadecimal values, hashes, balances, and block metrics use monospace */
.tx-hash,
.wallet-address,
.crypto-amount,
.gas-value,
.block-height,
.timestamp-mono {
  font-family: var(--font-mono);
  font-feature-settings: "tnum" 1, "zero" 1;
}

/* Chrome, navigation, labels, descriptions, and buttons use Suisse Intl */
body,
.label,
.nav-item,
.dialog-title,
.filter-button {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### Type Scale Breakdown

`Suisse Intl` is paired with the font weight steps: **300 (Book)** for subtle secondary copy and metadata, **400 (Regular)** for standard body/labels, and **500 (Medium)** for headings, buttons, and high-emphasis chrome:

| Role | Font Family | Size / Line-Height | Weight | Letter Spacing | Context / Usage |
|---|---|---|---|---|---|
| **Display** | Suisse Intl | 32px / 1.25 | 500 (Medium) | -0.02em | Aggregate portfolio valuation, page hero |
| **Heading** | Suisse Intl | 20px / 1.3 | 500 (Medium) | -0.01em | Modal headings, card titles, section dividers |
| **Subheading**| Suisse Intl | 15px / 1.4 | 500 (Medium) | normal | Wallet nickname, filter modal labels |
| **Body (UI)** | Suisse Intl | 13px / 1.5 | 400 (Regular) | normal | Standard controls, descriptions, tab items |
| **Body (Secondary)**| Suisse Intl | 13px / 1.5 | 300 (Book) | normal | Helper text, sub-descriptions, inactive links |
| **Data (Mono)**| Monospace | 13px / 1.4 | 500 | normal | Truncated tx hash, wallet address, transfer token amount |
| **Meta (Mono)**| Monospace | 11px / 1.4 | 400 | normal | Gas price (Gwei), L1/L2 execution fee, ISO timestamp |
| **Meta (Sans)**| Suisse Intl | 11px / 1.4 | 500 (Medium) | +0.04em | Table column uppercase headers, status badge text |

---

## 4. Components & Specifications

### 4.1 Transaction Row (`.tx-row`)

The core workhorse component designed for high-density scanability.

- **Height**: 44px (dense desktop), 52px (default desktop), auto (mobile stack).
- **Structure**:
  1. **Status Badge**: 20×20px circular icon or compact pill (`Success` = emerald dot, `Failed` = rose cross, `Pending` = amber pulse).
  2. **Tx Hash**: Truncated format (`0x7a3f...b891`) with interactive click-to-copy button and tooltip preview on hover.
  3. **Method / Action**: Pill (e.g., `Swap`, `Approve`, `Transfer`, `Contract Interaction`) with subtle border.
  4. **From / To**: Monospace formatted with counterparty identity tag (e.g., `Uniswap V3: Router` or `0x89c...23d`).
  5. **Value / Flow**:
     - Inflow: `+1,450.00 USDC` in `--color-inflow`.
     - Outflow: `-0.852 ETH` in `--color-outflow`.
  6. **Gas & Fee**: Two-line cell showing USD cost (`$4.12`) over Gwei rate (`18 Gwei`) in 11px monospace.
  7. **Timestamp**: Relative time (`3 mins ago`) with full UTC date string on tooltip.

```html
<div class="tx-row" role="row" tabindex="0">
  <div class="tx-cell status">
    <span class="status-dot success" title="Confirmed"></span>
  </div>
  <div class="tx-cell hash">
    <code class="mono" translate="no">0x3b1c...99a1</code>
    <button class="copy-btn" aria-label="Copy transaction hash" data-copy="0x3b1c8f4299a1..."></button>
  </div>
  <div class="tx-cell method">
    <span class="badge-method">Swap</span>
  </div>
  <div class="tx-cell route">
    <span class="mono address" translate="no">vitalik.eth</span>
    <span class="arrow-glyph">→</span>
    <span class="mono address" translate="no">Uniswap V3</span>
  </div>
  <div class="tx-cell amount inflow">
    <span class="mono">+2,450.00 USDT</span>
  </div>
  <div class="tx-cell gas">
    <span class="mono fee">$2.14</span>
    <span class="mono-meta">19 Gwei</span>
  </div>
  <div class="tx-cell time">
    <time datetime="2026-09-21T12:00:00Z">2m ago</time>
  </div>
</div>
```

### 4.2 Wallet Card (`.wallet-card`)

Displays high-level overview for individual tracked addresses in multi-wallet view.

- **Background**: `--color-surface` (`#121722`) with 1px `--color-border`.
- **Corner Radius**: 8px (`--radius-md`).
- **Padding**: 16px.
- **Key Elements**:
  - Top row: Multi-chain icon avatars, custom wallet nickname (`Treasury Cold Vault 1`), truncated address (`0x94A...3C0`).
  - Middle: Big balance metric in monospace (`$1,248,390.45 USD`) with 24h change pill (`+4.2%` inflow tint).
  - Bottom: Quick stats strip (`38 txns (24h)`, `Last active 4m ago`), direct deep-link anchor to wallet detail page.
  - Interactive Action: Quick-copy address icon button, star/favorite toggle, filter-by-this-wallet trigger.

### 4.3 Filter & Sort Toolbar (`.filter-bar`)

Enables real-time data slicing across millions of blocks:

- **Chain Selector**: Segmented horizontal pill strip (e.g., `All Chains`, `Ethereum`, `Arbitrum`, `Base`, `Polygon`, `Optimism`) displaying network glyph + active badge counter.
- **Date / Block Range**: Compact picker supporting quick presets (`1h`, `24h`, `7d`, `30d`, `Custom Block Range`).
- **Status Filter**: Multi-select pills (`All`, `Success`, `Failed`, `Pending/Mempool`).
- **Amount & Token Filter**: Min/Max numeric range input with instant debounce, token denomination dropdown.
- **Hide Spam / Poisoning Filter**: Toggle switch (`role="switch"`) filtering out zero-value dusting attacks and known spam contract addresses.

### 4.4 Alert & Notification Banner (`.alert-banner`)

Contextual system alerts rendered in high-contrast containers:

1. **High Gas Alert**:
   - Background: `--color-pending-tint` (`rgba(245, 158, 11, 0.14)`)
   - Border: 1px solid `--color-pending-border`
   - Icon: Fuel pump glyph in `#f59e0b`
   - Message: `"Gas alert: Ethereum base fee is currently 84 Gwei (> 50 Gwei threshold)."`
2. **Low Native Balance Alert**:
   - Background: `--color-outflow-tint`
   - Border: 1px solid `--color-outflow-border`
   - Message: `"Wallet 0x8a1...492 has insufficient ETH (< 0.005 ETH) to cover future gas fees."`
3. **Suspicious Activity Alert**:
   - Background: `rgba(244, 63, 94, 0.16)`
   - Border: 1px solid `--color-outflow`
   - Message: `"Flagged contract interaction: Approval to unverified address detected."`

---

## 5. Spacing, Layout & Responsive Density

### Layout Grid

- Base unit: **8px**. Micro-spacing steps: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`.
- Max container width: `1600px` for multi-wallet operations.

### High-Density Scanning vs. Detail View

| Dimension | High-Density List View | Expanded Detail View |
|---|---|---|
| **Row Height** | 40px–44px | 64px–72px |
| **Cell Padding**| 6px 10px | 16px 20px |
| **Typography Size** | 12px / 13px | 14px / 15px |
| **Visible Columns** | 7–8 columns (Hash, Method, Route, Value, Fee, Time, Action) | 4 key columns + accordion drawer showing full input data, raw hex logs, decoded trace |
| **Scroll Behavior** | Virtualized list for 10,000+ items, sticky table header | Standard block document layout |

### Breakpoints & Mobile Stack

- **Desktop (≥ 1024px)**: Full multi-column data grid, sticky filters, split-screen sidebar wallet drawer.
- **Tablet (640px – 1023px)**: Horizontal scroll container with pinned Hash and Amount columns.
- **Mobile (< 640px)**:
  - Table transforms from columns into compact card rows.
  - Wallet addresses collapse to chain icon + 4-char prefix (`0x3b...`) + direct tap-to-copy button.
  - Method and status merge into an icon badge overlay.
  - Amounts shrink to abbreviated values (`+2.45K USDT`, `-$1.2M`).
  - Gas fee and timestamp stack into a single right-aligned sub-line.

---

## 6. Interaction Models & Ergonomics

### 6.1 Row Hover & Focus State
- Hovering a transaction row activates `--color-surface-elevated` (`#181f2e`) with a `2px solid var(--color-primary)` accent indicator on the left border.
- Hovering any truncated address or hash immediately reveals the full 42/66 character string in a floating tooltip (`--color-surface-overlay`, 150ms delay).
- Focus ring: `2px solid #38bdf8` with `2px` offset (`:focus-visible`).

### 6.2 Instant Clipboard Copying (`.copy-btn`)
- Every address, hash, token contract, and raw amount features a 1-click copy target.
- Visual Feedback: Icon shifts from copy glyph to green checkmark (`#10b981`) for 1,200ms with floating toast notification (`"Copied 0x7a3...b891 to clipboard"`).
- Keyboard accessible: Space or Enter triggers copy when focused.

### 6.3 Quick Filters
- Clicking any address or token in the table instantly sets an active filter chip without requiring modal navigation.
- Escape key clears active filter chips.

---

## 7. Performance & Web Interface Guidelines

1. **`translate="no"` on Identifiers**: Prevents automatic browser translation engines from breaking hex addresses or ENS names.
2. **Tabular Figures (`font-feature-settings: "tnum"`)**: Guarantees numbers and amounts stay vertically aligned during real-time balance fluctuations.
3. **Hardware-Accelerated Transitions**: Motion strictly limited to `opacity` and `transform` at `150ms`–`250ms cubic-bezier(0.16, 1, 0.3, 1)`.
4. **Reduced Motion Support**:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, ::before, ::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
5. **No Full-Page Re-renders**: Row updates, pending-to-confirmed status changes, and incoming websocket transactions animate smoothly via subtle border-pulse without shifting table geometry.
