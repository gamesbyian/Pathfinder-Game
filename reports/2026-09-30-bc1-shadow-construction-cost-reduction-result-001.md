# BC1 shadow construction-cost reduction result

> **Status:** concluded-positive
> **Last evidence:** 2026-09-30 — two re-runs of the same frozen Stage-B 24-parent live-beam pilot ([2026-09-26 baseline](2026-09-26-bc1-beam-later-disposition-shadow-pilot-result-001.md)), each isolating one candidate optimization, against identical population/config.
> **Decision:** the connectivity-reuse optimization is real and verified (15.6% reduction in the shadow's flagged-candidate construction cost, ~70%->60% of campaign canonical work), with zero change to flagged counts, dispositions, or safety. The pending-mandatory early exit is provably correct and cheap but produced **no measurable reduction on this pilot's own cost metric**, because that metric only sums cost for *flagged* candidates, and a flagged candidate always has an outstanding obligation by construction -- so its real value (skipping unflagged, obligation-free checks) is invisible to this instrumentation, not absent. Aggregate per-check economics for an unconditional-per-candidate deployment remain the open question.
> **Remaining gate:** before any behavioral BC1 consumer, extend the collector to price cost across *every* checked candidate (flagged and unflagged), not just flagged ones, to get an honest aggregate-deployment cost figure; only then does the seam audit's final step (implement the smallest consumer, test at matched work) become well-founded.
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

### Why the early exit shows zero movement here

`totalConstructionWorkUnits` is summed only over candidates the shadow actually flagged. A flagged candidate's conflict has a non-empty `farPendingIds` by definition, which requires a non-empty `pendingMandatory` set at the moment it was checked -- so the early-exit branch can *never* fire for a candidate that ends up in this metric's denominator. Its real payoff is skipping the flood/graph work for candidates that get checked and are **not** flagged, either because no obligation remains (this exit) or because the state turns out connected with no bridge conflict. Neither this pilot nor its predecessor tracked cost for unflagged checks at all -- a real instrumentation gap in the collector, not evidence the optimization has no effect on an actual full deployment.

## What this earns

- A verified 15.6% reduction in the shadow's own measured cost, at zero risk (both optimizations are provably result-preserving and independently unit-tested).
- Confirmation that the dominant flagged-candidate cost is intrinsic to the theorem's own construction cost (12 canonical work units per fresh flood) rather than an accounting artifact -- the remaining 60.2% is now closer to a floor for *this* metric, not headroom the reuse alone can close further.

## What this does not earn

- A verdict on whether an unconditional-per-candidate BC1 shadow (or, eventually, hard-prune) is net-positive in aggregate canonical work. That requires pricing the *unflagged* checks too, which this collector does not do.
- A behavioral consumer. The seam audit's final step still needs the honest full-population cost figure first.

## Next gate

Extend `scripts/stress/collect-bc1-shadow-disposition.mjs`/the shadow observer interface to record construction cost (and a connected/eligible/conflict-free breakdown) for every candidate the shadow evaluates, not only the ones it flags, then re-run this same frozen population once more to get a true aggregate-deployment cost-versus-dominated-work figure. Only then implement the smallest BC1 consumer and test it at matched work on a disjoint population, per the seam audit's original ladder.

## Artifacts

- `reports/stress/bc1-shadow-disposition-stageb24-2026-09-26.json` (baseline)
- `reports/stress/bc1-shadow-disposition-stageb24-reused-2026-09-30.json` (+ connectivity reuse)
- `reports/stress/bc1-shadow-disposition-stageb24-optimized-2026-09-30.json` (+ pending-mandatory early exit)
