# ADR 0001: Static hosting, no build step

**Status:** **Superseded by [ADR 0010](0010-build-step-vite.md)** (2026-06-26). A Vite build step
was adopted (the site still deploys to GitHub Pages, now from a built `dist/`). The "no build step"
constraint below no longer holds; the rest is retained for historical context.

## Context
Pathfinder is served as a static site via GitHub Pages. It originally used Tailwind CSS (a
build step). Carrying a toolchain for a small, static, single-page game added friction
(install, build, drift between source and generated CSS) for little benefit.

## Decision
Ship with **no build step**. All application code is native ES modules loaded directly by the
browser. All CSS is hand-maintained in `styles/` (`reset.css` → `utilities.css` →
`components.css`, aggregated by `app.css` via `@import`). Tailwind and its toolchain were
removed; utility classes that were in use are reproduced as hand-written plain-CSS rules.

## Consequences
- No compile/bundle step; `index.html` loads modules and CSS as-is.
- CSS coverage is maintained by checks instead of a generator: `check:css-class-coverage`
  (used→defined) and `check:css-dead-components` (defined→used, for component classes).
- Adopting TypeScript or any compiler must be a deliberate, separately-approved reversal
  (modernization-plan §5 favors check-only `// @ts-check`/JSDoc first to avoid a build step).
- External deps (Firebase, Tone.js, fonts) load from CDNs under an allowlist
  (`check:third-party`).
