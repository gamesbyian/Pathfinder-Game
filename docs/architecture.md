# Pathfinder Architecture

> **Status:** current. History: `docs/refactor-notes/`; decisions: `docs/adr/`; completed modernization: `docs/archive/modernization-plan.md`.

Pathfinder is a Vite-built static GitHub Pages browser game using native ES modules and semantic CSS. Firebase (Firestore/Auth) and Tone.js are bundled npm dependencies, not CDN scripts.

## Layers

| Layer | Lives in | May depend on | Must not depend on |
|---|---|---|---|
| **Domain/services** | `modules/domain/`, `modules/solver/`, `modules/runtime/`, pure theme/editor helpers | domain | DOM, canvas, Firebase, Tone, browser globals, timers, network |
| **Browser adapters** | `modules/render/`, `modules/persistence/`, `modules/ui/`, SOUND_BUS, loader shim | domain | controllers generally |
| **Controllers/application** | `modules/engine*`, `modules/engine/`, `modules/input/`, `modules/editor.ts`, `modules/boot.ts` | domain + injected adapters | raw browser globals |
| **Facade/debug** | `modules/app.ts` | everything, built last | — |

ESLint enforces browser-free `domain/runtime/solver`, ENGINE mutation via state actions, and no raw HTML injection; solver workers are explicit browser-boundary exceptions. See [`testing.md`](testing.md).

### Directory ownership

- `modules/`: executable app/runtime policy and reusable domain logic.
- `scripts/`: developer, batch, migration, research, validation entry points.
- `data/`: serializable inputs, fixtures, corpora, generated evidence.
- `reports/`: interpreted evidence; `logs/`: raw run evidence.

Shared executable authority belongs in `modules/` and tooling imports it. ESLint rejects executable `scripts/`/`data/` imports from `modules/` while allowing serializable runtime data. Shared solver ablation/portfolio policy therefore lives in `modules/solver/`.

### Source filenames

Use lowercase kebab-case for `modules/` filenames. A package entrypoint may share its lowercase stem with a same-named implementation directory (`engine.ts` + `engine/`, `solver.ts` + `solver/`); avoid case-only distinctions and fused multiword names. Import specifiers still use `.js` and resolve to `.ts` source as documented in [`typing.md`](typing.md).

## Composition root (`modules/app.ts`)

`createApp()` builds acyclic stages without mutable forward declarations/post-init:

- **Stage 1, pure services:** `core`, `state`, `solverApi`, `data`, `debug`, `createErrorReporter`; failure paths use injected `reportError(context, err, meta?)`, tests may use `defaultReportError`; `data` is a leaf.
- **Stage 2, browser subsystems:** `ui`, `renderer`, `levelUtils`, `persistence`, `themes`; dependencies are one-way. `persistence` validates theme IDs through `data`, then `themes` consumes `persistence`.
- **Stage 3, controllers:** `editor`, `engine`, `input`, `loader`, `boot`; editor reaches engine lazily through `getEngineRuntime: () => createEditorEnginePort(engine)` to avoid a construction cycle.

`bootstrapApp()` installs SVG sprites/palette/modal icons, builds the app, then exposes diagnostics.

## State

`state-slices.ts` owns mutable `ENGINE`: `nav`, `hazards`, `solver`, `hinter`, `viewport`, `review`, `ui`, `runtime`, `gamepad`, `flags`, `editor`, `levelRating`, plus top-level state. All mutations use `state-actions.ts` / `state/actions/*.ts`; `check:engine-state-boundary` forbids direct writes in engine/input/ui consumers.

## Runtime commands/effects

`modules/runtime/`:

- `actions.ts` / `effects.ts`: frozen types/factories;
- `step-processor.ts`: pure step computation;
- `effect-runner.ts`: dispatcher over injected adapters;
- `game-rules.ts`, `path-state.ts`, `state-machine.ts`: win metrics, path derivation, legal transitions.

`rebuildDerivedState` recomputes `visitedCounts`, `cellUsage`, `intersections`, `flipCount`, `crossedFlippingFilters`; `test:path-state-invariants` checks parity with incremental state.

Correctness-sensitive flows use pure tested cores (`computeStep`, `PathNavigator.applySnapshot`, `computeWinEffects`, hazard planners, `planResetCheat`, `planSubmissionAdvance`); controllers execute their decisions/effects. There is intentionally no universal command reducer. `replayMoves` supports declarative move tests.

## Engine facade (`modules/engine.ts`)

`createEngine()` coordinates `modules/engine/` subcontrollers and exposes flat methods plus grouped `game`, `navigation`, `overlays`, `hints`, `solver`, `review`, `ratings`. Grouped entries are identical references to flat counterparts; tests enforce this. Input prefers grouped namespaces; flat-only methods remain for implementation/debug.

## Solver and persistence

`modules/solver.ts` is a thin facade over `modules/solver/`; test/analysis access uses `SOLVER_TESTING_API`; runtime workers live in `modules/solver/worker.js` and `solver-worker-client.ts`. See [`solver-architecture.md`](solver-architecture.md).

`modules/persistence/` contains Firebase client seam, submission/progress/review/rating/supplemental-hint repositories, and local-session fallback. `firebase-config.js` is public client config. See [`security.md`](security.md).

## UI and styling

`modules/ui/` owns DOM helpers, modals/focus, toast/layout/loading/solver overlays, SVG defs, editor palette, modal icons.

`styles/app.css` imports `reset.css` -> `tokens.css` -> `components.css`; no Tailwind/utility layer. Allowed non-component classes are type scale plus `.hidden` / `.is-shown` / `.selected`. Preserve computed behavior when changing cascade order; old same-specificity conflicts sometimes differed from apparent markup intent. See [`archive/styling-semantic-migration-plan.md`](archive/styling-semantic-migration-plan.md), [`ui-accessibility.md`](ui-accessibility.md).

## Where new code goes

- puzzle/solver rule or pure transform -> `modules/domain/` or `modules/solver/`;
- ENGINE field -> state slice + state-action helper;
- control/flow -> `modules/input/` or `engine/` subcontroller with narrow injected dependencies;
- browser side effect -> `ui/`, `render/`, `persistence/`, or runtime effect runner;
- modal/UI primitive -> follow `ui-accessibility.md`; construct DOM nodes, never raw `innerHTML`.
