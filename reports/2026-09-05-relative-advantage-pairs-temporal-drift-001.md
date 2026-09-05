# A relative-advantage pair's leading structural explanation is far less temporally stable than its divergence count

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — the same 8 technique pairs in `reports/stress/technique-niches/2026-09-01/relative-advantage-summary.json` and `reports/stress/technique-niches/2026-09-03/relative-advantage-summary.json`, matched across legacy/canonical action-identity spellings via `normalizeAttemptIdentityKey` (`modules/solver/attempt-identity.mjs`), no new dispatch
> **Decision:** across the two-day census refresh, the raw divergence counts (`leftOnly`/`rightOnly`/`both`/`neither`) for all 8 pairs stayed close (e.g. 16→20, 13→16 for the admissible-order pair; no pair moved by more than ~35%), but the **leading structural feature** (`topEffects[0]`) that supposedly explains each pair's divergence changed to a *different feature entirely* for 5 of 8 pairs, sometimes flipping sign as well (e.g. `mustTurn` (−0.644) → `mustPass` (+0.919); `requiredPathLength` (−1.095) → `flippingFilters` (+1.682); `constrainedObjectDensity` (−0.442) → `portals` (+0.460)). Only 3 of 8 pairs kept the same leading feature and sign (`portals`, `requiredIntersections`, `width`), and even those varied in magnitude.
> **Remaining gate:** none for this characterization. Directly informs `2026-09-01-technique-relative-advantage-followup.md`'s own stated next step ("test the repeated portal/diverse-beam nomination with stronger controls") — this result is a concrete reason those controls are needed.
> **Evidence role:** forensic/methodological — a temporal-stability check on an existing active report's evidence base, analogous to the capability-multiplicity temporal-robustness work
> **Selection:** the full fixed set of 8 pairs this file tracks, not a sample

## Method

Both census vintages' `relative-advantage-summary.json` track the identical 8 hand-picked technique pairs, but `2026-09-01`'s file uses legacy action-identity spellings (e.g. `ida:default`, `beam:objectiveFirst@beam2000`) while `2026-09-03`'s uses the canonical pipe-delimited form (e.g. `admissible-order|tieBreak=default|lds=off`) — a naive string match found zero overlapping pairs, which would have wrongly suggested the entire pair set was new. Normalizing both sides through `normalizeAttemptIdentityKey` before matching correctly aligned all 8 pairs across vintages, then compared `leftOnly`/`rightOnly`/`both`/`neither` counts and each pair's top standardized-difference structural feature.

## Result

| Pair | 09-01 counts (L/R/both) | 09-03 counts (L/R/both) | 09-01 top feature | 09-03 top feature |
|---|---|---|---|---|
| admissible-order `default` vs `mustCrossFirst` | 16/13/426 | 20/16/436 | `mustTurn` −0.644 | `mustPass` +0.919 |
| dfs `harvestThenFinish` vs `portalFirstTransfer` | 12/15/370 | 8/14/353 | `requiredPathLength` −1.095 | `flippingFilters` +1.682 |
| beam `objectiveFirst` width 2000 vs 5000 | 33/163/469 | 29/173/477 | `navigableArea` +0.656 | `turnConstraintLoad` −0.586 |
| beam `intersectionHarvest` width 2000 vs 5000 | 37/147/471 | 39/154/460 | `constrainedObjectDensity` −0.442 | `portals` +0.460 |
| beam `objectiveFirst` plain vs mechanic-buckets | 48/128/584 | 63/118/587 | `portals` −1.060 | `portals` −0.677 |
| beam `intersectionHarvest` plain vs mechanic-buckets | 40/135/578 | 41/140/573 | `requiredIntersections` +0.655 | `requiredIntersections` +0.903 |
| beam `perimeterSweep` CW vs CCW | 115/113/389 | 104/111/395 | `width` +0.215 | `width` +0.247 |
| dfs `perimeterSweep` CW vs CCW | 47/50/353 | 42/50/345 | `mustCross` +0.344 | `portals` −0.620 |

5/8 pairs' leading feature changed identity entirely across the refresh; 3/8 (rows 5-7) kept the same leading feature.

## Interpretation

This distinguishes two very different claims a relative-advantage pair can support: "these two configurations solve a meaningfully different set of levels" (the divergence counts — reasonably temporally stable) versus "and here is the structural reason why" (the leading feature — much less stable). The `2026-09-01` follow-up report's decision to pursue "stronger controls" before treating any inversion as actionable is validated directly by this result: a naive single-feature explanation drawn from one census snapshot has a real chance of not holding two days later, even when the underlying behavioral divergence it was explaining barely moved. Any future work using this file's `topEffects` field as a causal explanation, rather than as a candidate to re-test, should check it against a second snapshot first.

## What this does not establish

- Does not establish which (if either) census vintage's leading feature is "more correct" — both are legitimate snapshots of frozen-T1 heuristic behavior, and heuristic drift itself is expected and already documented (`2026-09-03-technique-census-refresh-001-rejoin.md`).
- Only 8 pairs exist in this file; not a general claim about relative-advantage analysis across the full technique menu.
- Does not re-run the "stronger controls" the existing follow-up report calls for — this result motivates that work, it does not substitute for it.
