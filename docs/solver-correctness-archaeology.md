# Solver Correctness Archaeology

**Status:** current hardening reference, reconciled through 2026-08-09.

This document turns Pathfinder's known fixed correctness failures into reusable failure classes and applies those classes back to the current codebase. Its purpose is not to retell the development history. It is to prevent the same structural mistakes from returning under new names.

Use `future-work.md` for the live solver-improvement queue. Use this document when changing hard prunes, state identity, solver/runtime rule implementations, experimental tooling, budgets, or persisted solver telemetry.

## Executive disposition

The archaeology found no newly demonstrated production hard prune that rejects a valid solution. It did identify the following current correctness or correctness-adjacent work:

1. **Main-loop attempt-ordering starvation remains a known live solver defect.** Some late techniques receive zero allocation despite known budget-fitting solves. `future-work.md` remains the source of truth for its measured population and proposed reserve-not-reorder repair.
2. **`runAttempt()` silently converts non-cancellation search exceptions into ordinary failed attempts.** A DFS/beam/repair/admissible-order implementation error can therefore masquerade as “this technique found no solution.” This is the same epistemic failure class previously seen when child-process/model failures were swallowed by research tooling. The eventual fix should preserve technique/config/gate identity and expose an explicit error outcome while still allowing the ladder to continue if desired.
3. **Final-win differential coverage is incomplete.** The oracle fuzzer compares oracle, production solver, and domain/live-play move legality, but final acceptance is not yet checked across all independent arbiters. Add a four-way goal-state comparison: oracle `isOracleSolution`, solver `isSolutionState`, runtime win metrics, and `validateCandidatePath`/referee acceptance.
4. **Representation contracts still need cleanup.** `prep.ts` uses `index+1 / 0=absent` for index arrays and `neighborKey+1 / 0=absent` for `staticNeighborKeys`. The dedicated `representation-contracts.test.ts` now pins those conventions as executable truth. Stale type comments and any reference/test consumer that reads these arrays raw should be corrected rather than trusted.
5. **`topology.test.ts` contains a latent flipper-index reference-oracle bug.** Its independent `referenceIsConnected()` reads `prep.flipperIndexMap[k]` as though it were a raw index with `-1` absent. The real encoding is `index+1`, zero absent. The randomized sequence test currently creates no flippers, so its present scratch-reuse comparisons are not invalidated, but broadening that generator to flipper levels without fixing the decode would make the reference wrong.
6. **Reusable scratch state deserves sequence-based differential coverage.** The historical bit-parallel connectivity bug only appeared across heterogeneous call sequences; clean single-call comparison was insufficient. Inventory reusable typed arrays, generation-tag tables, pools, and workspaces and ensure each has lifecycle/sequence coverage where stale contents could affect semantics.
7. **Attempt/report/provenance projection completeness should be mechanically tested.** Historical fields repeatedly stopped at an intermediate object or disappeared in a hand-maintained projection. Add a maximally populated synthetic `Attempt` round trip through persistence/report/provenance paths with an explicit list of persistent versus intentionally transient fields.
8. **Soundness tests should prove activation, not merely zero violations.** The must-cross forced-first-move sentinel bug and an old win-metric test both passed for reasons unrelated to the condition supposedly under test. Hard-prune tests should report/verify candidate-rule activations and include a positive control that deliberately trips the detector.
9. **Approximation direction must be explicit.** Every lower bound, relaxed reachability model, deadness proof, or external model used for a hard conclusion should state which direction of error is permitted and test that contract.

## Failure taxonomy

### 1. Incomplete future-state identity

This is the repository's most recurrent solver-correctness class.

Historical manifestations include unsound V1 memoization, under-keyed state-dependent lower-bound memoization, crude duplicate estimates that omitted essential history, the first MITM frontier key, the rejected naive global nogood key, and beam dedup being mistaken for exact equivalence.

**Standing invariant:** any new cache, memo, `seen` set, deduplication key, dominance relation, signature, fingerprint, or state equivalence must enumerate every state property that can alter future legal moves, future constraint satisfaction, or the value being cached. Add one-field-at-a-time counterexamples whenever the structure claims future equivalence.

**Current disposition:** the repair-scoped nogood cache deliberately computes a fresh signature rather than maintaining an incremental hash, reducing desynchronization risk. Coarse beam dedup remains intentionally non-equivalent and should be described as beam width/diversity policy, not a correctness-preserving transposition relation.

### 2. Sentinel, packing, and representation-contract drift

Historical manifestations include the beam packed-key overflow and the must-cross forced-first-move implementation initially trusting stale `-1`-sentinel comments for arrays that actually used `index+1 / 0=absent`.

The beam incident already triggered a systematic audit of composite bit-shift keys; that specific search found and fixed the diversity-bucket sibling and checked the remaining relevant mask composites. Do not repeat that work without new evidence.

The broader representation-contract risk remains. `modules/solver/representation-contracts.test.ts` now pins the current `prepLevel` encoding conventions. Future consumers should decode through the documented convention exactly once.

### 3. Reusable scratch lifecycle leakage

Historical manifestations include undersized/stale MST scratch and stale rows in the bit-parallel connectivity flood fill. The latter could survive millions of clean differential comparisons because the defect depended on what a previous invocation had touched.

**Standing invariant:** reusable work memory must be tested as a sequence. Prefer adversarial call patterns such as large-region -> tiny-region -> shifted-region -> original-region, plus generation-counter rollover where applicable.

### 4. Approximation in the wrong mathematical direction

Historical lower-bound/reachability defects repeatedly came from a supposedly optimistic model becoming pessimistic. Examples include distance treatments that could overestimate a real route and attempted additive combinations of lower bounds that could be satisfied by the same path segment.

**Standing invariant:** every approximation used in a hard prune declares its permitted error direction. A lower bound may be too low, never too high. A reachability over-approximation may admit impossible cells, never exclude possible ones. A deadness test may miss dead states, never invent one.

### 5. Heuristic evidence promoted into hard proof

Several proposed rules were useful intuitions but unsound as hard prunes, including required-cell degree/must-visit style deductions that failed against real path semantics.

**Standing invariant:** a scoring preference, corpus correlation, witness regularity, or structural intuition does not become `return false` without a derivation from game rules plus counterexample-oriented validation.

### 6. Independent rule implementations drifting

Pathfinder intentionally has multiple semantic arbiters: runtime/live play, domain move rules, referee/path validation, solver transitions, and an independent oracle. This independence catches common-mode bugs but also creates drift.

Historical manifestations include flipping-filter entry-axis drift, flipper single-use drift, and `checkWinMetrics` omitting must-turn while the runtime win check included it.

**Standing invariant:** keep implementations independent where they provide real cross-check value, but differential-test both move legality and final acceptance across them. Avoid “cleanup” that removes independent referee checks merely because another layer appears redundant.

### 7. Pre-move versus post-move state confusion

Historical scoring bugs arose because DFS and beam/repair did not always observe candidate state at the same phase. A value that looked sibling-invariant before applying a candidate could be candidate-specific afterward, and vice versa.

`evaluatePrunedMove` is a good current contract: it explicitly consumes an already-applied candidate. New scoring/search APIs should be equally explicit about whether state is pre-candidate or post-candidate.

### 8. Programming failures becoming plausible mathematical values

Historical code has converted missing/incorrect API values into `NaN`, `Infinity`, empty results, or other values that look meaningful to search code.

**Standing invariant:** distinguish “mathematically unreachable/infinite” from “the computation failed.” Assertions around finite expected values are preferable to allowing `undefined -> NaN -> Infinity` to masquerade as a proof of infeasibility.

### 9. Configuration/default propagation

Sparse ablation objects historically disabled unrelated default-on features; a later inverse bug silently enabled unrelated default-off opt-ins. These produced confident but confounded A/B results.

**Current disposition:** `normalizeAblationConfig()` centralizes sparse-override semantics and uses the opt-in registry for default-off features. Do not rebuild this machinery. The ongoing invariant is that every new default-off feature must be registered in the canonical opt-in set and covered by normalization tests.

### 10. Nested budget/resource semantics

Historical bugs confused local versus cumulative node budgets, time allocation versus cumulative node ceilings, additive extra-pass budgets, and binding wall deadlines. Entire techniques sometimes ran with zero useful allocation or experiments compared different effective resource envelopes.

**Standing invariant:** every scheduler boundary states whether a budget is absolute or remaining, per-attempt or cumulative, allocation currency or truncation deadline. Tests should cover zero, tiny, boundary, finite/infinite, and additive-pass cases.

### 11. Telemetry/provenance projection drift

Historical reports silently lost admissible-order markers, repair seed/salt, allocated budgets, node ceilings, and other fields, sometimes misclassifying wins or making them unreplayable.

**Standing invariant:** persisted telemetry is part of the scientific correctness contract. Central shared projections are preferable to hand-maintained copies; a schema/round-trip test should fail when a newly persistent field is accidentally dropped.

### 12. Exceptions/errors converted into ordinary null results

The CP-SAT corpus-plumbing incident and current `runAttempt()` catch behavior share the same structure: execution failed, but the caller received “no solution.”

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

## Recommended implementation handoff

These items need a patch-capable local development/test loop and should be handled as one bounded correctness-hardening package rather than speculative solver redesign:

1. Make search-technique exceptions observable through `Attempt`/`SolveResult`/batch telemetry without conflating them with timeout or exhaustion.
2. Extend the oracle fuzzer to four-way final acceptance.
3. Correct the stale encoded-array comments and the flipper decode in `topology.test.ts`'s reference BFS; then broaden the sequence test to include flipper-bearing levels.
4. Add the synthetic Attempt/report/provenance projection round-trip contract.
5. Inventory reusable scratch/workspaces and add heterogeneous sequence tests where lifecycle coverage is absent.
6. Strengthen hard-prune soundness harnesses with activation counts and deliberate positive controls.
7. Add explicit admissibility-direction/property tests to hard-prune approximation helpers where they are not already covered.

Keep this hardening package behavior-preserving except where an existing error is being surfaced. Do not combine it with main-loop attempt-allocation policy changes.

The main-loop starvation repair should be a separate solver-development change with its own deterministic matched-budget A/B, beginning with the already identified deterministic recoverable population in `future-work.md`.
