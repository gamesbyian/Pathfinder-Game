# Static Typing (check-only)

> **Status:** current-state reference. modernization-plan §5 / ADR 0009. TypeScript is a dev-only
> type checker — **there is no build step**; the browser loads the `.js` directly (ADR 0001).

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

## Untyped backlog (priority order — intentional, not accidental)
1. **`NormalizedLevel` is essentially complete** (`modules/domain/types.js`) — covers the core +
   landmark + normalizer fields and is consumed across the whole pure `domain`/`runtime`/`solver`
   layers. The keystone-growth phase is done; the remaining work is the non-pure surface (below), not
   `NormalizedLevel` itself.
   - **Note (focused pass):** `move-rules.js` + `path-validator.js` are typed via the
     `MoveState`/`MoveOptions` typedefs. While typing the validator, found that it passes a visit-
     **count** map as `cellUsage` to `isValidMove` (which expects an `{h,v}` axis-usage map), so
     `isValidMove`'s edge-reuse check is a **no-op on the referee path** — flagged in a code comment
     as pre-existing behavior worth a separate look (not changed here).
   - The whole `modules/runtime/` directory is now typed (`actions`/`effects`/`state-machine`/
     `game-rules`/`effect-runner`/`path-state`/`step-processor`), with the shared `TapRouteState`
     movement-state typedef in `domain/types.js`.
   - The whole `modules/domain/` directory is now typed, including the raw-level codec/schema/
     validation/fingerprint family. The untrusted wire-format inputs there are typed `any` (a
     documented runtime-validation boundary; `validateRawLevel`/`validateLevelDetailed` are the
     runtime guards, see §5 Phase 3 below).
2. **The whole `modules/solver/` directory is typed** except the two Web Worker host-boundary files
   (`worker.js` + `solver-worker-client.js` — `Worker`/`postMessage` globals; deliberately exempt from
   `check:domain-purity`). This includes `diversification.js` (and its now-typed dependency
   `scripts/ablation-config.mjs`).
2b. **Theme chain done**: `theme-engine.js` (pure color math), `theme/theme-normalizer.js`, and
   `theme/theme-registry.js` are typed. The remaining theme file, `theme/theme-picker-renderer.js`,
   is a DOM renderer (adapter layer).
3. **`EngineState` + slice typedefs** (`modules/state-slices.js` already has JSDoc `@typedef`s per
   slice; promote them to `// @ts-check`'d contracts and type the state-action helpers).
   **Note:** `checkJs: true` type-checks *imported* files too, so a module can only join the
   allowlist once its whole import graph is already typed (e.g. `state-slices` is blocked on
   `editor/editor-model`). Add bottom-up (leaves first).
3. **Persistence DTOs** (`SubmissionRecord`, `ProgressRecord`, session payload) + **runtime
   validation** of external boundaries: Firestore docs, solver worker messages, local/session
   storage payloads, URL/debug params (§5 Phase 3).
4. **Controller ports** (`EditorRuntimePort` is already a typedef in `modules/app.js`; add
   `RendererPort`/`UiPort`/… as the seams formalize).

The pure layers (`domain`/`runtime`/`solver`) are the highest-value next targets because they're
already browser-free (`check:domain-purity`) and carry the correctness-critical logic.
