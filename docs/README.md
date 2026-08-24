# Pathfinder documentation index

Task routing lives in [`../AGENTS.md`](../AGENTS.md). This file is the current-reference inventory, not a second agent guide.

## Naming

Current docs use lowercase kebab-case and stable, undated names. Prefer `<domain>-<subject>-<role>.md` when the domain or role helps scanning; omit redundant prefixes for repo-wide authorities such as `architecture.md`, `testing.md`, and `security.md`. Name a live document for what it is now, not the audit, plan, experiment, or investigation that created it. Use canonical repository terms rather than abbreviations or near-synonyms.

Dates and narrative experiment names belong in `reports/`, `archive/`, `history/`, or `refactor-notes/`. When renaming a live authority, update current links/imports/workflows/metadata and run `npm run check:documentation-links`; do not rewrite frozen reports or snapshots merely to modernize paths.

## Current references

| Doc | Role |
|---|---|
| [`architecture.md`](architecture.md) | Application structure and code ownership. |
| [`architecture-unification-debt.md`](architecture-unification-debt.md) | Remaining duplicate-authority, mutable-lifetime, and architecture debt; includes P0 search-stage state isolation. |
| [`change-recipes.md`](change-recipes.md) | Cross-boundary schema/state/telemetry changes plus solver-policy/data-generation experiment preflight recipes. |
| [`testing.md`](testing.md) | Validation and finish-line gates. |
| [`tooling-catalog.md`](tooling-catalog.md) | CLI, probe, batch, and workflow discovery. |
| [`solver-architecture.md`](solver-architecture.md) | Solver implementation and execution policy. |
| [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) | **Canonical ranked live solver research priority.** Read before specialist proposal docs. |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Solver research/evidence method, stop rules, promotion contract, configuration/selection discipline. |
| [`solver-scheduling-policy.md`](solver-scheduling-policy.md) | Evidence-driven action selection, fixed-work allocation, portfolio repricing, configuration/racing, generalization and complexity gates. |
| [`solver-residual-state-representation.md`](solver-residual-state-representation.md) | Cross-cutting residual/future representation vocabulary: exact interfaces, representative families, restricted/relaxed abstractions, automaton-resource propagation, CEGAR, backdoors and proof-vs-predictor roles. |
| [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md) | What technique/config names actually change in operation and bounded operational-similarity research. |
| [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) | Profile-led runtime work plus bounded native/WASM feasibility gate. |
| [`solver-level-blindness.md`](solver-level-blindness.md) | Cold runtime information boundary **and distinction between level-blindness and generalization**. |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Work/budget/deadline reproducibility and shared-envelope scheduler rules. |
| [`solver-correctness-hardening.md`](solver-correctness-hardening.md) | Correctness/state/provenance invariants, including unexplained stage-history dependence. |
| [`variant-level-research.md`](variant-level-research.md) | Variant/family research, existing trove use, parent-held-out discipline, and generation gates. |
| [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) | Default-off mechanism dispositions and removal/retention rules. |
| [`solver-future-work.md`](solver-future-work.md) | Deferred/reopen ideas with mechanism/pilot/success/failure/promotion gates. |
| [`investigation-report-conventions.md`](investigation-report-conventions.md) | Investigation status, evidence role, selection disclosure, and lightweight precommitment schema. |
| [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md) | Scratch-storage contracts. |
| [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) | Solver/game semantic boundary. |
| [`solver-solution-profile.md`](solver-solution-profile.md) | Known-solution behavioral fingerprints; offline hypothesis labels, not production routing features. |
| [`mechanic-state-contracts.md`](mechanic-state-contracts.md) | Dynamic mechanic state/bounds/model support. |
| [`typing.md`](typing.md) | TypeScript model and `.ts` source / `.js` import rule. |
| [`command-glossary.md`](command-glossary.md) | Runtime flow names and implementation locations. |
| [`ui-accessibility.md`](ui-accessibility.md) | Dialog/focus/keyboard/accessibility conventions. |
| [`security.md`](security.md) | Firestore authorization, Firebase config/secrets, debug exposure, security workflow. |
| [`content-security-policy.md`](content-security-policy.md) | Production CSP and external browser-origin/dependency policy. |
| [`hint-curation.md`](hint-curation.md) | Player hint selection/diversity. |
| [`hint-variety-search.md`](hint-variety-search.md) | Varied-hint search behavior. |
| [`hint-workbench.md`](hint-workbench.md) | Hint research CLI. |

## Solver research reading order

For a new solver optimization/research task, do not begin from whichever specialist experiment document looks interesting.

1. [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md): what matters now.
2. [`solver-research-operating-model.md`](solver-research-operating-model.md): what evidence is acceptable and which practices are blocked.
3. Relevant program/reference doc: scheduler/configuration, speed, variants, beam/lineage, exact/shadow, or [`solver-residual-state-representation.md`](solver-residual-state-representation.md) when the question concerns future interfaces, beam coverage, residual feasibility, repair reconstruction, caching, or abstraction quality.
4. [`tooling-catalog.md`](tooling-catalog.md): smallest existing instrument that can answer the question.
5. Dated reports/raw artifacts only as evidence for the specific hypothesis.

This order is deliberate. Historical evidence and specialist tooling must not silently outrank the current queue.

## Research instruments

Presence does not imply current priority or production readiness.

| Doc | Role / evidence limit |
|---|---|
| [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md) | Rebuildable census evidence and nominations. Current queue/scheduler policy overrides its local “next questions.” |
| [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) | Read-only exact/oracle-labelled probe discovery. Shadow success nominates a live experiment; selected probes require confirmation. |
| [`solver-winning-lineage-survival-analysis.md`](solver-winning-lineage-survival-analysis.md) | Beam lineage observation. Known-lineage survival is a diagnostic proxy, not the production objective. |
| [`solver-ablation.md`](solver-ablation.md) | Broad exploratory ablation lab. Its wall-bounded many-arm rankings are nomination evidence, not promotion verdicts. |
| [`solver-required-length-sweep.md`](solver-required-length-sweep.md) | Correlated within-level scaling/diagnostic sweep; parent lengths are not independent samples. |
| [`solver-solution-profile.md`](solver-solution-profile.md) | Solution-derived offline descriptors for hypothesis generation; direct production lookup is forbidden. |

Current scheduler budget evidence: [`../reports/2026-08-23-technique-budget-cap-efficiency.md`](../reports/2026-08-23-technique-budget-cap-efficiency.md). It establishes that beam searches are often cheap/self-exhausting screens, plain repair has material late capability, and deep ordinary DFS/IDA work should compete for residual budget rather than receive automatic entitlement. Policy consequences live in [`solver-scheduling-policy.md`](solver-scheduling-policy.md) and [`solver-budget-determinism.md`](solver-budget-determinism.md).

Current external-literature synthesis: [`../reports/2026-08-24-external-research-pathfinder-synthesis.md`](../reports/2026-08-24-external-research-pathfinder-synthesis.md), now covering fourteen compact research memos plus the original cross-pollination audit and [`../reports/2026-08-24-third-wave-cross-pollination-addendum.md`](../reports/2026-08-24-third-wave-cross-pollination-addendum.md).

Prior experiment evidence: [`../reports/README.md`](../reports/README.md). Stress corpora: [`../data/stress/README.md`](../data/stress/README.md). Broad rules/gotchas: [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md), load selectively.

## History

Superseded plans, concluded experiments, old queue states/research ledgers, and pre-consolidation text live in [`archive/snapshots/`](archive/snapshots/README.md). Other history: [`adr/`](adr/), [`archive/`](archive/README.md), [`history/development-journal.md`](history/development-journal.md), [`refactor-notes/`](refactor-notes/).

`../CLAUDE.md` and `.github/copilot-instructions.md` are thin adapters to `../AGENTS.md`, not separate knowledge bases.