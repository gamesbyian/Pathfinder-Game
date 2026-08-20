# Pathfinder Documentation Index

This directory contains current product references, current solver state, research methodology,
experiment protocols, and preserved historical records. It is intentionally an index, not another
source of detailed project truth.

For a cold coding agent, start at [`../AGENTS.md`](../AGENTS.md). For the full accumulated developer
reference, use [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md). For an existing CLI, probe,
or remote research job, start at [`tooling-catalog.md`](tooling-catalog.md).

## Choose by task

| Need | Start here |
|---|---|
| Change normal application code | [`architecture.md`](architecture.md) |
| Choose tests or finish-line validation | [`testing.md`](testing.md) |
| Find an existing script/workflow | [`tooling-catalog.md`](tooling-catalog.md) |
| Change the solver implementation | [`solver-architecture.md`](solver-architecture.md) |
| Choose current solver optimization work | [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) |
| Coordinate broader solver research | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| Check whether a default-off solver experiment is still live | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| Understand prior experiment evidence | [`../reports/README.md`](../reports/README.md) |
| Work with stress corpora | [`../data/stress/README.md`](../data/stress/README.md) |

## Current product and engineering references

These describe current contracts, architecture, or operating practice.

| Doc | Covers |
|---|---|
| [`architecture.md`](architecture.md) | Layering, composition root, state/runtime, engine facade, UI structure, and where new code belongs. |
| [`testing.md`](testing.md) | Test tiers, focused commands, CI gates, browser validation, and solver-specific finish-line checks. |
| [`tooling-catalog.md`](tooling-catalog.md) | Task-oriented catalog of npm aliases, local scripts, solver/corpus/hint/family tools, research pilots, and Actions workflows. |
| [`typing.md`](typing.md) | Strict TypeScript model, `.ts` source versus `.js` import specifiers, and intentionally dynamic adapter boundaries. |
| [`command-glossary.md`](command-glossary.md) | Engine/editor/review/solver/persistence flow names mapped to implementation locations. This is a runtime flow glossary, not the CLI catalog. |
| [`ui-accessibility.md`](ui-accessibility.md) | Modal/dialog/focus/keyboard conventions and UI accessibility requirements. |
| [`security.md`](security.md) | Data classification, Firebase/Firestore model, debug-surface policy, CSP, and rotation guidance. |
| [`content-security-policy.md`](content-security-policy.md) | CSP directives, drift check, and enable paths. |
| [`firestore-security-model.md`](firestore-security-model.md) | Rule-by-rule Firestore access model. |
| [`firebase-config-and-secret-hygiene.md`](firebase-config-and-secret-hygiene.md) | What may be committed versus kept secret. |
| [`third-party-dependencies.md`](third-party-dependencies.md) | External dependency/CDN allowlist and rationale. |
| [`hint-curation.md`](hint-curation.md) | Player-facing hint selection, diversity, coverage guarantees, cap, and messaging. |
| [`solve-button-variety.md`](solve-button-variety.md) | Editor/Review varied-hint search behavior and curation pipeline. |
| [`hint-workbench.md`](hint-workbench.md) | Unified hint generation/diversification CLI and report format. |
| [`mechanic-state-contracts.md`](mechanic-state-contracts.md) | Dynamic mechanic state shapes, bounds, monotonicity, and external-model support. |
| [`investigation-report-conventions.md`](investigation-report-conventions.md) | Required investigation status/decision/gate schema, authority rules, and closing checklist. |

## Current solver state and live decision surfaces

Use these before dated reports when the question is about what the solver does now or what work is
currently worth doing.

| Doc | Role |
|---|---|
| [`solver-architecture.md`](solver-architecture.md) | Durable implementation reference: attempt policy, DFS/beam/repair/admissible-order search, pruning, prep data, encodings, orchestration, and tool selection. |
| [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) | **Canonical ranked entry point for optimizing existing solver techniques.** Deliberately short: live state, next gates, stable priority IDs, and closed forms. |
| [`solver-level-blindness.md`](solver-level-blindness.md) | Capability contract: production/editor solves treat every puzzle as unseen; exact-level history and stored solutions are output-side research evidence only. |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Broader research coordination and sequencing across families, heuristics, mechanics, repair, oracles, cooperation, and allocation. |
| [`future-work.md`](future-work.md) | Detailed evidence/disposition and broader deferral record. It is not a competing ranked optimization queue. |
| [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) | Current disposition of retained/default-off solver mechanisms and their promotion gates. |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Canonical work-budget model, deadline role, deterministic-run recipe, and measurement limitations. |
| [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) | Correctness-hardening taxonomy, closed bug families, current findings, and remaining bounded work. |
| [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md) | Ownership, capacity, reset, and sequence-test contracts for reusable solver scratch storage. |
| [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) | Reconciled game-rule/solver opportunity ledger with measured closures and evidence-backed open directions. |
| [`solution-profile.md`](solution-profile.md) | Known-solution behavioral fingerprints and nearest-neighbor comparison, with provenance and completeness cautions. |

## Solver research methodology and instrumentation

These documents describe research systems, experiment protocols, or candidate directions. They do
not automatically define current priority. Reconcile them with the current queue and relevant dated
reports before acting.

| Doc | Role |
|---|---|
| [`research-infrastructure-and-optimization-opportunities.md`](research-infrastructure-and-optimization-opportunities.md) | Strategic research-infrastructure opportunities: run identity, analytics, Actions reuse, policy optimization, family-balanced evidence, progressive evaluation, transfer tests, and property/mutation testing. |
| [`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md) | Typed producer-to-receptor handoffs between search techniques, replay-safe artifacts, proof classes, and shadow evaluation. |
| [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md) | Observation-only diagnostics for locating where known-valid solution families disappear from beam search. |
| [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md) | Code-and-evidence inventory of representational gaps and demoted/closed leads. |
| [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) | Shared shadow-mode evaluation harness and CP-SAT-labelled residual atlas. |
| [`ablation.md`](ablation.md) | Solver feature-flag ablation laboratory, runner, and analysis. |
| [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md) | Frozen matched-budget protocol for the default-off late-reserve experiment. |
| [`sibling-cousin-system.md`](sibling-cousin-system.md) | Controlled level-family generation modes, provenance, witness preservation, and implementation status. |
| [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md) | Instrumentation plan for family boundaries, symmetry, divergence, and family-conditioned winning attempts. |
| [`family-and-scaling-research-possibilities.md`](family-and-scaling-research-possibilities.md) | Original family-generation proposal plus the still-separate scaling-analysis research direction. |
| [`req-length-sweep.md`](req-length-sweep.md) | Offline exact-required-length scaling experiment and interpretation. |
| [`ai-assisted-manual-solving.md`](ai-assisted-manual-solving.md) | Proposed AI-assisted differential-diagnosis methodology; limited validation, not a production solver method. |

## Historical, concluded, or explicitly speculative records

These remain discoverable because their negative results and design lessons matter, but they should
not be mistaken for the current backlog.

| Doc | Status/context |
|---|---|
| [`solver-optimization-current-queue-2026-08-20-snapshot.md`](solver-optimization-current-queue-2026-08-20-snapshot.md) | Verbatim snapshot of the detailed optimization-queue chronology through 2026-08-20, preserved when the canonical queue was compacted. Evidence/history only; use the undated queue for live priority. |
| [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) | Historical research ledger reconciled with later implementation/results. |
| [`solver-next-frontier-2026-08-02.md`](solver-next-frontier-2026-08-02.md) | Unvalidated research brainstorm; no code or experiment results. |
| [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md) | Multilingual literature update to the same unvalidated brainstorm. |
| [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) | Completed design record for the Corpus-2 solver development tooling investments. |
| [`solver-development-roadmap.md`](solver-development-roadmap.md) | Historical 2026-07-17 through 2026-08-05 solver campaign record and reusable diagnose/generalize/verify workflow. |
| [`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md) | Concluded opt-in scheduler experiment; broad timed-tier variants were slower than legacy. |
| [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) | Historical repair investigation; some forms closed negative and the useful cache subsequently shipped. |
| [`claude-remote-solver-handoff.md`](claude-remote-solver-handoff.md) | Dated 2026-08-11 remote-agent handoff. Preserve for provenance; reconcile against newer queue/report evidence before executing its sequence. |

## Decisions and deeper history

- [`adr/`](adr/) contains Architecture Decision Records. Current architecture is best entered through
  [`architecture.md`](architecture.md); ADRs explain why durable decisions were made and mark
  superseded decisions explicitly.
- [`archive/`](archive/README.md) contains completed plans/designs/handoffs. Its own index is
  exhaustive because `check:documentation-links` enforces discoverability there as well.
- [`history/development-journal.md`](history/development-journal.md) is dated build narrative, not
  current truth.
- [`refactor-notes/`](refactor-notes/) contains preserved refactor history.

`../AGENTS.md` is the compact vendor-neutral coding-agent router. `../CLAUDE.md` and
`.github/copilot-instructions.md` are small vendor adapters. `../DEVELOPER_REFERENCE.md` preserves
the former full root developer reference so accumulated game-rule and gotcha knowledge remains
available without being loaded into every agent session.
