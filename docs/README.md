# Pathfinder documentation index

Start here only when [`../AGENTS.md`](../AGENTS.md) does not already route the task. This index separates current references from research instruments and compatibility/archive pointers.

## Choose by task

| Need | Start here |
|---|---|
| Application architecture | [`architecture.md`](architecture.md) |
| Tests / finish-line validation | [`testing.md`](testing.md) |
| Existing CLI, probe, or workflow | [`tooling-catalog.md`](tooling-catalog.md) |
| Solver implementation | [`solver-architecture.md`](solver-architecture.md) |
| Current solver optimization priority | [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) |
| Solver research method / evidence routing | [`solver-research-operating-model.md`](solver-research-operating-model.md) |
| **Variant/family trove and uses** | **[`variant-level-research.md`](variant-level-research.md)** |
| Retained/default-off solver mechanisms | [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) |
| Broader deferred/reopen solver ideas | [`future-work.md`](future-work.md) |
| Prior experiment evidence | [`../reports/README.md`](../reports/README.md) |
| Stress corpora | [`../data/stress/README.md`](../data/stress/README.md) |
| Full accumulated game-rule/gotcha reference | [`../DEVELOPER_REFERENCE.md`](../DEVELOPER_REFERENCE.md) |

## Current product and engineering references

| Doc | Role |
|---|---|
| [`architecture.md`](architecture.md) | Layering, runtime/state, engine facade, UI structure, code placement. |
| [`testing.md`](testing.md) | Test tiers and required validation. |
| [`tooling-catalog.md`](tooling-catalog.md) | Task-oriented tool/workflow discovery. |
| [`typing.md`](typing.md) | Strict TypeScript model and `.ts` source / `.js` import-specifier rule. |
| [`command-glossary.md`](command-glossary.md) | Runtime flow names to implementation locations, not CLI discovery. |
| [`ui-accessibility.md`](ui-accessibility.md) | Dialog/focus/keyboard/accessibility conventions. |
| [`security.md`](security.md) | Security/data/debug-surface policy. |
| [`content-security-policy.md`](content-security-policy.md) | CSP contract. |
| [`firestore-security-model.md`](firestore-security-model.md) | Firestore access model. |
| [`firebase-config-and-secret-hygiene.md`](firebase-config-and-secret-hygiene.md) | Commit/secret boundary. |
| [`third-party-dependencies.md`](third-party-dependencies.md) | External dependency allowlist. |
| [`hint-curation.md`](hint-curation.md) | Player-facing hint selection/diversity. |
| [`solve-button-variety.md`](solve-button-variety.md) | Varied-hint search/curation behavior. |
| [`hint-workbench.md`](hint-workbench.md) | Unified hint research CLI. |
| [`mechanic-state-contracts.md`](mechanic-state-contracts.md) | Dynamic mechanic state/bounds/model support. |
| [`investigation-report-conventions.md`](investigation-report-conventions.md) | Investigation status/decision/gate schema. |

## Current solver references and decision surfaces

| Doc | Role |
|---|---|
| [`solver-architecture.md`](solver-architecture.md) | Durable solver implementation reference. |
| [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) | Canonical short ranked optimization queue. |
| [`solver-level-blindness.md`](solver-level-blindness.md) | Cold-capability information boundary. |
| [`solver-research-operating-model.md`](solver-research-operating-model.md) | Stable research method, failure classification, and promotion contract. |
| [`variant-level-research.md`](variant-level-research.md) | Canonical family/variant resource, including the off-main ~2.5 GB trove. |
| [`future-work.md`](future-work.md) | Compact broader deferred/reopen idea index, not a ranked queue. |
| [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) | Compact current disposition of every production-default-OFF mechanism. |
| [`solver-budget-determinism.md`](solver-budget-determinism.md) | Canonical work-unit, budget, deadline, and reproducibility contract. |
| [`solver-correctness-archaeology.md`](solver-correctness-archaeology.md) | Correctness-hardening taxonomy and remaining work. |
| [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md) | Reusable scratch-storage contracts. |
| [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) | Durable solver/game semantic-boundary and rule-alignment contract. |
| [`solution-profile.md`](solution-profile.md) | Known-solution behavioral fingerprints. |

## Current research instruments

These describe reusable machinery. Their presence does not make the associated hypothesis a current priority.

| Doc | Role |
|---|---|
| [`solver-shadow-eval-harness.md`](solver-shadow-eval-harness.md) | Read-only exact/oracle-labelled probe contract. |
| [`winning-lineage-survival-analysis.md`](winning-lineage-survival-analysis.md) | Beam known-lineage observation contract. |
| [`ablation.md`](ablation.md) | Feature-flag ablation lab. |
| [`req-length-sweep.md`](req-length-sweep.md) | Exact-required-length scaling instrument. |

## Compatibility pointers to archived/consolidated material

The following old paths remain intentionally small so old links resolve without putting long dated notebooks into the active semantic surface. Full pre-consolidation text is under [`archive/snapshots/`](archive/snapshots/README.md).

| Old path | Current disposition |
|---|---|
| [`solver-heuristic-capability-gap-analysis.md`](solver-heuristic-capability-gap-analysis.md) | Dated capability-gap analysis; current gaps/priorities live in the queue and operating model. |
| [`solver-interoperability-and-cooperation-plan.md`](solver-interoperability-and-cooperation-plan.md) | Original producer/receptor design; method consolidated into the operating model. |
| [`research-infrastructure-and-optimization-opportunities.md`](research-infrastructure-and-optimization-opportunities.md) | Strategic infrastructure review; current tooling/method/deferred ideas split across current docs. |
| [`main-loop-late-reserve-experiment.md`](main-loop-late-reserve-experiment.md) | Concluded/confounded historical experiment; current routing/allocation state lives in the queue/ledger. |
| [`ai-assisted-manual-solving.md`](ai-assisted-manual-solving.md) | Worked methodology note; accepted-path differential diagnosis consolidated into the operating model. |
| [`sibling-cousin-system.md`](sibling-cousin-system.md) | Superseded by `variant-level-research.md`. |
| [`variant-corpus-solver-research-plan.md`](variant-corpus-solver-research-plan.md) | Concluded family research plan; current family guidance consolidated. |
| [`family-and-scaling-research-possibilities.md`](family-and-scaling-research-possibilities.md) | Original proposal; family half superseded, scaling ideas retained in `future-work.md`. |
| [`solver-improvement-research-notes.md`](solver-improvement-research-notes.md) | Historical research ledger. |
| [`solver-next-frontier-2026-08-02.md`](solver-next-frontier-2026-08-02.md) | Historical speculative roadmap. |
| [`solver-next-frontier-multilingual-research-update-2026-08-02.md`](solver-next-frontier-multilingual-research-update-2026-08-02.md) | Historical literature update. |
| [`solver-dev-tooling-plan.md`](solver-dev-tooling-plan.md) | Completed tooling plan. |
| [`solver-development-roadmap.md`](solver-development-roadmap.md) | Historical solver campaign roadmap. |
| [`fast-portfolio-scheduler-plan.md`](fast-portfolio-scheduler-plan.md) | Concluded scheduler experiment. |
| [`repair-search-stagnation-escape-plan.md`](repair-search-stagnation-escape-plan.md) | Historical repair investigation. |
| [`claude-remote-solver-handoff.md`](claude-remote-solver-handoff.md) | Dated remote-agent handoff. |

[`solver-optimization-current-queue-2026-08-20-snapshot.md`](solver-optimization-current-queue-2026-08-20-snapshot.md) remains beside the live queue because preserving its original directory keeps its dense network of relative evidence links valid. It is history, not live priority.

## Decisions and deeper history

- [`adr/`](adr/) contains architecture decisions.
- [`archive/`](archive/README.md) contains completed records and frozen pre-consolidation snapshots.
- [`history/development-journal.md`](history/development-journal.md) is dated build narrative.
- [`refactor-notes/`](refactor-notes/) preserves refactor history.

`../CLAUDE.md` and `.github/copilot-instructions.md` are vendor adapters to `../AGENTS.md`, not separate knowledge bases.
