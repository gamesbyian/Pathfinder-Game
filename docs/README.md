# Pathfinder documentation index

Task routing lives in [`../AGENTS.md`](../AGENTS.md). This file inventories current references; it is not a second agent guide.

## Naming

Current docs use lowercase kebab-case, stable undated names, and canonical repository terms. Put dated/narrative investigations in `reports/`, `archive/`, `history/`, or `refactor-notes/`. When renaming a live authority, update current links/workflows/metadata and run `npm run check:documentation-links`; do not rewrite frozen reports merely to modernize paths. Canonical naming rules live in [`naming-and-vocabulary.md`](naming-and-vocabulary.md). For active cleanup work, run `npm run naming:status` rather than inferring the next step from prose. The repository-wide cleanup is specified by [`naming-cleanup-plan.md`](naming-cleanup-plan.md); its implementation history and failure-derived lessons are in [`naming-cleanup-history-and-lessons.md`](naming-cleanup-history-and-lessons.md); its Phase-8+ execution controls are in [`naming-cleanup-process-hardening.md`](naming-cleanup-process-hardening.md); machine-readable state with immutable row IDs and compatibility retirement is tracked in [`naming-cleanup-ledger.json`](naming-cleanup-ledger.json); and each active implementation batch uses a checked-in record based on [`naming-cleanup-phase-record-template.md`](naming-cleanup-phase-record-template.md).

## Current references

| Doc | Owns |
|---|---|
| [`architecture.md`](architecture.md) | Application structure and code ownership |
| [`architecture-unification-debt.md`](architecture-unification-debt.md) | Remaining authority/mutable-lifetime architecture debt |
| [`change-recipes.md`](change-recipes.md) | Cross-boundary schema/state/telemetry changes and experiment preflight recipes |
| [`naming-and-vocabulary.md`](naming-and-vocabulary.md) | Permanent canonical naming and vocabulary rules |
| [`naming-cleanup-plan.md`](naming-cleanup-plan.md) | Decision-complete repository naming cleanup, compatibility rules, rename inventory, serial implementation sequence, and phase gates |
| [`naming-cleanup-history-and-lessons.md`](naming-cleanup-history-and-lessons.md) | PR-by-PR implementation retrospective and the failure patterns that justify the remaining safeguards |
| [`naming-cleanup-process-hardening.md`](naming-cleanup-process-hardening.md) | Phase-1-7 failure analysis, pre-Phase-8 technical gate, batch execution controls, and stronger contract-migration/closeout model |
| [`naming-cleanup-phase-record-template.md`](naming-cleanup-phase-record-template.md) | Durable per-batch impact-map, validation, parity, audit, and pre-merge evidence template |
| [`naming-cleanup-phase-records/phase-08.md`](naming-cleanup-phase-records/phase-08.md) | Phase-8 serial batch authority and merged-tree completion gate |
| [`naming-cleanup-ledger.json`](naming-cleanup-ledger.json) | Machine-readable execution status, immutable migration row IDs, compatibility ownership/retirement, active-batch claim, Phase-8 assignments, and Phase-8+ verification evidence pointers |
| [`testing.md`](testing.md) | Validation and finish-line gates |
| [`tooling-catalog.md`](tooling-catalog.md) | CLI, probe, batch, and workflow discovery |
| [`solver-architecture.md`](solver-architecture.md) | Solver implementation and execution policy |
| [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) | **Canonical solver workstreams and current execution priority** |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Research/evidence method, stop rules, promotion and selection discipline |
| [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) | Development/confirmation/transfer roles, proportional holdout gates, confirmation blocks, cross-generator challenge |
| [`solver-scheduling-policy.md`](solver-scheduling-policy.md) | Action selection, fixed-work allocation, portfolio/configuration research |
| [`solver-residual-state-representation.md`](solver-residual-state-representation.md) | Residual/future representation vocabulary and proof-vs-predictor roles |
| [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md) | Operational meaning/similarity of techniques and configurations |
| [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) | Profile-led runtime work and execution-substrate gates |
| [`solver-level-blindness.md`](solver-level-blindness.md) | Runtime information boundary vs statistical generalization |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Work/budget/deadline reproducibility and shared envelopes |
| [`solver-correctness-hardening.md`](solver-correctness-hardening.md) | Solver correctness/state/provenance invariants |
| [`variant-level-research.md`](variant-level-research.md) | Variant/family evidence, trove use, parent holdouts, generation gates |
| [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) | Default-off mechanism dispositions |
| [`solver-future-work.md`](solver-future-work.md) | Deferred/reopen ideas and gates |
| [`investigation-report-conventions.md`](investigation-report-conventions.md) | Report status, evidence role, selection, precommitment |
| [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md) | Scratch-storage contracts |
| [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) | Solver/game semantic boundary |
| [`solver-solution-profile.md`](solver-solution-profile.md) | Offline known-solution fingerprints; not production routing features |
| [`mechanic-state-contracts.md`](mechanic-state-contracts.md) | Dynamic mechanic state, bounds, external-model support |
| [`typing.md`](typing.md) | TypeScript source/import conventions |
| [`command-glossary.md`](command-glossary.md) | Runtime flow names and implementation locations |
| [`ui-accessibility.md`](ui-accessibility.md) | Dialog/focus/keyboard/accessibility conventions |
| [`security.md`](security.md) | Firestore authorization, config/secrets, debug exposure |
| [`content-security-policy.md`](content-security-policy.md) | Browser CSP and external-origin/dependency policy |
| [`hint-curation.md`](hint-curation.md) | Player hint selection/diversity |
| [`hint-variety-search.md`](hint-variety-search.md) | Varied-hint search behavior |
| [`hint-workbench.md`](hint-workbench.md) | Hint research CLI |

## Solver research route

Read, in order: current [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) → [`solver-research-operating-model.md`](solver-research-operating-model.md) → [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) when population/holdout/generalization matters → relevant specialist doc → [`tooling-catalog.md`](tooling-catalog.md) → dated evidence. Do not promote a specialist report's local next step above the current execution priority.

For prior evidence, start at [`../reports/README.md`](../reports/README.md) or run `node scripts/research-status-index.mjs --compact --query=<term>`. For stress data use [`../data/stress/README.md`](../data/stress/README.md). Load [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md) only for rare rules/gotchas/facts/provenance.

### Research instruments

These docs describe reusable instruments, not current priority or promotion authority.

| Doc | Instrument |
|---|---|
| [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md) | Rebuildable census/portfolio diagnostics |
| [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) | Read-only exact/oracle-labelled probes |
| [`solver-winning-lineage-survival-analysis.md`](solver-winning-lineage-survival-analysis.md) | Beam lineage observation |
| [`solver-ablation.md`](solver-ablation.md) | Exploratory ablation lab |
| [`solver-required-length-sweep.md`](solver-required-length-sweep.md) | Within-level required-length sensitivity |

## History

Superseded plans, concluded experiments, and old queue/ledger states live in [`archive/snapshots/`](archive/snapshots/README.md). Other history: [`adr/`](adr/), [`archive/`](archive/README.md), [`history/development-journal.md`](history/development-journal.md), [`refactor-notes/`](refactor-notes/).

`../CLAUDE.md` and `.github/copilot-instructions.md` are adapters to `../AGENTS.md`, not separate knowledge bases.