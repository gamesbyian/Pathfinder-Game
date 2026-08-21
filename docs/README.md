# Pathfinder documentation index

Use [`../AGENTS.md`](../AGENTS.md) first when it already routes the task.

## Task map

| Need | Start here |
|---|---|
| Application architecture | [`architecture.md`](architecture.md) |
| Architecture cleanup / compatibility / duplicate-authority review | [`architecture-unification-audit.md`](architecture-unification-audit.md) |
| Tests / finish-line validation | [`testing.md`](testing.md) |
| CLI, probe, or workflow discovery | [`tooling-catalog.md`](tooling-catalog.md) |
| Solver implementation | [`solver-architecture.md`](solver-architecture.md) |
| Current solver priority | [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) |
| Solver research method | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| Variant/family research | [`variant-level-research.md`](variant-level-research.md) |
| Default-off solver mechanisms | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| Deferred/reopen solver ideas | [`future-work.md`](future-work.md) |
| Prior experiment evidence | [`../reports/README.md`](../reports/README.md) |
| Stress corpora | [`../data/stress/README.md`](../data/stress/README.md) |
| Full game-rule/gotcha reference | [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md) |

## Current references

| Doc | Role |
|---|---|
| [`architecture.md`](architecture.md) | Layering, runtime/state, engine facade, UI structure, code placement. |
| [`architecture-unification-audit.md`](architecture-unification-audit.md) | Current review of intentional plurality, legacy compatibility, duplicate authorities, and behavior-preserving unification priorities. |
| [`testing.md`](testing.md) | Test tiers and required validation. |
| [`tooling-catalog.md`](tooling-catalog.md) | Tool/workflow discovery. |
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
| [`solver-architecture.md`](solver-architecture.md) | Solver implementation. |
| [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) | Canonical ranked optimization queue. |
| [`solver-level-blindness.md`](solver-level-blindness.md) | Cold-capability information boundary. |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Research method and promotion contract. |
| [`variant-level-research.md`](variant-level-research.md) | Family/variant resource and off-main trove. |
| [`future-work.md`](future-work.md) | Deferred/reopen idea index. |
| [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) | Default-off mechanism dispositions. |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Work-unit, budget, deadline, reproducibility contract. |
| [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) | Correctness-hardening taxonomy. |
| [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md) | Scratch-storage contracts. |
| [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) | Solver/game semantic boundary. |
| [`solution-profile.md`](solution-profile.md) | Known-solution behavioral fingerprints. |

## Research instruments

Presence here does not imply current priority.

| Doc | Role |
|---|---|
| [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) | Read-only exact/oracle-labelled probes. |
| [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md) | Beam lineage observation. |
| [`ablation.md`](ablation.md) | Feature-flag ablation lab. |
| [`req-length-sweep.md`](req-length-sweep.md) | Required-length scaling instrument. |

## Compatibility and history

Old paths remain small so historical links resolve. Frozen pre-consolidation text: [`archive/snapshots/`](archive/snapshots/README.md).

- `solver-heuristic-capability-gap-analysis.md`, `solver-improvement-research-notes.md`, `solver-next-frontier-*`, and `solver-development-roadmap.md`: historical solver research.
- `solver-interoperability-and-cooperation-plan.md`: producer/receptor design now consolidated into the operating model.
- `research-infrastructure-and-optimization-opportunities.md`: infrastructure review now split across current tooling/method/deferred docs.
- `main-loop-late-reserve-experiment.md`, `fast-portfolio-scheduler-plan.md`, `repair-search-stagnation-escape-plan.md`: concluded experiments/plans.
- `ai-assisted-manual-solving.md`: worked note; current accepted-path method is in the operating model.
- `sibling-cousin-system.md`, `variant-corpus-solver-research-plan.md`, `family-and-scaling-research-possibilities.md`: superseded/consolidated family research.
- `solver-dev-tooling-plan.md`: completed tooling plan.
- `claude-remote-solver-handoff.md`: dated handoff.

Queue snapshots preserve 2026-08-20 chronology:
- [`solver-optimization-current-queue-2026-08-20-snapshot.md`](solver-optimization-current-queue-2026-08-20-snapshot.md)
- [`solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md`](solver-optimization-current-queue-2026-08-20-post-1398-snapshot.md)

They are history, not live priority.

Other history: [`adr/`](adr/), [`archive/`](archive/README.md), [`history/development-journal.md`](history/development-journal.md), [`refactor-notes/`](refactor-notes/).

`../CLAUDE.md` and `.github/copilot-instructions.md` are adapters to `../AGENTS.md`, not separate knowledge bases.
