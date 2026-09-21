# CLAUDE.md

XCap Scan — static multi-wallet transaction list (React 19 + Vite, GitHub Pages, no backend, no auth).

## Design system — mandatory

**Before any UI change, new element, or edit: read `docs/design-system.md` and match it.** It is the single source of truth for colour, type, spacing, radius, elevation, components, motion and accessibility. Tokens live in `src/styles/tokens.css` and map 1:1 to that file; never invent values outside it.

Key rules from it: white canvas / black ink, neutral surfaces only, semantic colour only for real status; sans-serif (OpenAI Sans → system-ui fallback), sentence case, weight 500 for labels/buttons; pill buttons and pill inputs (every text field is full-round), 12px cards, 8–16px containers; hairline borders instead of shadows; 44px minimum control height; visible 2px focus outline; `prefers-reduced-motion` honoured.

Dark theme: same tokens with neutrals inverted (`:root[data-theme='dark']` in `tokens.css`); never use raw colours in components so both themes stay in sync.

## Hard rules

- Never hardcode or name any external history source in code, comments, docs or tests — the user pastes URLs at runtime. `pnpm check` enforces this.
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
