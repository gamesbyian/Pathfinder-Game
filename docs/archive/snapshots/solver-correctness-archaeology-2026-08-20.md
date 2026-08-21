# Solver Correctness Archaeology

**Status:** current hardening reference, reconciled through 2026-08-10.

This document turns Pathfinder's known fixed correctness failures into reusable failure classes and applies those classes back to the current codebase. Its purpose is not to retell the development history. It is to prevent the same structural mistakes from returning under new names.

Use `future-work.md` for the live solver-improvement queue. Use this document when changing hard prunes, state identity, solver/runtime rule implementations, experimental tooling, budgets, or persisted solver telemetry.

## Executive disposition

The archaeology found no newly demonstrated production hard prune that rejects a valid solution.
The bounded correctness-hardening package identified by the original review is complete:

1. Search-technique exceptions now remain distinct from exhaustion, timeout, and budget starvation
   through `Attempt`, `SolveResult`, worker transport, and batch telemetry.
2. The oracle fuzzer compares final acceptance across the independent oracle, solver solution state,
   runtime win metrics, and referee/path validation.
3. Encoded-array contracts are documented and executable; the flipper reference decode is corrected,
   and heterogeneous connectivity sequences include flipper-bearing levels.
4. Reusable solver scratch and pools have an ownership/lifecycle inventory plus heterogeneous,
   boundary, and rollover coverage where stale contents could affect semantics.
5. A maximally populated synthetic `Attempt` mechanically covers report, worker, and provenance
   projections, with persistent and intentionally transient fields classified explicitly.
6. Hard-prune soundness harnesses verify rule activation and deliberate positive controls rather than
   accepting zero observed violations as sufficient evidence.
7. Lower-bound, relaxed-reachability, and deadness helpers have explicit permitted-error directions
   backed by admissibility/property tests.

One separate solver-development issue remains open: **main-loop attempt-ordering starvation**. A
default-off reserve-not-reorder treatment and a 14-level mechanism pilot now exist, but the pilot
recovered only 1 of 14 historically matched deterministic cases. The treatment is not promoted;
`future-work.md` and `main-loop-late-reserve-experiment.md` are the sources of truth for the pending
full-population decision. This is allocation-policy research, not unfinished correctness hardening.

The taxonomy below is therefore a set of historical failure classes and standing review invariants,
not a list of currently open defects. Apply it whenever new caches, prunes, representations,
scratch storage, rule implementations, schedulers, experiments, or telemetry fields are introduced.

## Failure taxonomy

### 1. Incomplete future-state identity

This is the repository's most recurrent solver-correctness class.

Historical manifestations include unsound V1 memoization, under-keyed state-dependent lower-bound memoization, crude duplicate estimates that omitted essential history, the first MITM frontier key, the rejected naive global nogood key, and beam dedup being mistaken for exact equivalence.

**Standing invariant:** any new cache, memo, `seen` set, deduplication key, dominance relation, signature, fingerprint, or state equivalence must enumerate every state property that can alter future legal moves, future constraint satisfaction, or the value being cached. Add one-field-at-a-time counterexamples whenever the structure claims future equivalence.

**Current disposition:** the repair-scoped nogood cache deliberately computes a fresh signature rather than maintaining an incremental hash, reducing desynchronization risk. Coarse beam dedup remains intentionally non-equivalent and should be described as beam width/diversity policy, not a correctness-preserving transposition relation.

### 2. Sentinel, packing, and representation-contract drift

Historical manifestations include the beam packed-key overflow and the must-cross forced-first-move implementation initially trusting stale `-1`-sentinel comments for arrays that actually used `index+1 / 0=absent`.

The beam incident already triggered a systematic audit of composite bit-shift keys; that specific search found and fixed the diversity-bucket sibling and checked the remaining relevant mask composites. Do not repeat that work without new evidence.

`modules/solver/representation-contracts.test.ts` pins the current `prepLevel` encoding conventions,
the stale type comments and flipper reference consumer have been corrected, and the randomized
connectivity sequence now exercises flipper-bearing levels. The ongoing risk applies to future raw
consumers: decode through the documented convention exactly once rather than inferring a sentinel.

### 3. Reusable scratch lifecycle leakage

Historical manifestations include undersized/stale MST scratch and stale rows in the bit-parallel connectivity flood fill. The latter could survive millions of clean differential comparisons because the defect depended on what a previous invocation had touched.

**Standing invariant:** reusable work memory must be tested as a sequence. Prefer adversarial call patterns such as large-region -> tiny-region -> shifted-region -> original-region, plus generation-counter rollover where applicable.

**Current disposition:** `solver-mutable-storage-inventory.md` records ownership, capacity, reset,
and nesting assumptions for the known reusable buffers and pools. Existing semantic scratch has
heterogeneous sequence/boundary coverage; any newly pooled or reusable state must extend that
inventory and add lifecycle tests before relying on clean single-call comparisons.

### 4. Approximation in the wrong mathematical direction

Historical lower-bound/reachability defects repeatedly came from a supposedly optimistic model becoming pessimistic. Examples include distance treatments that could overestimate a real route and attempted additive combinations of lower bounds that could be satisfied by the same path segment.

**Standing invariant:** every approximation used in a hard prune declares its permitted error direction. A lower bound may be too low, never too high. A reachability over-approximation may admit impossible cells, never exclude possible ones. A deadness test may miss dead states, never invent one.

**Current disposition:** the production lower-bound, connectivity, and deadness helpers are covered
by explicit admissibility-direction/property tests. New approximations must add themselves to that
contract; the completed baseline is not permission to infer direction from a helper's name.

### 5. Heuristic evidence promoted into hard proof

Several proposed rules were useful intuitions but unsound as hard prunes, including required-cell degree/must-visit style deductions that failed against real path semantics.

**Standing invariant:** a scoring preference, corpus correlation, witness regularity, or structural intuition does not become `return false` without a derivation from game rules plus counterexample-oriented validation.

### 6. Independent rule implementations drifting

Pathfinder intentionally has multiple semantic arbiters: runtime/live play, domain move rules, referee/path validation, solver transitions, and an independent oracle. This independence catches common-mode bugs but also creates drift.

Historical manifestations include flipping-filter entry-axis drift, flipper single-use drift, and `checkWinMetrics` omitting must-turn while the runtime win check included it.

**Standing invariant:** keep implementations independent where they provide real cross-check value, but differential-test both move legality and final acceptance across them. Avoid “cleanup” that removes independent referee checks merely because another layer appears redundant.

**Current disposition:** the oracle fuzzer now checks both move legality and four-way final
acceptance. Independence remains deliberate; future mechanics must be added to every arbiter and to
the differential fixtures rather than collapsing implementations into one shared result.

### 7. Pre-move versus post-move state confusion

Historical scoring bugs arose because DFS and beam/repair did not always observe candidate state at the same phase. A value that looked sibling-invariant before applying a candidate could be candidate-specific afterward, and vice versa.

`evaluatePrunedMove` is a good current contract: it explicitly consumes an already-applied candidate. New scoring/search APIs should be equally explicit about whether state is pre-candidate or post-candidate.

### 8. Programming failures becoming plausible mathematical values

Historical code has converted missing/incorrect API values into `NaN`, `Infinity`, empty results, or other values that look meaningful to search code.

**Standing invariant:** distinguish “mathematically unreachable/infinite” from “the computation failed.” Assertions around finite expected values are preferable to allowing `undefined -> NaN -> Infinity` to masquerade as a proof of infeasibility.

### 9. Configuration/default propagation

Sparse ablation objects historically disabled unrelated default-on features; a later inverse bug silently enabled unrelated default-off opt-ins. These produced confident but confounded A/B results.

**Current disposition:** `normalizeAblationConfig()` centralizes sparse-override semantics and uses the opt-in registry for default-off features. Do not rebuild this machinery. The ongoing invariant is that every new default-off feature must be registered in the canonical opt-in set and covered by normalization tests; the late-reserve experiment follows this contract.

### 10. Nested budget/resource semantics

Historical bugs confused local versus cumulative node budgets, time allocation versus cumulative node ceilings, additive extra-pass budgets, and binding wall deadlines. Entire techniques sometimes ran with zero useful allocation or experiments compared different effective resource envelopes.

**Standing invariant:** every scheduler boundary states whether a budget is absolute or remaining, per-attempt or cumulative, allocation currency or truncation deadline. Tests should cover zero, tiny, boundary, finite/infinite, and additive-pass cases.

### 11. Telemetry/provenance projection drift

Historical reports silently lost admissible-order markers, repair seed/salt, allocated budgets, node ceilings, and other fields, sometimes misclassifying wins or making them unreplayable.

**Standing invariant:** persisted telemetry is part of the scientific correctness contract. Central shared projections are preferable to hand-maintained copies; a schema/round-trip test should fail when a newly persistent field is accidentally dropped.

**Current disposition:** a maximally populated `Attempt` fixture now checks report, worker transport,
and provenance projections against explicit persistent/transient field sets. New fields must update
that contract in the same patch rather than relying on scattered spot tests.

### 12. Exceptions/errors converted into ordinary null results

The historical CP-SAT corpus-plumbing incident and the former `runAttempt()` catch behavior shared
the same structure: execution failed, but the caller received “no solution.” `runAttempt()` now
records an explicit bounded error outcome while preserving technique/config/gate identity, and an
unsuccessful solve containing such a failure reports `attempt-error` rather than exhaustion.

**Standing invariant:** null scientific result, timeout/truncation, unsupported input, and execution error are distinct states all the way to persisted output.

### 13. Workflow/ref/SHA/checkpoint freshness

Historical workflows have run `main` while dispatched from a feature branch, inherited stale checkpoints, merged stale branch refs, and reused prior-run files.

**Standing invariant:** every serious result records measured SHA/ref and corpus/config identity at the worker boundary; resume/checkpoint identity includes all settings that change the meaning of completed work.

### 14. Incomplete or contaminated experimental populations

Historical partial artifact downloads, path mismatches, stale shard files, and wrong combine assumptions produced plausible-looking partial baselines.

**Standing invariant:** combined reports assert expected coverage before becoming authoritative. Partial runs are explicitly labelled partial, never silently interpreted as solver regressions.

### 15. External-model validation direction

A CP-SAT model was under-constrained yet passed pinned-witness checks, because witness acceptance only detects over-constraint.

**Standing invariant for external models:**

- known valid witness -> model accepts, to catch over-constraint;
- model-generated witness -> real referee accepts, to catch under-constraint;
- known easy positive control -> model can actually search effectively, to catch correct-but-useless encodings.

Any UNSAT/proof-style conclusion additionally needs an explicit argument that the model's approximation direction makes that conclusion sound.

### 16. Identifier and namespace ambiguity

Historical bare level IDs collided across corpora, flat output paths let one corpus overwrite another, and CLI selector conventions sometimes selected a different real level without error.

**Standing invariant:** corpus identity is part of level identity wherever files, reports, caches, checkpoints, or cross-corpus analysis are involved. Use the shared selector/parsing infrastructure rather than reimplementing ID interpretation.

### 17. Stale documentation as an active correctness hazard

Several real bugs were caused or invited by comments/docs that described an obsolete sentinel, budget model, mechanic behavior, or experiment status.

**Standing invariant:** current-state contracts live beside code or in authoritative docs; dated reports remain historical evidence. A corrected historical report should not be allowed to masquerade as the current queue.

## Already-closed families and work that should not be duplicated

- The composite bit-packing sibling audit after the beam-key overflow was already performed.
- Generic exact transposition caching was measured with sound state signatures and remains low-value relative to its cost.
- The MITM frontier probe was corrected for under-keyed state identity and rerun; its frontier-size conclusion is not an outstanding implementation task.
- Flipping-filter single-use is settled game semantics and codified in live play/referee as well as solver state.
- Sparse ablation normalization is centralized; future work should extend its registry/tests, not create another configuration system.
- The repair-scoped exact-state nogood cache already exists and shipped default-on; the old naive three-field global key remains only a soundness counterexample.
- Portal-parity hard pruning was implemented soundly as an opt-in experiment and measured effectively inert; it is not an uninvestigated solver opportunity.

## Completed hardening handoff and remaining solver experiment

The bounded correctness-hardening package was completed on 2026-08-09:

1. Search-technique exceptions are observable through `Attempt`/`SolveResult`/batch telemetry.
2. The oracle fuzzer performs four-way final acceptance.
3. Encoded-array comments/reference decoding are corrected and sequence tests include flippers.
4. A maximal synthetic Attempt projection contract covers report/provenance paths.
5. Reusable scratch/workspaces have documented lifecycle and heterogeneous sequence coverage.
6. Hard-prune soundness harnesses verify activation and positive controls.
7. Hard-prune approximation helpers have explicit admissibility-direction property tests.

The hardening package was behavior-preserving except for making existing execution errors
observable. Its tests and contracts are now the baseline that future changes must extend.

The main-loop starvation treatment remains a separate, default-off solver-development experiment.
Its frozen protocol, completed mechanism pilot, and promotion gate are recorded in
`main-loop-late-reserve-experiment.md`,
`../reports/2026-08-10-main-loop-late-reserve-mechanism-pilot.md`, and `future-work.md`.
