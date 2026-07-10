# Pathfinder Modernization Plan

This plan translates the architecture review's "top big changes" into a concrete, staged modernization program. It is intentionally product- and engineering-focused rather than cosmetic: each section defines the desired future state, why it matters, implementation phases, risks, and a completion spec that describes what it means for the spirit and intent of the section to be fully satisfied.

The plan is not a mandate to rewrite the application in one large pass. Pathfinder already has meaningful cleanup work in place: staged app construction, state-action boundaries, modular solver internals, accessibility checks, secret-hygiene checks, and extensive custom test scripts. The goal is to finish the transition from a static-browser-app codebase with historically organic coupling into a durable, secure, testable, and comprehensible application architecture.

## Guiding Principles

1. **Preserve playable behavior.** Refactors should not change puzzle rules, bundled level behavior, accepted paths, solver correctness, saved progress semantics, or editor/review workflows unless a change is explicitly product-approved.
2. **Prefer narrow interfaces over broad object sharing.** Controllers should receive only the methods and values they need. Passing `state`, `engine`, `ui`, or `persistence` wholesale should become the exception, not the default.
3. **Make side effects explicit.** DOM writes, audio, timers, network calls, persistence, worker messages, and browser globals should live at the edges behind adapters.
4. **Make state transitions inspectable.** Important game/editor/review state changes should be expressible as commands, actions, or pure transitions that can be unit-tested without booting the full browser app.
5. **Use documentation as a contract, not a journal.** Current architecture docs should describe what is true now. Historical notes should live separately as ADRs or dated refactor logs.
6. **Improve safety incrementally.** Every phase should leave the app deployable and testable; compatibility shims are allowed when they reduce migration risk, but each shim must have an owner and removal plan.
7. **Keep the app static-hosting friendly.** Modernization should not assume a server-rendered app or private backend unless the product/security model deliberately changes.

---

## 1. Finish Architecture Boundary Work

### Intent

Complete the separation between pure domain logic, browser adapters, controllers, and public/debug facades. The current composition root documents staged construction and remaining dependency cycles. This section turns that partial improvement into a stable architectural boundary that future features can follow.

### Current Problem Shape

The app still relies on lazy getters and late injection to resolve coupling among UI, renderer, themes, persistence, editor, and engine. This is manageable but fragile: construction order matters, tests need broad mocks, and new code is tempted to pass entire subsystems rather than narrow ports.

### Target Architecture

The app should be organized into four conceptual layers:

1. **Domain/services layer**
   - Puzzle rules, path validation, level normalization, solver policy, theme normalization, pure state transitions.
   - No DOM, canvas, Firebase, `window`, `document`, timers, or audio dependencies.
2. **Browser adapter layer**
   - DOM querying/manipulation, canvas rendering, audio, localStorage/sessionStorage, Firebase client, Worker client, timers, viewport APIs.
   - Adapters expose small capability interfaces rather than raw globals.
3. **Controller/application layer**
   - Coordinates domain services and browser adapters.
   - Receives explicit ports; does not import browser globals directly unless it is itself an adapter.
4. **Facade/debug layer**
   - Builds production diagnostics and opt-in debug surfaces after all internals are wired.
   - Exposes immutable snapshots by default.

### Implementation Plan

#### Phase 1: Inventory and port definitions

- Create an architecture inventory table for every controller and subsystem:
  - Constructor inputs.
  - Imported globals.
  - Methods actually called on each dependency.
  - State slices read and written.
- Define named port typedefs or TypeScript-style JSDoc contracts for high-traffic seams:
  - `RendererPort`
  - `UiPort`
  - `ThemePreferencePort`
  - `PersistencePort`
  - `EditorRuntimePort`
  - `EngineCommandPort`
  - `BrowserEnvironmentPort`
- Mark each port as either domain-safe, browser-only, or test-only.

#### Phase 2: Remove remaining construction/runtime cycles

- Replace `ui -> renderer` lazy access with an explicit renderer callback port or a presentation event channel.
- Replace `themes -> persistence` and `persistence -> themes` mutual knowledge with a theme preference service:
  - Persistence stores and loads theme IDs/preferences.
  - Theme registry resolves IDs to theme objects.
  - Neither layer needs to call back into the other at construction time.
- Finish `editor -> engine` separation:
  - Keep the current editor runtime port shape, but make it the only editor-facing engine contract.
  - Move shared operations into domain/application services where possible.
  - Ensure editor construction no longer requires a later `init` call to become valid.

#### Phase 3: Enforce boundaries

- Add static checks that prevent imports from lower layers into higher-risk directions, for example:
  - Domain modules cannot import UI, renderer, persistence, or browser adapters.
  - Browser adapters cannot import application controllers unless explicitly allowed.
  - Controllers cannot import raw Firebase/browser globals directly.
- Add focused unit tests for composition:
  - App can construct with fake adapters.
  - Each controller can construct with only its declared port.
  - Production diagnostics returns clones, not live state.

#### Phase 4: Remove compatibility shims

- Keep backwards-compatible facades while callers migrate.
- Track every broad facade or compatibility alias in a removal checklist.
- Remove shims once all callers use grouped/narrow APIs.

### Risks and Mitigations

- **Risk:** Refactors accidentally change runtime behavior.
  - **Mitigation:** Add characterization tests before moving each seam.
- **Risk:** Port definitions become verbose boilerplate.
  - **Mitigation:** Define ports only at meaningful boundaries, not for every helper function.
- **Risk:** Over-abstracting a small app.
  - **Mitigation:** Keep direct references within a layer; abstract only cross-layer dependencies.

### Completion Spec

This section is fully satisfied when:

- The app composition root can construct all subsystems without mutable forward declarations, hidden lazy construction dependencies, or required post-construction initialization to complete circular dependencies.
- Every controller constructor accepts narrow, documented ports rather than entire broad subsystems unless a written exception explains why the broad dependency is intentional.
- Domain/service modules are demonstrably browser-free: no `window`, `document`, canvas, Firebase, Tone.js, localStorage, timers, or network access outside explicitly injected adapters.
- Static checks enforce the layer boundaries and run in the default `check` script.
- Tests prove that the app can be constructed with fake browser adapters and that the production diagnostics facade exposes only cloned, read-only snapshots.
- Any retained compatibility facade has a documented migration path, an owner, and a removal condition.
- A new contributor can read the architecture document and understand where to place domain logic, browser integration, controller orchestration, and debug/facade code without inspecting historical refactor notes.

---

## 2. Make Engine State Transitions Explicit

### Intent

Evolve the single mutable `ENGINE` tree into a system where correctness-sensitive state changes have named, inspectable semantics and pure core logic where practical. The existing state-action helpers, runtime actions, and effect runner are the foundation; this section should refine and extend them, not replace them with a second app-wide reducer or dispatcher framework.

### Current Problem Shape

`ENGINE` is a large mutable object containing top-level mode, level, nav, hazards, solver state, UI state, runtime state, editor state, review state, gamepad state, and level-rating state. The code documents ownership and derived fields, but correctness still depends heavily on discipline: callers must mutate through the right action helper and recompute derived state at the right time. Some flows already have suitable local controllers/actions/effects, so the modernization target is consistency and testability at those seams, not centralization for its own sake.

### Target Architecture

Important runtime changes should follow this pattern at the flow boundary where it adds clarity:

```text
User/system event -> Named flow action -> Pure transition or derivation -> State update + Effects -> Existing effect runner/adapters
```

The "named flow action" can be an existing `ActionType`, an existing state-action helper, or a local flow-specific command object. It does **not** require a single global dispatch function, a central cross-flow reducer, or a universal event log. Use the lightest mechanism that makes the flow testable and prevents hidden state drift.

Examples of names that should be documented consistently, whether implemented as existing action constants, state-action helpers, or local command objects:

- `LOAD_LEVEL`
- `SWITCH_MODE`
- `START_PATH_AT_GATE`
- `ADD_PATH_STEP`
- `UNDO_PATH_STEP`
- `RESET_RUN`
- `TRIGGER_GOOSE`
- `TRIGGER_FALSE_GOAL`
- `SOLVER_STARTED`
- `SOLVER_COMPLETED`
- `SUBMIT_LEVEL_REQUESTED`
- `REVIEW_APPROVE_CONFIRMED`

### Implementation Plan

#### Phase 1: Classify state

- Update state docs so every field is classified as:
  - Authoritative persistent state.
  - Authoritative runtime state.
  - Derived state.
  - Ephemeral UI/input state.
  - External/cache state.
- Identify which module owns each write.
- Identify derived fields that must be recomputed rather than directly authored.

#### Phase 2: Define flow vocabulary without centralizing dispatch

- Create a canonical glossary of action/command names for engine, editor, review, solver, and persistence flows.
- Map each glossary entry to its actual implementation location: existing runtime action, state-action helper, controller method, or small flow-local command object.
- Keep names domain-specific and user-action-oriented.
- Avoid encoding DOM details into commands.
- Define payload schemas only for commands/actions that cross module boundaries or need replay-style tests.
- Do not introduce a global dispatcher/reducer solely to satisfy this vocabulary; the vocabulary is a documentation and testability tool, not a mandate for a parallel state-management system.

#### Phase 3: Convert high-value flows

Start with the flows that are most correctness-sensitive:

1. Path creation and movement.
2. Undo/reset/rebuild derived path state.
3. Win-condition handling.
4. Hazard triggering and recovery.
5. Level loading and mode switching.
6. Solver lifecycle.
7. Submission/review approval workflow.

For each flow:

- Write characterization tests around current behavior.
- Extract pure transition/derivation functions for the parts that decide game state, validation results, or effects.
- Keep orchestration in the owning controller when that is simpler than routing through a generic dispatcher.
- Return effects as data for side effects that are part of the correctness contract; continue using existing effect-runner/adapters rather than creating a parallel effect system.
- Remove or narrow old imperative wrappers after callers migrate.

#### Phase 4: Add invariants and replay tools

- Add invariant tests for path-derived fields:
  - `visitedCounts`
  - `cellUsage`
  - `intersections`
  - `flipCount`
  - `crossedFlippingFilters`
- Add focused replay helpers for flows that benefit from them, especially path movement and reset/undo behavior.
- If a debug transition log is added, scope it to the migrated flow or to an existing debug surface; it is optional and should not require all flows to route through one global dispatcher.

### Risks and Mitigations

- **Risk:** State patches become harder to read than direct mutation.
  - **Mitigation:** Use commands only for significant state changes; small local UI state may remain imperative.
- **Risk:** Transition/effect split duplicates existing effect infrastructure or creates a parallel reducer system.
  - **Mitigation:** Extend the existing runtime action/effect vocabulary and flow-local controllers rather than inventing a separate global dispatcher.
- **Risk:** Performance regressions from copying large state objects.
  - **Mitigation:** Start with patch-style updates and pure derivations; introduce immutable state only where it is affordable and useful.

### Completion Spec

This section is fully satisfied when:

- Gameplay-critical state changes have documented names and payload/argument contracts at the boundaries where they cross modules or need characterization tests.
- Path movement, undo, reset, hazard handling, win handling, level switching, solver lifecycle, and review approval can be tested through pure transition/derivation functions or through narrow controller ports without booting the DOM app.
- Derived navigation fields are recomputed in one authoritative place and cannot silently diverge from `nav.path` in tests.
- Side effects produced by core transitions are represented as data when they are part of the correctness contract and are executed by existing effect runners/adapters.
- Existing state-action helpers either wrap extracted logic or remain explicit ownership-preserving mutation helpers; they do not need to be replaced by a universal reducer.
- The default test suite includes invariant tests that fail if authoritative and derived state drift apart.
- Debugging a complex migrated flow can be done by inspecting that flow's named actions/effects or replay helper rather than stepping through scattered imperative mutations.
- No new central dispatcher, app-wide reducer, or mandatory global transition log exists solely to satisfy this spec.

---

## 3. Create a Real UI and Component Layer

### Intent

Reduce hand-maintained HTML/DOM coupling by introducing reusable UI templates/components and centralized behavior for modals, controls, panels, and editor tools. This should preserve the static-hosted nature of the app while making UI code less repetitive and more accessible by default.

### Current Problem Shape

The app uses a large static `index.html` shell, many fixed IDs, direct DOM queries, injected SVG defs, injected modal icons, and controller-specific binding logic. Accessibility has improved, but much of it depends on checks and discipline rather than shared primitives.

### Target Architecture

UI should be assembled from a small set of reusable primitives:

- `ModalShell`
- `OverlayPanel`
- `IconButton`
- `ActionButton`
- `NumberField`
- `ToolbarGroup`
- `EditorPaletteItem`
- `ReviewActionPanel`
- `SolverStatusPanel`
- `Toast`
- `LoadingOverlay`

Each primitive should define:

- Required IDs or generated ID strategy.
- ARIA roles/labels.
- Keyboard behavior.
- Focus behavior.
- Close/dismiss behavior.
- Styling class contract.
- Test hooks.

### Implementation Plan

#### Phase 1: Identify repeated UI patterns

- Inventory repeated modal structure, buttons, icon controls, form fields, loading/status panels, editor palette entries, and review action rows.
- Identify which elements must remain static landmarks in `index.html` for initial boot or accessibility.
- Identify which markup can be generated at boot from template functions.

#### Phase 2: Build template primitives

- Create DOM-safe template builders that use element construction rather than unsafe HTML injection.
- Keep templates small and explicit.
- Centralize modal behavior:
  - Focus trap.
  - Escape handling.
  - Dismiss controls.
  - ARIA labeling.
  - Restore focus on close.
- Centralize button behavior:
  - Disabled states.
  - Loading states.
  - Accessible names.
  - Keyboard activation.

#### Phase 3: Migrate repeated markup

Migrate in low-risk chunks:

1. Modal close buttons and icon buttons.
2. Loading/status panels.
3. Solver modals.
4. Review modals.
5. Options/theme UI.
6. Editor palette and editor panels.

Each migration should include:

- DOM tests or Playwright coverage for expected IDs and accessible names.
- Visual regression snapshot updates only when output intentionally changes.
- A checklist proving all controller bindings still find their elements.

#### Phase 4: Shrink `index.html`

- Leave `index.html` as:
  - Document metadata.
  - External dependency loading.
  - Root app containers.
  - Critical accessibility landmarks.
  - Minimal boot script.
- Move repeated structural UI into modules.
- Document the static shell contract.

### Risks and Mitigations

- **Risk:** Generated UI makes debugging harder.
  - **Mitigation:** Keep IDs stable and templates simple; add source comments in generated nodes where useful.
- **Risk:** Template migration breaks Playwright selectors.
  - **Mitigation:** Preserve IDs/test hooks during migration.
- **Risk:** Component system grows into a mini-framework.
  - **Mitigation:** Build only primitives the app repeatedly needs; do not invent generalized rendering or diffing unless necessary.

### Completion Spec

This section is fully satisfied when:

- Repeated modal, overlay, button, field, and toolbar structures are created through shared primitives rather than copy-pasted markup.
- Accessibility requirements for dialogs, icon buttons, keyboard activation, focus trapping, and focus restoration are implemented once in shared primitives and covered by tests.
- `index.html` is a concise static shell rather than the primary home for application UI structure.
- Controllers bind to stable, documented UI contracts instead of relying on scattered ad hoc IDs and markup assumptions.
- Raw HTML injection remains prohibited by checks, and template builders construct nodes safely.
- Visual and accessibility tests cover the migrated UI primitives and representative screens.
- Future UI additions can be made by composing documented primitives without rediscovering modal, focus, ARIA, and keyboard conventions.

---

## 4. Harden Production Security

### Intent

Turn the current documented security follow-ups into a production-grade static-app security posture. The goal is to reduce the impact of injection, dependency compromise, accidental debug exposure, misconfigured Firebase rules, and overly broad data reads.

### Current Problem Shape

The project documents that Firebase web config is public, that admin authorization should move away from current public/hard-coded patterns, and that pending submissions have broad authenticated reads. The HTML also notes that CSP was temporarily removed while debugging Google sign-in.

### Target Security Model

- Firebase client config is treated as public configuration, never as secret storage.
- Admin privileges are based on custom claims or a deployment-managed allowlist, not duplicated public config and hard-coded rules.
- Firestore rules are tested with emulator-backed behavioral tests.
- Production pages ship with a working CSP and a documented third-party dependency policy.
- Debug capabilities are safe by default and cannot accidentally expose mutation surfaces in production.
- Data visibility follows a written threat model.

### Implementation Plan

#### Phase 1: Threat model and data classification

- Classify data:
  - Public bundled levels/themes.
  - Public published levels.
  - User progress/session data.
  - Pending submissions.
  - Review/admin metadata.
  - Local debug/audit artifacts.
- Document allowed readers/writers for each class.
- Decide whether authenticated broad reads of pending submissions are still acceptable.

#### Phase 2: Firestore rule hardening

- Add Firebase emulator tests for current rule behavior.
- Move admin authorization to custom claims or a deployment-controlled allowlist.
- Remove duplicated public admin UID/email assumptions once replacement is tested.
- Add tests for negative cases:
  - Anonymous writes.
  - Cross-user progress reads/writes.
  - Non-admin publication/deletion.
  - Malformed submissions.
  - Excessive or unexpected metadata.

#### Phase 3: CSP and third-party scripts

- Reintroduce CSP using deployment headers where possible.
- Document required directives for:
  - Firebase Auth/Firestore.
  - Google sign-in popup flow.
  - Tone.js or replacement audio dependency.
  - Google Fonts or self-hosted fonts.
- Prefer pinned/self-hosted third-party assets where feasible.
- Add an automated check that deployment config includes the expected security headers.

#### Phase 4: Debug-surface safety

- Keep production diagnostics read-only by default.
- Gate the mutable debug facade behind an explicit signal, not an ambient default.
- Ensure debug surfaces redact sensitive user/admin data.
- Add tests that assert production boot does not expose mutation-capable globals.

> **Revised (2026-06-22):** an earlier pass implemented the second bullet literally — a dev-host
> check plus a one-time `localStorage` opt-in, on top of the `?debug` query param — but that broke
> the documented production-debugging workflow (load the live site with `?debug`) for no real
> security gain: the read-only `window.PATHFINDER` diagnostics (the thing actually safe to leave
> always-on) were already the safe-by-default posture this phase exists to guarantee, and the
> *mutable* facade is itself the explicit signal — nobody appends `?debug` by accident. Reverted by
> owner decision: `shouldExposeMutableFacade()` once again gates on the `?debug` query param alone,
> on any host including production. See `docs/security.md` ("Debug surface policy") for the current
> behavior and ADR 0004 for the updated record.

#### Phase 5: Secret and dependency hygiene

- Maintain secret-hygiene checks.
- Restrict Firebase/Google API keys in their consoles.
- Document rotation procedures for any exposed secret-like value.
- Keep third-party dependency allowlists updated with purpose, source, and replacement plan.

### Risks and Mitigations

- **Risk:** CSP breaks sign-in or fonts.
  - **Mitigation:** Develop CSP in report-only mode first and capture violations in tested flows.
- **Risk:** Rule migration locks out real admins.
  - **Mitigation:** Deploy emulator tests and staging validation before production rule changes.
- **Risk:** Reduced pending-submission reads break duplicate detection.
  - **Mitigation:** Replace broad reads with indexed fingerprints or constrained query fields.

### Completion Spec

This section is fully satisfied when:

- A current security model document defines every Firestore data class, allowed readers/writers, and rationale.
- Firestore authorization is enforced through custom claims or a managed allowlist, with no privileged identity duplicated in public browser config as an authorization mechanism.
- Firebase emulator-backed tests cover both allowed and denied reads/writes for progress, sessions, submissions, published levels, and admin actions.
- Production deployment includes a working CSP and other relevant security headers, with automated checks preventing accidental removal.
- Production diagnostics remain read-only and cloned by default; the mutable debug facade requires
  the explicit `?debug` query param (revised 2026-06-22 — see Phase 4 note above).
- Third-party scripts and external assets are either pinned/self-hosted or documented in an allowlist with integrity/risk rationale.
- Secret-hygiene checks and credential-rotation guidance are part of the default contributor workflow.

---

## 5. Add Static Typing Gradually

### Intent

Make implicit contracts explicit without forcing an immediate full rewrite. The project can gain most of the benefits of typing by starting with JSDoc/`// @ts-check` in pure modules and progressively adopting TypeScript or stronger schema validation where it pays off.

### Current Problem Shape

The codebase uses ES modules and some JSDoc ownership comments, but many data shapes are enforced by convention, tests, or runtime validation. This increases the cost of refactors across state, levels, solver internals, persistence payloads, and UI ports.

### Target Typing Model

- Domain models have explicit types:
  - `RawLevel`
  - `NormalizedLevel`
  - `ThemeDefinition`
  - `EngineState`
  - `NavigationState`
  - `Command`
  - `Effect`
  - `SolverAttemptConfig`
  - `SolverResult`
  - `SubmissionRecord`
  - `ProgressRecord`
- Boundary data is runtime-validated:
  - JSON assets.
  - Firestore documents.
  - localStorage/sessionStorage payloads.
  - URL/debug parameters.
  - Worker messages.
- Editors and CI catch shape errors before runtime.

### Implementation Plan

#### Phase 1: Enable type checking in pure modules

- Add `// @ts-check` to low-risk domain modules first.
- Add JSDoc typedefs for level, path, move context, validation result, and solver primitive shapes.
- Use `tsc --checkJs --noEmit` or an equivalent check script for selected modules.

#### Phase 2: Define shared model contracts

- Create central type definition files or JSDoc modules for:
  - Level schema and normalized level shape.
  - State slices.
  - Runtime commands/effects.
  - Persistence documents.
  - UI/controller ports.
- Avoid circular type imports by keeping types in leaf files.

#### Phase 3: Validate external boundaries

- Extend existing level schema validation where needed.
- Add validators for Firestore submission/progress/session records.
- Add worker message validation for solver worker requests/responses.
- Add safe parsing for URL/debug options.

#### Phase 4: Consider TypeScript migration for selected areas

Candidate areas:

1. Domain rules and level validation.
2. Solver primitives and orchestration contracts.
3. Runtime command/effect definitions.
4. Persistence DTOs.

Keep browser glue in JS until typing the core has stabilized.

### Risks and Mitigations

- **Risk:** Type migration consumes time without improving behavior.
  - **Mitigation:** Start where refactor churn and shape complexity are highest.
- **Risk:** Type definitions drift from runtime validators.
  - **Mitigation:** Keep validators and typedefs adjacent; test invalid boundary payloads.
- **Risk:** TypeScript build step conflicts with static hosting simplicity.
  - **Mitigation:** Use check-only JS first; only add compilation if the team accepts a build step.

### Completion Spec

This section is fully satisfied when:

- Core domain, solver, runtime command/effect, state-slice, and persistence DTO shapes are documented as machine-checkable types or JSDoc contracts.
- A type-check command runs in CI and fails on contract violations in the selected typed surface.
- External data boundaries are runtime-validated before data enters trusted application state.
- Worker messages, Firestore records, local/session storage payloads, and JSON assets cannot silently introduce unexpected shapes without tests failing.
- New contributors get useful autocomplete and type errors for major app models and controller ports.
- Any untyped areas are intentionally listed with rationale and priority rather than being accidental gaps.

---

## 6. Rationalize Tests into Clear Tiers

### Intent

Preserve the project’s broad test/check coverage while making it easier to understand, faster to run locally, and clearer in CI. The current script suite is valuable but custom and dense; this section gives it a sustainable structure.

### Current Problem Shape

The project has many granular scripts for linting, secret hygiene, audit artifacts, domain behavior, state, app modules, persistence, solver internals, Firestore rules, Playwright, and visual snapshots. The breadth is strong, but contributors need a clear mental model of which tests to run and when.

### Target Test Model

Define explicit tiers:

1. **Static checks**
   - Lint.
   - Secret hygiene.
   - Dependency allowlist.
   - Raw HTML safety.
   - CSS class coverage.
   - Architecture/import boundary checks.
2. **Fast unit tests**
   - Domain rules.
   - State transitions.
   - Runtime commands/effects.
   - Solver primitives.
   - UI template helpers.
3. **Integration tests**
   - App composition with fake adapters.
   - Persistence adapters with mocks/emulator.
   - Solver worker client.
   - Loader/data/theme integration.
4. **Browser E2E tests**
   - Playwright smoke, gameplay, editor, review, accessibility.
5. **Visual tests**
   - Modal and key-screen snapshots.
6. **Slow solver/audit tests**
   - Expensive solver audits, ablations, heatmap/boredom/rating reports.

### Implementation Plan

#### Phase 1: Map existing scripts to tiers

- Create a table mapping every package script to a tier, owner, expected runtime, and trigger condition.
- Identify duplicate coverage and gaps.
- Decide which scripts are mandatory on every PR.

#### Phase 2: Rename/group scripts

- Keep backwards-compatible aliases initially.
- Introduce clear script names:
  - `check:static`
  - `test:unit`
  - `test:integration`
  - `test:e2e`
  - `test:visual`
  - `test:solver:fast`
  - `test:solver:slow`
  - `ci:pr`
  - `ci:full`
- Document expected local workflows.

#### Phase 3: Improve fixtures and helpers

- Centralize test factories for levels, engine state, fake DOM adapters, fake persistence, fake timers, solver fixtures, and Firestore records.
- Make tests read like behavior specs rather than repeated setup code.
- Add fixture validation to prevent stale or invalid test levels.

#### Phase 4: Add coverage and performance visibility

- Add coverage reporting for core domain/runtime modules if practical.
- Record approximate runtime for each tier.
- Mark slow tests explicitly and keep them out of default local loops unless requested.

### Risks and Mitigations

- **Risk:** Renaming scripts disrupts existing workflows.
  - **Mitigation:** Keep aliases for one or more releases and document migration.
- **Risk:** Slow tests get skipped too often.
  - **Mitigation:** Run slow solver/audit tiers nightly, on release branches, or when solver/data files change.
- **Risk:** Coverage metrics become vanity targets.
  - **Mitigation:** Use coverage to find blind spots, not as the only measure of quality.

### Completion Spec

This section is fully satisfied when:

- Every package script belongs to a documented tier with purpose, expected runtime, and recommended trigger.
- Contributors can run one fast command for pre-commit confidence and one full command for release confidence.
- CI distinguishes PR-required checks from slower scheduled/release checks.
- Shared fixtures/helpers eliminate repeated ad hoc setup across domain, app, solver, persistence, and UI tests.
- Test failures clearly indicate whether they are static policy failures, unit behavior failures, integration failures, browser regressions, visual regressions, or slow solver/audit failures.
- Important architectural boundaries and state invariants are tested directly, not only indirectly through Playwright flows.

---

## 7. Clean Up Documentation into Authoritative Docs and ADRs

### Intent

Make documentation reliable for future contributors by separating current truth from historical notes and future plans. Documentation should explain how the system works today, why major decisions were made, and what work remains.

### Current Problem Shape

The repository contains useful architecture and security notes, but some documents mix completed work, old concerns, current behavior, and future plans. This makes it difficult to know which sections are authoritative.

### Target Documentation Structure

Recommended structure:

```text
docs/
  architecture.md
  security.md
  testing.md
  deployment.md
  data-model.md
  solver.md
  ui-accessibility.md
  adr/
    0001-static-hosting-no-build-step.md
    0002-state-action-boundary.md
    0003-solver-modularization.md
    0004-firebase-security-model.md
  refactor-notes/
    2026-06-20-app-architecture-refactor.md
```

### Implementation Plan

#### Phase 1: Split current-state docs from history

- Create or update `docs/architecture.md` as the current architecture reference.
- Move dated refactor notes into `docs/refactor-notes/`.
- Convert lasting decisions into ADRs.
- Remove or clearly label obsolete plans.

#### Phase 2: Create focused docs

- `docs/security.md`:
  - Threat model.
  - Firebase rules model.
  - Debug surface policy.
  - CSP/dependency policy.
- `docs/testing.md`:
  - Test tiers.
  - Local commands.
  - CI commands.
  - Fixture guidance.
- `docs/deployment.md`:
  - Static hosting assumptions.
  - Firebase config expectations.
  - Security headers.
  - Release checklist.
- `docs/data-model.md`:
  - Level schema.
  - Theme schema.
  - Progress/session/submission records.
- `docs/ui-accessibility.md`:
  - Modal rules.
  - Keyboard navigation.
  - Focus management.
  - Required accessible names.

#### Phase 3: Add doc-maintenance checks

- Add a lightweight check for stale references to moved files where feasible.
- Add a contributor checklist requiring doc updates when changing architecture, security, data shape, or test tiers.
- Keep docs linked from a concise root README.

### Risks and Mitigations

- **Risk:** Docs become another maintenance burden.
  - **Mitigation:** Keep current-state docs short and link to detailed ADRs for rationale.
- **Risk:** Historical notes are lost.
  - **Mitigation:** Preserve them under `docs/refactor-notes/` rather than deleting them.
- **Risk:** Docs overpromise future architecture.
  - **Mitigation:** Separate `Current state`, `Decision`, and `Planned follow-up` headings.

### Completion Spec

This section is fully satisfied when:

- A new contributor can start from the root README and find current architecture, security, testing, deployment, data-model, solver, and accessibility guidance within two clicks.
- Current-state docs do not contain obsolete plans unless they are clearly labeled as historical or future work.
- Major decisions are captured as ADRs with context, decision, consequences, and status.
- Dated refactor notes are preserved but are not the authoritative source for current behavior.
- Documentation updates are included in the contributor workflow for architecture, security, data shape, UI/accessibility, and test-tier changes.
- Basic doc checks prevent common drift such as references to removed files or renamed commands.

---

## Suggested Execution Order

The sections above are related, but they should not all be attempted at once. A practical order is:

1. **Documentation cleanup foundation**
   - Create authoritative `architecture.md`, `security.md`, and `testing.md` skeletons.
   - This gives future work a clear place to land.
2. **Security hardening discovery**
   - Threat model, Firestore emulator test plan, CSP report-only plan.
   - Security work has the highest downside if delayed.
3. **Architecture boundary inventory**
   - Define ports and dependency-cycle removal tasks.
   - Avoid major code movement until tests are classified.
4. **Test-tier rationalization**
   - Make it clear which checks protect refactors.
5. **Engine transition extraction**
   - Start with path movement and derived navigation invariants.
6. **UI component migration**
   - Migrate repeated, well-tested pieces first.
7. **Static typing expansion**
   - Apply typing to the domain/runtime/persistence boundaries exposed by earlier refactors.

## Definition of Done for the Modernization Program

The modernization program as a whole is complete when Pathfinder remains a static-hosted browser game but has the following properties:

- Core puzzle rules, level parsing, solver logic, and runtime transitions are browser-independent and thoroughly unit-tested.
- Browser integrations are behind explicit adapters.
- Controllers are wired with narrow ports and no hidden dependency cycles.
- Runtime state changes are command/effect-driven for all correctness-sensitive flows.
- UI structure is built from accessible, tested primitives rather than repeated ad hoc markup.
- Production security has a documented threat model, emulator-tested Firestore rules, working CSP/security headers, and a safe debug policy.
- Major data shapes and cross-module contracts are statically checked or runtime-validated.
- Tests are tiered, documented, and fast enough for regular contributor use.
- Documentation is authoritative, current, and separated from historical refactor logs.
