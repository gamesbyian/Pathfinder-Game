# Pathfinder Codebase Modernization Plan

## How to use this document

This plan is written for a future AI coder or human contributor who has no context from the review conversation that produced it. Treat it as a roadmap, not as a mandate to implement everything in one pull request.

When taking work from this plan:

1. Pick **one bounded slice** from the "Suggested first PR" or "Immediate next actions" sections.
2. Inspect the referenced files before editing; this document intentionally names the likely starting points.
3. Preserve existing behavior unless the task explicitly says to change behavior.
4. Add or update tests before large refactors, especially for gameplay rules and solver behavior.
5. Keep compatibility facades in place while moving internals, so browser behavior and developer tooling continue to work.
6. Run `npm run ci` before handing off changes unless the task is documentation-only or an environment limitation prevents it.

## Purpose

This document captures a comprehensive, prioritized plan for improving Pathfinder's efficiency, robustness, future-proofing, comprehensibility, testability, and cleanliness. It is based on a broad review of the current browser app, domain/runtime modules, solver, persistence layer, tests, package scripts, security rules, and dependency/bootstrap structure.

The codebase is already in a promising state: core gameplay concepts have been extracted into modules such as `modules/domain`, `modules/runtime`, `modules/render`, `modules/input`, `modules/ui`, `modules/editor`, and `modules/persistence`, and the current CI path passes. The highest-leverage next steps are not isolated small cleanups; they are boundary-setting changes that make the project easier to refactor, test, secure, and scale.

## Current repo map

Use this map to orient yourself before making changes:

- `index.html` contains document markup, large inline style definitions, external browser dependencies, and the current app bootstrap script.
- `modules/core.js` defines core constants, mode/status enums, deep clone helper, and the browser audio bus.
- `modules/state.js` creates the top-level mutable `ENGINE` state object.
- `modules/boot.js` owns startup sequencing and the `window.onload` handler factory.
- `modules/engine.js` is the main gameplay orchestration facade. It coordinates runtime rules, navigation, UI effects, persistence, solver state, hints, review mode, and editor-related state transitions.
- `modules/domain/` contains mostly pure domain helpers such as level codec, movement rules, geometry, portal utilities, path validation, and level validation.
- `modules/runtime/` contains extracted gameplay/runtime logic such as game rules, path state operations, step processing, and logic-state transitions.
- `modules/render/` and `modules/renderer.js` contain canvas rendering and render-model creation.
- `modules/ui/` and `modules/ui.js` contain DOM utilities, modal/toast/loading/overlay/layout helpers, and the UI facade used by engine/controllers.
- `modules/input/` and `modules/input.js` contain keyboard, pointer, gamepad, solver, options, review, submission, and editor-toolbar controllers.
- `modules/editor/` and `modules/editor.js` contain editor state, occupancy, validation/history/export helpers, and the editor facade.
- `modules/persistence/` and `modules/persistence.js` contain local session/progress stores, Firebase client setup, submission repository, and review repository.
- `SolverV2.js` contains the current solver implementation and public solver factory.
- `levels.js` and `themes.js` contain bundled level/theme data.
- `scripts/` contains test, audit, solver, import, and diagnostic scripts.
- `firestore.rules` and `firestore.indexes.json` define Firebase/Firestore behavior.

## Current strengths

- Domain and runtime logic has started moving out of the browser glue layer into focused modules.
- The project has meaningful behavior-locking scripts for startup, hints, and domain/runtime mechanics.
- Level normalization, movement rules, validation, rendering, input, persistence, editor operations, and themes are no longer all in one monolithic script.
- The solver has a clear public API and useful test/analysis hooks.
- The app is small enough that architectural improvements can still be made incrementally without a high migration cost.

## Known review findings to preserve

These facts were observed during the review and are useful context for future agents:

- `npm run ci` passed at review time. It ran startup smoke, hint-path oracle, and domain unit tests.
- `package.json` declares additional audit and legacy scripts. Some referenced targets were not present in the reviewed checkout, including:
  - `scripts/run-level-audit.mjs`
  - `scripts/analyze-audit-failures.mjs`
  - `scripts/check-persistent-hard-levels.mjs`
  - `scripts/check-regression-levels.mjs`
  - `scripts/audit-heuristic-recall.mjs`
  - `LegacySolver/solver-smoke-test.mjs`
- `includes/secret.php` stores a Firebase API-key-like value. Firebase web API keys are normally public identifiers rather than private secrets, but the filename and storage pattern are misleading and should be clarified.
- `firestore.rules` currently hard-codes a single admin email and allows authenticated users to read submissions. Do not change this casually; add rules tests first and confirm intended product behavior.
- `index.html` currently loads Tailwind, Tone.js, Firebase compat SDKs, and Google Fonts from external CDNs.

## Guiding principles

1. **Make contracts explicit.** Level data, runtime state, solver input/output, and persistence payloads should be validated and documented.
2. **Keep pure logic pure.** Gameplay rules, state transitions, validation, and solver contracts should be testable without DOM, canvas, audio, timers, or Firebase.
3. **Move effects to the edge.** UI rendering, modals, audio, persistence, timers, and browser APIs should be adapters around a pure core.
4. **Prefer incremental compatibility.** Existing factory APIs and browser behavior should remain stable while internals are extracted behind them.
5. **Automate confidence.** Every major refactor should be backed by unit, integration, browser, security-rule, and benchmark checks.
6. **Avoid rewrites without characterization tests.** The puzzle rules and solver heuristics are subtle; preserve behavior first, then refactor.

---

# Top 5 Big Changes

## 1. Introduce a typed, validated, immutable domain model for levels and runtime state

### Problem

The game relies on a rich level model: packed coordinate keys, `Set`s, `Map`s, portals, filters, geese, false goals, must-pass/must-cross constraints, hints, raw 1-based coordinates, and normalized 0-based packed keys. Today much of that model is implicit and enforced by convention.

Runtime state is also stored in a large mutable `ENGINE` object that mixes mode, navigation, hazards, solver state, render flags, hints, viewport, progress, editor state, review state, UI state, runtime pointer state, gamepad state, and feature flags.

This makes refactoring risky because many modules can mutate shared structures directly, and it is not always obvious which shape is raw, normalized, canonical, derived, or display-only.

### Where to look first

- `modules/domain/level-codec.js` for raw-to-normalized level parsing, denormalization, cloning, and shape assertions.
- `modules/domain/level-validation.js` for editor/level validity checks.
- `modules/domain/cell-key.js` for packed coordinate helpers.
- `modules/domain/level-fingerprint.js` for canonical fingerprinting and duplicate detection.
- `modules/state.js` for the top-level runtime state shape.
- `modules/engine.js` for places where normalized level objects and runtime state are mutated.
- `scripts/domain-unit-tests.mjs` for current behavior-locking coverage.

### Plan

- Add formal model definitions for:
  - `RawLevel`
  - `NormalizedLevel`
  - `LevelMetadata`
  - `PortalPair`
  - `RuntimeNavState`
  - `HazardState`
  - `SolverInputLevel`
  - `SolverResult`
  - `EngineState`
  - `EditorState`
  - `ReviewState`
- Use TypeScript or, as an incremental first step, JSDoc typedefs plus runtime validators.
- Add `modules/domain/level-schema.js` or an equivalent typed module that owns validation and shape normalization.
- Change parsing APIs to return structured results:
  - `parseRawLevel(raw) -> { ok: true, level } | { ok: false, errors }`
  - Keep a compatibility wrapper for existing callers that expect `null` on failure.
- Define one canonical boundary where raw 1-based coordinates become normalized 0-based packed keys.
- Keep canonical level objects immutable in development/test mode with `Object.freeze`-style safeguards or frozen clone helpers.
- Replace in-place challenge-option mutations with derived level variants.
- Split the top-level state object into smaller slices with clear ownership:
  - `game`
  - `nav`
  - `hazards`
  - `solver`
  - `editor`
  - `review`
  - `ui`
  - `input`
  - `persistence`

### Deliverables

1. `modules/domain/level-schema.js` with validators and typedefs.
2. Structured parse/validation result types.
3. A startup validation pass for all bundled levels.
4. Dev-only frozen canonical levels.
5. Regression tests for malformed raw levels, normalized level invariants, and challenge-option variants.

### Suggested implementation slices

- **Small:** Add JSDoc typedefs and validator helpers without changing call sites.
- **Medium:** Add `parseRawLevelDetailed(raw)` and keep `parseRawLevel(raw)` as the compatibility wrapper.
- **Large:** Split `ENGINE` into smaller state slices after reducer/effects boundaries exist.

### Acceptance criteria

- All existing bundled levels validate successfully.
- Invalid raw levels produce specific errors rather than silent `null` or partial objects.
- Existing callers still pass until they are intentionally migrated.
- `npm run ci` passes.

### Payoff

- Safer refactors.
- Fewer accidental mutations.
- Clearer onboarding for future contributors.
- Better editor, solver, and persistence contracts.
- Easier conversion to TypeScript if desired later.

### Suggested first PR

Add `modules/domain/level-schema.js`, validate all bundled levels during CI, and adapt `parseRawLevel` behind a compatibility wrapper so current callers do not need to change immediately.

---

## 2. Decouple the engine from UI, persistence, audio, timers, and rendering effects

### Problem

The engine is still the central orchestration point for too many responsibilities. It coordinates gameplay, navigation, state transitions, UI updates, sound effects, modal behavior, persistence writes, timers, editor behavior, review behavior, solver lifecycle, and dirty-render signaling.

Although pure logic has already been extracted into runtime modules, the engine layer remains broad enough that UI or persistence changes can unintentionally affect gameplay behavior.

### Where to look first

- `modules/engine.js` for the current orchestration facade.
- `modules/runtime/game-rules.js` for win metrics and win-condition logic.
- `modules/runtime/path-state.js` for path mutations and derived path state.
- `modules/runtime/step-processor.js` for per-step computation and event generation.
- `modules/runtime/state-machine.js` for legal logic-state transitions.
- `modules/ui.js` and `modules/ui/` for browser UI effects called by the engine.
- `modules/persistence.js` and `modules/persistence/` for persistence effects called during gameplay.
- `modules/core.js` for `SOUND_BUS` and core constants.

### Plan

Move toward a reducer/effects architecture:

- Pure reducers:
  - `gameReducer(state, action) -> { state, effects }`
  - `navReducer(state, action) -> { state, effects }`
  - `solverReducer(state, action) -> { state, effects }`
  - `editorReducer(state, action) -> { state, effects }`
- Effect adapters:
  - `playSound(effect)`
  - `openModal(effect)`
  - `persistProgress(effect)`
  - `scheduleTimer(effect)`
  - `markRenderDirty(effect)`
  - `showToast(effect)`
- Controllers translate browser/input/solver events into actions.
- The engine facade remains temporarily but delegates to reducers and effect execution.
- State transitions should become explicit events rather than direct calls from mixed responsibilities.

### Deliverables

1. `modules/runtime/actions.js` defining gameplay/editor/solver action types.
2. `modules/runtime/effects.js` defining effect types.
3. A pure reducer for navigation/path actions.
4. A browser effect runner for UI, audio, timers, persistence, and render invalidation.
5. Tests asserting reducer outputs and emitted effects without DOM.

### Suggested implementation slices

- **Small:** Define effect object shapes and convert one path, such as win handling, to emit effects.
- **Medium:** Move overlay/hazard timer behavior into an effect runner.
- **Large:** Convert primary grid input and path navigation to actions/reducers while preserving `engine` facade methods.

### Acceptance criteria

- Pure reducer tests do not need DOM, canvas, Firebase, Tone, or timers.
- Existing browser behavior remains unchanged.
- Existing engine public methods continue to work during migration.
- `npm run ci` passes, and new reducer tests cover emitted effects.

### Payoff

- Gameplay can be tested without browser dependencies.
- UI and persistence changes become less risky.
- Replay, undo/redo, solver visualization, analytics, and input remapping become easier.
- Future developers can reason about state transitions from a single action/effect model.

### Suggested first PR

Extract win handling, overlay transitions, and hazard animation side effects into a browser effect runner while keeping `engine.js` as the compatibility entry point.

---

## 3. Turn the browser app shell into a real build/dependency boundary

### Problem

The HTML file still acts as markup, stylesheet host, dependency loader, bootstrap script, and debug facade. It loads several runtime dependencies from CDNs and contains the app factory wiring directly inside a module script.

This weakens caching, dependency control, CSP/security posture, offline behavior, testability, and code-splitting.

### Where to look first

- `index.html` for markup, inline styles, CDN dependencies, module imports, bootstrap wiring, and `window.APP` exposure.
- `modules/boot.js` for boot sequencing and the onload handler factory.
- `modules/loader.js` for external level/theme loading behavior.
- `firebase-config.js` for runtime Firebase config loading.
- `package.json` for current scripts and minimal dependency setup.

### Plan

- Move bootstrap code from `index.html` into `modules/app.js` or `src/main.js`.
- Replace the inline module script with a tiny import-only entrypoint.
- Move large CSS variable definitions and app styles into dedicated CSS files.
- Replace Tailwind CDN usage with a pinned build-time Tailwind setup if Tailwind remains part of the project.
- Pin and bundle or intentionally vendor external browser dependencies.
- Lazy-load optional systems:
  - Firebase only when cloud persistence/submission/review is needed.
  - Tone only after audio unlock or when sound is enabled.
  - Solver worker only when solving/hints are requested.
- Hide or narrow the global `window.APP` facade behind a dev/debug flag.
- Add a target Content Security Policy and ensure the build can satisfy it.

### Deliverables

1. `modules/app.js` owning app construction and dependency wiring.
2. Dedicated CSS files for base tokens, layout, components, and themes.
3. Build scripts for development and production.
4. Dependency pinning and update policy.
5. CSP documentation and a deployable header template.

### Suggested implementation slices

- **Small:** Move only the module bootstrap code to `modules/app.js`; leave markup, CSS, and dependencies unchanged.
- **Medium:** Move inline styles into one or more CSS files without changing selectors or variables.
- **Large:** Add a bundler/build pipeline and replace CDN runtime dependencies with pinned build-time dependencies.

### Acceptance criteria

- App boots the same way in browser and startup smoke tests.
- `window.APP` remains available unless the task explicitly changes debug behavior.
- No dependency-loading strategy changes are mixed into the initial bootstrap extraction PR.
- `npm run ci` passes.

### Payoff

- Faster and more predictable page loads.
- Safer dependency updates.
- Better browser security posture.
- Cleaner separation of app code from document markup.
- Easier end-to-end tests and future bundling/code splitting.

### Suggested first PR

Move only the current bootstrap JavaScript from `index.html` into `modules/app.js`, keep behavior unchanged, and leave dependency/build decisions for later PRs.

---

## 4. Split `SolverV2` into a solver package with worker execution, benchmarks, and clear contracts

### Problem

The solver is one of the most valuable and complex parts of the project. It currently combines solver-level normalization, encoding assumptions, policy profiles, structural templates, search logic, trap detection, attempt orchestration, metrics, public API, and test/analysis internals in one large module.

This makes solver tuning and optimization harder than necessary, and it ties long-running search work closely to the browser thread unless carefully yielded.

### Where to look first

- `SolverV2.js` for the current solver implementation and public API.
- `modules/domain/path-validator.js` for candidate-path validation.
- `modules/domain/move-rules.js` and `modules/domain/move-context.js` for movement legality.
- `scripts/run-solverv2-direct.mjs` for direct solver execution.
- `scripts/run-audit-export.mjs`, `scripts/run-ablation.mjs`, and `scripts/analyze-ablation.mjs` for audit/experiment workflows.
- `audits/` for existing solver/audit output examples.

### Plan

Create a solver package boundary:

- `modules/solver/model.js`
  - Solver input model.
  - Coordinate/key helpers.
  - Invariant checks.
- `modules/solver/prep.js`
  - Precomputed maps.
  - Masks.
  - Portal/filter indexes.
  - Distance maps.
- `modules/solver/policies.js`
  - Profiles.
  - Templates.
  - Attempt config generation.
- `modules/solver/search.js`
  - DFS/beam/search primitives.
  - Pruning rules.
  - Cancellation and budget checks.
- `modules/solver/traps.js`
  - Trap spot detection.
- `modules/solver/metrics.js`
  - Attempts.
  - Nodes expanded.
  - Timings.
  - Failure reasons.
- `modules/solver/worker.js`
  - Web Worker adapter.
- `modules/solver/contracts.js`
  - Candidate-path validation against domain rules.

Add benchmarks and regression gates:

- Representative easy, medium, hard, and pathological levels.
- Fixed budgets for CI-friendly checks.
- Longer scheduled benchmark jobs for solve-rate tracking.
- Stable JSON metric schemas for audit output.
- Regression thresholds for solve rates, timeouts, and nodes expanded.

### Deliverables

1. Extracted solver policy/config module.
2. Extracted solver prep and search modules.
3. Browser worker adapter and cancellation tests.
4. Solver benchmark corpus.
5. CI-friendly solver regression script.

### Suggested implementation slices

- **Small:** Extract policy profiles/templates/attempt config generation only, keeping `SolverV2.js` behavior identical.
- **Medium:** Extract solver prep and metrics modules.
- **Large:** Add worker execution and cancellation semantics after benchmark coverage exists.

### Acceptance criteria

- Solver public factory methods remain compatible.
- Existing hint oracle and domain tests pass.
- Any benchmark added has stable budgets appropriate for CI.
- Extracted modules do not introduce circular imports with browser/UI code.

### Payoff

- Better UI responsiveness.
- Safer solver tuning.
- Faster diagnosis of performance regressions.
- Clearer distinction between game rules and search heuristics.
- Easier future experimentation with alternate solvers.

### Suggested first PR

Extract policy profiles and attempt configuration into `modules/solver/policies.js`, then add a small fixed-budget benchmark that runs a representative subset of levels.

---

## 5. Strengthen quality gates, CI hygiene, and security/persistence boundaries

### Problem

The current checks are useful, but the tooling surface is incomplete and somewhat inconsistent. There are tests for startup, hints, and domain behavior, but there is no standard lint/typecheck/format baseline. Some package scripts reference files that are not present in this checkout. Persistence and Firestore behavior deserve automated tests because they protect progress, submissions, review actions, and published levels.

Security and persistence boundaries also need tightening and documentation. Firebase web API keys are not secrets by themselves, but config should be clearly named and handled as public runtime config rather than stored in a file named like a secret. Admin identity should not be hard-coded directly in security rules long-term, and submission read access should be revisited.

### Where to look first

- `package.json` for current scripts and dependencies.
- `.github/workflows/` for CI behavior.
- `scripts/domain-unit-tests.mjs`, `scripts/startup-smoke-test.mjs`, and `scripts/hint-path-oracle.mjs` for existing test style.
- `firestore.rules` for access rules.
- `modules/persistence/firebase-client.js` for Firebase initialization and auth behavior.
- `modules/persistence/progress-store.js`, `modules/persistence/level-submission-repository.js`, and `modules/persistence/review-repository.js` for data access semantics.
- `firebase-config.js` and `includes/secret.php` for runtime config handling.

### Plan

- Add standard quality commands:
  - `npm run lint`
  - `npm run typecheck` or `npm run check:types`
  - `npm run format:check`
  - `npm run test:unit`
  - `npm run test:e2e`
  - `npm run test:rules`
- Replace or wrap the custom test harness with Node's built-in test runner, Vitest, or another standard runner.
- Add a script-target existence check for package scripts.
- Remove, restore, or quarantine stale scripts.
- Add Playwright coverage for:
  - Boot.
  - Level load.
  - Path drawing.
  - Win modal.
  - Editor create/validate/export.
  - Submission flow with mocked persistence.
  - Review flow with mocked persistence.
- Add Firestore rules tests for:
  - User progress isolation.
  - Submission creation ownership.
  - Submission read policy.
  - Admin-only approve/reject/delete.
  - Public published-level reads.
- Replace hard-coded admin email checks with custom claims or environment-specific allowlists.
- Rename and document public Firebase runtime config.
- Consider duplicate detection through structural fingerprints or a backend function rather than broad pending-submission reads.

### Deliverables

1. Clean `package.json` scripts.
2. Script target existence check in CI.
3. Lint/typecheck/format baseline.
4. Firestore rules tests.
5. Playwright smoke and editor-flow tests.
6. Persistence/security documentation.

### Suggested implementation slices

- **Small:** Add a script that verifies referenced `node ...` script targets exist and wire it into CI.
- **Medium:** Add Firestore rules tests for current behavior without changing the rules.
- **Large:** Introduce lint/typecheck/format tooling and migrate custom tests to a standard runner.

### Acceptance criteria

- Package scripts either work, are removed, or are explicitly documented as unavailable legacy commands.
- Security-rule tests describe current intended behavior before any rule changes.
- Existing CI still passes.
- Public Firebase config is documented clearly and not represented as a private secret.

### Payoff

- Higher confidence during refactors.
- Easier onboarding.
- Fewer broken scripts.
- Better protection for user submissions and admin workflows.
- Clear distinction between public config and private credentials.

### Suggested first PR

Clean stale package scripts, add a check that declared script targets exist, and add Firestore rules tests for the current intended access model before changing the rules.

---

# Recommended implementation order

## Phase 1: Stabilize quality gates

- Clean or restore stale scripts.
- Add script-target existence checks.
- Add lint/typecheck/format commands.
- Keep the existing CI tests passing.
- Add a short contributor/testing guide.

**Success criteria:** CI is clearer, every declared script is either valid or intentionally documented, and future refactors have better guardrails.

## Phase 2: Formalize domain contracts

- Add level/state typedefs and validators.
- Validate bundled raw levels.
- Return structured parse errors internally.
- Freeze canonical levels in dev/test paths.
- Stop mutating canonical levels for play options.

**Success criteria:** Level shape errors are caught early, domain contracts are documented in code, and challenge variants are derived without corrupting canonical data.

## Phase 3: Extract engine effects

- Introduce action/effect types.
- Extract win handling, overlay transitions, sound, modal, and timer effects.
- Add DOM-free tests for reducer outputs.
- Keep the existing engine public API stable during migration.

**Success criteria:** Gameplay state transitions can be tested without browser adapters, and `engine.js` becomes smaller and easier to reason about.

## Phase 4: Separate app shell and dependencies

- Move bootstrap code out of `index.html`.
- Move large inline styles into CSS files.
- Add dependency/build strategy.
- Restrict global debug facade to dev mode.
- Define a CSP target.

**Success criteria:** HTML becomes mostly document structure, app boot is testable as a module, and runtime dependency loading is intentional.

## Phase 5: Modularize and benchmark the solver

- Extract policies, prep, search, traps, metrics, contracts, and worker adapter.
- Add fixed-budget benchmark checks.
- Add long-running scheduled benchmarks if CI supports them.
- Track solve-rate and performance regressions over time.

**Success criteria:** Solver behavior is easier to tune, UI responsiveness is protected, and performance regressions are measurable.

---

# Risk management

## Main risks

- Refactors may unintentionally alter puzzle mechanics.
- Solver performance may regress if modules are split without benchmark coverage.
- Freezing or cloning levels may reveal hidden mutation assumptions.
- Build tooling may introduce deployment differences.
- Firestore rule changes may break existing submission/review workflows.

## Mitigations

- Preserve compatibility facades while extracting internals.
- Add behavior-locking tests before changing implementation.
- Use small PRs with one architectural boundary per PR.
- Add benchmarks before solver rewrites.
- Add Firestore rules tests before changing access policies.
- Keep deployment behavior unchanged until the app-shell split is well covered by Playwright.

---

# Definition of done for the modernization effort

The modernization effort is complete when:

- Level and runtime-state contracts are explicit and validated.
- Core gameplay reducers can be tested without DOM, canvas, audio, timers, Firebase, or browser globals.
- Browser effects are adapters around pure state transitions.
- The app shell has a clear build/dependency boundary.
- Solver internals are modular, benchmarked, and worker-capable.
- CI includes unit, browser, quality, script-hygiene, and security-rule checks.
- Package scripts are accurate and documented.
- Persistence/security behavior is documented and tested.
- Future contributors can understand the codebase architecture from documentation plus module boundaries.

---

# Immediate next actions

These are the best small-to-medium first tasks for a future agent:

1. Create a script-target existence check and run it in CI.
2. Add level schema typedefs/validators and validate bundled levels.
3. Extract a small effect runner from engine win/overlay/hazard paths.
4. Move bootstrap code from `index.html` into a dedicated app module.
5. Extract solver policies into a dedicated solver module and add a fixed-budget benchmark subset.

For any of these tasks, update this plan if implementation discoveries change the recommended order or reveal constraints not captured here.
