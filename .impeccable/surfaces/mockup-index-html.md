---
version: 1
slug: "mockup-index-html"
primary_target: "mockup/index.html"
related_targets: ["mockup/login.html","mockup/settings.html"]
---

# Surface: mockup/index.html (Dashboard + token detail), with login.html and settings.html

Mode: Operate. Audience: crypto power users checking what a wallet did. Task: scan transfers, filter, spot risk, drill into a token, manage tracked wallets. Constraints: static, no server. v3 inherits the user's pinned XCap system (crystal-prism-moss-cherry); v1 (muted XCap greys) and v2 (1inch blue) are anti-references. UX structure from v2 is preserved.

## Direction contract

THESIS: A monochrome ledger where only money has colour. Hairline-bounded surfaces on near-black, white primary actions, and gain/loss green/rose reserved for direction and risk. Refuses v1's washed-out greys and v2's accent-blue chrome.
OWN-WORLD: #0a0a0a page, #111113 cards with 1px fg/10% hairlines and 24px radius, Geist with tabular figures (Geist Mono for hashes only), 11px uppercase labels, white buttons with black text, gain #34d399 / loss #fb7185 as the sole chroma.
STORY: "Here is what this wallet moved, whether it went up or down, and each thing it did; anything green came in, anything rose went out or is risky." Tokens open their own page (`#token/<chain>/<id>`); chain is shown as a 16px badge on every token logo and filtered with a chip row, never selected up front — one request returns every chain.
FIRST VIEWPORT (1440): header with mark + name + EXPLORER label, search, outline Settings and white Add wallet; sidebar with white-barred active wallet; hero card (identity, uppercase label, 60px volume, delta pill, range seg, gain/loss area chart); four hairline stat cards; tabs with white underline; first rows of Recent transfers with monochrome/gain/loss type pills.
SIGNATURE INTERACTION: chip row "All · Robinhood 8 · Base 4 …" multi-select filters hero, chart, stats and tables at once (URL-synced); chart crosshair highlights that day's rows with a white inset bar; clicking any token routes to #token/<chain>/<id>; on phones the bottom tab bar keeps four destinations one tap away.
RISK: monochrome flattening into low contrast; bounded by fg #f4f4f5 for all values, muted #a1a1aa (7:1) for secondary copy, subtle only at 11px uppercase labels, and hairlines instead of grey fills.
