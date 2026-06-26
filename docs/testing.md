# Pathfinder Testing Guide

> **Status:** current-state reference. Test tiers, what each protects, and which command to
> run when. Rationalizing/renaming the tiers further is modernization-plan §6.

## TL;DR

```bash
npm run ci          # PR gate: static checks + Vitest unit suites + node validators (no browser)
npm run test:unit   # Vitest unit/integration suites only (~3s)
npm run ci:full     # release confidence: ci + Playwright browser e2e
npm run test:e2e    # Playwright functional browser tests (Chromium)
npm run test:visual # opt-in modal visual-regression baselines (developer harness)
```

`npm run ci` is the required pre-merge gate (fast, browser-free). `npm run ci:full` adds the
Playwright `test:e2e` browser suite for release/branch confidence. `test:visual` stays separate
and opt-in: its baselines are environment-sensitive (font/anti-aliasing), so it must be generated
and compared in the same environment.

## Tier map

Every package script, by tier (modernization-plan §6 Phase 1):

| Tier | Scripts | Trigger |
|---|---|---|
| **Static checks** (`check`) | `check:dead-scripts`, `check:lint`, `check:secret-hygiene`, `check:audit-artifacts`, `check:third-party`, `check:csp`, `check:raw-inner-html`, `check:modal-a11y`, `check:css-class-coverage`, `check:css-dead-components`, `check:engine-state-boundary`, `check:domain-purity`, `check:types` | every PR (`ci`) |
| **Unit/integration** (`test:unit`) | One **Vitest** pass over 33 suites / ~440 tests: domain, level-schema, ui-dom, app-module, persistence, theme-registry, data-assets, state, state-actions, path-navigator, path-state-invariants, overlay-controller, debug, audit-output, engine-controllers, engine-facade, runtime-actions, effect-runner, step-processor, and the 14 `solver-*` suites | every PR (`ci`) |
| **Node validators** (`test:node`) | `test:startup-smoke`, `test:hint-path-oracle`, `test:loader`, `test:data-asset-runtime-smoke`, `test:firestore-rules`, `test:bundled-levels` — non-unit harnesses kept as `node` scripts | every PR (`ci`) |
| **Browser e2e** | `test:e2e` | `ci:full` / release |
| **Visual regression** | `test:visual`, `test:visual:update` | on demand (modal/markup changes) |
| **Slow solver / audit / data tooling** | `solver:direct`, `audit:newhint:full`, `ablation:*`, `levels:*`, `test:editor-validation` | on demand (solver/level-data changes) |

## Tiers

### 1. Static checks — `npm run check`
Policy/structure gates that need no runtime. Composed into `check`:
- `check:dead-scripts` — every `node <path>` npm script target exists.
- `check:lint` — ESLint over `modules/` + `scripts/` (bans raw event-type strings, etc.).
- `check:secret-hygiene` — no committed secrets.
- `check:audit-artifacts` — audit telemetry artifact presence (the audit *shape* test moved to Vitest).
- `check:third-party` — only allowlisted CDN URLs in `index.html`.
- `check:raw-inner-html` — bans `innerHTML`/`innerText`/trusted-HTML helpers.
- `check:modal-a11y` — every modal container has `role="dialog"` + `aria-modal` + `aria-label`.
- `check:css-class-coverage` — every class used in HTML/JS is defined in CSS (used→defined).
- `check:css-dead-components` — every `.modal-*`/`.overlay-*` component class defined in CSS is
  applied somewhere (defined→used; the reverse gap).
- `check:engine-state-boundary` — engine/input/ui layers mutate ENGINE only via state-actions.
- `check:domain-purity` — `domain`/`runtime`/`solver` stay browser-free (no DOM/Firebase/adapter imports).
- `check:types` — `tsc --noEmit` over the `// @ts-check`'d allowlist in `tsconfig.json` (see `typing.md`).

### 2. Unit tests — `npm run test:unit` (Vitest)
**Vitest** runs the 33 unit/integration suites (~440 tests) in one parallel pass (~3 s). They use
Vitest's `test()` + `node:assert`, all in the `node` environment (DOM-free — they were before too),
discovered via `vitest.config.mjs`. Coverage: domain rules, level schema, UI DOM helpers,
app-module composition, state & state-actions, persistence, theme registry, data assets,
path-navigator, path-state-invariants (asserts incremental `pushStep` ≡ full `rebuildDerivedState`),
overlay-controller, debug, audit-output shape, engine sub-controllers, engine facade
(grouped===flat), runtime actions, effect-runner, step-processor, and the 14 `solver-*` suites.

```bash
npm run test:unit            # one Vitest run over all suites
npm run test:unit:watch      # watch mode (re-runs affected suites on save)
npx vitest run solver        # filter by filename substring (e.g. just the solver suites)
npx vitest run -t "portal"   # filter by test-name substring
```

> Migrated from ~33 hand-rolled `node scripts/*-unit-tests.mjs` files on a homegrown register/run
> harness (now deleted). The files still live in `scripts/` (renaming to `*.test.ts` is part of the
> TypeScript migration, codebase-quality-review #7). `node:assert` is kept rather than ported to
> Vitest `expect` — it works unchanged under Vitest, so the migration stayed mechanical.

### 2b. Node validators — `npm run test:node`
Non-unit harnesses kept as `node` scripts (special structure, not worth Vitest): `test:startup-smoke`
(boot harness), `test:hint-path-oracle` + `test:bundled-levels` (solver/level validation against the
real corpus), `test:loader` (browser-adapter IIFE characterization), `test:data-asset-runtime-smoke`,
`test:firestore-rules` (source-level characterization).

`npm run ci = check && test:unit && test:node`.

### 3. Browser E2E — `npm run test:e2e`
Playwright, `chromium` project (excludes the visual baselines). The webServer runs
`npm run build && vite preview`, so e2e exercises the **production Vite bundle** (what ships to
Pages), not the raw source tree. 30 tests across `smoke` / `gameplay` / `editor` / `a11y` /
`security` / `theme-coverage` / `csp` specs: boot, navigation, path drawing, editor palette + grid
transforms, modal focus-trapping, keyboard grid play, focus-visible, the production debug-surface
invariant (read-only `window.PATHFINDER` by default, mutable `window.APP` only under `?debug`),
per-theme colour coverage across all themes, and zero CSP violations under the enforcing policy.

**Speed & isolation.** Tests run **fully parallel** (`fullyParallel: true`; locally Playwright uses
~half the cores, CI is capped at 2) — they're read-only and each gets an isolated browser context.
A shared fixture (`tests/fixtures.mjs`) **aborts all third-party requests** (Tone/cdnjs,
Firebase/gstatic, Google Fonts, gapi, Firestore/Auth): the functional suite doesn't need them (the
app degrades to its local fallback), so `page.goto` resolves the `load` event immediately instead
of waiting on slow/unreachable CDNs, and third-party uptime can't make e2e flaky. This is the
dominant speedup — a bare boot test dropped from ~26 s to ~0.4 s. The visual-baseline spec
deliberately skips the fixture (it needs real fonts).

**Run limited sets** (each still builds the bundle first; see the reuse tip below):

```bash
npm run test:e2e            # full suite
npm run test:e2e:smoke      # boot + gameplay (fastest sanity check)
npm run test:e2e:a11y       # accessibility / focus / keyboard
npm run test:e2e:editor     # level editor
npm run test:e2e:security   # debug-surface + CSP specs
npm run test:e2e:theme      # per-theme colour coverage

# Ad-hoc: any file, or filter by title substring.
npx playwright test --project=chromium tests/gameplay.spec.mjs
npx playwright test --project=chromium -g "undo"

# If the bundled Chromium path differs:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run test:e2e
```

> **Fast iterative runs:** each invocation rebuilds + starts `vite preview`. To skip that between
> runs, keep one server up — `npm run build && npm run preview` in a separate terminal — and the
> test runner reuses it (`reuseExistingServer` is on outside CI), so subset runs start instantly.

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
- `npm run levels:generate-heatmaps` / `levels:heatmap-report` / `levels:ratings-report` —
  level data tooling.
- `node scripts/trap-search-audit.mjs` — trap-spot timing audit.

## When to run what
- **While editing:** the targeted suite (`npx vitest run solver-prep`) or `npm run test:unit:watch`.
- **Before commit:** `npm run ci`. Add `npm run test:e2e` if you touched UI/controllers.
- **After modal/markup changes:** `npm run test:visual` (and `:update` for intentional diffs).
- **After solver/level changes:** `npm run test:hint-path-oracle` + a targeted `solver:direct`.

## Writing a unit suite (Vitest)
Suites live in `scripts/*-unit-tests.mjs` and use Vitest + `node:assert`:

```js
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { makeRawLevel, createFakeScheduler } from './test-lib/fixtures.mjs';

test('does a thing', () => { assert.equal(1 + 1, 2); });
test('does an async thing', async () => { assert.ok(await something()); });
```

Vitest discovers the file via `vitest.config.mjs` (`include` glob) and runs it — no `run()` driver.
Reach for the shared **`scripts/test-lib/fixtures.mjs`** factories before hand-rolling:
`makeRawLevel(overrides)` (a minimal solver-normalizable 1-indexed wire level) and
`createFakeScheduler()` (an injectable timer scheduler for controllers taking a `scheduleTimer` dep).
Suite-specific fakes stay local. `node:assert` is used rather than Vitest `expect` (it works
unchanged); new suites may use either.

## Gaps / roadmap (modernization-plan §6)
- **Done:** the homegrown register/run harness was replaced by **Vitest** (`test:unit`) — 33 suites /
  ~440 tests in one ~3 s parallel pass, with watch/filtering. The old per-file `test:*` scripts and
  the `test:core`/`test:app`/`test:solver` chains collapsed into `test:unit` + `test:node`.
- Deliberate `test:node` hold-outs (`loader`, `firestore-rules`, the boot/data/oracle/bundled-level
  validators) stay as `node` scripts — bespoke structure or whole-corpus validation, not unit tests.
- Suites still live in `scripts/` as `.mjs`; renaming to `*.test.ts` is part of the TypeScript
  migration (codebase-quality-review #7). Porting `node:assert` → Vitest `expect` is optional polish.
- **Optional enhancements only:** coverage reporting (§6 Phase 4, "if practical") isn't wired up;
  Firestore rules are source-level characterization, not emulator-backed (§4 follow-up).
