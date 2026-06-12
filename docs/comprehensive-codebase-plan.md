# Pathfinder Codebase Modernization Plan

## How to use this document

This plan is written for a future AI coder or human contributor who has no context from the review conversations that produced it. Treat it as a roadmap, not as a mandate to implement everything in one pull request.

When taking work from this plan:

1. Pick **one bounded slice** from the phase list or "Suggested first PR" sections.
2. Inspect the referenced files before editing; this document names likely starting points.
3. Preserve existing behavior unless the task explicitly says to change behavior.
4. Add or update tests before large refactors, especially for gameplay rules, persistence, and solver behavior.
5. Keep compatibility facades in place while moving internals, so browser behavior and developer tooling continue to work.
6. Prefer normal ESM imports and injected adapters over VM hacks, browser globals, and side-effect script loading.
7. Run `npm run ci` before handing off changes unless the task is documentation-only or an environment limitation prevents it.

## Purpose

This document captures a prioritized modernization plan for improving Pathfinder's architecture, efficiency, robustness, future-proofing, comprehensibility, testability, and production readiness. It incorporates two independent reviews of the current browser app, domain/runtime modules, solver, persistence layer, tests, package scripts, security rules, dependency loading, and audit workflow.

The overall conclusion is sharper after the second review: the codebase has clearly benefited from real refactoring, but it still carries several prototype-era or "vibe-coded" fingerprints. The most important issues are not isolated style problems; they are boundary and operational problems: a hand-wired page-level composition root, a broad engine facade, mutable shared state, browser-global data loading, drifted tooling, a large heuristic solver module, generated audit artifacts in source history, and inconsistent production/security hardening.

## Current repo map

Use this map to orient yourself before making changes:

- `index.html` contains document markup, large inline style definitions, CDN dependencies, module imports, app bootstrap wiring, circular/lazy subsystem references, and the `window.APP` debug facade.
- `modules/core.js` defines core constants, mode/status enums, deep clone helper, and the browser audio bus.
- `modules/state.js` creates the top-level mutable `ENGINE` state object.
- `modules/boot.js` owns startup sequencing and the `window.onload` handler factory.
- `modules/engine.js` is the main gameplay orchestration facade. It currently coordinates runtime rules, navigation, UI effects, persistence, solver state, hints, review mode, editor mode, modal flows, sounds, and animation/render invalidation.
- `modules/data.js` and `modules/loader.js` are important boundary files for data loading. They currently interact with browser-global level/theme data and dynamic script loading.
- `modules/domain/` contains mostly pure helpers for level codec, movement rules, geometry, portal utilities, path validation, fingerprinting, and level validation.
- `modules/runtime/` contains extracted gameplay/runtime logic such as game rules, path state operations, step processing, and logic-state transitions.
- `modules/render/` and `modules/renderer.js` contain canvas rendering and render-model creation.
- `modules/ui/` and `modules/ui.js` contain DOM utilities, modal/toast/loading/overlay/layout helpers, and the UI facade used by engine/controllers.
- `modules/input/` and `modules/input.js` contain keyboard, pointer, gamepad, solver, options, review, submission, and editor-toolbar controllers.
- `modules/editor/` and `modules/editor.js` contain editor state, occupancy, validation/history/export helpers, and the editor facade.
- `modules/persistence/` and `modules/persistence.js` contain local session/progress stores, Firebase client setup, submission repository, and review repository.
- `SolverV2.js` contains the current solver implementation and public solver factory.
- `levels.js` and `themes.js` contain bundled level/theme data and should eventually stop relying on global side effects.
- `scripts/` contains test, audit, solver, import, and diagnostic scripts.
- `audits/` contains generated audit output that is currently tracked in source history.
- `firestore.rules` and `firestore.indexes.json` define Firebase/Firestore behavior.
- `firebase-config.js` and `includes/secret.php` are part of runtime config/secret-hygiene review.

## Current strengths

- Domain and runtime logic has started moving out of browser glue code into focused modules.
- The project has meaningful behavior-locking scripts for startup, hints, and domain/runtime mechanics.
- Level normalization, movement rules, validation, rendering, input, persistence, editor operations, and themes are no longer all in one monolithic script.
- The solver has a clear public factory and useful test/analysis hooks.
- The codebase is still small enough that architectural improvements can be made incrementally.

## Known review findings to preserve

These facts were observed during review and are useful context for future agents:

- `npm run ci` passed during review. It ran startup smoke, hint-path oracle, and domain unit tests.
- `package.json` declares additional audit and legacy scripts. Some referenced targets were not present in the reviewed checkout, including:
  - `scripts/run-level-audit.mjs`
  - `scripts/analyze-audit-failures.mjs`
  - `scripts/check-persistent-hard-levels.mjs`
  - `scripts/check-regression-levels.mjs`
  - `scripts/audit-heuristic-recall.mjs`
  - `LegacySolver/solver-smoke-test.mjs`
- `startup-smoke-test.mjs` uses VM/regex-style import/export stripping. Treat this as a useful rescue harness, not as the desired long-term testing model.
- `includes/secret.php` stores a Firebase API-key-like value. Firebase web API keys are normally public identifiers rather than private secrets, but the filename and storage pattern are misleading and should be clarified or removed.
- `firestore.rules` currently hard-codes a single admin email and allows authenticated users to read submissions. Do not change this casually; add rules tests first and confirm intended product behavior.
- `index.html` currently loads Tailwind, Tone.js, Firebase compat SDKs, and Google Fonts from external CDNs without an obvious bundled/SRI/CSP strategy.
- UI code includes `innerHTML` paths. Some may be safe because they render trusted internal markup, but dynamic/user/server-provided strings should move to text-node rendering by default.
- Generated audit JSON is tracked in the repo. Decide intentionally which audit fixtures belong in source and which should be CI artifacts or release artifacts.

## How the second report changes the plan

The second review largely validates the earlier observations but improves the priorities. My original plan emphasized typed domain contracts and reducer/effects architecture. Those are still important, but the report makes clear that the first remediation wave should also remove obvious operational drift and unsafe boundaries before deep architecture work.

The updated priority is:

1. **Stabilize drift and production hygiene first**: broken scripts, misleading secret-like files, unsafe dynamic HTML patterns, and missing checks are low-risk/high-signal fixes.
2. **Make the app importable and testable**: move away from global data side effects, dynamic script injection, Firebase globals, and VM-based smoke harnesses.
3. **Then split state and engine responsibilities**: a reducer/effects architecture is easier once browser/data/persistence boundaries are injectable.
4. **Professionalize solver and audit workflows**: modularize the solver and keep generated outputs out of normal source churn.
5. **Finish with stronger production hardening**: CSP, dependency pinning/bundling/SRI, secret scanning, and Firestore authorization improvements.

## Guiding principles

1. **Make contracts explicit.** Level data, theme data, runtime state, solver input/output, persistence payloads, and audit output should be validated and documented.
2. **Keep pure logic pure.** Gameplay rules, state transitions, validation, and solver contracts should be testable without DOM, canvas, audio, timers, Firebase, or browser globals.
3. **Move effects to the edge.** UI rendering, modals, audio, persistence, timers, data loading, and browser APIs should be adapters around a pure core.
4. **Prefer incremental compatibility.** Existing factory APIs, `window.APP`, and browser behavior should remain stable while internals are extracted behind them.
5. **Automate confidence.** Every major refactor should be backed by unit, integration, browser, security-rule, and benchmark checks.
6. **Avoid rewrites without characterization tests.** The puzzle rules and solver heuristics are subtle; preserve behavior first, then refactor.
7. **Do not normalize unsafe patterns.** Browser globals, broad mutable state, dynamic `innerHTML`, CDN supply-chain assumptions, and generated source churn should be treated as migration targets.

---

# Top 5 Big Changes

## 1. Create a real application architecture and composition boundary

### Problem

The browser entry point and engine are still doing too much. `index.html` is markup, style host, dependency loader, app composition root, lazy circular dependency resolver, `window.onload` assignment point, and debug facade. `modules/engine.js` is likewise a broad "god engine" that mixes game runtime, UI effects, persistence effects, review mode, editor mode, solver lifecycle, hints, sounds, modal flows, and path navigation.

The single mutable `ENGINE` state object makes feature ownership unclear and lets unrelated modules depend on the same large state shape.

### Where to look first

- `index.html` for inline composition, lazy `_themes`/`_renderer`/`_persistence`/`_engine`/`_editor` references, and `window.APP` exposure.
- `modules/engine.js` for the broad engine facade and side-effect orchestration.
- `modules/state.js` for the top-level mutable `ENGINE` object.
- `modules/boot.js` for startup sequencing and onload handling.
- `modules/input/`, `modules/editor.js`, `modules/persistence.js`, and `modules/ui.js` for subsystems currently wired directly into engine/app construction.

### Plan

- Move bootstrap code from `index.html` to `modules/app/create-app.js` or `modules/app.js`.
- Keep a tiny import-only script in `index.html` during the first migration.
- Replace circular/lazy composition comments with explicit dependency inversion:
  - small callback interfaces,
  - event/command dispatcher,
  - or narrowly scoped service interfaces.
- Split `ENGINE` into smaller stores or state slices:
  - `gameSession`
  - `navigation`
  - `editorSession`
  - `reviewSession`
  - `solverSession`
  - `uiSession`
  - `deviceInput`
  - `runtimeConfig`
- Narrow `createEngine()` to game runtime and path execution.
- Move review administration, editor workflows, solver orchestration, and modal-specific flows into dedicated controllers/services.
- Introduce JSDoc interfaces for subsystem boundaries before considering TypeScript.

### Suggested implementation slices

- **Small:** Move only the inline module bootstrap from `index.html` into `modules/app.js`; leave CSS, markup, dependencies, and `window.APP` behavior unchanged.
- **Medium:** Define interfaces/callback objects for engine dependencies and remove one lazy circular reference.
- **Large:** Split `ENGINE` into named state slices and move review/editor/solver orchestration out of `engine.js`.

### Acceptance criteria

- App boots the same way in browser and startup smoke tests.
- `window.APP` remains available unless the task explicitly changes debug behavior.
- No dependency-loading strategy changes are mixed into the initial bootstrap extraction PR.
- Existing public engine methods continue to work during migration.
- `npm run ci` passes.

### Suggested first PR

Create `modules/app.js`, move the current app construction code out of `index.html`, and keep behavior unchanged. This creates a real composition-root file without attempting the deeper state/engine split yet.

---

## 2. Seal leaky module boundaries around data, DOM, globals, and mutation

### Problem

Several modules look modular but still rely on browser globals, side-effect data loading, direct DOM mutation, dynamic HTML strings, or shared mutable objects. `levels.js` and `themes.js` populate global data. The loader dynamically injects scripts. Firebase is loaded as compat scripts and used through the global `firebase` object. UI helpers sometimes write `innerHTML`, including paths that may eventually receive server/user-provided text.

These patterns make tests harder, weaken CSP/supply-chain posture, and blur the boundary between pure logic, rendering, persistence, and data loading.

### Where to look first

- `modules/data.js` for level/theme access and any `window.LEVELS`, `window.RAW_LEVELS`, or `window.THEMES` assumptions.
- `modules/loader.js` for dynamic script injection of `levels.js` and `themes.js`.
- `levels.js` and `themes.js` for current data export/global patterns.
- `modules/ui.js` and `modules/ui/` for direct DOM writes and `innerHTML` usage.
- `modules/persistence/firebase-client.js` for global Firebase compat usage.
- `modules/domain/level-codec.js`, `modules/domain/level-validation.js`, and `modules/theme/theme-normalizer.js` for boundary validation.

### Plan

- Convert level and theme data to ESM exports or versioned JSON assets.
- Make `createData()` accept levels/themes as parameters instead of reading from `window`.
- Replace dynamic script injection with static imports or explicit fetch of versioned JSON assets.
- Add validators for loaded levels and themes at the boundary.
- Create safe DOM utilities for dynamic text/list rendering that use `textContent` or text nodes by default.
- Restrict `innerHTML` to explicitly reviewed, trusted markup paths.
- Move Firebase to ESM SDK imports or a persistence adapter that can be mocked without global browser scripts.
- Replace mutation of canonical level objects with derived variants or explicit cloned state.

### Suggested implementation slices

- **Small:** Add a safe DOM helper for rendering detail lists as text nodes and migrate one dynamic `innerHTML` caller.
- **Small:** Add JSDoc typedefs and validator helpers for raw levels/themes without changing call sites.
- **Medium:** Make `createData()` accept injected level/theme data while keeping a compatibility fallback for current globals.
- **Large:** Convert `levels.js` and `themes.js` to ESM/JSON and remove dynamic script injection.

### Acceptance criteria

- Dynamic user/server-facing strings are rendered as text, not HTML.
- Existing level/theme loading behavior remains compatible until the global path is intentionally removed.
- All bundled levels and themes validate at startup or in CI.
- Firebase can be mocked in tests without loading global compat scripts.
- `npm run ci` passes.

### Suggested first PR

Add a safe text rendering utility and migrate the submit-step detail renderer away from raw `innerHTML` for dynamic detail strings. This is a low-risk security hardening step before larger data-loading changes.

---

## 3. Fix tooling, CI, script drift, and test architecture

### Problem

`package.json` contains scripts that reference files not present in the repository. CI currently runs useful checks, but it does not include lint, type checking, format checking, bundle/build checks, browser e2e tests, dependency checks, or dead-script checks. Existing custom harnesses are valuable but also show that modules are not yet easy to import and test normally.

### Where to look first

- `package.json` for scripts and dependencies.
- `.github/workflows/` for CI behavior.
- `scripts/startup-smoke-test.mjs` for the VM/regex harness.
- `scripts/domain-unit-tests.mjs` for the custom domain test harness and stubs.
- `scripts/hint-path-oracle.mjs` for hint validation.
- Missing script targets listed in "Known review findings" above.

### Plan

- Remove, restore, or quarantine package scripts whose targets are missing.
- Add `check:dead-scripts` that fails when a `node <path>` package script references a missing file.
- Add minimum quality gates:
  - `lint`
  - `format:check`
  - `test:unit`
  - `test:e2e`
  - `check:deps`
  - `check:dead-scripts`
- Ensure the GitHub workflow runs the same top-level `npm run ci` that developers run locally.
- Migrate custom tests gradually to a standard runner such as Node's built-in test runner or Vitest.
- Add Playwright browser flows for boot, level load, path drawing, win modal, editor create/validate/export, submission flow, and review flow.
- Replace VM/regex import-stripping smoke tests after browser globals and data loading are behind injectable adapters.

### Suggested implementation slices

- **Small:** Add a script that verifies referenced `node ...` script targets exist and wire it into CI.
- **Small:** Remove or document legacy scripts for absent `LegacySolver` paths if that directory is intentionally gone.
- **Medium:** Add a real unit test runner while keeping the current scripts as compatibility wrappers.
- **Large:** Replace the VM startup smoke harness with normal ESM tests after app/data/persistence boundaries are injectable.

### Acceptance criteria

- Package scripts either work, are removed, or are explicitly documented as unavailable legacy commands.
- CI runs the same top-level command documented for developers.
- New quality gates do not produce noisy false positives.
- Existing tests continue to pass.
- `npm run ci` passes.

### Suggested first PR

Add `scripts/check-package-scripts.mjs` to verify package script file targets, add `check:dead-scripts`, and include it in CI. Decide separately whether to remove or restore each stale script.

---

## 4. Professionalize SolverV2 and the audit workflow

### Problem

`SolverV2.js` is a large heuristic subsystem in a single file. It combines solver-level normalization, encoding assumptions, policy profiles, structural templates, search variants, trap detection, metrics, public API, and test/ablation internals. The public factory exposes private-ish helpers for analysis, which is understandable during experimentation but risky as a long-term API.

The repo also tracks generated audit JSON. This creates source-history noise and can obscure meaningful code changes unless intentionally curated.

### Where to look first

- `SolverV2.js` for the current solver implementation and public API.
- `modules/domain/path-validator.js` for candidate-path validation.
- `modules/domain/move-rules.js` and `modules/domain/move-context.js` for movement legality.
- `scripts/run-solverv2-direct.mjs` for direct solver execution.
- `scripts/run-audit-export.mjs`, `scripts/run-ablation.mjs`, and `scripts/analyze-ablation.mjs` for audit/experiment workflows.
- `audits/` for generated audit output examples.
- `.gitignore` for what generated artifacts are or are not excluded.

### Plan

Split the solver into modules by concern:

- `modules/solver/model.js`
- `modules/solver/normalization.js`
- `modules/solver/search/beam.js`
- `modules/solver/search/dfs-lds.js`
- `modules/solver/heuristics/profiles.js`
- `modules/solver/heuristics/templates.js`
- `modules/solver/traps.js`
- `modules/solver/metrics.js`
- `modules/solver/public-api.js`
- `modules/solver/contracts.js`

Keep a narrow runtime public interface:

- `prepareLevelForSolver`
- `solve`
- `findTrapSpots`
- `validateCandidatePath`

Put ablation-only internals behind a separate tooling/test import path. Move policy profiles and templates into data modules with documented meaning and tests. Track a small curated regression fixture set in source, but store routine generated audit runs as CI artifacts or release artifacts rather than normal source commits.

### Suggested implementation slices

- **Small:** Extract policy profiles/templates/attempt config generation only, keeping `SolverV2.js` behavior identical.
- **Small:** Document which audit files are curated fixtures versus generated outputs.
- **Medium:** Extract metrics and normalization modules.
- **Large:** Add worker execution and cancellation semantics after benchmark coverage exists.

### Acceptance criteria

- Solver public factory methods remain compatible.
- Existing hint oracle and domain tests pass.
- Any benchmark added has stable budgets appropriate for CI.
- Extracted modules do not introduce circular imports with browser/UI code.
- Generated audit-output policy is documented and enforced by `.gitignore` or CI.

### Suggested first PR

Extract policy profiles and templates into `modules/solver/heuristics/` while leaving the public API and solve behavior unchanged. Add a small test or snapshot proving generated attempt configs are unchanged.

---

## 5. Harden security, persistence, dependencies, and production operations

### Problem

The app currently loads third-party scripts from public CDNs without an obvious SRI/bundling/CSP strategy. Firebase config is committed, which is usually acceptable for Firebase web config, but `includes/secret.php` looks like a secret and should not remain ambiguous. Firestore rules hard-code a personal admin email and allow authenticated users to read all pending submissions. UI dynamic HTML patterns increase risk if user/server-provided content reaches those paths.

### Where to look first

- `index.html` for CDN scripts and styles.
- `firebase-config.js` and `includes/secret.php` for config/secret hygiene.
- `firestore.rules` for read/write authorization.
- `modules/persistence/firebase-client.js`, `modules/persistence/progress-store.js`, `modules/persistence/level-submission-repository.js`, and `modules/persistence/review-repository.js` for persistence semantics.
- `modules/ui.js` and `modules/ui/` for dynamic HTML rendering.
- `.github/workflows/` for possible secret scanning and dependency checks.

### Plan

- Remove `includes/secret.php` unless there is a documented, non-secret reason for it.
- Add secret scanning to CI.
- Bundle third-party dependencies or pin CDN dependencies with SRI.
- Add a Content Security Policy compatible with the app's real needs.
- Replace hard-coded admin email checks with custom claims, deployment-specific allowlists, or a locked-down admin allowlist document.
- Avoid broad reads of pending submissions if possible; use indexed duplicate-check endpoints, sanitized fingerprints, or a server-side function.
- Add Firestore rules tests before changing access policies.
- Replace dynamic `innerHTML` for user/server-facing strings with text-node construction.
- Document what Firebase web config values are public and what values must never be committed.

### Suggested implementation slices

- **Small:** Remove or document `includes/secret.php` and add a short public-config/secret-hygiene note.
- **Small:** Add Firestore rules tests that lock current behavior before changing the rules.
- **Medium:** Add secret scanning and dependency checks to CI.
- **Large:** Move Firebase to ESM imports/adapters and replace hard-coded admin identity with claims/allowlist infrastructure.

### Acceptance criteria

- Security-rule tests describe current intended behavior before any rule changes.
- Public Firebase config is documented clearly and not represented as a private secret.
- Secret scanning runs in CI or is documented if unavailable.
- CDN dependency strategy is explicitly pinned, bundled, or tracked as an accepted risk.
- `npm run ci` passes.

### Suggested first PR

Add Firestore rules tests for the current access model and document Firebase public config versus secrets. Do not change rules until the tests make current behavior explicit.

---

# Recommended remediation roadmap

## Phase 1: Stabilize and remove obvious drift

- Delete, restore, or document all package scripts that point to missing files.
- Add a CI check that verifies every `node <path>` in `package.json` exists.
- Remove or document `LegacySolver` scripts if that directory is intentionally gone.
- Remove `includes/secret.php` or document why it is not secret.
- Add a lint rule or simple scanner forbidding unsafe dynamic `innerHTML` except in explicitly reviewed files.
- Document which audit outputs are curated source fixtures and which are generated artifacts.

**Success criteria:** Developers can trust package scripts, obvious secret-hygiene ambiguity is gone, unsafe dynamic HTML has a migration path, and CI catches future script drift.

## Phase 2: Make the app importable and testable

- Move bootstrap from inline `index.html` into a JS module.
- Convert levels/themes from global script side effects into ESM exports or JSON fetches.
- Make Firebase an injected adapter, not a global.
- Replace VM/regex import-stripping smoke tests with normal ESM tests once boundaries allow it.
- Add validators for loaded levels/themes.

**Success criteria:** App construction can be imported by tests, loaded data has explicit contracts, and browser globals are compatibility fallbacks rather than primary architecture.

## Phase 3: Split state and engine responsibilities

- Create separate state modules for game, editor, review, solver, UI, and input.
- Introduce command-style methods or reducer/effect actions instead of direct mutation of one `ENGINE` object.
- Shrink `createEngine()` to game runtime and path execution.
- Move review, editor, solver, and modal orchestration into separate controllers/services.

**Success criteria:** Gameplay state transitions can be tested without browser adapters, and `engine.js` becomes narrower and easier to reason about.

## Phase 4: Professionalize solver development

- Split `SolverV2.js` by concern.
- Document each heuristic profile and template.
- Create a curated solver regression suite from representative levels.
- Move routine generated audit outputs out of normal source commits.
- Keep ablation tooling separate from runtime API.

**Success criteria:** Solver behavior is easier to tune, UI responsiveness is protected, private internals stop becoming accidental public API, and performance regressions are measurable.

## Phase 5: Production hardening

- Add CSP.
- Pin or bundle third-party dependencies.
- Add secret scanning.
- Review Firestore read/write rules against a written threat model.
- Replace hard-coded personal admin authorization with claims or allowlist infrastructure.
- Avoid broad pending-submission reads unless explicitly justified by the threat model.

**Success criteria:** Deployment risks are documented and reduced, authorization is portable beyond one personal email, and security-sensitive behavior is covered by tests.

---

# Risk management

## Main risks

- Refactors may unintentionally alter puzzle mechanics.
- Solver performance may regress if modules are split without benchmark coverage.
- Freezing or cloning levels may reveal hidden mutation assumptions.
- Build tooling may introduce deployment differences.
- Firestore rule changes may break existing submission/review workflows.
- Removing generated audit files without a policy may lose useful regression context.

## Mitigations

- Preserve compatibility facades while extracting internals.
- Add behavior-locking tests before changing implementation.
- Use small PRs with one architectural boundary per PR.
- Add benchmarks before solver rewrites.
- Add Firestore rules tests before changing access policies.
- Keep deployment behavior unchanged until the app-shell split is covered by Playwright.
- Separate curated fixtures from routine generated audit artifacts before changing `.gitignore`.

---

# Definition of done for the modernization effort

The modernization effort is complete when:

- Package scripts are accurate, documented, and checked by CI.
- Level, theme, runtime-state, solver, persistence, and audit contracts are explicit and validated.
- App composition lives in an importable module rather than inline `index.html` bootstrap code.
- Core gameplay reducers/services can be tested without DOM, canvas, audio, timers, Firebase, or browser globals.
- Browser effects are adapters around pure state transitions.
- Level/theme loading no longer depends on global side effects as the primary path.
- Solver internals are modular, benchmarked, and worker-capable.
- Routine generated audit artifacts no longer create normal source-history noise.
- CI includes unit, browser, quality, dependency, script-hygiene, secret-scan, and security-rule checks.
- Persistence/security behavior is documented and tested.
- Future contributors can understand the codebase architecture from documentation plus module boundaries.

---

# Immediate next actions

These are the best small-to-medium first tasks for a future agent:

1. Add `check:dead-scripts` and fix or document stale `package.json` commands.
2. Remove or document `includes/secret.php`, and add a short Firebase public-config/secret-hygiene note.
3. Add a safe DOM text-rendering helper and migrate one dynamic detail-rendering path away from raw `innerHTML`.
4. Move bootstrap code from `index.html` into a dedicated app module without changing runtime behavior.
5. Make `createData()` accept injected levels/themes while preserving current global fallback behavior.
6. Add Firestore rules tests for the current access model before changing rules.
7. Extract solver policy profiles/templates into dedicated modules with behavior-preserving tests.
8. Document audit artifact policy and separate curated fixtures from generated run outputs.

For any of these tasks, update this plan if implementation discoveries change the recommended order or reveal constraints not captured here.
