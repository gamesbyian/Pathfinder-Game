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
| **Static checks** (`check`) | `check:dead-scripts`, `check:lint` (incl. the AST architecture rules), `check:secret-hygiene`, `check:audit-artifacts`, `check:third-party`, `check:csp`, `check:modal-a11y`, `check:css-class-coverage`, `check:css-dead-components`, `check:no-solver-level-numbers`, `check:types`, `check:types:tests` | every PR (`ci`) |
| **Unit/integration** (`test:unit`) | One **Vitest** pass over all suites (59 suites / ~700 tests). The unit suites are **colocated, type-checked `modules/**/*.test.ts`** — solver, domain/level-schema, the input-`*-core`s, engine controllers/facade/overlay/path-navigator, state/state-actions/runtime-actions/effect-runner/step-processor, theme-registry/persistence/debug/ui-dom/app. 7 **validator/harness** suites remain `scripts/*-unit-tests.mjs` by design: `data-assets` + `audit-output` (validate committed data / spawn a checker), `loader` + `solver-worker` (browser-adapter / Worker-host mocks), `solver-parallel` (worker-thread integration), `import-published-levels` (network-touching entrypoint guard), `eslint-rules` (lints the config). | every PR (`ci`) |
| **Node validators** (`test:node`) | `test:startup-smoke`, `test:hint-path-oracle`, `test:loader`, `test:data-asset-runtime-smoke`, `test:firestore-rules`, `test:bundled-levels` — non-unit harnesses kept as `node` scripts | every PR (`ci`) |
| **Browser e2e** | `test:e2e` | `ci:full` / release |
| **Visual regression** | `test:visual`, `test:visual:update` | on demand (modal/markup changes) |
| **Slow solver / audit / data tooling** | `solver:direct`, `audit:newhint:full`, `ablation:*`, `levels:*`, `test:editor-validation` | on demand (solver/level-data changes) |

## Tiers

### 1. Static checks — `npm run check`
Policy/structure gates that need no runtime. Composed into `check`:
- `check:dead-scripts` — every `node <path>` npm script target exists.
- `check:lint` — ESLint over `modules/` + `scripts/`. Carries the **AST-based architecture rules**
  (codebase-quality-followup-plan §3) that replaced three former regex check scripts, each with a
  tripwire test in `scripts/eslint-rules-unit-tests.mjs`:
  - raw event-type strings must use `ActionType`/`EffectType` constants;
  - **raw HTML injection** (`innerHTML`/`outerHTML`/`innerText`/trusted-HTML helpers) is banned
    (was `check:raw-inner-html`);
  - the pure logic core (`domain`/`runtime`/`solver`) stays **browser-free + adapter-import-free**
    via scoped `no-restricted-globals`/`no-restricted-imports` (was `check:domain-purity`);
  - the `engine`/`input`/`ui` consumer layers mutate ENGINE state only through state-actions, via a
    local AST rule `local/engine-state-boundary` that also catches computed-access/`++` evasions the
    old regex missed (was `check:engine-state-boundary`).
- `check:secret-hygiene` — no committed secrets.
- `check:audit-artifacts` — audit telemetry artifact presence (the audit *shape* test moved to Vitest).
- `check:third-party` — only allowlisted CDN URLs in `index.html`.
- `check:modal-a11y` — every modal container has `role="dialog"` + `aria-modal` + `aria-label`.
- `check:css-class-coverage` — every class used in HTML/JS is defined in CSS (used→defined).
- `check:css-dead-components` — every `.modal-*`/`.overlay-*` component class defined in CSS is
  applied somewhere (defined→used; the reverse gap).
- `check:no-solver-level-numbers` — the solver selects strategy by level features, never identity
  (no `L###`/`level N` in `modules/solver/`).
- `check:types` — `tsc --noEmit` over `modules/**/*.ts` (source only) under `strict`, DOM lib (see `typing.md`).
- `check:types:tests` — `tsc --noEmit -p tsconfig.test.json`: strict-checks the colocated `*.test.ts`
  with node types added (for `node:assert`), so a renamed field or a stale API call in a test fails
  the build (§4). Source `*.ts` are excluded from the main check and re-checked here for import
  resolution; test fixtures are cast to their real types (or `any` for heavy adapter stubs).

> The former regex checks `check:raw-inner-html`, `check:engine-state-boundary`, and
> `check:domain-purity` are gone — their invariants are now AST-based ESLint rules under
> `check:lint` (see above), which are precise (scope/computed-access aware) and tripwire-tested.

### 2. Unit tests — `npm run test:unit` (Vitest)
**Vitest** runs the 59 unit/integration suites (~700 tests) in one parallel pass (~5 s). They use
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

> Migrated from hand-rolled `node scripts/*-unit-tests.mjs` files on a homegrown register/run
> harness (now deleted), then colocated as `modules/**/*.test.ts` (§4); a few validator/harness
> suites remain in `scripts/` by design. `node:assert` is kept rather than ported to Vitest
> `expect` — it works unchanged under Vitest, so the migration stayed mechanical.

### 2a. Coverage — `npm run test:coverage`
Coverage is measured by **v8** (`@vitest/coverage-v8`) and **enforced in CI** (`ci` runs
`test:coverage`, not bare `test:unit`). It is scoped to the **pure logic surface** —
`domain/`, `runtime/`, `solver/`, `state/` + `state-slices.ts`, and the extracted input
**cores** (`modules/input/*-core.ts`). The DOM/adapter shells (`render/`, `ui/`, the input
*controllers*, and the `engine/`/`editor/`/`persistence/` wiring) are **excluded** — they are
verified by the Playwright e2e suites, not unit coverage (see ADR/`docs/typing.md`). Config lives
in `vitest.config.mjs` (`test.coverage`).

```bash
npm run test:coverage        # run all unit suites + emit coverage, enforce thresholds
```

**Recorded baseline (2026-07-03, logic surface — after the hardening-plan §1 coverage pass;
previous 2026-06-26 baseline was statements 58.9 / branches 48.9):**

| Metric | Logic-surface aggregate | Soft global floor | Input cores (`*-core.ts`) | Per-file floor |
|---|---|---|---|---|
| Statements | 86.2% | 82% | 100% | 95% |
| Branches | 75.3% | 72% | ~98% | 85% |
| Functions | 94.8% | 90% | 100% | 95% |
| Lines | 91.9% | 88% | 100% | 95% |

The global floors sit below the aggregate so normal solver-suite jitter doesn't trip them; the
extracted input cores carry a **strict per-file floor** (they are fully covered and must stay so).
Dropping any core's coverage below its floor — e.g. deleting its suite — **fails CI**. The blind
spots the baseline makes visible (the DOM/adapter shells) are intentional and tracked above.

### 2b. Node validators — `npm run test:node`
Non-unit harnesses kept as standalone scripts (special structure, not worth Vitest):
`test:startup-smoke` (boot harness), `test:hint-path-oracle` + `test:bundled-levels` (solver/level
validation against the real corpus), `test:loader` (browser-adapter IIFE characterization),
`test:data-asset-runtime-smoke`, `test:firestore-rules` (source-level characterization). The ones
that import the module graph run under **tsx** (so they load converted `.ts` modules — ADR 0011);
the graph-free/text-reading ones stay on `node`.

`npm run ci = check && test:coverage && test:node` (`test:coverage` is a superset of
`test:unit` — same suites, plus coverage enforcement).

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
- `npm run solver:trap-audit` — trap-spot timing audit.
- `npm run hints:diversify` / `hints:calibrate-weights` — hint-discovery/scoring-calibration
  analysis tools (see `docs/hint-curation.md`).

## When to run what
- **While editing:** the targeted suite (`npx vitest run solver-prep`) or `npm run test:unit:watch`.
- **Before commit:** `npm run ci`. Add `npm run test:e2e` if you touched UI/controllers.
- **After modal/markup changes:** `npm run test:visual` (and `:update` for intentional diffs).
- **After solver/level changes:** `npm run test:hint-path-oracle` + a targeted `solver:direct`.

### Solver stress tiers — which check is *sufficient*

The stress corpora (`data/stress/README.md`) and their tooling (`scripts/stress/*.mjs`) sit
outside `ci` — they're slow (the full 1700-level Corpus 2 or even the 450-level Corpus 1 can take
minutes to hours depending on the environment; see that doc's timing caveats) and running the
biggest tier after every small edit is exactly the workflow
[`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) exists to avoid. The tiers, cheapest
first:

| Tier | Command | Size / cost | Catches |
|---|---|---|---|
| Smoke | `npm run stress:smoke` | 14 levels, ~30s | Obvious breakage across every mechanic family + historical bug regressions |
| Regression (pinned) | `npm run stress:regression` | 24 levels, minutes (2 are genuinely slow known-hard cases) | Known-hard levels un-fixing themselves; new improvements to record |
| Published corpus | `npm run solver:bench -- --check` | 156 levels, ~40s | Any regression vs. the committed timing/solve baseline — **mandatory if you touched the shared search core** (see below) |
| Corpus 1 (frontier) | `npm run stress:benchmark` against `data/stress/stress-levels.json` | 450 levels, official run is sequential/slow | Regressions against `logs/stress-corpus1-450-baseline.json` (compare with `stress:diff-baseline`) |
| Corpus 2 (stress) | `npm run stress:benchmark` against `data/stress/stress-levels-random.json` | 1700 levels, hours | New solves on the known-unsolved baseline (`logs/stress-corpus2-1700-baseline.json`) — a promotion gate, not a routine check |
| Corpus 2 (rotating sample) | `npm run stress:benchmark -- --sample=100` | ~100 levels, minutes | A repeatable, deterministic-per-commit slice of Corpus 2 — cheaper than the full 1700 sweep, still reproducible (same commit/`--seed` → same sample; see `solver-dev-tooling-plan.md`'s "Cheap-tail follow-ups") |

A failure surfaced by any tier above should be re-verified with `npm run stress:classify-stability`
before treating it as certain: a level classified `budget-edge` (solved but ≥90% of budget, or a
raw `timeout`) deserves an isolated re-check before you trust either a pass or a fail at face
value — `stress:regression` and `stress:diff-baseline -- --retry-failures=<corpus>` already do this
retry automatically (see the plan doc's "Isolated retry on failure" entry); a manual
`stress:solve-one` re-run is the fallback for anything that doesn't route through those two.

**Minimum sufficient tier by change type:**

| Change touches... | Minimum tier |
|---|---|
| One pruning/scoring function scoped to a single mechanic (e.g. `mustCrossLowerBound`) | Smoke + the mechanic's own targeted subset (`--filter-mechanic=`, see `data/stress/README.md`) |
| `attempts.ts` policy ordering/thresholds | Smoke + `stress:regression` + `solver:bench --check` |
| `orchestration.ts`, `search.ts`, `repair-search.ts`, `scoring.ts`, `prune-gauntlet.ts` (shared across every level, regardless of mechanic) | **Full `solver:bench --check`, no shortcuts** — mechanic filtering does not safely narrow this, since every level runs through this code |
| Anything touching `timeBudgetMs` allocation or budget constants (`REPAIR_EXTRA_BUDGET_FRACTION` etc.) | Full `solver:bench --check`, and re-read the repair-budget-stacking math in `orchestration.ts` before assuming a change is safe |

A change that only touched one mechanic's own file is never assumed safe from the smoke suite
alone without also running that mechanic's targeted subset; a change to any file in the "shared
across every level" row is never signed off on anything smaller than the full published-corpus
check, regardless of how small the diff looks — see
[`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md)'s Component B for the reasoning
(this session's own telemetry-only commits to `orchestration.ts`/`search.ts` still correctly ran
the full check both times, precisely because "purely additive, must be safe" is not a substitute
for verifying shared code).

## Writing a unit suite (Vitest)
Unit suites are **colocated next to the code as `modules/**/*.test.ts`** (a few validator/harness
suites remain `scripts/*-unit-tests.mjs` — see the tier map). They use Vitest + `node:assert`:

```js
import assert from 'node:assert/strict';
import { test } from 'vitest';
// Shared fixtures live at scripts/test-lib/fixtures.mjs — import via the correct relative path.
import { makeRawLevel, createFakeScheduler } from '../../scripts/test-lib/fixtures.mjs';

test('does a thing', () => { assert.equal(1 + 1, 2); });
test('does an async thing', async () => { assert.ok(await something()); });
```

Vitest discovers the file via `vitest.config.mjs` (`include` glob) and runs it — no `run()` driver.
Reach for the shared **`scripts/test-lib/fixtures.mjs`** factories before hand-rolling:
`makeRawLevel(overrides)` (a minimal solver-normalizable 1-indexed wire level) and
`createFakeScheduler()` (an injectable timer scheduler for controllers taking a `scheduleTimer` dep).
Suite-specific fakes stay local. `node:assert` is used rather than Vitest `expect` (it works
unchanged); new suites may use either.

## Gaps / roadmap
- The homegrown register/run harness was replaced by **Vitest** (`test:unit`) — 59 suites /
  ~700 tests in one parallel pass, with watch/filtering, colocated as type-checked
  `modules/**/*.test.ts`; the per-file `test:*` scripts collapsed into `test:unit` + `test:node`.
- Deliberate `test:node` hold-outs (`loader`, `firestore-rules`, the boot/data/oracle/bundled-level
  validators) stay as `node` scripts — bespoke structure or whole-corpus validation, not unit tests.
- **Decided — not doing:** porting `node:assert` → Vitest `expect`. Both work identically under
  Vitest; it's a pure style migration with no functional benefit, so it is not planned.
- **Deferred (needs infra):** emulator-backed Firestore rule tests — see the security note below;
  revisit only alongside an actual Firestore-rules change.
- Coverage reporting is wired up and enforced — see §2a. v8 coverage over the pure logic
  surface, with a soft global floor + strict per-file floors on the extracted input cores.
  (Firestore rules stay source-level characterization, not emulator-backed — deferred by decision,
  see above.)
