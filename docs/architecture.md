# Pathfinder Architecture

> **Status:** current-state reference. Describes how the app is wired *today*. Dated
> refactor history lives in `docs/refactor-notes/`; lasting decisions are captured as ADRs
> in `docs/adr/`. The staged modernization roadmap is `docs/modernization-plan.md`.

Pathfinder is a browser game built with **Vite** and deployed as a static site to GitHub Pages
(see ADR 0010, which supersedes the original no-build-step ADR 0001). The source is native ES
modules + hand-maintained semantic CSS in `styles/`; the production build bundles/minifies them
into `dist/`. Firebase (Firestore + Auth) and Tone.js load from CDNs.

## Layered model

The codebase is organized into four conceptual layers. New code should be placed by asking
"which layer is this?":

| Layer | Lives in | May depend on | Must NOT depend on |
|---|---|---|---|
| **Domain / services** | `modules/domain/`, `modules/solver/`, `modules/runtime/`, `modules/theme/*-normalizer*`, `modules/editor/editor-*` (pure helpers) | other domain modules | DOM, canvas, Firebase, Tone, `window`/`document`, timers, network |
| **Browser adapters** | `modules/render/`, `modules/persistence/`, `modules/ui/` (DOM helpers), `core.js` SOUND_BUS, loader's browser shim | domain | application controllers (generally) |
| **Controllers / application** | `modules/engine*`, `modules/engine/`, `modules/input/`, `modules/editor.js`, `modules/boot.js` | domain + adapters via injected ports | raw browser globals (use adapters) |
| **Facade / debug** | `modules/app.js` (`createReadOnlyDiagnostics`, `createAppFacade`) | everything (built last) | — |

> The layer boundary is enforced by static checks (modernization-plan §1):
> `check:domain-purity` keeps `modules/domain/`, `modules/runtime/`, and `modules/solver/`
> free of browser-host globals and adapter/controller imports (the two solver Worker files are
> the explicit exempt boundary); `check:engine-state-boundary` confines ENGINE mutation to the
> state-action helpers; `check:raw-inner-html` bans unsafe DOM writes. All run in the default
> `check` group.

## Composition root (`modules/app.js`)

`createApp()` constructs everything in labeled stages, **acyclically** — `const`s only, no
mutable forward declarations, no post-construction init (ADR 0008):

- **Stage 1 — pure services:** `core`, `state`, `solverV2`, `data`, `debug`. `data` is a
  leaf service (the historical `data ↔ themes` cycle was removed; themes flow one way:
  `loader → data.ingest({ themes }) → theme-registry reads data.getThemes()`).
- **Stage 2 — browser subsystems:** `ui`, `renderer`, `levelUtils`, `persistence`, `themes`.
  Both former cycles are gone: `ui → renderer` is one-way (`layout-ui` reads `#gameCanvas`
  directly), and `persistence` is built **before** `themes` (it validates theme ids via a
  `data`-sourced `themeExists` predicate, not the themes registry), so `themes` takes
  `persistence` directly.
- **Stage 3 — controllers:** `editor`, `engine`, `input`, `loader`, `boot`. `editor ↔ engine`
  is a genuine mutual *runtime* collaboration with **no** construction cycle: the editor takes a
  construction-time lazy `getEngineRuntime: () => createEditorEnginePort(engine)` (the **narrow**
  9-member port) and memoizes it on first use — no `editor.init()`.

`bootstrapApp()` injects the SVG sprite sheet, editor palette, and modal icons, constructs
the app, then exposes diagnostics (see Debug surface).

## State model

A single mutable `ENGINE` tree (`modules/state-slices.js` `createEngineState`) holds all
runtime state, organized into slices: `nav`, `hazards`, `solver`, `hinter`, `viewport`,
`review`, `ui`, `runtime`, `gamepad`, `flags`, `editor`, `levelRating`, plus top-level
scalars (mode, logicState, level, options, …). Each slice factory documents its owner and
tags fields `authoritative` vs `derived`.

**All ENGINE mutations go through `modules/state-actions.js`** — a re-export barrel over
per-slice modules in `modules/state/actions/*.js` (one file per slice + `shared.js` for the
`resolveEngineState` helper). `check:engine-state-boundary` forbids direct `state.ENGINE`
writes in the engine/input/ui consumer layers.

## Runtime (commands & effects)

`modules/runtime/` holds the per-step engine:
- `actions.js` / `effects.js` — frozen `ActionType` / `EffectType` constants + factories
  (raw event-type strings are banned by ESLint).
- `step-processor.js` — pure per-step computation; emits Action/Effect events.
- `effect-runner.js` — central dispatcher executing `Effect[]` against injected adapters.
- `game-rules.js`, `path-state.js`, `state-machine.js` — win metrics, path derivation,
  legal logic-state transitions.

Derived navigation fields (`visitedCounts`, `cellUsage`, `intersections`, `flipCount`,
`crossedFlippingFilters`) are recomputed by `path-state.js`'s `rebuildDerivedState`, not
authored directly. A cross-check invariant test (`test:path-state-invariants`) guarantees the
incremental `pushStep` derivation and the full `rebuildDerivedState` recompute agree.

**Correctness-sensitive flows have pure, unit-tested transition/decision cores** (modernization
-plan §2; see ADR 0006): move (`computeStep`), undo (`PathNavigator.applySnapshot`), win
(`computeWinEffects`), hazard (`compute{JumpScare,BombDetonation}Effects`), the reset-streak cheat
(`planResetCheat`), and the review approve/reject advance (`planSubmissionAdvance`). These return
effects-as-data (run by `effect-runner`) or plain decision objects; controllers apply them. There
is deliberately **no** single central command dispatcher — pushing every flow through one reducer
would be the parallel system the plan's principles caution against. `replayMoves` replays a move
sequence through the pure transition for declarative tests.

## Engine facade (`modules/engine.js`)

`createEngine()` coordinates sub-controllers in `modules/engine/` (level-flow, path-navigator,
overlay-controller, hazard-controller, win-controller, solver-manager, review-mode,
tap-router, step-dispatcher, render-loop, challenge-options, level-rating-manager).

It returns the flat methods **plus** grouped namespaces — `game`, `navigation`, `overlays`,
`hints`, `solver`, `review`, `ratings` — where each grouped entry is the *same instance* as
its flat counterpart (`engine-facade-unit-tests` guards this). Callers in `modules/input/`
use the grouped namespaces; the flat surface remains as the implementation source (the groups
are built from it) and the `window.APP.Engine` debug surface. The remaining flat-only methods
(`setLogicState`, `switchMode`, `setMuted`, `setOption`, the pending-action trio, `toggleMute`,
`updatePlayModeLayout`) have no group by design.

## Solver

`modules/SolverV2.js` is a thin facade over `modules/solver/` (18 modules: normalization,
prep, search, scoring, attempts, archetype, lower-bounds, topology, orchestration, …). The
test/analysis surface is the named `SOLVER_TESTING_API` export (no underscore aliases on the
runtime instance). The solver also runs off-thread via `modules/solver/worker.js` +
`solver-worker-client.js`. See `docs/solver.md` (planned) and the CLAUDE.md solver section.

## Persistence (`modules/persistence/`)

Firebase client wrapper + repositories for level submissions, player progress, reviews, and
Dev-Mode level ratings, plus a local-session fallback. Firebase web config is public
(`firebase-config.js`); see `docs/security.md`.

## UI & styling (`modules/ui/`, `styles/`)

DOM helpers, modal control (`modal-ui.js` with central focus-trapping), toast, layout,
loading, solver overlay, plus boot-time DOM builders: `svg-defs.js` (icon sprite),
`editor-palette.js` (data-driven palette tools), `modal-icons.js` (shared close-X). Styling
is four hand-maintained files aggregated by `styles/app.css` (`reset` → `utilities` →
`components`), driven by `--theme-*` CSS variables. Accessibility conventions (dialog
semantics, focus-trap, keyboard play, focus-visible) are in `docs/ui-accessibility.md`.
Building UI from shared primitives is modernization-plan §3.

## Where to put new code

- **A puzzle/solver rule or pure transformation** → `modules/domain/` or `modules/solver/`
  (no browser deps; unit-test it directly).
- **A new ENGINE field** → add to the right slice in `state-slices.js`, add a mutation helper
  in the matching `modules/state/actions/*.js`, never mutate `state.ENGINE` directly.
- **A new control/flow** → a controller in `modules/input/` (or an `engine/` sub-controller),
  wired with narrow injected dependencies; call the grouped engine namespaces.
- **A browser side effect** (DOM/audio/timer/network) → behind an adapter in
  `modules/ui/`, `modules/render/`, `modules/persistence/`, or the runtime effect-runner.
- **A new modal/UI primitive** → follow `docs/ui-accessibility.md`; build nodes via DOM
  construction (no `innerHTML`).
