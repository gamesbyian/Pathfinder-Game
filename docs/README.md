<!-- agent-context-budget: warn=10000 max=13000 -->
# Pathfinder documentation index

Task routing lives in [`../AGENTS.md`](../AGENTS.md). This file inventories ownership; it is not a second agent guide.

## Current references

| Doc | Owns |
|---|---|
| [`architecture.md`](architecture.md) | Application structure and code ownership |
| [`architecture-unification-debt.md`](architecture-unification-debt.md) | Remaining authority/mutable-lifetime architecture debt |
| [`change-recipes.md`](change-recipes.md) | Cross-boundary schema/state/telemetry changes |
| [`periodic-repository-hygiene.md`](periodic-repository-hygiene.md) | Recurring repository entropy-control procedure: docs/context, staleness, tooling, workflows, CI, validators, archives, research infrastructure, and anti-regression guards |
| [`naming-and-vocabulary.md`](naming-and-vocabulary.md) | Canonical naming and vocabulary |
| [`testing.md`](testing.md) | Validation and finish-line gates |
| [`tooling-catalog.md`](tooling-catalog.md) | Broad tool/workflow discovery; query named tools first |
| [`agent-context-routes.json`](agent-context-routes.json) | Required/optional agent-context routes and byte budgets |
| [`solver-architecture.md`](solver-architecture.md) | Solver implementation and execution policy |
| [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md) | **Canonical solver-research priority, workstream state, and next gates** |
| [`solver-reasoning-capability-atlas.md`](solver-reasoning-capability-atlas.md) | Semantic map of solver reasoning primitives versus Pathfinder computational demands; descriptive premise-generation aid, not a queue |
| [`solver-capability-gap-stop-condition-reconciliation.md`](solver-capability-gap-stop-condition-reconciliation.md) | Reconciles historical negative/closed experiments against capability gaps so descriptor/form/cross-level closure is not mistaken for semantic-premise closure |
| [`solver-solve-local-rediscovery-preflight.md`](solver-solve-local-rediscovery-preflight.md) | Bounded observer-first plan to measure repeated derivation and potential typed reuse of expensive current-instance facts within one cold solve |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Research method, stop rules, promotion and selection discipline |
| [`solver-archaeology-register.md`](solver-archaeology-register.md) | Historical solver premises, dispositions, vocabulary lineages, and reopen questions; **not** a priority authority |
| [`solver-research-data-assets.md`](solver-research-data-assets.md) | Compact cross-asset topology and scientific boundaries |
| [`solver-research-data-assets.json`](solver-research-data-assets.json) | Structured per-asset locations, authorities, joins, relationships, roles, and caveats |
| [`solver-research-resource-contract.md`](solver-research-resource-contract.md) | Catalogue-grade and audit-grade scientific semantics for durable research resources |
| [`solver-research-resource-contract-audits.json`](solver-research-resource-contract-audits.json) | Machine-readable audit-grade declarations keyed to research-asset IDs |
| [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md) | Development/confirmation/transfer and holdout discipline |
| [`solver-scheduling-policy.md`](solver-scheduling-policy.md) | Action selection and fixed-work allocation research |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Work/budget/deadline semantics |
| [`solver-workflow-evidence-remediation-plan.md`](solver-workflow-evidence-remediation-plan.md) | **Completed PR #1740 workflow/evidence-remediation program; retained historical route and durable-rule summary** |
| [`solver-workflow-remediation-implementation-handoff.md`](solver-workflow-remediation-implementation-handoff.md) | Historical implementation contract used by the completed remediation |
| [`solver-evidence-integrity-index.schema.json`](solver-evidence-integrity-index.schema.json) | Machine-readable contract for the rebuildable historical solver-evidence integrity index |
| [`solver-experiment-result.schema.json`](solver-experiment-result.schema.json) | Version 3 shared solver experiment publication contract |
| [`solver-workflow-lifecycle.json`](solver-workflow-lifecycle.json) | Maintained workflow inventory, consumers, and retirement triggers |
| [`solver-workflow-remediation-review-handoff.md`](solver-workflow-remediation-review-handoff.md) | Completed remediation closeout and hostile-review conclusions |
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
- prior evidence: `node scripts/research-status-index.mjs --compact --query=<term>`;
- historical solver premise/disposition memory: [`solver-archaeology-register.md`](solver-archaeology-register.md) when the question is explicitly about old/retired work;
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