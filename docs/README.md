# Pathfinder Documentation Index

Pathfinder is a browser puzzle game built with Vite and deployed as a static site to GitHub Pages
(Firebase for submissions/progress). Start here to find the right doc.

## Current-state references (authoritative — describe how the app works today)

| Doc | Covers |
|---|---|
| [`architecture.md`](architecture.md) | Layered model, composition root, state/runtime, engine facade, solver, where to put new code |
| [`solver-architecture.md`](solver-architecture.md) | Deep hint-solver reference: core flow, feature-keyed attempt policy, DFS/beam, pruning, `prepLevel` data, encodings |
| [`hint-curation.md`](hint-curation.md) | Which stored hints the player cycles through: distinctiveness metric, gate/portal-usage coverage guarantee, must-cross-order variety, cap + message |
| [`security.md`](security.md) | Data classification, Firebase/Firestore model, debug-surface policy, CSP, rotation |
| [`content-security-policy.md`](content-security-policy.md) | The CSP directives, drift check (`check:csp`), and the two enable paths |
| [`testing.md`](testing.md) | Test tiers, what each protects, which command to run when |
| [`ui-accessibility.md`](ui-accessibility.md) | Modal/dialog/focus/keyboard conventions; adding-a-modal checklist |
| [`command-glossary.md`](command-glossary.md) | Canonical engine/editor/review/solver/persistence flow names → implementation locations (modernization-plan §2 Phase 2) |
| [`typing.md`](typing.md) | Check-only static typing (`// @ts-check` + `tsc --noEmit`): the typed allowlist + how to grow it |
| [`firestore-security-model.md`](firestore-security-model.md) | Rule-by-rule Firestore access model |
| [`firebase-config-and-secret-hygiene.md`](firebase-config-and-secret-hygiene.md) | What may be committed vs. kept secret |
| [`third-party-dependencies.md`](third-party-dependencies.md) | External CDN/asset allowlist + rationale |
| [`ablation.md`](ablation.md) | Solver ablation lab — 45 feature flags, experiment runner, analysis |

> `CLAUDE.md` (repo root) is the **current-state developer reference** (project overview, game
> rules, solver architecture, repo layout, commands, gotchas). The docs above are the concise,
> authoritative per-topic entry points. The dated build narrative — session logs, bug-fix
> writeups, retracted experiments — was moved out of `CLAUDE.md` to
> [`history/development-journal.md`](history/development-journal.md) (history only; not current truth).

## Decisions

[`adr/`](adr/) — Architecture Decision Records (context · decision · consequences · status):

- [0001 — Static hosting, no build step](adr/0001-static-hosting-no-build-step.md) *(superseded by 0010)*
- [0002 — ENGINE mutations via state-action helpers](adr/0002-state-action-boundary.md)
- [0003 — Modular solver with a separate testing API](adr/0003-solver-modularization.md)
- [0004 — Firebase public config; authorization in Firestore rules](adr/0004-firebase-public-config-security-model.md)
- [0005 — Grouped engine facade and narrow controller ports](adr/0005-grouped-engine-facade-and-narrow-ports.md)
- [0006 — Pure transition/decision cores per flow; no central dispatcher](adr/0006-pure-transition-cores-no-central-dispatcher.md)
- [0007 — UI component layer: boot builders + semantic CSS + centralized modal behavior](adr/0007-ui-component-layer-boot-builders.md)
- [0008 — Acyclic composition root (no construction cycles / forward decls / late init)](adr/0008-acyclic-composition-root.md)
- [0009 — Check-only static typing (JSDoc + `tsc --checkJs`), no build step](adr/0009-check-only-static-typing.md) *(being superseded by 0011)*
- [0010 — Adopt a Vite build step (supersedes 0001)](adr/0010-build-step-vite.md)
- [0011 — Full TypeScript migration (supersedes 0009)](adr/0011-full-typescript-migration.md)

## Plans & history

- [`modernization-plan.md`](modernization-plan.md) — the staged modernization roadmap (7 sections
  with completion specs). See "Modernization progress" below for status.
- [`codebase-quality-review-plan.md`](codebase-quality-review-plan.md) — the 7-issue remediation
  plan (Vite build, CSP, full TS, Vitest, data split, CLAUDE.md collapse, indirection pruning).
- [`codebase-strengthening-plan.md`](codebase-strengthening-plan.md) — **COMPLETE (2026-06-27).**
  4 initiatives: type the ENGINE/state core, test+measure the interaction layer (coverage), bundle
  Firebase+Tone (modular SDK), trim CLAUDE.md. Retained as the design record.
- [`history/development-journal.md`](history/development-journal.md) — the full dated CLAUDE.md
  narrative (2026-06-11 onward), including retracted experiments. History only.
- [`refactor-notes/`](refactor-notes/) — dated refactor logs (preserved history, not authoritative
  for current behavior).

## Modernization progress

Tracking against `modernization-plan.md`'s sections:

| § | Section | Status |
|---|---|---|
| 1 | Finish architecture boundary work | **Done (per ADR 0008)** — staged composition root is now acyclic: all construction cycles removed (`data↔themes`, `ui↔renderer`, `themes↔persistence`, and the editor↔engine post-construction `init()`), with no mutable forward declarations. Narrow `EditorRuntimePort` typedef + grouped engine facade + caller migration; `check:domain-purity` statically enforces the pure-layer boundary; `app-module-unit-tests` proves construction with fake adapters + clone-only diagnostics. Optional future work: more named port typedefs for the remaining seams. |
| 2 | Make engine state transitions explicit | **Done (per ADR 0006)** — state-action boundary + per-slice ownership/derived typedefs + derived-nav invariant test (`test:path-state-invariants`). Every correctness-sensitive flow has a pure, unit-tested transition/decision core: move (`computeStep`), undo (`PathNavigator.applySnapshot`), win (`computeWinEffects`), hazard (`compute{JumpScare,BombDetonation}Effects`), reset-cheat (`planResetCheat`), review advance (`planSubmissionAdvance`); solver/level-flow are thin state-action orchestration with shared sub-steps factored. Effects-at-the-core-boundary are data (`effect-runner`); `replayMoves` gives declarative command-sequence tests. Deliberately no central command dispatcher/global transition log (would be the parallel reducer the plan cautions against — ADR 0006). |
| 3 | Real UI/component layer | **Done (per ADR 0007)** — the component layer is boot-time data-driven builders (`svg-defs`/`editor-palette`/`guide-cards`/`submit-steps`/`modal-icons`) + semantic CSS component classes + centralized modal behavior (focus-trap/dialog semantics), with shared contracts (e.g. `SUBMIT_STEP_IDS`), a documented static-shell contract, and a11y/visual/coverage test gates. No runtime framework (ADR 0001, no build step). Migrating additional modal *container* inner markup to builders is optional incremental work, not required by the spec's intent. |
| 4 | Harden production security | **Largely implemented (per ADR 0004); residual items are ops/hosting tasks** — Phase 1 threat model/data classification documented (`security.md`). **Phase 2:** `isAdmin()` now accepts a Firebase custom claim (`admin: true`) or the legacy email (no-lockout transition); rule tests updated + negative-case guards (`no unconditional writes`, `public reads scoped`, `no auth-only writes`). **Phase 3:** CSP **enforced in production** (enforcing `<meta>`, verified live incl. Google sign-in — codebase-quality-review #5), defined in `security/csp-policy.json` + drift-checked by `check:csp` and the `csp` e2e spec; `docs/content-security-policy.md`. **Phase 4:** production diagnostics safe-by-default — read-only, cloned `window.PATHFINDER` always exposed; mutable `window.APP` facade opt-in via `shouldExposeMutableFacade()`, which gates on `?debug` alone, on any host (a brief dev-host + persisted-opt-in tightening was reverted 2026-06-22 as a regression against the documented production-debugging workflow with no real security gain — unit-tested + `tests/security.spec.mjs`). **Phase 5:** credential-rotation procedures documented. Residual (need ops/hosting, not runnable here): provision the admin custom claim + drop the email fallback; emulator-backed behavioral rule tests. |
| 5 | Add static typing gradually | **Done (per ADR 0009)** — check-only `// @ts-check` + `tsc --noEmit` gate (`check:types`) in the `check` CI group, strict over a curated allowlist of **66 modules**: the **entire `modules/domain/` directory** (rule layer incl. `isValidMove`/`path-validator`/`landmark-rules`, plus the raw-level codec/schema/validation/fingerprint family), the **entire `modules/runtime/` directory** (command/effect vocabulary, `game-rules`, `effect-runner`, the `path-state` movement transition, and the `step-processor`), the theme normalization chain (`theme-engine` color math + `theme-normalizer`/`theme-registry`), the whole `modules/editor/` directory + the entire ENGINE state layer (`state-slices` factories, `state.js`, and all 11 `state/actions/*` mutation helpers via the `state-actions` barrel), three persistence repositories, and the **entire `modules/solver/` directory** (except the two Web Worker host-boundary files) — primitives, the hot core (`search-state`), pruning (`topology`/`lower-bounds`), the move scorer (`scoring`), the policy config (`policy`), the attempt-config ordering (`attempts`), the DFS/beam driver (`search`), the per-level `PrepLevel` builder (`prep`), the `solveLevel` driver (`orchestration`), the trap-spot search (`trap-search`), the raw→`NormalizedLevel` builder (`normalization`), and the `SOLVER_TESTING_API` (`testing-api`) — with shared `NormalizedLevel`/`MoveState`/`SolverSearchState`/`PrepLevel`/`UndoToken`/`ScoringProfile`/`StructuralTemplate`/`AttemptConfig` typedefs. No build step. The DOM adapter/controller/integration layer (render/ui/input/the remaining engine sub-controllers/top-level roots) is a **deliberate, documented scope boundary** — it orchestrates the `any`-typed ENGINE tree, so `tsc` there is near-pure `@param {any}` noise; it's gated instead by `check:engine-state-boundary`/`check:domain-purity`/`check:modal-a11y` + the Playwright e2e/visual/theme-coverage suites. The single high-leverage extension (typing `createEngineState`'s return so every already-`@ts-check`'d mutation site is checked for free) is unblocked but not required for §5. See ADR 0009 "Completion criterion & scope boundary". |
| 6 | Rationalize tests into tiers | **Done — now on Vitest** (codebase-quality-review #6). The hand-rolled `node scripts/*-unit-tests.mjs` suites on a homegrown register/run harness were migrated to **Vitest** (`test:unit`: ~40 suites / ~520 tests in one parallel pass, watch + filtering) and colocated as type-checked `modules/**/*.test.ts` (§4); the per-file `test:*` scripts and the `test:core`/`test:app`/`test:solver` chains collapsed into `test:unit` + `test:node` (node validators). `ci = check && test:coverage && test:node` (coverage enforced over the logic surface); `ci:full` adds browser e2e; full script→tier map in `testing.md`. Shared `scripts/test-lib/fixtures.mjs` (`makeRawLevel`/`createFakeScheduler`) kept; the homegrown harness + its self-test were deleted. Deliberate `test:node` hold-outs: `loader` IIFE structure, `firestore-rules` characterization, boot/data/oracle/bundled-level validators. A few validator/harness suites remain `scripts/*-unit-tests.mjs` by design. Optional-only: porting `node:assert`→Vitest `expect`. |
| 7 | Docs into authoritative docs + ADRs | **Done (foundation)** — this index, `architecture/security/testing/ui-accessibility`, ADRs 0001–0005, and `refactor-notes/` are in place. |
