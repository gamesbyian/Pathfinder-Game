# Pathfinder Documentation Index

Pathfinder is a static-hosted, no-build-step browser puzzle game (GitHub Pages; Firebase for
submissions/progress). Start here to find the right doc.

## Current-state references (authoritative — describe how the app works today)

| Doc | Covers |
|---|---|
| [`architecture.md`](architecture.md) | Layered model, composition root, state/runtime, engine facade, solver, where to put new code |
| [`security.md`](security.md) | Data classification, Firebase/Firestore model, debug-surface policy, CSP & dependency gaps |
| [`testing.md`](testing.md) | Test tiers, what each protects, which command to run when |
| [`ui-accessibility.md`](ui-accessibility.md) | Modal/dialog/focus/keyboard conventions; adding-a-modal checklist |
| [`command-glossary.md`](command-glossary.md) | Canonical engine/editor/review/solver/persistence flow names → implementation locations (modernization-plan §2 Phase 2) |
| [`typing.md`](typing.md) | Check-only static typing (`// @ts-check` + `tsc --noEmit`): the typed allowlist + how to grow it |
| [`firestore-security-model.md`](firestore-security-model.md) | Rule-by-rule Firestore access model |
| [`firebase-config-and-secret-hygiene.md`](firebase-config-and-secret-hygiene.md) | What may be committed vs. kept secret |
| [`third-party-dependencies.md`](third-party-dependencies.md) | External CDN/asset allowlist + rationale |

> `CLAUDE.md` (repo root) remains a detailed developer reference and running engineering
> journal. The docs above are the concise, authoritative current-state entry points; deep
> historical detail lives in `CLAUDE.md` and `refactor-notes/`.

## Decisions

[`adr/`](adr/) — Architecture Decision Records (context · decision · consequences · status):

- [0001 — Static hosting, no build step](adr/0001-static-hosting-no-build-step.md)
- [0002 — ENGINE mutations via state-action helpers](adr/0002-state-action-boundary.md)
- [0003 — Modular solver with a separate testing API](adr/0003-solver-modularization.md)
- [0004 — Firebase public config; authorization in Firestore rules](adr/0004-firebase-public-config-security-model.md)
- [0005 — Grouped engine facade and narrow controller ports](adr/0005-grouped-engine-facade-and-narrow-ports.md)
- [0006 — Pure transition/decision cores per flow; no central dispatcher](adr/0006-pure-transition-cores-no-central-dispatcher.md)
- [0007 — UI component layer: boot builders + semantic CSS + centralized modal behavior](adr/0007-ui-component-layer-boot-builders.md)
- [0008 — Acyclic composition root (no construction cycles / forward decls / late init)](adr/0008-acyclic-composition-root.md)
- [0009 — Check-only static typing (JSDoc + `tsc --checkJs`), no build step](adr/0009-check-only-static-typing.md)

## Plans & history

- [`modernization-plan.md`](modernization-plan.md) — the staged modernization roadmap (7 sections
  with completion specs). See "Modernization progress" below for status.
- [`refactor-notes/`](refactor-notes/) — dated refactor logs (preserved history, not authoritative
  for current behavior).

## Modernization progress

Tracking against `modernization-plan.md`'s sections:

| § | Section | Status |
|---|---|---|
| 1 | Finish architecture boundary work | **Done (per ADR 0008)** — staged composition root is now acyclic: all construction cycles removed (`data↔themes`, `ui↔renderer`, `themes↔persistence`, and the editor↔engine post-construction `init()`), with no mutable forward declarations. Narrow `EditorRuntimePort` typedef + grouped engine facade + caller migration; `check:domain-purity` statically enforces the pure-layer boundary; `app-module-unit-tests` proves construction with fake adapters + clone-only diagnostics. Optional future work: more named port typedefs for the remaining seams. |
| 2 | Make engine state transitions explicit | **Done (per ADR 0006)** — state-action boundary + per-slice ownership/derived typedefs + derived-nav invariant test (`test:path-state-invariants`). Every correctness-sensitive flow has a pure, unit-tested transition/decision core: move (`computeStep`), undo (`PathNavigator.applySnapshot`), win (`computeWinEffects`), hazard (`compute{JumpScare,BombDetonation}Effects`), reset-cheat (`planResetCheat`), review advance (`planSubmissionAdvance`); solver/level-flow are thin state-action orchestration with shared sub-steps factored. Effects-at-the-core-boundary are data (`effect-runner`); `replayMoves` gives declarative command-sequence tests. Deliberately no central command dispatcher/global transition log (would be the parallel reducer the plan cautions against — ADR 0006). |
| 3 | Real UI/component layer | **Done (per ADR 0007)** — the component layer is boot-time data-driven builders (`svg-defs`/`editor-palette`/`guide-cards`/`submit-steps`/`modal-icons`) + semantic CSS component classes + centralized modal behavior (focus-trap/dialog semantics), with shared contracts (e.g. `SUBMIT_STEP_IDS`), a documented static-shell contract, and a11y/visual/coverage test gates. No runtime framework (ADR 0001, no build step). Migrating additional modal *container* inner markup to builders is optional incremental work, not required by the spec's intent. |
| 4 | Harden production security | **Discovery done; debug-surface invariant now tested** — model documented + ADR 0004; gaps catalogued (custom-claim admin, CSP, emulator tests). `tests/security.spec.mjs` guards the safe-by-default debug surface at boot. Remaining implementation (custom-claim admin, CSP, emulator-backed rule tests) pending. |
| 5 | Add static typing gradually | **In progress (per ADR 0009)** — check-only `// @ts-check` + `tsc --noEmit` gate (`check:types`) in the `check` CI group, strict over a curated allowlist of **63 modules**: the **entire `modules/domain/` directory** (rule layer incl. `isValidMove`/`path-validator`/`landmark-rules`, plus the raw-level codec/schema/validation/fingerprint family), the **entire `modules/runtime/` directory** (command/effect vocabulary, `game-rules`, `effect-runner`, the `path-state` movement transition, and the `step-processor`), the theme normalization chain (`theme-engine` color math + `theme-normalizer`/`theme-registry`), the whole `modules/editor/` directory + the entire ENGINE state layer (`state-slices` factories, `state.js`, and all 11 `state/actions/*` mutation helpers via the `state-actions` barrel), three persistence repositories, and the **entire `modules/solver/` directory** (except the two Web Worker host-boundary files) — primitives, the hot core (`search-state`), pruning (`topology`/`lower-bounds`), the move scorer (`scoring`), the policy config (`policy`), the attempt-config ordering (`attempts`), the DFS/beam driver (`search`), the per-level `PrepLevel` builder (`prep`), the `solveLevelV2` driver (`orchestration`), the trap-spot search (`trap-search`), the raw→`NormalizedLevel` builder (`normalization`), and the `SOLVER_TESTING_API` (`testing-api`) — with shared `NormalizedLevel`/`MoveState`/`SolverSearchState`/`PrepLevel`/`UndoToken`/`ScoringProfile`/`StructuralTemplate`/`AttemptConfig` typedefs. No build step. The pure `domain`/`runtime`/`solver` layers are complete (only the Web Worker host boundary + `diversification`, blocked on `scripts/ablation-config`, remain in solver). Remaining elsewhere (documented in `typing.md`): state slices, persistence DTOs, and the adapter/controller layers. |
| 6 | Rationalize tests into tiers | **Partial** — `ci` grouped into `check`/`test:core`/`test:app`/`test:solver`; `ci:full` (PR gate + browser e2e) added; visual harness added; full script→tier map + per-script triggers in `testing.md`. Remaining: shared fixtures, coverage. |
| 7 | Docs into authoritative docs + ADRs | **Done (foundation)** — this index, `architecture/security/testing/ui-accessibility`, ADRs 0001–0005, and `refactor-notes/` are in place. |
