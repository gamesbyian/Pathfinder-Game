# Pathfinder Testing Guide

> **Status:** current-state reference. Test tiers, what each protects, and which command to
> run when. Rationalizing/renaming the tiers further is modernization-plan §6.

## TL;DR

```bash
npm run ci          # full pre-merge confidence: static checks + all unit/integration tests
npm run test:e2e    # Playwright functional browser tests (Chromium)
npm run test:visual # opt-in modal visual-regression baselines (developer harness)
```

`npm run ci` is the required gate. `test:e2e` and `test:visual` are **not** part of `ci`
(they need a browser; visual baselines are environment-sensitive).

## Tiers

### 1. Static checks — `npm run check`
Policy/structure gates that need no runtime. Composed into `check`:
- `check:dead-scripts` — every `node <path>` npm script target exists.
- `check:lint` — ESLint over `modules/` + `scripts/` (bans raw event-type strings, etc.).
- `check:secret-hygiene` — no committed secrets.
- `check:audit-artifacts` / `test:audit-output` — audit telemetry presence/shape.
- `check:third-party` — only allowlisted CDN URLs in `index.html`.
- `check:raw-inner-html` — bans `innerHTML`/`innerText`/trusted-HTML helpers.
- `check:modal-a11y` — every modal container has `role="dialog"` + `aria-modal` + `aria-label`.
- `check:css-class-coverage` — every class used in HTML/JS is defined in CSS (used→defined).
- `check:css-dead-components` — every `.modal-*`/`.overlay-*` component class defined in CSS is
  applied somewhere (defined→used; the reverse gap).
- `check:engine-state-boundary` — engine/input/ui layers mutate ENGINE only via state-actions.

### 2. Fast unit tests — `npm run test:core`, `test:app`, `test:solver`
Node-run, DOM-free (or DOM-stubbed). Grouped:
- **`test:core`** — domain rules, level schema, UI DOM helpers, app-module composition, state &
  state-actions, persistence, theme registry, loader, data assets, path-navigator,
  path-state-invariants (asserts incremental `pushStep` ≡ full `rebuildDerivedState` so derived
  nav fields can't silently diverge from `nav.path`), overlay-controller, debug, firestore-rules
  (source-level characterization), startup-smoke, hint-path-oracle.
- **`test:app`** — engine sub-controllers, engine facade (grouped===flat), runtime actions,
  effect-runner, step-processor.
- **`test:solver`** — all 13 `solver-*` unit suites + bundled-levels validation.

`npm run ci = check && test:core && test:app && test:solver`.

### 3. Browser E2E — `npm run test:e2e`
Playwright, `chromium` project (excludes the visual baselines). 24 tests across
`smoke` / `gameplay` / `editor` / `a11y` / `theme-coverage` specs: boot, navigation, path
drawing, editor palette + grid transforms, modal focus-trapping, keyboard grid play,
focus-visible, and per-theme colour coverage across all 31 themes.

```bash
# If the bundled Chromium path differs:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run test:e2e
```

### 4. Visual regression — `npm run test:visual`
Playwright `visual` project. Screenshots 12 modal/overlay layouts against committed baselines
(`tests/visual.spec.mjs-snapshots/`). Purpose: make modal-markup refactors safe — a layout
shift the colour-only `theme-coverage` test can't see fails here.

```bash
npm run test:visual         # compare against baselines
npm run test:visual:update  # regenerate baselines (after intentional layout changes)
```

**Not in `ci`/`test:e2e`:** baselines are environment-sensitive (font/anti-aliasing), so they
must be generated and compared in the same environment.

### 5. Slow solver / audit / data tooling (run on demand)
Not part of `ci`. Used when changing solver internals or level data:
- `npm run solver:direct -- --levels=… --budget-ms=…` — targeted solve runs.
- `npm run audit:newhint:full` — full causality-metric audit (rolling history).
- `npm run ablation:*` / `ablation:analyze` — the ablation laboratory.
- `npm run levels:generate-heatmaps` / `levels:heatmap-report` / `levels:ratings-report` /
  `levels:boredom-report` — level data tooling.
- `node scripts/trap-search-audit.mjs` — trap-spot timing audit.

## When to run what
- **While editing:** the targeted unit suite for the file (e.g. `npm run test:solver-prep`).
- **Before commit:** `npm run ci`. Add `npm run test:e2e` if you touched UI/controllers.
- **After modal/markup changes:** `npm run test:visual` (and `:update` for intentional diffs).
- **After solver/level changes:** `npm run test:hint-path-oracle` + a targeted `solver:direct`.

## Gaps / roadmap (modernization-plan §6)
- Tiers aren't yet named `check:static` / `test:unit` / `test:integration` / `ci:pr` / `ci:full`.
- No shared fixture/factory library yet (setup is repeated across suites).
- No coverage reporting. Firestore rules are source-level characterization, not emulator-backed.
