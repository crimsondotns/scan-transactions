# Product

<!-- impeccable:product-schema 1 -->

_Init was run non-interactively from the caller's brief (no interview was possible in this session). Facts marked **[inferred]** were derived from the brief or the sample data and should be confirmed by the user._

## Platform

web

## Stack

Static HTML/CSS + vanilla JS for the mockup phase (`mockup/`), hosted on GitHub Pages: no server, no build step, no env or secret keys. The production app stack is **undecided**; the existing XCap site is Tailwind-based, so a Vite + Tailwind build is the likely direction **[inferred]**.

## Users

Crypto power users who track several of their own (and watched) wallets across sessions and want a fast, dense read of what each wallet did: swaps, sends, receives, approvals, counterparties, gas. They arrive already knowing what a tx hash, an approval, and a DEX router are. Reference behaviour: Arkham Intelligence's entity explorer, used at a desk on a dark screen for minutes at a time, and on a phone for a quick "what happened" check **[inferred]**.

## Product Purpose

**Scan Transactions** turns the raw Rabby `history_list` feed into a wallet explorer: the user signs in, saves multiple wallets, and gets an Arkham-style entity page per wallet (identity header, key stats, activity chart, sortable transfers table with filters). Success: a user can answer "what did this wallet do, with whom, for how much, and was any of it sketchy" in seconds, and their wallet list survives across devices/sessions.

## Positioning

Single-source, bring-your-own-endpoint explorer: the user supplies only the Rabby history base URL; the app composes every query itself and runs entirely client-side. No indexer, no backend, no keys to leak. Scam and suspicious tokens are flagged inline from the feed's own `is_scam` / `is_suspicious` fields rather than a third-party list.

## Operating Context

- Data source: `GET https://api.rabby.io/v1/user/history_list?` with `id=<wallet>&start_time=<unix>&page_count=<n>` appended by the app — **no `chain_id`**, so one call returns transfers across all chains (`history_list[i].chain` carries the chain per row; `start_time=0` = newest first, older pages pass the oldest `time_at`). `token_id` is ignored without `chain_id`, so token filtering is client-side. The API sends `access-control-allow-origin: *`, so the static page can call it directly. Only the base URL is user-editable (Settings), remembered in `localStorage`.
- Chains: the chain list (73 as of Sep 2026) comes from `https://api.debank.com/chain/list` (`data.chains[]`: `id`, `name`, `network_id`, `token_symbol`, `token_id`, `explorer_host`, `logo_url`, `is_support_history`, `prefix`) or `https://api.rabby.io/v1/chain/list` and is used only for names, logos and explorer links. Snapshot at `mockup/sample/chain_list.json`. `token_dict` keys are per response; the native token key equals the chain id (e.g. `hood`, `base`); NFT entries carry `is_erc721/is_erc1155`, `collection.is_scam`, no `price`. DeBank's `is_support_history` flag does not match Rabby and is informational only.
- A tracked wallet is an address + label; chain is a filter over loaded rows, never a selector.
- Response shape: `history_list[]` (`cate_id`, `chain`, `id`, `other_addr`, `project_id`, `receives[]`, `sends[]`, `time_at` unix seconds, `token_approve`, `tx {name, status, from_addr, to_addr, usd_gas_fee, value}`) plus `token_dict`, `project_dict`, `cate_dict`, `cex_dict` lookups. Native token key equals the chain id (e.g. `"hood"`). USD = amount × price.
- Auth: Google + Email/Password, provider undecided (Firebase Auth or Supabase). A "continue as guest" path keeps wallets local only.
- Hosting: GitHub Pages, pure static.

## Capabilities and Constraints

- Confirmed: multi-wallet tracking, per-wallet entity page, transfers table (Time, Type, From → To, Token, Amount, USD, Gas, Tx hash), filters (chain, token, type, date range, search), tabs (Overview, Transfers, Holdings, Counterparties), scam/suspicious flagging, settings with API base + resolved request preview, login/sign-up.
- Type derivation: `token_approve` → Approve; sends and receives → Swap; sends only → Send; receives only → Receive; otherwise the contract call name from `tx.name` **[inferred rule]**.
- Undecided: auth provider; chart library for the real build; whether "portfolio value / 24h change" tiles come from a second endpoint (history alone cannot supply balances) **[open]**.
- Terminology: "wallet" (tracked address), "counterparty" (`other_addr` or project), "transfer" (one history entry).

## Brand Commitments

- Name: **Scan Transactions**. Sibling of the user's existing **XCap** site; must share its visual system (dark, near-monochrome, Instrument Sans + IBM Plex Mono, tokens listed in `mockup/DESIGN.md`).
- Voice: quiet, precise, operational. No hype copy, no neon.

## Evidence on Hand

- Real sample feed: `mockup/sample/history_all.json` (all-chain call for wallet `0x42a8…328e`: 20 rows across hood 8 / base 4 / arb 4 / op 3 / monad 1, 18 tokens incl. scam airdrops and one NFT; tx names include swap, approve, execute, multicall, batchTransfer, mintTo and empty). `mockup/sample/history_list.json` is the older single-chain sample, no longer referenced.
- Existing XCap shell: `xcap.html` (Tailwind class names `bg-bg text-fg font-sans`).
- No logos, testimonials, or metrics beyond the sample; do not fabricate.

## Product Principles

1. The feed is the truth: every number on screen is computed from the response, and derived values say so.
2. Density over decoration: one screen should answer the question without scrolling on desktop.
3. Addresses, hashes, and amounts are monospace and copyable; nothing important is truncated without a way to get the full value.
4. Risk is visible but not loud: flagged tokens are marked with an icon + label, never colour alone.
5. Nothing secret ever lives in the client; the only stored preference is a public base URL and a wallet list.
