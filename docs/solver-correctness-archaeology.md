# Solver correctness hardening reference

> **Status:** current invariants distilled from fixed correctness failures.
> **History:** [`archive/snapshots/solver-correctness-archaeology-2026-08-20.md`](archive/snapshots/solver-correctness-archaeology-2026-08-20.md).

Use when changing hard prunes, state identity, solver/runtime rules, reusable scratch, budgets, experiment plumbing, or persisted telemetry. This is a review checklist, not a defect list; current optimization work is in [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md). The August 2026 hardening pass found no newly demonstrated production hard prune rejecting a valid solution.

## Standing failure classes

| # | Failure class | Required invariant |
|---:|---|---|
| 1 | Incomplete future-state identity | Cache/memo/`seen`/dedup/dominance/signature equivalence includes every property affecting future legality, constraints, or cached value. Add counterexamples varying omitted fields. |
| 2 | Sentinel / packing / representation drift | Decode documented contracts, not remembered sentinels. Fixed-width packing needs enforced cardinality proof across producers/consumers; audit consumers when caps change. |
| 3 | Reusable scratch lifecycle leakage | Test heterogeneous call sequences, capacity boundaries, shifted regions, reset assumptions, nesting, and generation-counter rollover where relevant. |
| 4 | Approximation in the wrong direction | Hard-prune approximations declare allowed error direction. Lower bounds may be low, never high; reachability over-approximations may admit impossible states, never exclude possible ones; deadness tests may miss dead states, never invent them. |
| 5 | Heuristic evidence promoted to proof | Correlation, witness regularity, score preference, or intuition cannot become a hard reject without rule-derived proof and counterexample-oriented validation. |
| 6 | Independent rule implementations drift | Preserve useful independence among live/domain rules, referee, solver transitions, and reference oracle; differentially test move legality and final acceptance. New mechanics reach every arbiter/fixture. |
| 7 | Pre-move / post-move state confusion | Search/scoring APIs state whether candidate state is already applied. Check this before porting quantities among DFS/beam/repair. |
| 8 | Programming failure becomes a plausible mathematical value | Distinguish failed computation from legitimate `Infinity`, unreachable, empty, or infeasible values; assert finite/defined values where required. |
| 9 | Configuration/default propagation | Extend canonical ablation normalization and opt-in registry; do not create a second sparse-default system. Test default-on and default-off polarity. |
| 10 | Nested budget/resource semantics | Budget boundaries state absolute vs remaining, per-attempt vs cumulative, allocation currency vs deadline, and whether additive passes share the envelope. Test zero/tiny/boundary/infinite cases. |
| 11 | Telemetry/provenance projection drift | Persisted telemetry is scientific correctness. Shared projections and maximal round-trip fixtures must fail when persistent fields are dropped. |
| 12 | Exceptions/errors converted into ordinary negatives | Keep exhaustion, timeout/deadline truncation, unsupported input, execution error, and genuine no-solution evidence distinct through workers/reports/artifacts. |
| 13 | Workflow/ref/SHA/checkpoint staleness | Serious results record measured SHA/ref and corpus/config identity at the worker boundary. Resume identity includes every meaning-changing setting. |
| 14 | Incomplete or contaminated populations | Combine steps assert expected coverage. Partial/missing/stale shards are labelled partial or rejected, never silently treated as regression evidence. |
| 15 | External-model validation in only one direction | Validate real witnesses in the model and model witnesses with the real referee; include a positive search control. UNSAT/proof claims require explicit approximation-direction reasoning. |
| 16 | Identifier/namespace ambiguity | Corpus identity is part of level identity for files, caches, reports, checkpoints, and cross-corpus analysis. Reuse shared selectors/parsers. |
| 17 | Stale documentation | Current behavior belongs in current contracts/queues; reports/snapshots preserve evidence. Update/archive status when implementation or promotion state changes. |

## Supporting contracts

- [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md): history-sensitive semantics and rule alignment.
- [`mechanic-state-contracts.md`](mechanic-state-contracts.md): dynamic mechanic cardinality/state/model assumptions.
- [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md): scratch/pool ownership and lifecycle.
- [`solver-budget-determinism.md`](solver-budget-determinism.md): work currency, deadlines, matched-work rules.
- [`solver-level-blindness.md`](solver-level-blindness.md): production information boundary.
- [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md): retained prototype dispositions.
- [`investigation-report-conventions.md`](investigation-report-conventions.md): evidence status vs current instruction.

## Closed work not to rediscover unchanged

- Exact DFS/beam transposition caching with sound identity had poor payoff; coarse beam dedup is width/diversity policy, not exact equivalence.
- Composite bit-packing siblings were audited after the beam-key overflow; reopen for new packed representations/cardinality changes.
- The MITM frontier key was fixed for missing future state and rerun; exact frontier growth is now the conclusion.
- Flipping-filter single-use/global crossing-order parity is settled semantics.
- Sparse ablation normalization is centralized; extend its registry/tests instead of adding default logic.
- Repair-scoped exact-state nogood caching exists; the naive global key is a soundness counterexample, not pending work.
- Portal-parity hard pruning was implemented and measured effectively inert in its tested form.
- The August 2026 hardening pass already added explicit attempt errors, multi-arbiter oracle/referee checks, representation contracts, scratch-lifecycle coverage, telemetry projection tests, prune-harness activation/positive controls, and admissibility-direction tests.

For exact bug stories, measurements, hypotheses, and chronology, use the snapshot and its dated reports. Keep this file about what future changes must preserve.
