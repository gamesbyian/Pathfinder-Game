# Production's own failure-risk feature ranking differs from the isolated census's no-T1-winner ranking

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — standardized mean differences between production-solved and production-unsolved levels' `features` in `reports/stress/technique-niches/2026-09-03/level-capability.json`, joined against `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`'s per-level production `status` (975 solved / 725 unsolved, corpus2), no new dispatch
> **Decision:** production's own solved-vs-unsolved standardized feature differences are real and comparable in magnitude to the isolated census's own solved-vs-no-T1-winner risk table (`2026-09-04-technique-census-refresh-direct-analysis-rejoin.md`'s "Structural unsupported-risk signal" section), but the *relative ranking* differs: `portals` (0.730), `turnConstraintLoad` (0.724), and `constrainedObjectDensity` (0.713) cluster tightly at the top for production failure, while the isolated-census table has `constrainedObjects`/`turnConstraintLoad` clearly ahead of `portals` (1.276 vs. 0.789 in that table). `mustCross` is a materially *weaker* production-failure predictor (0.251) than its isolated-no-T1-winner counterpart's implied role would suggest.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — a direct standardized-difference computation, not previously reported for production status specifically (the existing risk table is for isolated no-T1-winner status)
> **Selection:** whole comparable population (975 solved / 725 unsolved, corpus2), not a sample

## Method

Same standardized-difference approach the existing "Structural unsupported-risk signal" table uses (mean difference divided by pooled standard deviation), computed here against **production** solved/unsolved status rather than isolated-oracle solved/no-winner status, for six of the same features that table already tracks.

## Result

| feature | production-solved mean | production-unsolved mean | standardized difference |
|---|---:|---:|---:|
| `portals` | 2.251 | 4.201 | **0.730** |
| `turnConstraintLoad` | 12.671 | 17.168 | 0.724 |
| `constrainedObjectDensity` | 0.171 | 0.231 | 0.713 |
| `requiredPathCoverageRatio` | 0.733 | 0.790 | 0.541 |
| `mustTurn` | 2.852 | 4.545 | 0.527 |
| `mustCross` | 2.399 | 3.081 | 0.251 |

## Interpretation

Production and the isolated T1 census are measuring genuinely different things — production has real retry/repair machinery the isolated census's single-technique cells do not — so it is not obvious in advance that their risk-factor rankings should match exactly, and this report finds they do not. `portals` moves from a secondary factor in the isolated-census table to a co-leading one for production failure specifically, while `mustCross` (which the isolated table's own combined-burden framing treats as a real contributor) is comparatively weak here. This is directly useful context for `solver-future-work.md`'s deferred "generator- and editor-envelope-specific technique niches" and any future structural-feature-driven routing work: a feature's importance for "does *any* isolated technique solve this" is not automatically its importance for "does the real *production ladder* solve this," and any future work using structural features to predict production outcomes specifically should measure against production status directly, not assume the isolated-census ranking transfers.

## What this does not establish

- Does not test the full feature set the isolated-census table covers (`requiredPathLength`, `surround`, `blocks`, `nonNavigableDensity` were not recomputed here) — a fuller replication of that table's own nine-feature list against production status would be the natural next step if this line is pursued further.
- Correlational, not causal; both production and isolated failure plausibly share underlying difficulty drivers this standardized-difference approach cannot separate.
- Single production run.
