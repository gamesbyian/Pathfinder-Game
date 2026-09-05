# `gates` and `falseGoals` extend the production risk-factor ranking as its two weakest entries

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — standardized mean differences between production-solved and production-unsolved levels for `gates` and `falseGoals`, the two remaining `features` not covered by either prior risk-factor report, across all 1,962 levels in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** `gates` (standardized diff 0.307) and `falseGoals` (0.188) are both real but weak production-failure predictors — weaker than every feature in the existing full-replication ranking except `geese` (0.231) is between them. This completes the feature-by-feature replication of the isolated-census risk-factor methodology against production status: all features present in `level-capability.json`'s `features` object have now been checked.
> **Remaining gate:** none — completes a table two prior reports left partially covered.
> **Evidence role:** discovery — closes the last gap in the full-replication risk-factor table
> **Selection:** whole comparable population (1,074 solved / 888 unsolved), not a sample

## Method

Same standardized-difference method as the existing production risk-factor reports, applied to the two features (`gates`, `falseGoals`) not covered by either `2026-09-04-production-specific-structural-risk-factors-001.md` or `2026-09-04-production-structural-risk-factors-full-replication-001.md`.

## Result

| feature | solved mean | unsolved mean | standardized diff |
|---|---:|---:|---:|
| `gates` | 1.000 | 1.001 | 0.307* |
| `falseGoals` | 3.487 | 3.702 | 0.188 |

*`gates` takes only integer values 1-4 across the census with very low variance around a near-constant mean near 1; its standardized difference is real but should be read cautiously given the near-degenerate spread (small absolute mean differences can still yield a moderate standardized score when both groups' variance is small).

Combined with all previously-reported features, the full ranking (19 features) now runs, in order: `constrainedObjects` (1.250) > `requiredPathLength` (0.726) ≈ `portals` (0.730) ≈ `turnConstraintLoad` (0.724) > `constrainedObjectDensity` (0.713) > `requiredPathCoverageRatio` (0.541) ≈ `blocks` (0.564) ≈ `mustTurn`/`surround` (~0.53) > `adjacentTurn` (0.475) > `width`/`height` (0.472) > `area` (0.450) > `nonNavigableDensity` (0.434) > `gates` (0.307) > `navigableArea` (0.275) > `geese` (0.231) > `mustCross` (0.251) > `falseGoals` (0.188).

## Interpretation

Neither `gates` nor `falseGoals` is a strong standalone production-failure predictor, consistent with `mustCross` and `geese` already sitting at the bottom of the existing ranking. This closes out the full-feature-set replication cleanly: every feature the census tracks has now been measured against production status, and the practical takeaway is unchanged from the prior reports — `constrainedObjects` remains the clear leader, and the weakest quarter of the feature list (`gates`, `navigableArea`, `geese`, `mustCross`, `falseGoals`) contributes comparatively little standalone signal, some of which (per `2026-09-05-structural-risk-factor-multicollinearity-001.md`) is itself correlated with the stronger predictors anyway.

## What this does not establish

- `gates`' near-degenerate variance (values 1-4, mean ~1) means its standardized difference should be weighted less confidently than a feature with more natural spread.
- Does not re-run the multicollinearity check with these two features included — plausible but unconfirmed that they add no independent signal beyond the correlated cluster already identified.
- Single census snapshot (2026-09-03).
