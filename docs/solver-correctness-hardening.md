# Solver correctness hardening reference

> **Status:** current invariants distilled from fixed correctness failures.
> **History:** [`archive/snapshots/solver-correctness-archaeology-2026-08-20.md`](archive/snapshots/solver-correctness-archaeology-2026-08-20.md).

Use when changing hard prunes, state identity, solver/runtime rules, reusable scratch, budgets, experiment plumbing, or persisted telemetry. This is a review checklist, not a defect list; current optimization work is in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md). The August 2026 hardening pass found no newly demonstrated production hard prune rejecting a valid solution.

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
| 18 | Unmodelled stage-history dependence | Given the same explicit level/action/config/seed and deterministic work budget, unrelated predecessor stages must not silently change search semantics, ordering, randomness, or capability. Any intended handoff must be explicit typed action state. Cache warming may change wall cost only unless a different contract is documented. Add fresh-vs-preceded differential tests for affected stages before treating sequence effects as causal evidence. |

## Open correctness defect: 31-32 flipping-filter beam identity

`validateRawLevel` permits up to 32 flipping filters because `flipperUsedMask` legitimately uses all 32 int32 bits. The underlying transition state is sound at that boundary: bit 31 is a negative signed int32 value but nonzero membership checks, `popcount`, apply, and undo handle it correctly; `flipper-cardinality.test.ts` pins that behavior.

Beam's numeric state-identity fast path does **not** currently share that full-domain guarantee. `search.ts` derives `_flipperBase` as `1 << prep.flipperKeys.length`. JavaScript bitwise shifts are int32: at 31 filters this becomes `-2147483648`, and at 32 the shift count wraps so it becomes `1`. `flipperUsedMask` itself is also signed when bit 31 is set. Therefore the mixed-radix beam dedup key and diverse-beam `(mustCrossMask, flipperUsedMask)` bucket encoding are not collision-free on schema-valid 31/32-filter levels even though their comments claim cardinality-derived exactness.

Required repair before claiming solver correctness over that domain:

1. derive the radix arithmetically (`2 ** flipperCount`), never with a bitwise shift;
2. normalize the 32-bit flipper mask to its unsigned value (`>>> 0`) before numeric composition;
3. use numeric dedup/bucketing only when the complete composed key is a safe integer; otherwise use an exact delimited/string representation;
4. add 31- and 32-filter counterexamples proving distinct high-bit states remain distinct in both dedup and diverse-beam bucketing;
5. preserve the ordinary small-cardinality numeric path byte-for-byte except for representation arithmetic.

This is a representation correctness bug, not evidence that any existing corpus result was wrong: no affected production/corpus population has yet been established. Do not reduce the validator's 32-filter contract merely to protect the fast path; fix or bypass the representation instead.

## Open research-integrity blocker: fresh vs preceded stage behavior

Historical reverse-oracle/admissible-order evidence has cases where an isolated action does not reproduce a win that occurred after earlier ladder activity. Until a specific explicit handoff, mutable field, cache semantic, randomness path, or work-accounting effect explains such a difference, treat it as an **unresolved correctness/experimental-integrity issue**, not as a useful scheduler feature.

Required handling:

1. reproduce the action from a freshly prepared state and from the predecessor-stage sequence with identical explicit action/config/seed/work limits;
2. diff every mutable/prepared field or generation-owned cache reachable by the action, plus work-meter and PRNG state;
3. identify whether the difference is wall-only, work-accounting, search-order, legality, cached-value, or randomness behavior;
4. if the predecessor contributes useful information intentionally, promote that information into a bounded typed producer -> receptor contract and add an independent control path;
5. otherwise reset/isolate the leaked state and re-derive any isolated cap/routing conclusions that depended on the contaminated behavior.

Do not tune scheduler caps or technique value around unexplained stage-history dependence. See [`solver-research-operating-model.md`](solver-research-operating-model.md), [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md), and [`technique-census-second-order-analysis.md`](technique-census-second-order-analysis.md).

## Supporting contracts

- [`solver-aware-game-architecture.md`](solver-aware-game-architecture.md): history-sensitive semantics and rule alignment.
- [`mechanic-state-contracts.md`](mechanic-state-contracts.md): dynamic mechanic cardinality/state/model assumptions.
- [`solver-mutable-storage-inventory.md`](solver-mutable-storage-inventory.md): scratch/pool ownership and lifetime, including per-solve cross-attempt memo tables.
- [`solver-budget-determinism.md`](solver-budget-determinism.md): work currency, deadlines, matched-work rules.
- [`solver-level-blindness.md`](solver-level-blindness.md): production information boundary.
- [`solver-opt-in-experiment-ledger.md`](solver-opt-in-experiment-ledger.md): retained prototype dispositions.
- [`solver-research-operating-model.md`](solver-research-operating-model.md): research stop rules, generalization, and promotion discipline.
- [`investigation-report-conventions.md`](investigation-report-conventions.md): evidence status vs current instruction.

## Closed work not to rediscover unchanged

- Exact DFS/beam transposition caching with sound identity had poor payoff; coarse state merge is a deliberately lossy frontier-retention policy, not exact equivalence.
- Do **not** treat an earlier packing audit as blanket closure. The 2026-08 hardening pass found two later counterexamples created by domain/representation drift: (a) must-pass lower-bound memoization reserved only 24 mask bits although normalized must-pass/must-turn cardinality is schema-valid through 30; the fixed key now reserves 30 bits and a 25-objective fixture exercises the former alias; (b) beam's later cardinality-derived numeric flipper radix still uses an int32 shift and is unsound at the validator's 31/32-filter boundary (open above). Re-audit consumers whenever cardinality or encoding contracts change.
- The MITM frontier key was fixed for missing future state and rerun; exact frontier growth is now the conclusion.
- Flipping-filter single-use/global crossing-order parity is settled semantics; the open beam bug above is representation identity, not mechanic semantics.
- Sparse ablation normalization is centralized; extend its registry/tests instead of adding default logic.
- Repair-scoped exact-state nogood caching exists; the naive global key is a soundness counterexample, not pending work.
- Portal-parity hard pruning was implemented and measured effectively inert in its tested form.
- The August 2026 hardening pass already added explicit attempt errors, multi-arbiter oracle/referee checks, representation contracts, scratch-lifecycle coverage, telemetry projection tests, prune-harness activation/positive controls, and admissibility-direction tests.

For exact bug stories, measurements, hypotheses, and chronology, use the snapshot and its dated reports. Keep this file about what future changes must preserve.