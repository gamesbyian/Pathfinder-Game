# Full structural risk-factor replication against production status: `constrainedObjects` leads, not `portals`

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — standardized mean differences between production-solved and production-unsolved levels' `features` in `reports/stress/technique-niches/2026-09-03/level-capability.json`, extending `2026-09-04-production-specific-structural-risk-factors-001.md` with the 11 remaining untested features (`requiredPathLength`, `surround`, `blocks`, `nonNavigableDensity`, `width`, `height`, `area`, `navigableArea`, `constrainedObjects`, `adjacentTurn`, `geese`), no new dispatch
> **Decision:** the prior report explicitly flagged "a fuller replication ... would be the natural next step"; this is that replication. With all 17 features now measured against production status, `constrainedObjects` (standardized diff 1.250) is the single strongest predictor — clearly ahead of the previously-reported leaders `portals` (0.730) and `turnConstraintLoad` (0.724). `requiredPathLength` (0.726) ties with `turnConstraintLoad` for second. Geometry-scale features (`width`/`height`/`area`/`navigableArea`) are all mid-table (0.275-0.472), confirming raw map size is a real but secondary production-difficulty driver.
> **Remaining gate:** none — descriptive characterization using already-collected data; this closes the "fuller replication" gap the prior report left open.
> **Evidence role:** discovery, direct extension of a report that named this exact next step
> **Selection:** whole comparable population (1,074 production-solved / 888 production-unsolved), not a sample

## Method

Identical standardized-difference method as the prior report (mean difference / pooled SD), computed for the 11 features that report did not cover, against the same `productionSolved` true/false split.

## Result — full combined ranking (prior 6 + this report's 11)

| feature | solved mean | unsolved mean | standardized diff | source |
|---|---:|---:|---:|---|
| `constrainedObjects` | 16.987 | 28.376 | **1.250** | this report |
| `portals` | 2.251 | 4.201 | 0.730 | prior report |
| `requiredPathLength` | 83.770 | 102.255 | 0.726 | this report |
| `turnConstraintLoad` | 12.671 | 17.168 | 0.724 | prior report |
| `constrainedObjectDensity` | 0.171 | 0.231 | 0.713 | prior report |
| `requiredPathCoverageRatio` | 0.733 | 0.790 | 0.541 | prior report |
| `mustTurn` | 2.852 | 4.545 | 0.527 | prior report |
| `blocks` | 18.680 | 25.374 | 0.564 | this report |
| `surround` | 0.691 | 1.447 | 0.527 | this report |
| `adjacentTurn` | 2.450 | 4.000 | 0.475 | this report |
| `width`/`height` | 12.100 | 12.857 | 0.472 | this report |
| `area` | 149.567 | 167.278 | 0.450 | this report |
| `nonNavigableDensity` | 0.170 | 0.203 | 0.434 | this report |
| `mustCross` | 2.399 | 3.081 | 0.251 | prior report |
| `navigableArea` | 124.045 | 133.738 | 0.275 | this report |
| `geese` | 2.885 | 3.651 | 0.231 | this report |

## Interpretation

`constrainedObjects` (raw count) leading by a wide margin over `constrainedObjectDensity` (its normalized cousin, 0.713, previously the closest thing to it reported) means the *absolute* number of constrained objects matters more for production failure than its density relative to map size — a large map with many constrained objects is riskier for production than the density figure alone would suggest, consistent with `width`/`height`/`area` also carrying real (if secondary) standalone signal rather than being pure confounds of density. `requiredPathLength` landing essentially tied with `turnConstraintLoad` (0.726 vs 0.724) adds a second raw-scale-of-difficulty factor alongside `constrainedObjects` at the top of the table. `mustCross` (0.251) and `geese` (0.231) remain the weakest production-status predictors in the full 17-feature list, reinforcing the prior report's specific observation that `mustCross`'s isolated-census importance does not carry over as strongly to production status.

This full ranking is the more complete reference for any future structural-feature-driven routing or risk-scoring work referenced in `solver-future-work.md`'s deferred generator/envelope line — it should be preferred over the prior report's partial 6-feature table.

## What this does not establish

- Correlational, not causal; both production and isolated failure plausibly share underlying difficulty drivers this standardized-difference approach cannot separate.
- Does not test feature interactions (e.g. `constrainedObjects` at fixed `area`) — each feature was tested independently.
- Single production run, single census snapshot (2026-09-03).
