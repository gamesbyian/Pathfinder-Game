# Solver correctness hardening reference

> **Status:** current standing invariants distilled from fixed correctness failures.
> **Historical investigation:** [`archive/snapshots/solver-correctness-archaeology-2026-08-20.md`](archive/snapshots/solver-correctness-archaeology-2026-08-20.md).

Use this when changing hard prunes, state identity, solver/runtime rule implementations, reusable scratch, budgets, experiment plumbing, or persisted telemetry. It is a review checklist, not a list of current solver defects. Current optimization work lives in [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md).

The bounded correctness-hardening package completed in August 2026 found no newly demonstrated production hard prune that rejected a valid solution. Its durable value is the failure taxonomy below.

## Standing failure classes

| # | Failure class | Required invariant |
|---:|---|---|
| 1 | Incomplete future-state identity | Any cache, memo, `seen` set, dedup key, dominance relation, signature, or state equivalence must include every property that can change future legality, future constraint satisfaction, or the cached value. Add counterexamples that vary one omitted field at a time. |
| 2 | Sentinel / packing / representation drift | Decode through documented contracts, not remembered sentinels. Fixed-width packing requires enforced cardinality proof at every producer/consumer boundary. Audit consumers whenever caps change. |
| 3 | Reusable scratch lifecycle leakage | Test reusable memory as heterogeneous call sequences, not only clean single calls. Cover capacity boundaries, shifted regions, reset assumptions, nesting, and generation-counter rollover where relevant. |
| 4 | Approximation in the wrong direction | Every hard-prune approximation declares permitted error direction. Lower bounds may be too low, never too high; reachability over-approximations may admit impossible states, never exclude possible ones; deadness tests may miss dead states, never invent them. |
| 5 | Heuristic evidence promoted to proof | Corpus correlation, witness regularity, score preference, or structural intuition does not become a hard reject without a rule-derived proof plus counterexample-oriented validation. |
| 6 | Independent rule implementations drift | Preserve useful independence among live/domain rules, referee, solver transitions, and reference oracle, but differentially test both move legality and final acceptance. New mechanics must reach every arbiter and fixture. |
| 7 | Pre-move / post-move state confusion | Search/scoring APIs state explicitly whether candidate state has already been applied. Do not port a quantity between DFS/beam/repair phases without checking this contract. |
| 8 | Programming failure becomes a plausible mathematical value | Distinguish failed computation from legitimate `Infinity`, unreachable, empty, or infeasible values. Assert finite/defined values where mathematics requires them. |
| 9 | Configuration/default propagation | Extend the canonical ablation normalization and opt-in registry. Do not create a second sparse-default system; test both default-on and default-off polarity. |
| 10 | Nested budget/resource semantics | Every budget boundary states absolute vs remaining, per-attempt vs cumulative, allocation currency vs deadline, and whether additive passes are inside the total envelope. Cover zero/tiny/boundary/infinite cases. |
| 11 | Telemetry/provenance projection drift | Persisted telemetry is part of scientific correctness. Shared projections and maximal round-trip fixtures must fail when a newly persistent field is accidentally dropped. |
| 12 | Exceptions/errors converted into ordinary negatives | Exhaustion, timeout/deadline truncation, unsupported input, execution error, and genuine no-solution evidence remain distinct through workers, reports, and persisted artifacts. |
| 13 | Workflow/ref/SHA/checkpoint staleness | Serious results record measured SHA/ref plus corpus/config identity at the worker boundary. Resume/checkpoint identity includes every setting that changes result meaning. |
| 14 | Incomplete or contaminated populations | Combine steps assert expected coverage. Partial/missing/stale shards are labelled partial or rejected, never silently interpreted as a solver regression. |
| 15 | External-model validation in only one direction | Validate known real witnesses in the model **and** model-generated witnesses with the real referee. Include a positive search control. UNSAT/proof claims require an explicit approximation-direction argument. |
| 16 | Identifier/namespace ambiguity | Corpus identity is part of level identity for files, caches, reports, checkpoints, and cross-corpus analysis. Reuse shared selector/parsing infrastructure. |
| 17 | Stale documentation | Current behavior belongs in current contracts/queues; dated reports and snapshots are evidence. Update or archive status text when implementation or promotion state changes. |

## Current supporting contracts

- [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md) covers history-sensitive state semantics and independent game/solver rule alignment.
- [`mechanic-state-contracts.md`](mechanic-state-contracts.md) records dynamic mechanic cardinality/state/model assumptions.
- [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md) records scratch/pool ownership and lifecycle.
- [`solver-budget-determinism.md`](solver-budget-determinism.md) defines the canonical work currency, deadline semantics, and matched-work rules.
- [`solver-level-blindness.md`](solver-level-blindness.md) defines the production information boundary.
- [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md) prevents retained prototype flags from being mistaken for open correctness work.
- [`investigation-report-conventions.md`](investigation-report-conventions.md) keeps evidence status separate from current instruction.

## Closed work that should not be rediscovered unchanged

- Generic exact DFS/beam transposition caching was measured with sound state identity and had poor payoff relative to cost. Coarse beam dedup is a separate width/diversity policy, not exact equivalence.
- The composite bit-packing sibling audit after the beam-key overflow was completed; reopen only when a new packed representation or cardinality change creates new evidence.
- The MITM frontier key was corrected for missing future-relevant state and rerun; exact frontier growth, not an unfixed key, is the current conclusion.
- Flipping-filter single-use/global crossing-order parity is settled game semantics.
- Sparse ablation normalization is centralized; extend its registry/tests rather than creating parallel default logic.
- The repair-scoped exact-state nogood cache exists; the old naive global key remains a soundness counterexample, not a pending feature.
- Portal-parity hard pruning was implemented and measured effectively inert in its tested form; code presence does not make it an uninvestigated opportunity.
- The completed August 2026 hardening package already added explicit attempt errors, multi-arbiter oracle/referee checks, representation contracts, scratch-lifecycle coverage, telemetry projection tests, activation/positive controls for prune harnesses, and admissibility-direction tests.

For exact bug stories, measurements, intermediate hypotheses, and the completed hardening chronology, use the frozen snapshot and its cited dated reports. Keep this file focused on what a future change must preserve.
