# XCap Scan

Static, browser-only transaction list for many wallets. No server, no account, no keys. Wallet list and settings stay in this browser's `localStorage`.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:5174/transactions/
pnpm typecheck
pnpm check
pnpm test
pnpm build        # dist/
```

Deployed to GitHub Pages from the `xcap-scan` branch by `.github/workflows/pages.yml`.

## API keys

The page is static, so it holds no secrets. A source that needs a key goes through the server-side wrapper in [`worker/`](worker) — the frontend then only knows an alias (`main/v1/…`), never the upstream URL or the key. See [docs/api-wrapper.md](docs/api-wrapper.md). `pnpm check:dist` runs after every build and fails if anything that looks like a key reaches `dist/`.
