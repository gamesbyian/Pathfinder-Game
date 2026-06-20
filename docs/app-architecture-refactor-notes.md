# App Architecture Refactor — Working Notes (2026-06-20)

These notes accompany the architecture review of the app composition root, state model,
and `index.html`. **All eight review items are now implemented in code.** The larger,
riskier ones were landed additively — flat/compat surfaces preserved — rather than as
one-shot god-object rewrites. The sections below describe each item; where an item is an
ongoing discipline (#1 remaining cycles, #5 ownership, #8 a11y follow-ups) the section
records what shipped and what is deliberately left as the next incremental step.

> Status: all of #1–#8 are implemented in code. #1 broke the `data↔themes` cycle and
> introduced staged construction (two mutual runtime cycles remain, now explicit). #5 added
> ownership/derived typedefs to the slice factories. #8 extracted the SVG sprite sheet and
> added ARIA labels (focus-trapping / button-vs-div semantics remain as documented
> follow-ups). #2/#3/#4/#6/#7 as described above.

## What was implemented this session (code)

1. **`window.APP` narrowed (review item #2).** `bootstrapApp()` now exposes a read-only
   `window.PATHFINDER` diagnostics object by default (snapshot-only getters:
   `getStateSnapshot`, `getCurrentLevel`, `getCurrentLevelIndex`, `getMode` — all return
   `deepClone`d copies, never live references). The full mutable `createAppFacade(app)`
   surface is now opt-in via the `?debug` query param. The documented production-debugging
   workflow still works (load the app with `?debug`); the always-on mutable
   `window.APP.State.ENGINE` foothold is gone by default. `tests/theme-coverage.spec.mjs`
   navigates with `?debug=1` to keep using the full facade.
2. **Solver testing API split + aliases removed (review item #6).** `modules/SolverV2.js`
   re-exports the canonical `SOLVER_TESTING_API` as a named export. The five underscore props
   on the `createSolverV2()` instance (`_normalizeRawLevel`, `_buildDistMap`,
   `_detectArchetype`, `_getAttemptConfigs`, `_prepLevel`) were first kept as deprecated
   shims, then **removed** once every consumer was migrated: `modules/solver/diversification.js`
   imports `prepLevel` from `./prep.js`; the four CLI scripts and seven `solver-*-unit-tests`
   use `SOLVER_TESTING_API` (or the directly-imported impl); `solver-testing-api-unit-tests.mjs`
   guards that the underscore props are gone.
3. **CI script grouped (review item #7).** The single 45-step `ci` chain is split into
   `check`, `test:core`, `test:app`, `test:solver`, with `ci` composing the four. Coverage
   is byte-for-byte identical — every original step appears exactly once across the groups.
4. **state-actions barrel split (review item #4).** `modules/state-actions.js` is now a
   re-export barrel; the ~104 helpers moved verbatim into `modules/state/actions/*.js`, one
   module per `createEngineState()` slice (`shared.js` for `resolveEngineState`, then
   `core`/`navigation`/`hazard`/`hint`/`solver`/`review`/`editor`/`ui`/`runtime`/`rating`).
   The barrel `export *`-re-exports everything, so every existing `state-actions.js` import
   is unchanged. `check:engine-state-boundary` and `startup-smoke-test.mjs` updated to match.
5. **grouped engine facade (review item #3).** `createEngine()` returns the flat methods
   plus grouped namespaces (`game`/`navigation`/`overlays`/`hints`/`solver`/`review`/
   `ratings`), each pointing at the same flat method instance. Backward-compatible; callers
   migrate group-by-group. Locked by `scripts/engine-facade-unit-tests.mjs`.

## Item #1 — Staged app construction (implemented; one cycle removed)

**Shipped:** `createApp` is now organized into labeled **Stage 1 (pure services) → Stage 2
(browser subsystems) → Stage 3 (controllers)**, and the **`data ↔ themes` cycle is gone**.
`data` no longer receives a `getThemes` hook wired to the theme registry — that hook was
inert anyway (at `data.ingest()` time `data.isLoaded()` is false, so the registry returned
its empty fallback). Themes now flow strictly one way: `loader → data.ingest({ themes }) →
theme-registry reads data.getThemes()`. Removing the hook eliminated the `let _themes`
forward declaration entirely, so `data` is a true Stage-1 leaf service. Two genuine mutual
*runtime* cycles remain and are now each a single, commented lazy getter (`ui ↔ renderer`,
`themes ↔ persistence`); the `editor ↔ engine` construction cycle stays as one explicit
late `editor.init({ engine })`. The historical inventory below is kept for reference.

### Current cycle / late-injection inventory (`modules/app.js`)

The factory already centralizes wiring (a real improvement over inline `index.html`
construction), but it compensates for modules that reference each other too directly via
lazy getters and one explicit late `init`:

| Coupling | Mechanism today | Direction |
|---|---|---|
| `data` ↔ `themes` | `data` reads `getThemes()`; `themes` is constructed with `data` | mutual lazy |
| `ui` → `renderer` | `ui` constructed with `getRenderer: () => _renderer` | lazy getter |
| `themes` → `persistence` | `themes` constructed with `getPersistence: () => _persistence` | lazy getter |
| `themes` → `ui` | `getUI: () => ui` | lazy getter (ui exists, kept lazy for symmetry) |
| `levelUtils` → `renderer` | `getRenderer: () => _renderer` | lazy getter |
| `editor` ↔ `engine` | `editor` built first, then `_editor.init({ engine: _engine })` | explicit late injection |
| `persistence` → `themes` | `getTheme: (id) => _themes.getTheme(id)` | lazy getter |

The genuine cycles are **data↔themes** and **editor↔engine**. The remaining lazy getters
are *ordering* artifacts (the referent exists by construction time) rather than true
cycles, and could become plain references with a construction reorder — but they're worth
keeping as getters until the two real cycles are broken, so the reorder is done once.

### Target: four-stage construction

- **Stage 1 — Pure services** (no DOM/Firebase/canvas): level parsing/validation, theme
  registry data, solver facade, rule/runtime services. None of these should need a getter.
- **Stage 2 — Browser adapters**: DOM adapter, canvas adapter, audio adapter, persistence
  adapter, data-asset loader.
- **Stage 3 — Controllers**: constructed with *explicit narrow interfaces* (a controller
  receives only the methods it calls, not the whole subsystem).
- **Stage 4 — Facade**: build the compatibility `APP` facade last.

### Concrete first steps (each independently shippable)

1. **Break `data ↔ themes`.** `data` only needs theme *genre metadata*. Extract that
   metadata into a Stage-1 pure value (or pass the small lookup table directly) so `data`
   no longer reaches back into the live `themes` registry. Then `themes` depends on `data`
   one-way.
2. **Break `editor ↔ engine`.** The editor needs a *narrow* slice of engine behavior (the
   methods called inside `_editor.init`). Define that slice as an interface object built
   after engine, and pass it in — or invert so engine receives an editor callback. Either
   removes the `init`-after-construct dance.
3. Once both cycles are gone, convert the remaining `get*()` getters in `createApp` to
   direct references in dependency order, and group construction into the four stages
   above. This is mechanical and low-risk after steps 1–2.

The point is not zero cycles in one PR; it's that the two real cycles are now named and
have concrete removal recipes.

## Item #5 — State slice ownership (implemented as in-code typedefs)

**Shipped:** `modules/state-slices.js` now carries the ownership convention as JSDoc — a
file-level note plus a `@typedef`/owner comment per slice factory, and inline
`// authoritative` / `// derived` tags on each field (most importantly the nav slice's
`visitedCounts`/`cellUsage`/`intersections`/`flipCount`/`crossedFlippingFilters`, all
recomputed by `rebuildDerivedState`). The ownership table below is the prose version of
those annotations.

`state-slices.js`'s `createEngineState()` returns one mutable object. That's manageable
but easy to couple through. Rather than a state-management rewrite, the discipline is: every
slice gets an ownership contract. Below is the initial contract for the top-level slices.
**All writes must route through `modules/state-actions.js`** (enforced by
`check:engine-state-boundary`); "writers" below means the action helpers, not direct
mutation.

| Slice (field on `ENGINE`) | Owner | Authoritative vs derived | Persisted? |
|---|---|---|---|
| `mode`, `logicState`, `overlayState` | engine state machine / overlay-controller | authoritative | no |
| `isDevMode`, `cheatActive`, `cheatTimer` | options-controller / level-flow | authoritative | no |
| `levelIdx`, `variant`, `level` | level-flow | authoritative (`level` derived from `data` + `variant`) | `levelIdx` via progress |
| `nav` | path-navigator | `path` authoritative; `visitedCounts`, `cellUsage`, `intersections`, `flipCount` **derived/recomputed** from `path` | no |
| `hazards` | hazard-controller | authoritative (timers) | no |
| `solver` | solver-manager | authoritative (run lifecycle) | no |
| `ripples` | render-loop / renderer | derived (visual) | no |
| `isDirty` | render-loop (`markDirty`) | derived signal | no |
| `muted` | options-controller | authoritative | yes (progress store) |
| `options` (`geese`/`falseGoals`/`deadGates`) | options-controller / challenge-options | authoritative | yes |
| `resetStreak` | level-flow | derived (counter) | no |
| `hinter` | solver-manager / submission-controller | authoritative (current hint set) | no |
| `viewport` | renderer | derived (camera/zoom) | no |
| `progressSet`, `foundHintsSinceLoad` | progress-store / submission-controller | authoritative | `progressSet` yes |
| `editor` | editor | authoritative (working copy) | draft only |
| `review` | review-mode / review-controller | authoritative | no (Firestore-backed) |
| `ui` | ui integration | authoritative (session UI focus) | no |
| `runtime` | step-processor | authoritative (pointer/runtime) | no |
| `gamepad` | navigation-controller | authoritative (input) | no |
| `flags` | misc controllers | authoritative | no |
| `levelRating` | level-rating-manager | authoritative; keyed by fingerprint | Firestore-backed |

**Marked-derived fields are the high-value discipline target**: `nav.visitedCounts`,
`nav.cellUsage`, `nav.intersections`, `nav.flipCount`, `ripples`, `isDirty`, `viewport`,
and heatmaps are *recomputed*, not sources of truth — no controller should treat them as
inputs to game logic. Tests can guard accidental mutation by freezing input fixtures
(`Object.freeze`) for slices/levels where practical (`normalizeLevel()` already returns
shallow-frozen levels — extend the same instinct to runtime slice fixtures).

Next step toward typed contracts: the level schema already has JSDoc discipline
(`level-schema.js`); extend `@typedef` blocks to the runtime slice factories in
`state-slices.js` so editors surface the ownership/derived distinctions inline.

## Item #8 — `index.html` extraction & accessibility (SVG + ARIA shipped)

**Shipped:** the inline SVG `<defs>` sprite sheet was extracted from `index.html` into
`modules/ui/svg-defs.js` (`SVG_DEFS_MARKUP` + `injectSvgDefs()`), injected at the top of
`bootstrapApp()` before first paint via `DOMParser` node construction (no `innerHTML`, so it
passes `check:raw-inner-html`). `index.html` keeps only a comment placeholder; the static
`<use href="#def-*">` references resolve against the injected symbols (verified by a new
`smoke.spec.mjs` assertion that the sheet injects, symbols exist, and a nav button paints
non-zero). Dialog semantics — `role="dialog"` + `aria-modal="true"` + a descriptive
`aria-label` — were added to all 13 modal/overlay containers, and `aria-label`s to the
previously-unlabeled icon-only controls (mute, the five modal close `×` buttons, the solver
cancel button, and the grid size/rotate/mirror buttons). **Still open as follow-ups** (left
out deliberately — they change behavior and need manual a11y testing against the existing
custom gamepad-focus system): modal focus-trapping, button-vs-div semantics for clickable
`div`s, and a full keyboard-navigation pass. The original plan follows.

`index.html` is ~544 lines and still carries: external dependency setup (`<head>`), a large
inline SVG `<defs>` sprite sheet (lines 25–54, ~28 `<g id="def-*">` symbols), all core
markup, utility-class-heavy UI sections, and the bootstrap `<script type="module">`.

### Extraction plan (stable chunks first)

1. **SVG sprite sheet.** Move the `<svg style="display:none"><defs>…</defs></svg>` block to
   either `assets/icons.svg` (fetched + injected at boot) or `modules/ui/svg-defs.js` (a
   template-string injected into the DOM during boot). These symbols are referenced via
   `<use href="#def-*">`; the contract is just "these symbol IDs exist in the document by
   first paint," so injection during the existing boot sequence preserves behavior. This
   alone removes ~30 dense lines and is the lowest-risk extraction.
2. **Repeated modal/panel markup.** With no framework, introduce small template functions
   (`renderModalShell({ id, title, … })`) for the recurring modal structure — the semantic
   `.modal-overlay` / `.modal-panel` / `.modal-header` classes from the CSS refactor already
   exist, so the template functions only need to emit that structure once.
3. Leave `index.html` as **shell + landmarks** (the actual layout containers the renderer
   and controllers query by ID).

### Accessibility pass (do after markup is less dense)

- **Focus trapping** for modals/overlays (`reviewAuthOverlay`, `guideModal`, `themeModal`,
  `submitModal`, etc.) — currently none trap focus.
- **Button vs div semantics** — audit icon-only controls and interactive `div`s; promote to
  `<button>` where they're clickable.
- **Keyboard navigation expectations** — document and verify tab order through play
  controls, editor palette, and modals.
- **ARIA labels for icon-only controls** (mute, grid size ±, rotate/mirror, modal close
  `×`, nav prev/next) — they render glyphs/SVGs with no accessible name today.

This item is intentionally left as a plan: it touches the most markup and benefits from the
SVG/template extraction landing first so the accessibility changes apply to less-noisy HTML.
