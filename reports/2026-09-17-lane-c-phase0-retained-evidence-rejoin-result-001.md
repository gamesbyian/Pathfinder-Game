# Lane C solve-local rediscovery Phase 0 retained-evidence rejoin result 001

> **Status:** concluded-negative
> **Last evidence:** 2026-09-17 — retained-evidence and code-reading rejoin of fact classes B, C, D from `solver-solve-local-rediscovery-preflight.md` (fact class A already closed by prior work), current HEAD.
> **Decision:** Phase 0 does not earn advancement to Phase 1's bounded current observer. Fact class B's only real dependency-keyed reuse candidate (`mustPassLowerBound`/`mustCrossLowerBound`'s memo caches) is already implemented in production and already independently proven sound and valuable (`reports/2026-09-03-lower-bound-memo-cache-empty-warm-control.md`) — it is not a new rediscovery opportunity for Lane C to build. Fact class C's cheap mechanic facts (forced-neighbor, portal parity, must-turn deadlock) are confirmed unmemoized, matching the preflight's own negative-control expectation. Fact class D found no opportunistic same-dependency-key recurrence across this session's own already-run Lane A/B/D exact-query batches (D1's revisit-commitment queries and D2/H1's crossing-event queries test different constraint shapes even on shared states; D3's population is corpus-disjoint from D1/D2's).
> **Remaining gate:** none for B/C/D as scoped. Reopens only if a future fact family surfaces genuine same-attempt re-derivation not already covered by an existing memoization mechanism.
> **Evidence role:** Phase 0 retained-evidence rejoin, per `solver-solve-local-rediscovery-preflight.md`'s required gate before any Phase 1 observer.
> **Population identity:** existing committed reports and module source (`modules/solver/lower-bounds.ts`, `modules/solver/hard-prune-pipeline.ts`, `modules/solver/joint-obligation-propagation.ts`, `modules/solver/scoring.ts`, `modules/solver/stage-budget-core.ts`); this session's own Lane D1-D3 committed JSON artifacts. No new solver compute.

## Why this ran

Per the reconciled queue's remaining single-agent order, Lane C is next after Lane D's closure. `solver-solve-local-rediscovery-preflight.md` requires a Phase 0 retained-evidence rejoin before any new observational compute, and explicitly instructs: fact class A is already closed (do not re-run); fact class B should be checked only against "existing telemetry or a tiny observer... do not rebuild the existing memoization experiment"; fact class C should confirm the expected negative control; fact class D is opportunistic only, using facts already paid for by other lanes.

## Fact class A — connectivity/residual reachability

Already closed. `reports/2026-09-13-class5-dead-cause-current-population-rejoin-result-001.md` found only 1/12 sampled current-Class-5 rows met the required informativeness floor; the preflight's own text says not to re-run this unchanged and to start B/C/D instead. No action taken here beyond confirming the closure still applies (no materially changed residual since; Lane A's separator census and Lane B's sibling harvest this session did not reopen it, and neither claims to).

## Fact class B — admissible lower-bound results (positive control)

`modules/solver/lower-bounds.ts` already ships exactly this: `mustPassLowerBound` and `mustCrossLowerBound` memoize per `(pos, mpVisitedMask)`/`(pos, mustCrossMask, ...)` in `PrepLevel._mpLowerBoundCache`/`._mcLowerBoundCache`, gated by the `STRATEGY_LOWER_BOUND_MEMO` ablation flag specifically so the memoization's own contribution can be measured. The code's own profiling comment cites `mustPassLowerBound` as "the single hottest function in repair search (~30% of total CPU time)."

`reports/2026-09-03-lower-bound-memo-cache-empty-warm-control.md` already ran the exact "hit/reuse behavior" check the preflight asks for: solving the same 50 objective-bearing levels with the caches on vs. fully disabled produced byte-identical `ok`/`status`/`workSpent`/`nodesExpanded`/`solution` (proving the memoization is sound, not an approximation), while wall-clock time dropped 2.3-4.8x with the caches on (proving the reuse is materially valuable, not just correctness-neutral).

**This closes fact class B's role as a positive control**: it confirms real, sound, valuable dependency-keyed reuse exists and looks like a pure function of an exact key that recurs across attempt/gate boundaries within one solve. It does **not** surface a new Lane C opportunity — the mechanism is already shipped and already independently audited. Per the preflight's own instruction ("do not rebuild the existing memoization experiment"), no new work is warranted here.

## Fact class C — mechanic-specific proof facts (expected negative control)

Checked `mustCrossForcedNeighborDeadlocked`, `mustTurnDeadlocked` (`modules/solver/lower-bounds.ts`, referenced from `modules/solver/hard-prune-pipeline.ts`), and portal-parity logic (`modules/solver/scoring.ts`, `modules/solver/stage-budget-core.ts`) for any cache/memo pattern analogous to fact class B's. None exists — these are computed fresh on every call, with no memoization seam at all.

This matches the preflight's own prediction ("most are cheap to recompute and are expected negative controls for general memory"). The absence of memoization here, next to its presence for the two lower-bound functions specifically profiled as CPU-hot, is itself evidence the codebase already discriminates correctly between facts worth caching and facts not worth caching — exactly the boundary Lane C would need to draw for any new fact family, and it already exists for the facts checked.

## Fact class D — future exact/interface facts (opportunistic only)

The preflight bars creating new queries for this study; only already-paid-for exact/interface work from other lanes counts. This session's own Lane A/B/D work is the relevant already-paid-for population:

- Lane D question 1 (`--pin-revisit`, future-intersection commitment realizability) queried "does `visits[c] >= 2`" per already-visited candidate cell on 5 B2 states (2 parents).
- Lane D question 2 reused H1's cross-via/pass-via queries ("is completion feasible entering/exiting cell X from direction Y") on the same B2 population (28 states/14 parents).
- Lane D question 3 (residual-interface commutativity) used a corpus-disjoint 25-level population from `stress-levels-random.json`, sharing no states with D1/D2's `stress-levels.json`-sourced B2 set.

D1 and D2 share a state population but test different constraint shapes on it (a revisit-count floor vs. a directional crossing/passing event) — these are different dependency keys even when aimed at the same cell, not recurrence of the same fact. D3's population has no state overlap with D1/D2 at all. No same-dependency-key query was asked twice across these batches.

**Finding: no opportunistic recurrence observed.** This is not evidence against fact class D's premise in general — it only says this session's own already-run exact work happened not to repeat a query, which is unsurprising given each lane was independently prespecified against a disjoint or differently-shaped candidate set. Future lanes should keep recording dependency keys as they run exact queries so a real recurrence, if one ever appears, is opportunistically visible without new compute.

## Phase-0 advance gate

Per the preflight: advance to Phase 1 only if a fact family shows substantial same-attempt re-derivation with a plausible cheaper key, cross-attempt/stage recurrence of a sound fact, or expensive recomputation separated by enough work that sharing could matter. None of B/C/D clears this **as a new Lane C opportunity**: B is already fully captured by existing production infrastructure and its own audit; C is correctly unmemoized; D shows no recurrence in the only population available to check opportunistically. Phase 0 closes without earning a Phase 1 observer.

## Artifacts

No new scripts or data — this is a pure retained-evidence and source-reading rejoin. Cited: `reports/2026-09-03-lower-bound-memo-cache-empty-warm-control.md`, `reports/2026-09-13-class5-dead-cause-current-population-rejoin-result-001.md`, `modules/solver/lower-bounds.ts`, `modules/solver/hard-prune-pipeline.ts`, `modules/solver/joint-obligation-propagation.ts`, `modules/solver/scoring.ts`, `modules/solver/stage-budget-core.ts`, this session's own Lane D1-D3 result reports.
