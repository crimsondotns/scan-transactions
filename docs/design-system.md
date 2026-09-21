# OpenAI.com Design System

> **Status:** Observed reconstruction / implementation guide  
> **Reference date:** 2026-09-21  
> **Scope:** Public-facing `openai.com` web experience  
> **Important:** This is **not** an official internal OpenAI design-system source. It combines OpenAI's public brand guidelines with current public-site observations and third-party DOM/token measurements.

## 1. Design DNA

OpenAI.com uses a restrained, editorial interface that puts typography, whitespace, navigation, and imagery ahead of ornamental UI. The dominant visual language is near-monochrome: white canvas, black ink, subtle gray separators/surfaces, and occasional color carried primarily by content imagery.

The current homepage is organized around product/organization navigation, a centered ChatGPT-oriented entry point, editorial cards, and a large set of content categories including Research, Products, Business, Developers, and Company. citehttps://openai.com/

### Core principles

1. **Clarity before decoration** — use simple geometry and clear hierarchy.
2. **Whitespace is structural** — generous space separates content groups and creates emphasis.
3. **Typography does most of the work** — headings, labels, and body copy provide the visual hierarchy.
4. **Monochrome foundation** — default UI chrome should remain black/white/neutral.
5. **Soft geometry** — controls tend toward rounded or pill shapes; containers use modest radii.
6. **Editorial composition** — content should feel closer to a publication or product story than a dense dashboard.
7. **Imagery can carry color** — colorful photography/illustration can sit against a neutral UI without making the chrome colorful.

## 2. Brand identity

### Logo

OpenAI's official brand guidance says the wordmark is built with **OpenAI Sans**, with the `O` formed as a perfect circle. The wordmark's proportions are fixed and it requires prescribed clear space. The Blossom should not be treated as the primary branding. citehttps://openai.com/brand/

**Usage rules**

- Use the official artwork exactly as supplied.
- Preserve clear space around the wordmark.
- Do not stretch, crop, mask, recolor, texture, or otherwise modify the wordmark.
- Do not invent alternative logo lockups.
- Do not use the Blossom as the primary brand mark.
- For partnership lockups, preserve balanced spacing and visual size relationships. citehttps://openai.com/brand/

## 3. Color system

### Core palette

| Token | Value | Role |
|---|---|---|
| `--color-bg` | `#FFFFFF` | Page canvas / default surface |
| `--color-ink` | `#000000` | Primary text and strongest actions |
| `--color-soft` | `#F1F1F1` | Subtle surface, hover, utility backgrounds |
| `--color-line` | `rgba(0, 0, 0, 0.12)` | Hairline borders and dividers |
| `--color-line-subtle` | `rgba(0, 0, 0, 0.08)` | Very low-contrast separation |
| `--color-muted` | `rgba(0, 0, 0, 0.60)` | Secondary copy |
| `--color-tertiary` | `rgba(0, 0, 0, 0.44)` | Tertiary/meta copy and placeholders |
| `--color-disabled` | `rgba(0, 0, 0, 0.38)` | Disabled text/icons |
| `--color-danger` | `#DC2626` | Error / destructive status |

The official brand page emphasizes an unmodified logo and typography rather than publishing a complete UI token palette. Public-site measurement sources consistently identify the page as monochrome-first, with white and black as the dominant colors and light neutral separators/surfaces. citehttps://openai.com/brand/

### Color rules

- Default page: `#FFFFFF`.
- Default ink: `#000000`.
- Use neutral surfaces to create only subtle elevation.
- Prefer borders/dividers to heavy shadows.
- Keep semantic color limited to genuine status meaning.
- Do not make the primary brand experience multicolored by default.

## 4. Typography

### Typeface

**Primary:** OpenAI Sans  
OpenAI's official brand guidelines describe OpenAI Sans as a geometric, functional typeface with rounded, approachable characteristics. The family has five core weights: **Light, Regular, Medium, Semibold, Bold**, each with a corresponding italic. citehttps://openai.com/brand/

### Suggested UI type scale

The following scale is an **observed/derived implementation scale**, not a published OpenAI internal token list. Third-party measurements of openai.com report a 17px body baseline and large display/heading sizes in the roughly 31–56px range depending on viewport and page context. citehttps://designmd.cc/benchmarks/openai

| Token | Size | Line height | Weight | Intended use |
|---|---:|---:|---:|---|
| `display-xl` | `56px` | `1.05` | 500 | Hero/display statement |
| `display-lg` | `48px` | `1.08` | 500 | Large section headline |
| `display-md` | `40px` | `1.10` | 500 | Page headline |
| `heading-lg` | `32px` | `1.20` | 500 | Section heading |
| `heading-md` | `24px` | `1.20` | 500 | Card/group heading |
| `heading-sm` | `20px` | `1.25` | 500 | Supporting heading |
| `body-lg` | `17px` | `1.50` | 400 | Long-form body copy |
| `body-md` | `15px` | `1.45` | 400 | Standard UI/body |
| `label` | `14px` | `1.40` | 500 | Buttons, nav, metadata |
| `caption` | `13px` | `1.40` | 400 | Fine print / tertiary metadata |

### Typography rules

- Use weight changes before adding decorative styling.
- Keep body measure readable; avoid very long text lines.
- Headings should have tight line-height and restrained tracking.
- Prefer sentence case for interface labels and navigation.
- Use bold/semibold sparingly so hierarchy remains quiet and premium.

## 5. Spacing system

Use a 4px base unit with a small set of composable spacing steps.

| Token | Value |
|---|---:|
| `space-1` | `4px` |
| `space-2` | `8px` |
| `space-3` | `12px` |
| `space-4` | `16px` |
| `space-6` | `24px` |
| `space-8` | `32px` |
| `space-12` | `48px` |
| `space-16` | `64px` |
| `space-24` | `96px` |

Public measurements of the site describe generous whitespace and vertical padding as a defining characteristic. citehttps://www.opendesign.cc/en/sites/openai

### Spacing rules

- Prefer larger gaps between major sections than between components within a section.
- Use `16px` as the default internal component padding.
- Use `24–32px` for grouped content blocks.
- Use `48–96px` for major section separation on large screens.
- Avoid dense grids when the content benefits from editorial pacing.

## 6. Layout & grid

### Container

Recommended starting point:

```css
--layout-max: 1440px;
--layout-gutter: clamp(20px, 3vw, 48px);
```

Use a fluid container with large horizontal breathing room. Align navigation, page titles, cards, and footer sections to the same primary content edges whenever practical.

### Grid

Use a flexible 12-column grid for complex editorial/product pages and simpler 1–4 column arrangements for content sections.

```css
.container {
  width: min(100% - 2 * var(--layout-gutter), var(--layout-max));
  margin-inline: auto;
}

.grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 24px;
}
```

### Responsive behavior

**Desktop**
- Full navigation visible.
- Large display typography.
- Multi-column cards/grids.
- Generous section padding.

**Tablet**
- Reduce gutters and display sizes.
- Collapse multi-column content where readability improves.
- Preserve large tap targets.

**Mobile**
- Collapse navigation into a compact menu.
- Use a single-column content flow by default.
- Keep major headings prominent but reduce display scale.
- Maintain generous vertical rhythm instead of shrinking every gap proportionally.

## 7. Shape language

### Border radius

| Token | Value | Usage |
|---|---:|---|
| `radius-sm` | `6px` | Small fields/chips where needed |
| `radius-md` | `8px` | Cards/containers |
| `radius-lg` | `12px` | Prominent cards/interactive containers |
| `radius-xl` | `16px` | Large media/content surfaces |
| `radius-pill` | `9999px` | Buttons, pills, selectors |

Public DOM-derived measurements show repeated rounded values including 6px, 8px, 10px, 12px, 16px, and pill-shaped controls. citehttps://github.com/yuvrajangadsingh/brandmd/blob/main/examples/openai.md

### Geometry rules

- Use rounded pills for compact, high-priority controls.
- Use moderate radii for content containers.
- Avoid excessive nested rounding.
- Avoid sharp-corner decorative cards unless the content context specifically calls for it.

## 8. Elevation & borders

The visual hierarchy relies more on whitespace and hairline borders than on heavy depth.

```css
--shadow-none: none;
--shadow-soft: 0 2px 10px rgba(0, 0, 0, 0.04);
--border-hairline: 1px solid rgba(0, 0, 0, 0.12);
--border-subtle: 1px solid rgba(0, 0, 0, 0.08);
```

Default preference:

1. No shadow.
2. Hairline border.
3. Soft surface change.
4. Very subtle shadow only when a floating element needs separation.

## 9. Components

### Navigation

The current public homepage uses top-level groupings such as **Research, Products, Business, Developers, Company**, with supporting entries and a prominent **Try ChatGPT** action. citehttps://openai.com/

**Pattern**
- Keep primary navigation compact.
- Use medium-weight labels.
- Avoid excessive visual chrome.
- Separate primary navigation from secondary/product utility links through placement and spacing, not large color blocks.

### Primary button

```css
.button-primary {
  min-height: 44px;
  padding-inline: 16px;
  border: 0;
  border-radius: 9999px;
  background: #000000;
  color: #ffffff;
  font: 500 14px/1.4 "OpenAI Sans", system-ui, sans-serif;
}
```

Use for the strongest action in a local context.

### Secondary / outline button

```css
.button-secondary {
  min-height: 44px;
  padding-inline: 16px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 9999px;
  background: #ffffff;
  color: #000000;
  font: 500 14px/1.4 "OpenAI Sans", system-ui, sans-serif;
}
```

Use when hierarchy calls for a lower-emphasis action beside a primary button.

### Text link

Text links should rely on position, wording, and hover/underline treatment rather than saturated brand colors.

Recommended baseline:

```css
.link {
  color: #000000;
  text-decoration: none;
}

.link:hover,
.link:focus-visible {
  text-decoration: underline;
  text-underline-offset: 3px;
}
```

### Card

```css
.card {
  padding: 24px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #ffffff;
}
```

Cards should feel like structured editorial surfaces rather than floating dashboards.

### Input

```css
.input {
  min-height: 48px;
  padding-inline: 16px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  background: #ffffff;
  color: #000000;
  font: 400 16px/1.4 "OpenAI Sans", system-ui, sans-serif;
}
```

Focus state:

```css
.input:focus-visible {
  outline: 2px solid #000000;
  outline-offset: 2px;
}
```

## 10. Imagery

OpenAI's web presence often uses colorful, abstract, photographic, or generated imagery against a restrained UI. The interface itself should remain quiet so the visual media can carry attention.

### Image rules

- Let imagery be expressive while keeping surrounding UI neutral.
- Prefer strong crops and clear focal points.
- Use consistent aspect-ratio families within repeated card grids.
- Avoid adding unnecessary borders around media when the composition already provides sufficient separation.

## 11. Content & voice patterns

The public OpenAI site uses concise navigation labels, direct calls to action, and short editorial summaries. The brand guidelines also publish dedicated language guidance for GPTs, API developers, models, non-partnerships, and attribution. citehttps://openai.com/brand/

### Writing rules

- Use direct, plain-language headings.
- Keep UI labels short and action-oriented.
- Avoid filler adjectives.
- Make model/product names precise and context-appropriate.
- Treat branding and attribution as part of the content system, not only the visual system.

## 12. Accessibility

Accessibility should be designed into the minimal aesthetic rather than layered on afterward.

### Requirements

- Preserve strong text/background contrast.
- Ensure keyboard focus is clearly visible.
- Use semantic HTML for navigation, headings, buttons, forms, and landmarks.
- Do not communicate state with color alone.
- Maintain at least 44px interactive target height for primary controls.
- Respect `prefers-reduced-motion` for non-essential animation.
- Keep body text comfortably readable at user zoom levels.

ChatGPT's current visual settings also expose appearance, contrast, and accent-color controls, demonstrating that contrast and theme are treated as independent concerns in the product UI. citehttps://help.openai.com/en/articles/11958281

## 13. Motion

Motion should be subtle and functional.

```css
--motion-fast: 120ms;
--motion-base: 180ms;
--motion-slow: 280ms;
--easing-standard: cubic-bezier(0.2, 0, 0, 1);
```

Use motion for:
- Hover/focus feedback.
- Expanding/collapsing navigation.
- Dialog/drawer entry and exit.
- Small layout transitions where they improve orientation.

Avoid:
- Constant looping UI motion.
- Large parallax effects that compete with content.
- Decorative animation that slows task completion.

## 14. CSS foundation

```css
:root {
  --color-bg: #ffffff;
  --color-ink: #000000;
  --color-soft: #f1f1f1;
  --color-line: rgba(0, 0, 0, 0.12);
  --color-line-subtle: rgba(0, 0, 0, 0.08);
  --color-muted: rgba(0, 0, 0, 0.60);
  --color-tertiary: rgba(0, 0, 0, 0.44);

  --font-sans: "OpenAI Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 9999px;

  --layout-max: 1440px;
  --layout-gutter: clamp(20px, 3vw, 48px);
}

html {
  background: var(--color-bg);
  color: var(--color-ink);
  font-family: var(--font-sans);
  text-rendering: optimizeLegibility;
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-ink);
}

.container {
  width: min(100% - 2 * var(--layout-gutter), var(--layout-max));
  margin-inline: auto;
}
```

## 15. Do / Don't

### Do

- Use OpenAI Sans where licensed/authorized.
- Build hierarchy with type size, weight, spacing, and alignment.
- Keep surfaces predominantly white and actions predominantly black.
- Use rounded controls and moderate container radii.
- Let imagery introduce visual richness.
- Maintain substantial whitespace around major content.
- Use official OpenAI assets without alteration when branding is required.

### Don't

- Treat this reconstructed token set as an official OpenAI internal specification.
- Modify or recolor official OpenAI logos.
- Overuse shadows or gradients in core UI chrome.
- Turn every secondary element into a filled button.
- Introduce saturated interface colors without a semantic reason.
- Compress section spacing simply to fit more content above the fold.
- Mix unrelated typefaces into the primary brand experience.

## 16. Implementation checklist

### Foundation

- [ ] OpenAI Sans loaded/authorized or an approved fallback selected.
- [ ] White canvas and black ink established.
- [ ] Neutral borders/surfaces defined.
- [ ] 4px spacing scale implemented.
- [ ] Rounded/pill shape scale implemented.

### Components

- [ ] Navigation
- [ ] Primary button
- [ ] Secondary button
- [ ] Text link
- [ ] Input
- [ ] Card
- [ ] Dialog / drawer
- [ ] Tabs / segmented controls
- [ ] Content/media card

### UX quality

- [ ] Keyboard navigation works.
- [ ] Focus states are visible.
- [ ] Contrast is tested.
- [ ] Responsive breakpoints are verified.
- [ ] Reduced-motion behavior is implemented.
- [ ] Long-form content remains readable and breathable.

## 17. Source notes

### Official

- **OpenAI Design Guidelines:** https://openai.com/brand/ — authoritative source for OpenAI marks, logo usage, typography, and language/brand guidance. citehttps://openai.com/brand/
- **OpenAI homepage:** https://openai.com/ — current public information architecture, navigation, content modules, and high-level page composition observed on 2026-09-21. citehttps://openai.com/
- **ChatGPT visual settings help:** https://help.openai.com/en/articles/11958281 — documents current appearance, contrast, and accent-color behavior in ChatGPT. citehttps://help.openai.com/en/articles/11958281

### Observational / third-party

- **DesignMD OpenAI benchmark:** https://designmd.cc/benchmarks/openai — measured public-site typography and color observations; used only as an implementation reference, not as official OpenAI documentation. citehttps://designmd.cc/benchmarks/openai
- **OpenDesign OpenAI DNA:** https://www.opendesign.cc/en/sites/openai — third-party characterization of spacing, monochrome palette, and visual language. citehttps://www.opendesign.cc/en/sites/openai
- **brandmd OpenAI example:** https://github.com/yuvrajangadsingh/brandmd/blob/main/examples/openai.md — third-party DOM-derived observations for component geometry and radii. citehttps://github.com/yuvrajangadsingh/brandmd/blob/main/examples/openai.md

## 18. Maintenance

Re-check this document whenever the public `openai.com` navigation, typography, major component geometry, or brand guidelines change. Treat exact pixel values as **observations**, while OpenAI's published brand rules take precedence for official logo/brand use.
