# Pathfinder documentation index

Task routing lives in [`../AGENTS.md`](../AGENTS.md). This file inventories references; it is not a second agent guide.

## Current references

| Doc | Owns |
|---|---|
| [`architecture.md`](architecture.md) | Application structure and code ownership |
| [`architecture-unification-debt.md`](architecture-unification-debt.md) | Remaining authority/mutable-lifetime architecture debt |
| [`change-recipes.md`](change-recipes.md) | Cross-boundary schema/state/telemetry changes and experiment preflight recipes |
| [`naming-and-vocabulary.md`](naming-and-vocabulary.md) | Permanent canonical naming and vocabulary rules |
| [`testing.md`](testing.md) | Validation and finish-line gates |
| [`tooling-catalog.md`](tooling-catalog.md) | Broad CLI/probe/batch/workflow discovery; named tools should be queried compactly first |
| [`agent-context-routes.json`](agent-context-routes.json) | Machine-readable required/optional agent-context routes and byte budgets |
| [`solver-architecture.md`](solver-architecture.md) | Solver implementation and execution policy |
| [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) | **Compact solver-research current priority and next gate** |
| [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) | Detailed workstream chronology, dispositions, and full evidence chains |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Research/evidence method, stop rules, promotion and selection discipline |
| [`solver-research-data-assets.md`](solver-research-data-assets.md) | Full evidence inventory/inter-relevance/boundaries; query [`solver-research-data-assets.json`](solver-research-data-assets.json) through `node scripts/research-asset-query.mjs --query=<term>` first |
| [`solver-research-post-naming-resumption.md`](solver-research-post-naming-resumption.md) | Conditional bridge for executing/aggregating/translating frozen pre-cleanup solver evidence |
| [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) | Development/confirmation/transfer roles, proportional holdout gates, confirmation blocks, cross-generator challenge |
| [`solver-scheduling-policy.md`](solver-scheduling-policy.md) | Action selection, fixed-work allocation, portfolio/configuration research |
| [`solver-residual-state-representation.md`](solver-residual-state-representation.md) | Residual/future representation vocabulary and proof-vs-predictor roles |
| [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md) | Operational meaning/similarity of techniques and configurations |
| [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) | Profile-led runtime work and execution-substrate gates |
| [`solver-level-blindness.md`](solver-level-blindness.md) | Runtime information boundary vs statistical generalization |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Work/budget/deadline reproducibility and shared envelopes |
| [`solver-correctness-hardening.md`](solver-correctness-hardening.md) | Solver correctness/state/provenance invariants |
| [`variant-level-research.md`](variant-level-research.md) | Variant/family evidence, dataset use, parent holdouts, generation gates |
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

## Cheap discovery first

Before opening large catalogs, reports, corpora, or histories:

- current solver priority: [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md);
- prior experiment/evidence: `node scripts/research-status-index.mjs --compact --query=<term>`;
- existing tooling: `node scripts/tooling-census.mjs --compact --query=<term>`;
- solver evidence assets/joins: `node scripts/research-asset-query.mjs --query=<term>`;
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`;
- context-route size: `node scripts/agent-context-budget.mjs [--route=<id>]`.

Use the full owning reference when the compact result is insufficient or the task requires its contract/boundary detail.

## Solver research route

Default current-head orientation is intentionally small:

1. [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md)
2. [`solver-research-operating-model.md`](solver-research-operating-model.md)
3. the specialist doc required by the current gate
4. compact evidence/tool queries before opening broad catalogs

Add [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) when population/holdout/generalization matters. Open [`solver-research-data-assets.md`](solver-research-data-assets.md) for non-obvious cross-evidence joins or boundary detail. Open [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) for chronology/full evidence chains. Use [`solver-research-post-naming-resumption.md`](solver-research-post-naming-resumption.md) only when frozen pre-cleanup evidence is materially involved.

### Research instruments

These docs describe reusable instruments, not current priority or promotion authority.

| Doc | Instrument |
|---|---|
| [`technique-census-analysis.md`](technique-census-analysis.md) | Rebuildable census/portfolio diagnostics |
| [`solver-offline-replay-harness.md`](solver-offline-replay-harness.md) | Read-only exact/reference-labelled probes |
| [`solver-known-solution-prefix-survival.md`](solver-known-solution-prefix-survival.md) | Beam known-solution-prefix survival observation |
| [`solver-ablation.md`](solver-ablation.md) | Exploratory ablation lab |
| [`solver-required-length-sweep.md`](solver-required-length-sweep.md) | Within-level required-length sensitivity |

## Completed naming-cleanup evidence

The repository-wide naming cleanup is complete through Phase 15. Current naming authority is [`naming-and-vocabulary.md`](naming-and-vocabulary.md); future cross-boundary renames use [`change-recipes.md`](change-recipes.md). `npm run naming:status` reports terminal/history state.

The following remain implementation evidence, not ordinary current-task reading: `naming-cleanup-plan.md`, `naming-cleanup-ledger.json`, `naming-cleanup-history-and-lessons.md`, `naming-cleanup-process-hardening.md`, `naming-cleanup-future-phase-preparation.md`, `naming-cleanup-phase-record-template.md`, and `naming-cleanup-phase-records/`. Do not reopen them as a Phase 16 sequence. Frozen reports keep historical names/paths where provenance requires it.

## History

Superseded plans, concluded experiments, and old queue/ledger states live in [`archive/snapshots/`](archive/snapshots/README.md). Other history: [`adr/`](adr/), [`archive/`](archive/README.md), [`history/development-journal.md`](history/development-journal.md), [`refactor-notes/`](refactor-notes/).

`../CLAUDE.md` and `.github/copilot-instructions.md` are adapters to `../AGENTS.md`, not separate knowledge bases.
