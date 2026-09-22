# Pathfinder documentation index

Task routing lives in [`../AGENTS.md`](../AGENTS.md). This file inventories ownership; it is not a second agent guide.

## Current references

| Doc | Owns |
|---|---|
| [`architecture.md`](architecture.md) | Application structure and code ownership |
| [`architecture-unification-debt.md`](architecture-unification-debt.md) | Remaining authority/mutable-lifetime architecture debt |
| [`change-recipes.md`](change-recipes.md) | Cross-boundary schema/state/telemetry changes |
| [`periodic-repository-hygiene.md`](periodic-repository-hygiene.md) | Recurring repository entropy-control procedure |
| [`naming-and-vocabulary.md`](naming-and-vocabulary.md) | Canonical naming and vocabulary |
| [`testing.md`](testing.md) | Validation and finish-line gates |
| [`tooling-catalog.md`](tooling-catalog.md) | Broad tool/workflow discovery; query named tools first |
| [`agent-context-routes.json`](agent-context-routes.json) | Required/optional agent-context routes and byte budgets |
| [`solver-architecture.md`](solver-architecture.md) | Solver implementation and execution policy |
| [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) | **Canonical solver-research priority, workstream state, and next gates** |
| [`solver-reasoning-capability-atlas.md`](solver-reasoning-capability-atlas.md) | Solver reasoning capability map; not a queue |
| [`solver-capability-invention-program.md`](solver-capability-invention-program.md) | HARVEST / EXTENSION / INVENTION acquisition rules and demand pipeline |
| [`solver-protocol-schema-contraction-plan.md`](solver-protocol-schema-contraction-plan.md) | Active contraction of overlapping solver/research schemas, protocols, identities, compatibility inputs, and mutable representations |
| [`solver-capability-gap-stop-condition-reconciliation.md`](solver-capability-gap-stop-condition-reconciliation.md) | Reconciles historical experiment closure against capability gaps |
| [`solver-solve-local-rediscovery-preflight.md`](solver-solve-local-rediscovery-preflight.md) | Bounded observer-first plan to measure repeated derivation and potential typed reuse of expensive current-instance facts within one cold solve |
| [`solver-per-instance-relational-feasibility-preflight.md`](solver-per-instance-relational-feasibility-preflight.md) | Bounded current-input relational queries (intersection realizability, event feasibility, interface commutativity) |
| [`solver-dependency-defined-revision-preflight.md`](solver-dependency-defined-revision-preflight.md) | Observer-first test of whether DEAD near-misses trace to a compact dependency-defined commitment set, not path-distance rollback |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Research method, stop rules, promotion and selection discipline |
| [`solver-archaeology-register.md`](solver-archaeology-register.md) | Historical solver premises, dispositions, vocabulary lineages, and reopen questions; **not** a priority authority |
| [`solver-research-data-assets.md`](solver-research-data-assets.md) | Compact cross-asset topology and scientific boundaries |
| [`solver-research-data-assets.json`](solver-research-data-assets.json) | Structured per-asset locations, authorities, joins, relationships, roles, and caveats |
| [`solver-research-resource-contract.md`](solver-research-resource-contract.md) | Catalogue-grade and audit-grade scientific semantics for durable research resources |
| [`solver-research-resource-contract-audits.json`](solver-research-resource-contract-audits.json) | Machine-readable audit-grade declarations keyed to research-asset IDs |
| [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) | Development/confirmation/transfer and holdout discipline |
| [`solver-scheduling-policy.md`](solver-scheduling-policy.md) | Action selection and fixed-work allocation research |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Work/budget/deadline semantics |
| [`solver-evidence-integrity-index.schema.json`](solver-evidence-integrity-index.schema.json) | Machine-readable contract for the rebuildable historical solver-evidence integrity index |
| [`solver-experiment-result.schema.json`](solver-experiment-result.schema.json) | Version 3 shared solver experiment publication contract |
| [`solver-workflow-lifecycle.json`](solver-workflow-lifecycle.json) | Maintained workflow inventory, consumers, and retirement triggers |
| [`solver-residual-state-representation.md`](solver-residual-state-representation.md) | Residual/future representation vocabulary |
| [`solver-technique-operational-taxonomy.md`](solver-technique-operational-taxonomy.md) | Operational technique/configuration meaning |
| [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) | Current profile-led speed gates/dispositions |
| [`solver-level-blindness.md`](solver-level-blindness.md) | Runtime information boundary |
| [`solver-correctness-hardening.md`](solver-correctness-hardening.md) | Solver correctness/state/provenance invariants |
| [`variant-level-research.md`](variant-level-research.md) | Variant/family evidence and dataset use |
| [`human-parent-contrast-research.md`](human-parent-contrast-research.md) | Question-first human/editor-parent controlled contrasts and evidence boundaries |
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
- new/unregistered research question: [`research-question-intake.md`](research-question-intake.md), then `node scripts/research-status-index.mjs --compact --query=<term>`;
- prior evidence / known question discovery: `node scripts/research-status-index.mjs --compact --query=<term>`;
- research-system orientation: `npm run research:system-inventory -- --view=brief`;
- machine inputs/findings: `npm run research:system-inventory -- --view=brief-inputs|findings`;
- historical solver premise/disposition memory: [`solver-archaeology-register.md`](solver-archaeology-register.md) when the question is explicitly about old/retired work;
- existing tooling: `node scripts/tooling-census.mjs --compact --query=<term>`;
- solver evidence assets/joins: `node scripts/research-asset-query.mjs --query=<term>`;
- corpus shape: `node scripts/corpus-query.mjs --corpus=stress2`;
- context size: `node scripts/agent-context-budget.mjs [--route=<id>]`.

Open the owning reference only when the compact result is insufficient or its contract/boundary detail matters.

## Solver research route

For a conversational/unregistered idea, start with [`research-question-intake.md`](research-question-intake.md). Expand and contextualize the ambiguity before minting an ID; if an existing stable question emerges, switch to `research:dossier`.

For an existing gate/question, default orientation is:

1. [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md)
2. [`solver-research-operating-model.md`](solver-research-operating-model.md)
3. the specialist doc for the current gate
4. compact evidence/tool queries before broad artifacts

Add [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) for population/holdout/generalization questions. Use [`solver-research-data-assets.md`](solver-research-data-assets.md) for cross-asset boundaries and [`solver-research-resource-contract.md`](solver-research-resource-contract.md) for audited resource semantics. Use the post-naming resumption guide only for frozen pre-cleanup evidence, and the archaeology register only for historical premises/dispositions.

Workflow/evidence remediation is complete; current maintenance uses the evaluation/operating-model docs, maintained lifecycle/indexes, and changed code. Historical conclusions remain in [`solver-workflow-remediation-review-handoff.md`](solver-workflow-remediation-review-handoff.md).

### Research instruments

These are reusable instruments, not priority authorities.

| Doc | Instrument |
|---|---|
| [`technique-census-analysis.md`](technique-census-analysis.md) | Census/portfolio diagnostics |
| [`solver-offline-replay-harness.md`](solver-offline-replay-harness.md) | Read-only exact/reference-labelled probes |
| [`solver-known-solution-prefix-survival.md`](solver-known-solution-prefix-survival.md) | Known-solution-prefix survival observation |
| [`human-parent-contrast-research.md`](human-parent-contrast-research.md) | Human/editor-origin controlled family generation for earned causal/transfer questions |
| [`solver-search-resumability.md`](solver-search-resumability.md) | Opt-in beam continuation mechanism and current research dispositions |
| [`solver-ablation.md`](solver-ablation.md) | Exploratory ablation lab |
| [`solver-required-length-sweep.md`](solver-required-length-sweep.md) | Required-length sensitivity |

## Compatibility and conditional references

- [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) is a compatibility pointer to the workstream authority. Do not put mutable queue state there.
- [`solver-research-post-naming-resumption.md`](solver-research-post-naming-resumption.md) translates frozen pre-cleanup evidence when historical names/contracts matter.

## Completed naming-cleanup evidence

Phase 0–15 is complete. Current naming authority is [`naming-and-vocabulary.md`](naming-and-vocabulary.md); future cross-boundary renames use [`change-recipes.md`](change-recipes.md). `npm run naming:status` provides targeted terminal/history status.

| Frozen record | Role |
|---|---|
| [`naming-cleanup-phase-records/phase-15.md`](naming-cleanup-phase-records/phase-15.md) | Completed/frozen Phase-15 execution evidence |
| [`naming-cleanup-phase-records/phase-15-preparation.md`](naming-cleanup-phase-records/phase-15-preparation.md) | Frozen Phase-15 preparation snapshot |

`naming-cleanup-plan.md`, `naming-cleanup-ledger.json`, `naming-cleanup-history-and-lessons.md`, `naming-cleanup-process-hardening.md`, `naming-cleanup-future-phase-preparation.md`, `naming-cleanup-phase-record-template.md`, and `naming-cleanup-phase-records/` are implementation evidence, not ordinary current-task reading. Frozen reports keep historical names/paths where provenance requires it.

## History

### Concluded solver research routes

Retained for evidence/history and targeted archaeology, not as current authorities:

- [`solver-separator-decomposition-census-preflight.md`](solver-separator-decomposition-census-preflight.md) — concluded Class-5 separator census.
- [`solver-fresh-dead-sibling-harvest-preflight.md`](solver-fresh-dead-sibling-harvest-preflight.md) — concluded fresh exact sibling-harvest preflight and construction-gap record.
- [`solver-workflow-evidence-remediation-plan.md`](solver-workflow-evidence-remediation-plan.md) — completed PR #1740 remediation program.
- [`solver-workflow-remediation-implementation-handoff.md`](solver-workflow-remediation-implementation-handoff.md) — historical implementation contract for that program.
- [`solver-workflow-remediation-review-handoff.md`](solver-workflow-remediation-review-handoff.md) — completed closeout/review record.
- [`solver-research-system-consolidation-and-epistemic-coverage-plan.md`](solver-research-system-consolidation-and-epistemic-coverage-plan.md) — completed research-system consolidation program; history/maintenance rationale.

Superseded plans, concluded experiments, and old authority states live in [`archive/snapshots/`](archive/snapshots/README.md). Other history: [`adr/`](adr/), [`archive/`](archive/README.md), [`history/development-journal.md`](history/development-journal.md), [`refactor-notes/`](refactor-notes/).

`../CLAUDE.md` and `.github/copilot-instructions.md` are adapters to `../AGENTS.md`, not knowledge bases.
