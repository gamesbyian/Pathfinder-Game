# BC1 shadow construction-cost reduction result

> **Status:** concluded-negative
> **Last evidence:** 2026-09-30 — three re-runs of the same frozen Stage-B 24-parent live-beam pilot ([2026-09-26 baseline](2026-09-26-bc1-beam-later-disposition-shadow-pilot-result-001.md)), isolating two candidate optimizations plus a full-population cost accounting, against identical population/config.
> **Decision:** the connectivity-reuse optimization is real and verified (15.6% reduction in the shadow's flagged-candidate construction cost). Pricing *every* evaluated candidate (not only flagged ones) settles the aggregate-economics question this line was chasing: total shadow cost across all 1,083,213 candidate checks is **11,067,084 canonical work units -- 1.55x the entire 24-parent campaign's own `workSpent` (7,160,719)**. An unconditional per-candidate BC1 shadow would **more than double** total canonical work (2.55x). Only 38.3% of checks are ever flagged; the two cost optimizations combined cut average per-check cost only from 12.0 to 10.2 units (a 14.9% reduction), nowhere near enough to close that gap. **This closes the "unconditional per-candidate check" form of BC1's production consumer as tested; it does not close BC1's soundness or its per-catch value.**
> **Remaining gate:** BC1 remains a real, sound, decision-bearing fact (per-catch economics are excellent: 12 canonical work units to expose a median 2,800-17,600 units of later work), but a production consumer needs a materially cheaper pre-filter than a full connectivity flood to decide *which* candidates are worth checking -- not "every survivor." No behavioral consumer is authorized before such a pre-filter is found and shown to preserve most of the catch rate at a fraction of the checking cost.
> **Evidence role:** development.
> **Owner:** `WS2-CUT-BALANCE-PROJECTION`.

## Question

The [2026-09-26 pilot](2026-09-26-bc1-beam-later-disposition-shadow-pilot-result-001.md) found the BC1 shadow's own construction cost -- summed only over the 415,273 candidates it actually flagged -- was 69.6% of the entire 24-parent campaign's canonical work, and attributed the dominant share to `connectivityResearchSnapshot` unconditionally re-running `isConnected()` even when the ordinary hard-prune gauntlet had already computed the identical flood-fill for the exact same candidate moments earlier. It nominated reusing that already-fresh result as the next gate before any behavioral consumer.

## What changed

1. **Connectivity reuse** (`modules/solver/topology.ts`): `connectivityResearchSnapshot`/`computeBc1ShadowConflicts` accept a `reachedIsFresh`/`connectivityAlreadyFresh` flag. `search.ts` passes `true` only when it can prove the ordinary gauntlet's own `isConnected()` call just ran for this exact `(pos, state)` with nothing else touching the shared `_reached()` buffer since (`runConnectivity && (!cfg || cfg.PRUNE_CONNECTIVITY)`), skipping the redundant flood entirely.
2. **Pending-mandatory early exit** (same file): `computeBc1ShadowConflicts` now checks `state.mustCrossMask`/`state.mpVisitedMask` against `level.mustPassKeys.length` first and returns immediately -- paying zero flood/graph cost -- once every must-pass/must-cross obligation is already satisfied, since `findBridgeExcursionConflicts` can never produce a conflict with an empty `pendingMandatory` set.

Both are provably safe (correctness cannot depend on which branch skips redundant recomputation of an already-known or a trivially-absent value) and are unit-tested directly (`modules/solver/topology.test.ts`): one asserting the reused result is bit-identical to a fresh recompute at zero extra cost, the other asserting the early-exit path never touches the work meter.

## Result

Re-ran the identical frozen Stage-B 24-parent population (same seed, width 500, node budget 3,000,000) after each change:

| Run | `totalConstructionWorkUnits` (flagged candidates only) | % of campaign `workSpent` |
|---|---:|---:|
| 2026-09-26 baseline | 4,983,276 | 69.6% |
| + connectivity reuse | 4,311,912 | 60.2% |
| + pending-mandatory early exit | 4,311,912 | 60.2% |

Every other figure was bit-identical across all three runs: flagged counts, per-candidate dispositions, `behaviorIdentical` (24/24), and solution-safety alarms (0/24). Both changes are pure cost-accounting optimizations with zero effect on which candidates get flagged or how they are later resolved.

### Why the early exit showed zero movement on the flagged-only metric

`totalConstructionWorkUnits` is summed only over candidates the shadow actually flagged. A flagged candidate's conflict has a non-empty `farPendingIds` by definition, which requires a non-empty `pendingMandatory` set at the moment it was checked -- so the early-exit branch can *never* fire for a candidate that ends up in this metric's denominator. Its real payoff is skipping the flood/graph work for candidates that get checked and are **not** flagged. Neither the baseline pilot nor the reuse-only re-run tracked cost for unflagged checks at all -- a real instrumentation gap, closed by the full-population measurement below.

## Full-population cost accounting

Added `observeBc1ShadowCost` (`modules/solver/types.ts`/`bc1-shadow-disposition.ts`): called once for **every** candidate the shadow evaluates, flagged or not, with that call's own `constructionWorkUnits` (0 for the pending-mandatory early exit). Re-ran the same frozen 24-parent population once more with both optimizations active:

| Metric | Value |
|---|---:|
| Total candidates the shadow evaluated | 1,083,213 |
| Total flagged | 415,273 (38.3% of evaluated) |
| Total shadow cost (all evaluated candidates) | 11,067,084 canonical work units |
| Total campaign `workSpent` (both arms, identical) | 7,160,719 |
| Shadow cost as a fraction of campaign work | **154.6%** |
| Total work if the shadow ran live (`workSpent` + shadow cost) | 18,227,803 (2.55x campaign work) |
| Average cost per shadow invocation | 10.22 units (vs. 12.0 with neither optimization -- 14.9% reduction) |

Every other figure remained bit-identical to the prior three runs: flagged counts, dispositions, `behaviorIdentical` (24/24), solution-safety alarms (0/24).

**This settles the question the seam audit's Phase-1 advance gate left open.** An unconditional-per-candidate BC1 shadow does not merely have "qualified" aggregate economics -- it costs more than the entire rest of the search combined, and the two real, verified cost optimizations found so far reduce that by only ~15%, nowhere near enough. The per-catch economics remain genuinely excellent (12 units to expose thousands of units of later work), but only 38.3% of checks ever pay off; the other 61.7% are pure overhead under a policy of checking every survivor.

## What this earns

- A verified 15.6% reduction in per-check shadow cost, at zero risk (both optimizations are provably result-preserving and independently unit-tested).
- A definitive, full-population answer to "is unconditional-per-candidate BC1 checking economically viable": no. This closes that specific consumer-policy question under this theorem/seam, cleanly and with real evidence, rather than leaving it an open "aggregate economics are qualified" caveat.
- Confirmation that BC1's own soundness, per-catch value, and 100% parent recurrence (from the 2026-09-26 pilot) are untouched -- this is a policy/economics result, not a theorem or integration defect.

## What this does not earn

- A behavioral BC1 consumer of any form. Checking every survivor is not economical; no cheaper selection policy has been tried yet.
- A negative on BC1 itself, or on some future cheaper-to-evaluate consumer design (e.g., a pre-filter using information already computed for other purposes, or checking only at specific structural decision points rather than every move).

## Next gate

Find a pre-filter that decides *which* surviving candidates are worth a full BC1 check, cheap enough that the aggregate cost (pre-filter cost x candidates-checked, plus full-check cost x candidates-that-pass-the-filter) is materially below the ~7.16M canonical work units of dominated search, while still catching a useful share of the 415,273 true conflicts this population contains. Candidate directions: a cheaper necessary condition derivable from state already on hand (e.g., recent must-pass/must-cross completion, or a bounded local topology signal) rather than a full flood; or restricting checks to specific decision points (e.g., only immediately after completing an obligation, or only every Nth phase) rather than every candidate. Only after such a pre-filter demonstrates a favorable cost/catch trade-off does the seam audit's final step (implement the smallest consumer, test at matched work) become well-founded.

## Artifacts

- `reports/stress/bc1-shadow-disposition-stageb24-2026-09-26.json` (baseline, flagged-only cost)
- `reports/stress/bc1-shadow-disposition-stageb24-reused-2026-09-30.json` (+ connectivity reuse, flagged-only cost)
- `reports/stress/bc1-shadow-disposition-stageb24-optimized-2026-09-30.json` (+ pending-mandatory early exit, flagged-only cost)
- `reports/stress/bc1-shadow-disposition-stageb24-fullcost-2026-09-30.json` (both optimizations, full-population cost accounting)
