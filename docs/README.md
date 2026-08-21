# Pathfinder documentation index

Use [`../AGENTS.md`](../AGENTS.md) first when it routes the task.

## Task map

| Need | Start here |
|---|---|
| Application architecture | [`architecture.md`](architecture.md) |
| Architecture cleanup / duplicate authority | [`architecture-unification-audit.md`](architecture-unification-audit.md) |
| Cross-cutting schema/state/telemetry change | [`change-recipes.md`](change-recipes.md) |
| Tests / finish-line validation | [`testing.md`](testing.md) |
| CLI, probe, workflow discovery | [`tooling-catalog.md`](tooling-catalog.md) |
| Solver implementation | [`solver-architecture.md`](solver-architecture.md) |
| Current solver priority | [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) |
| Solver research method | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| Variant/family research | [`variant-level-research.md`](variant-level-research.md) |
| Default-off solver mechanisms | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| Deferred/reopen solver ideas | [`future-work.md`](future-work.md) |
| Prior experiment evidence | [`../reports/README.md`](../reports/README.md) |
| Stress corpora | [`../data/stress/README.md`](../data/stress/README.md) |
| Full rules/gotchas | [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md) |

## Other current references

| Doc | Role |
|---|---|
| [`typing.md`](typing.md) | TypeScript model and `.ts` source / `.js` import rule. |
| [`command-glossary.md`](command-glossary.md) | Runtime flow names and implementation locations. |
| [`ui-accessibility.md`](ui-accessibility.md) | Dialog/focus/keyboard/accessibility conventions. |
| [`security.md`](security.md) | Security/data/debug policy. |
| [`content-security-policy.md`](content-security-policy.md) | CSP contract. |
| [`firestore-security-model.md`](firestore-security-model.md) | Firestore access model. |
| [`firebase-config-and-secret-hygiene.md`](firebase-config-and-secret-hygiene.md) | Commit/secret boundary. |
| [`third-party-dependencies.md`](third-party-dependencies.md) | External dependency allowlist. |
| [`hint-curation.md`](hint-curation.md) | Player hint selection/diversity. |
| [`solve-button-variety.md`](solve-button-variety.md) | Varied-hint search behavior. |
| [`hint-workbench.md`](hint-workbench.md) | Hint research CLI. |
| [`mechanic-state-contracts.md`](mechanic-state-contracts.md) | Dynamic mechanic state/bounds/model support. |
| [`investigation-report-conventions.md`](investigation-report-conventions.md) | Investigation status/decision/gate schema. |
| [`solver-level-blindness.md`](solver-level-blindness.md) | Cold-capability information boundary. |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Work/budget/deadline reproducibility. |
| [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) | Correctness-hardening taxonomy. |
| [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md) | Scratch-storage contracts. |
| [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) | Solver/game semantic boundary. |
| [`solution-profile.md`](solution-profile.md) | Known-solution behavioral fingerprints. |

## Research instruments

Presence does not imply current priority.

| Doc | Role |
|---|---|
| [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) | Read-only exact/oracle-labelled probes. |
| [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md) | Beam lineage observation. |
| [`ablation.md`](ablation.md) | Feature-flag ablation lab. |
| [`req-length-sweep.md`](req-length-sweep.md) | Required-length scaling. |

## History

Superseded plans, concluded experiments, old queue states/research ledgers, and pre-consolidation text live in [`archive/snapshots/`](archive/snapshots/README.md). Do not treat snapshot chronology or old priorities as current instructions; use the task map above.

Other history: [`adr/`](adr/), [`archive/`](archive/README.md), [`history/development-journal.md`](history/development-journal.md), [`refactor-notes/`](refactor-notes/).

`../CLAUDE.md` and `.github/copilot-instructions.md` adapt `../AGENTS.md`; they are not separate knowledge bases.
