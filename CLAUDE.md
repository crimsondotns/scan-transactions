# CLAUDE.md

XCap Scan — static multi-wallet transaction list (React 19 + Vite, GitHub Pages, no backend, no auth).

## Design system — mandatory

**Before any UI change, new element, or edit: read `docs/design-system.md` and match it.** It is the single source of truth for colour, type, spacing, radius, elevation, components, motion and accessibility. Tokens live in `src/styles/tokens.css` and map 1:1 to that file; never invent values outside it.

Key rules from it: white canvas / black ink, neutral surfaces only, semantic colour only for real status; sans-serif (OpenAI Sans → system-ui fallback), sentence case, weight 500 for labels/buttons; pill buttons and pill inputs (every text field is full-round), 12px cards, 8–16px containers; hairline borders instead of shadows; 44px minimum control height; visible 2px focus outline; `prefers-reduced-motion` honoured.

Dark theme: same tokens with neutrals inverted (`:root[data-theme='dark']` in `tokens.css`); never use raw colours in components so both themes stay in sync.

## Before every delivery — mandatory audit

1. Re-read `docs/design-system.md` (must be byte-identical to `/Users/Kakachi/Downloads/DesignSystem/OpenAI/openai.com-design-system.md`; `diff -q` them).
2. Audit every screen and state — default, hover, focus-visible, active/selected, disabled, error, empty, loading — **in both Light and Dark theme** against the file **exactly**: colours from tokens only, type scale/weights, spacing steps, radii (pill controls, 12px cards, 16px large surfaces), hairline borders, shadow only on floating panels, 44px primary controls / 40px inputs and dropdown triggers (user override of the file's 48px — keep), 2px focus outline, motion 120/180/280ms standard easing, sentence case.
3. Hover check is done with every `:hover` rule forced on (scratch copy of dist, not in repo) in both themes: no control may blend into its background or lose its text; primary hover uses `--color-ink-hover`, everything else `--color-hover` / `--color-line-hover`. Never let a generic `.btn:hover` outrank `.btn-primary`.
4. Any mismatch = fix first, then re-run `pnpm typecheck && pnpm check && pnpm test && pnpm build`. Never skip, never deliver with a known deviation.

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
