# Pathfinder documentation index

Task routing lives in [`../AGENTS.md`](../AGENTS.md). This file is the current-reference inventory, not a second agent guide.

## Naming

Current docs use lowercase kebab-case and stable, undated names. Prefer `<domain>-<subject>-<role>.md` when the domain or role helps scanning; omit redundant prefixes for repo-wide authorities such as `architecture.md`, `testing.md`, and `security.md`. Name a live document for what it is now, not the audit, plan, experiment, or investigation that created it. Use canonical repository terms rather than abbreviations or near-synonyms.

Dates and narrative experiment names belong in `reports/`, `archive/`, `history/`, or `refactor-notes/`. When renaming a live authority, update current links/imports/workflows/metadata and run `npm run check:documentation-links`; do not rewrite frozen reports or snapshots merely to modernize paths.

## Current references

| Doc | Role |
|---|---|
| [`architecture.md`](architecture.md) | Application structure and code ownership. |
| [`architecture-unification-debt.md`](architecture-unification-debt.md) | Remaining duplicate-authority/architecture debt. |
| [`change-recipes.md`](change-recipes.md) | Cross-boundary schema/state/telemetry changes. |
| [`testing.md`](testing.md) | Validation and finish-line gates. |
| [`tooling-catalog.md`](tooling-catalog.md) | CLI, probe, batch, and workflow discovery. |
| [`solver-architecture.md`](solver-architecture.md) | Solver implementation and execution policy. |
| [`solver-scheduling-policy.md`](solver-scheduling-policy.md) | **ASAP / HIGH PRIORITY:** evidence-driven ordering, bounded portfolio allocation, and dynamic scheduling program. |
| [`solver-architectural-speed-opportunities.md`](solver-architectural-speed-opportunities.md) | **ASAP / HIGH PRIORITY:** architecture-level runtime refactors and already-tested negatives. |
| [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) | Ranked live solver priority and current experiment dispositions. |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Solver research/evidence method. |
| [`variant-level-research.md`](variant-level-research.md) | Variant/family research and trove use. |
| [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) | Default-off mechanism dispositions. |
| [`solver-future-work.md`](solver-future-work.md) | Deferred/reopen ideas. |
| [`typing.md`](typing.md) | TypeScript model and `.ts` source / `.js` import rule. |
| [`command-glossary.md`](command-glossary.md) | Runtime flow names and implementation locations. |
| [`ui-accessibility.md`](ui-accessibility.md) | Dialog/focus/keyboard/accessibility conventions. |
| [`security.md`](security.md) | Firestore authorization, Firebase config/secrets, debug exposure, security workflow. |
| [`content-security-policy.md`](content-security-policy.md) | Production CSP and external browser-origin/dependency policy. |
| [`hint-curation.md`](hint-curation.md) | Player hint selection/diversity. |
| [`hint-variety-search.md`](hint-variety-search.md) | Varied-hint search behavior. |
| [`hint-workbench.md`](hint-workbench.md) | Hint research CLI. |
| [`mechanic-state-contracts.md`](mechanic-state-contracts.md) | Dynamic mechanic state/bounds/model support. |
| [`investigation-report-conventions.md`](investigation-report-conventions.md) | Investigation status/decision/gate schema. |
| [`solver-level-blindness.md`](solver-level-blindness.md) | Cold-capability information boundary. |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Work/budget/deadline reproducibility. |
| [`solver-correctness-hardening.md`](solver-correctness-hardening.md) | Correctness-hardening taxonomy. |
| [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md) | Scratch-storage contracts. |
| [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) | Solver/game semantic boundary. |
| [`solver-solution-profile.md`](solver-solution-profile.md) | Known-solution behavioral fingerprints. |

## Research instruments

Presence does not imply current priority.

| Doc | Role |
|---|---|
| [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md) | Active second-order census questions, findings, and follow-up analyses. |
| [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) | Read-only exact/oracle-labelled probes. |
| [`solver-winning-lineage-survival-analysis.md`](solver-winning-lineage-survival-analysis.md) | Beam lineage observation. |
| [`solver-ablation.md`](solver-ablation.md) | Feature-flag ablation lab. |
| [`solver-required-length-sweep.md`](solver-required-length-sweep.md) | Required-length scaling. |

Prior experiment evidence: [`../reports/README.md`](../reports/README.md). Stress corpora: [`../data/stress/README.md`](../data/stress/README.md). Broad rules/gotchas: [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md), load selectively.

## History

Superseded plans, concluded experiments, old queue states/research ledgers, and pre-consolidation text live in [`archive/snapshots/`](archive/snapshots/README.md). Other history: [`adr/`](adr/), [`archive/`](archive/README.md), [`history/development-journal.md`](history/development-journal.md), [`refactor-notes/`](refactor-notes/).

`../CLAUDE.md` and `.github/copilot-instructions.md` are thin adapters to `../AGENTS.md`, not separate knowledge bases.
