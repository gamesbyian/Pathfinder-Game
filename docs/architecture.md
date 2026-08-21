# Pathfinder Architecture

> **Status:** current state. Refactor history: `docs/refactor-notes/`; lasting decisions: `docs/adr/`; completed modernization plan: `docs/archive/modernization-plan.md`.

Pathfinder is a Vite-built browser game deployed as a static GitHub Pages site. Source is native ES modules plus semantic CSS. Firebase (Firestore/Auth) and Tone.js are bundled npm dependencies, not CDN scripts.

## Layers

| Layer | Lives in | May depend on | Must not depend on |
|---|---|---|---|
| **Domain/services** | `modules/domain/`, `modules/solver/`, `modules/runtime/`, pure theme/editor helpers | domain | DOM, canvas, Firebase, Tone, browser globals, timers, network |
| **Browser adapters** | `modules/render/`, `modules/persistence/`, `modules/ui/`, SOUND_BUS, loader shim | domain | controllers generally |
| **Controllers/application** | `modules/engine*`, `modules/engine/`, `modules/input/`, `modules/editor.js`, `modules/boot.js` | domain + injected adapters | raw browser globals |
| **Facade/debug** | `modules/app.js` | everything, built last | — |

AST ESLint rules enforce browser-free `domain/runtime/solver`, ENGINE mutation through state actions, and no raw HTML injection. Solver worker files are explicit browser-boundary exceptions. See [`testing.md`](testing.md).

## Composition root (`modules/app.js`)

`createApp()` builds acyclic stages with no mutable forward declarations or post-construction init:

- **Stage 1, pure services:** `core`, `state`, `solverApi`, `data`, `debug`, `createErrorReporter`. Failure paths use injected `reportError(context, err, meta?)`; factories may use `defaultReportError` in tests. `data` is a leaf service.
- **Stage 2, browser subsystems:** `ui`, `renderer`, `levelUtils`, `persistence`, `themes`. Dependencies are one-way; `persistence` validates theme IDs through `data`, then `themes` consumes `persistence`.
- **Stage 3, controllers:** `editor`, `engine`, `input`, `loader`, `boot`. Editor accesses engine through lazy `getEngineRuntime: () => createEditorEnginePort(engine)`, avoiding a construction cycle.

`bootstrapApp()` installs SVG sprites, palette, and modal icons, builds the app, then exposes diagnostics.

## State

`modules/state-slices.js` owns the mutable `ENGINE` tree: `nav`, `hazards`, `solver`, `hinter`, `viewport`, `review`, `ui`, `runtime`, `gamepad`, `flags`, `editor`, `levelRating`, plus top-level state.

All ENGINE mutations go through `modules/state-actions.js` / `modules/state/actions/*.js`. `check:engine-state-boundary` forbids direct writes in engine/input/ui consumers.

## Runtime commands/effects

`modules/runtime/` contains:
- `actions.js` / `effects.js`: frozen action/effect types and factories;
- `step-processor.js`: pure step computation;
- `effect-runner.js`: effect dispatcher over injected adapters;
- `game-rules.js`, `path-state.js`, `state-machine.js`: win metrics, path derivation, legal state transitions.

`rebuildDerivedState` recomputes navigation derivatives (`visitedCounts`, `cellUsage`, `intersections`, `flipCount`, `crossedFlippingFilters`). `test:path-state-invariants` checks incremental and rebuilt state agree.

Correctness-sensitive flows use pure tested decision/transition cores: `computeStep`, `PathNavigator.applySnapshot`, `computeWinEffects`, hazard-effect planners, `planResetCheat`, and `planSubmissionAdvance`. Controllers execute the returned decisions/effects. There is intentionally no universal command reducer. `replayMoves` supports declarative move tests.

## Engine facade (`modules/engine.js`)

`createEngine()` coordinates `modules/engine/` subcontrollers and exposes flat methods plus grouped `game`, `navigation`, `overlays`, `hints`, `solver`, `review`, and `ratings` namespaces. Grouped entries are the same instances as their flat counterparts; unit tests enforce this. Input controllers prefer grouped namespaces. Flat-only methods remain for implementation/debug use.

## Solver

`modules/Solver.ts` is a thin facade over `modules/solver/`. Test/analysis access is through `SOLVER_TESTING_API`. Runtime worker support is in `modules/solver/worker.js` and `solver-worker-client.ts`. See [`solver-architecture.md`](solver-architecture.md).

## Persistence

`modules/persistence/` contains the Firebase client seam, submission/progress/review/rating/supplemental-hint repositories, and local-session fallback. `firebase-config.js` is public client config. See [`security.md`](security.md) and [`firestore-security-model.md`](firestore-security-model.md).

## UI and styling

`modules/ui/` owns DOM helpers, modals/focus trapping, toast/layout/loading/solver overlays, SVG defs, editor palette, and modal icons.

Styles are one semantic system: `styles/app.css` imports `reset.css` -> `tokens.css` -> `components.css`. No Tailwind or utility layer. Allowed non-component classes are the type scale and `.hidden` / `.is-shown` / `.selected` state hooks.

When changing cascade order, preserve computed behavior: old same-specificity utility/component conflicts sometimes made apparent markup intent differ from the actual applied value. Design record: [`archive/styling-semantic-migration-plan.md`](archive/styling-semantic-migration-plan.md). Accessibility conventions: [`ui-accessibility.md`](ui-accessibility.md).

## Where new code goes

- puzzle/solver rule or pure transform -> `modules/domain/` or `modules/solver/`;
- ENGINE field -> correct state slice + matching state-action helper;
- control/flow -> `modules/input/` or an `engine/` subcontroller with narrow injected dependencies;
- browser side effect -> adapter in `ui/`, `render/`, `persistence/`, or runtime effect runner;
- modal/UI primitive -> follow `ui-accessibility.md`; construct DOM nodes, never raw `innerHTML`.
