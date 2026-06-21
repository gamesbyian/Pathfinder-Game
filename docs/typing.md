# Static Typing (check-only)

> **Status:** current-state reference. modernization-plan §5 **Done** / ADR 0009. TypeScript is a
> dev-only type checker — **there is no build step**; the browser loads the `.js` directly (ADR 0001).
>
> **66 modules** are type-checked under `tsc --strict`: the entire pure logic core (`domain` +
> `runtime` + `solver`, minus the 2 Web Worker host files), the theme/editor/state layers, the
> data/persistence-data shims, and `engine/win-controller`. The DOM adapter/controller/integration
> layer is a *deliberate, documented* scope boundary — see "Scope boundary" below and ADR 0009
> ("Completion criterion & scope boundary").

## How it works
- Modules opt in with a `// @ts-check` pragma and JSDoc type annotations.
- `npm run check:types` runs `tsc --noEmit -p tsconfig.json` against a **curated allowlist**
  (`tsconfig.json` `include`), under `strict` (incl. `noImplicitAny`). It's in the default `check`
  CI group, so type-contract violations fail the build.
- Nothing is emitted/compiled. The annotations are inert at runtime.

## Currently typed (the allowlist)
Keep this in sync with `tsconfig.json` `include`:
- `modules/domain/types.js` — shared JSDoc contracts (`NormalizedLevel`, `PathMetricsState`,
  `PortalVisual`, `PortalExit`, `GridSize`); no runtime exports, referenced via `import('./types.js').T`.
- `modules/domain/cell-key.js` — `PackedKey` encoding (`PACK`/`UNPACK`/`inBounds`).
- `modules/domain/geometry.js` — variant coordinate/axis transforms.
- `modules/domain/move-context.js` — `MoveContext` presets.
- `modules/domain/portal-utils.js` — portal resolution/parity (first `NormalizedLevel` consumer).
- `modules/domain/heatmap.js` — hint-path heat map build/normalize.
- `modules/domain/move-rules.js` — `isValidMove` (the legal-move source of truth; `MoveState`/`MoveOptions` consumer).
- `modules/domain/path-validator.js` — `validateCandidatePath` (the solver referee).
- `modules/runtime/actions.js` — `Action` typedef + `ActionType`/`Actions` factories.
- `modules/runtime/effects.js` — `Effect` typedef + `EffectType`/`Effects` factories.
- `modules/runtime/state-machine.js` — `VALID_LOGIC_TRANSITIONS` + `isValidLogicTransition`.
- `modules/runtime/game-rules.js` — win metrics / counted length (`PathMetricsState` consumer).
- `modules/runtime/effect-runner.js` — `runEffects` central effect dispatcher (`EffectAdapters` typedef).
- `modules/runtime/path-state.js` — the pure tap-route movement transition (`cloneTapRouteState`/
  `pushStep`/`rebuildDerivedState`/`simulateTapRouteStep`/`replayMoves`); defines/consumes the shared
  `TapRouteState` typedef (assignable to both `MoveState` and `PathMetricsState`).
- `modules/runtime/step-processor.js` — `computeStep` pure step computation (DI'd via the
  `ComputeStepDeps` port; `StepEvent`/`Ripple`/`ComputeStepResult` locals). Engine nav/hazards slices
  stay `any` at this boundary until `state-slices` is typed.
- `modules/solver/types.js` — solver-local contracts (`SolverSearchState` full, `PrepLevel` partial, `UndoToken`).
- `modules/solver/encoding.js` — solver `PACK`/axis constants/`popcount`.
- `modules/solver/distance.js` — 0-1 BFS distance maps (`NormalizedLevel` consumer).
- `modules/solver/archetype.js` — level-shape classification (`detectArchetype`).
- `modules/solver/solution.js` — solver solution-acceptance checks (`SolverSearchState` consumer).
- `modules/solver/search-state.js` — the solver hot core (`createState`/`applyMove`/`undoMove`/
  `getNeighbors`/`isMoveDynamicallyValid`); defines the `SolverSearchState`/`PrepLevel`/`UndoToken` shapes.
- `modules/solver/topology.js` — connectivity/volume pruning (`isConnected`/`isConnectedForTrap`).
- `modules/solver/lower-bounds.js` — MST/MP/MC/surround/adj-turn lower-bound pruning.
- `modules/solver/scoring.js` — move scorer (`scoreMoveV2`/`scoreAndSort`/`computeTemplateBonus`);
  `ScoringProfile`/`StructuralTemplate` consumer.
- `modules/solver/policy.js` — profile/template config data, type-checked against
  `ScoringProfile`/`StructuralTemplate` (closes the loop with `scoring.js`).
- `modules/solver/attempts.js` — per-archetype attempt-config ordering (`getAttemptConfigs`/
  `applyAttemptConfigOptions`/`getConfiguredAttemptConfigs`); `AttemptConfig`/`AblationConfig` consumer.
- `modules/solver/search.js` — the DFS/LDS + beam search driver (`dfsFromGateLDS`/
  `beamSearchFromGate`); `SolverSearchState`/`PrepLevel`/`UndoToken` consumer (`DfsFrame`/`BeamNode` locals).
- `modules/solver/prep.js` — the per-level `PrepLevel` builder (`prepLevel`); validates the
  `PrepLevel` typedef against its actual construction (the typedef now mirrors the full prep shape).
- `modules/solver/orchestration.js` — the `solveLevelV2` driver (gate × attempt-config × budget
  scheduling; interleaved/serial gate loops); `AttemptConfig`/`PrepLevel` consumer (`SolveOpts`/
  `SolveResult`/`Attempt` locals).
- `modules/solver/trap-search.js` — false-goal/trap-spot enumeration (`findTrapSpotsV2`); reads
  `SolverSearchState` + `prep.trapInvalidSet` (`TrapFrame` local).
- `modules/domain/landmark-rules.js` — pure landmark wire-format mechanics (`applyLandmark`/
  `removeLandmark`/`resolveLandmarkTurn`/`baseLandmarkRole`); `LandmarkBuildLevel` typedef.
- `modules/domain/level-fingerprint.js` — canonical level dedup hashing (`getLevelFingerprint` etc.).
- `modules/domain/level-schema.js` — raw-level runtime validator (`validateRawLevel`); `raw` typed
  `any` (untrusted wire-format boundary).
- `modules/domain/level-codec.js` — raw↔normalized parse/serialize/clone (`parseRawLevel`/
  `denormalizeLevel`/`canonicalCloneLevel`/`deepCloneLevel`/`getLevelBounds`); wire inputs typed `any`.
- `modules/domain/level-validation.js` — editor structural validator (`validateLevelDetailed`); the
  editor working level typed `any` (boundary).
- `modules/theme-engine.js` — pure color math + algorithmic token derivation (`lighten`/`darken`/
  `mix`/`luminance`/`contrastRatio`/`readableOn`/`deriveTokens`); `Hsl`/`Seeds` typedefs. Leaf module
  (no imports, no DOM).
- `modules/theme/theme-normalizer.js` — theme-config normalization/fallback assembly (`normalizeTheme`/
  `buildChaosTheme`/`collectThemePaths`/`toRgb`/`darkenHex`/`lightenHex`); `theme` objects typed `any`
  (config boundary), `Rgb` typedef.
- `modules/theme/theme-registry.js` — theme lookup + leave-color schema check (`createThemeRegistry`/
  `ensureThemeLeaveColors`).
- `modules/editor/editor-model.js` — editor session state factory (`createEditorState`); `EditorState`
  typedef. Leaf module; unblocks `state-slices.js`.
- `modules/editor/editor-history.js` — editor undo snapshot save/restore (`EditorState` consumer).
- `modules/state-slices.js` — the ENGINE state slice factories (already carried per-slice `@typedef`s;
  now `// @ts-check`'d). `core` + the top-level `createEngineState` return typed `any`.
- `modules/state.js` + `modules/state-actions.js` (barrel) + `modules/state/actions/*.js` (11 slice
  modules) — the entire ENGINE state-mutation layer. Every helper resolves to and mutates the
  `any`-typed ENGINE tree, so these are typed at the `any` boundary; putting them under `// @ts-check`
  now means tightening the ENGINE type later immediately type-checks every mutation site.
- `modules/editor/editor-export.js` — pure level→wire serialization (`serializeLevel`).
- `modules/editor/editor-occupancy.js` — editor place/remove/get occupant + landmark tool defs
  (`getOccupant`/`removeOccupant`/`placeOccupant`/`LANDMARK_TOOL_DEFS`); editor level typed `any`.
- `modules/persistence/level-rating-repository.js` — Firestore rating load/save (`client` typed `any`).
- `modules/persistence/level-submission-repository.js` — submission/published-level access +
  `encodeHints`/`decodeHints` (Firestore `client` typed `any`).
- `modules/persistence/review-repository.js` — admin review/approve/publish ops (Firestore `client`
  typed `any`).
- `modules/SolverV2.js` — the solver facade (re-exports the typed solver modules + `SOLVER_TESTING_API`).
- `modules/data.js` — level/theme data store + `validateDataSources`.
- `modules/debug.js` — dev-only `window` debug-export registry.
- `modules/engine/win-controller.js` — `computeWinEffects` (typed pure core) + the win-handler
  (`state`/`core`/deps typed `any`).
- `scripts/ablation-config.mjs` — ablation feature registry + config constructors + experiment
  catalogue (`FEATURES`/`defaultConfig`/`withFeatureDisabled`/`buildExperimentList`). Pure CLI/solver
  shared data; the unblocker for `diversification.js`.
- `modules/solver/diversification.js` — resumable diverse-hint-search session
  (`createDiversificationSession`/`pathSignature`/`mergeUniqueHints`); session-state objects typed
  `any` at their mutation boundaries. The last non-worker solver file.
- `modules/solver/normalization.js` — raw→`NormalizedLevel` builder (`normalizeRawLevelV2`); the
  inverse of `prep` (produces the `NormalizedLevel` the solver consumes). `rawLevel` is typed `any`
  (an untrusted wire-format boundary; validated separately by `level-schema`).
- `modules/solver/testing-api.js` — the `SOLVER_TESTING_API` analysis surface (re-exports typed impls).

## Adding a module to the typed surface
1. Add `// @ts-check` at the top and JSDoc types to its exports (params/returns; `@typedef` for
   shared shapes).
2. Add the path to `tsconfig.json` `include`.
3. `npm run check:types` until clean — annotate, don't `// @ts-ignore`, unless there's a documented
   reason.

## Scope boundary (deliberate — not an accidental gap)
The typed surface stops at the **DOM adapter/controller/integration layer**, by design. ADR 0009's
"Completion criterion & scope boundary" has the full rationale; in short:

**Outside the typed surface, on purpose:**
- `modules/render/*` (canvas/draw), most of `modules/ui/*` (DOM construction/manipulation),
  `modules/input/*` (pointer/gamepad/keyboard event handlers), the remaining `modules/engine/*`
  sub-controllers, the DOM-touching persistence (`firebase-client`/`local-session-store`/
  `progress-store`), `theme/theme-picker-renderer.js`/`theme/css-variable-applier.js`, and the
  top-level integration roots (`app`/`boot`/`engine`/`editor`/`ui`/`renderer`/`persistence`/
  `themes`/`levelutils`/`loader`).
- Plus the two solver **Web Worker host** files (`worker.js` + `solver-worker-client.js`).

**Why:** these orchestrate the **`any`-typed ENGINE tree** (`createEngineState` returns `any`) and
`any`-typed injected deps, so `tsc` over them would be near-pure `@param {any}` noise (no safety,
real maintenance cost). They are gated instead by `check:engine-state-boundary`,
`check:domain-purity`, `check:modal-a11y`, and the Playwright `e2e`/`visual`/`theme-coverage`
suites; their extracted pure cores (`computeWinEffects` [typed], `computeJumpScareEffects`,
`planResetCheat`, `planSubmissionAdvance`) are unit-tested per plan §2.

**The single high-leverage way to extend this later:** give `createEngineState` a real `EngineState`
return type (the per-slice `@typedef`s already exist in `state-slices.js`). Because the whole
state-mutation layer is *already* `// @ts-check`'d, that one change type-checks every mutation site
for free and makes typing the adapter layer worthwhile (no longer all-`any`). It is unblocked by this
§5 work, not a prerequisite for §5 being done.

> **`checkJs: true` note:** tsc type-checks *imported* files too, so a module joins the allowlist only
> once its whole import graph is already typed (add bottom-up, leaves first). This is also why the
> adapter layer is all-or-nothing per integration root: typing `app.js`/`engine.js` would pull their
> entire DOM/controller subtree into the program.

## Known typing-surfaced oddities (documented, not changed)
- `path-validator.js` passes a visit-**count** map as `cellUsage` to `isValidMove` (which expects an
  `{h,v}` axis-usage map), so `isValidMove`'s edge-reuse check is a **no-op on the referee path** —
  flagged in a code comment as pre-existing behavior worth a separate look.
- `policy.js`'s `antiDeadCorridorWeight` is defined in every profile but never read by `scoreMoveV2`
  (vestigial) — noted in the `ScoringProfile` typedef.
