# XCap Scan

Static, browser-only transaction list for many wallets. No server, no account, no keys. Wallet list and settings stay in this browser's `localStorage`.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:5174/xcapscan/
pnpm typecheck
pnpm check
pnpm test
pnpm build        # dist/
```

Deployed to GitHub Pages from the `xcap-scan` branch by `.github/workflows/pages.yml`.
