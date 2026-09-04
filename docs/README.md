# Pathfinder documentation index

Task routing lives in [`../AGENTS.md`](../AGENTS.md). This file inventories ownership; it is not a second agent guide.

## Current references

| Doc | Owns |
|---|---|
| [`architecture.md`](architecture.md) | Application structure and code ownership |
| [`architecture-unification-debt.md`](architecture-unification-debt.md) | Remaining authority/mutable-lifetime architecture debt |
| [`change-recipes.md`](change-recipes.md) | Cross-boundary schema/state/telemetry changes |
| [`naming-and-vocabulary.md`](naming-and-vocabulary.md) | Canonical naming and vocabulary |
| [`testing.md`](testing.md) | Validation and finish-line gates |
| [`tooling-catalog.md`](tooling-catalog.md) | Broad tool/workflow discovery; query named tools first |
| [`agent-context-routes.json`](agent-context-routes.json) | Required/optional agent-context routes and byte budgets |
| [`solver-architecture.md`](solver-architecture.md) | Solver implementation and execution policy |
| [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) | **Canonical solver-research priority, workstream state, and next gates** |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Research method, stop rules, promotion and selection discipline |
| [`solver-research-data-assets.md`](solver-research-data-assets.md) | Compact cross-asset topology and scientific boundaries |
| [`solver-research-data-assets.json`](solver-research-data-assets.json) | Structured per-asset locations, authorities, joins, relationships, roles, and caveats |
| [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) | Development/confirmation/transfer and holdout discipline |
| [`solver-scheduling-policy.md`](solver-scheduling-policy.md) | Action selection and fixed-work allocation research |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Work/budget/deadline semantics |
| [`solver-residual-state-representation.md`](solver-residual-state-representation.md) | Residual/future representation vocabulary |
| [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md) | Operational technique/configuration meaning |
| [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) | Profile-led execution-substrate gates |
| [`solver-level-blindness.md`](solver-level-blindness.md) | Runtime information boundary |
| [`solver-correctness-hardening.md`](solver-correctness-hardening.md) | Solver correctness/state/provenance invariants |
| [`variant-level-research.md`](variant-level-research.md) | Variant/family evidence and dataset use |
| [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) | Default-off mechanism dispositions |
| [`solver-future-work.md`](solver-future-work.md) | Deferred/reopen ideas |
| [`investigation-report-conventions.md`](investigation-report-conventions.md) | Investigation/report contract |
| [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md) | Scratch-storage contracts |
| [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) | Solver/game semantic boundary |
| [`solver-solution-profile.md`](solver-solution-profile.md) | Offline known-solution profiles |
| [`mechanic-state-contracts.md`](mechanic-state-contracts.md) | Dynamic mechanic state and external-model support |
| [`typing.md`](typing.md) | TypeScript source/import conventions |
| [`command-glossary.md`](command-glossary.md) | Runtime flow names and implementation locations |
| [`ui-accessibility.md`](ui-accessibility.md) | UI accessibility conventions |
| [`security.md`](security.md) | Firestore authorization/config/secrets/debug exposure |
| [`content-security-policy.md`](content-security-policy.md) | Browser CSP policy |
| [`hint-curation.md`](hint-curation.md) | Player hint selection/diversity |
| [`hint-variety-search.md`](hint-variety-search.md) | Varied-hint search behavior |
| [`hint-workbench.md`](hint-workbench.md) | Hint research CLI |

## Cheap discovery first

Before broad catalogs, reports, corpora, or histories:

- solver priority/state: [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md);
- prior evidence: `node scripts/research-status-index.mjs --compact --query=<term>`;
- existing tooling: `node scripts/tooling-census.mjs --compact --query=<term>`;
- solver evidence assets/joins: `node scripts/research-asset-query.mjs --query=<term>`;
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`;
- context size: `node scripts/agent-context-budget.mjs [--route=<id>]`.

Open the owning reference only when the compact result is insufficient or its contract/boundary detail matters.

## Solver research route

Default orientation:

1. [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md)
2. [`solver-research-operating-model.md`](solver-research-operating-model.md)
3. the specialist doc for the current gate
4. compact evidence/tool queries before broad artifacts

Add [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) when population/holdout/generalization matters. Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for cross-asset boundary guidance. [`solver-research-post-naming-resumption.md`](solver-research-post-naming-resumption.md) is conditional on materially using frozen pre-cleanup evidence.

### Research instruments

These are reusable instruments, not priority authorities.

| Doc | Instrument |
|---|---|
| [`technique-census-analysis.md`](technique-census-analysis.md) | Census/portfolio diagnostics |
| [`solver-offline-replay-harness.md`](solver-offline-replay-harness.md) | Read-only exact/reference-labelled probes |
| [`solver-known-solution-prefix-survival.md`](solver-known-solution-prefix-survival.md) | Known-solution-prefix survival observation |
| [`solver-ablation.md`](solver-ablation.md) | Exploratory ablation lab |
| [`solver-required-length-sweep.md`](solver-required-length-sweep.md) | Required-length sensitivity |

## Compatibility and conditional references

- [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) is a compatibility pointer to the workstream authority. Do not put mutable queue state there.
- [`solver-research-post-naming-resumption.md`](solver-research-post-naming-resumption.md) translates frozen pre-cleanup evidence when historical names/contracts matter.

## Completed naming-cleanup evidence

Phase 0–15 is complete. Current naming authority is [`naming-and-vocabulary.md`](naming-and-vocabulary.md); future cross-boundary renames use [`change-recipes.md`](change-recipes.md). `npm run naming:status` provides targeted terminal/history status.

`naming-cleanup-plan.md`, `naming-cleanup-ledger.json`, `naming-cleanup-history-and-lessons.md`, `naming-cleanup-process-hardening.md`, `naming-cleanup-future-phase-preparation.md`, `naming-cleanup-phase-record-template.md`, and `naming-cleanup-phase-records/` are implementation evidence, not ordinary current-task reading. Frozen reports keep historical names/paths where provenance requires it.

## History

Superseded plans, concluded experiments, and old authority states live in [`archive/snapshots/`](archive/snapshots/README.md). Other history: [`adr/`](adr/), [`archive/`](archive/README.md), [`history/development-journal.md`](history/development-journal.md), [`refactor-notes/`](refactor-notes/).

`../CLAUDE.md` and `.github/copilot-instructions.md` are adapters to `../AGENTS.md`, not knowledge bases.
