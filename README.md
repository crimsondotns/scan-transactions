# XCap Scan

Static, browser-only transaction list for many wallets at once. No server, no account, no keys.

- Import wallets in bulk from `.csv` / `.xlsx` (columns **Label** and **Addresses**), or add them one at a time.
- Paste the URL template of the history source you use in **Settings** — the app ships with none. Placeholders: `{address}` (required), `{start}` (paging cursor, `0` first page), `{count}` (page size).
- Wallet list and the template are kept in this browser's `localStorage` only.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:5174/scan-transactions/
pnpm typecheck
pnpm check        # repo guards (no hardcoded sources, no stray text)
pnpm build        # dist/
```

Deployed to GitHub Pages from the `block-scanner` branch by `.github/workflows/pages.yml`.

## Import file

| Label | Addresses |
|---|---|
| Main | 0xabc… |
| Trading | 0xdef…, 0x123… |

Header row is required (case-insensitive; `Name`/`Address`/`Wallet` also accepted). One cell may hold several addresses separated by comma, space or newline.
