# The full 17-feature production risk-factor ranking is confounded by multicollinearity among its top entries

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — pairwise Pearson correlation among the eight highest-ranked features from `2026-09-04-production-structural-risk-factors-full-replication-001.md`, computed over all 1,962 levels in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** several of the top-ranked production-risk features are substantially correlated with each other, not independent axes: `constrainedObjects` correlates strongly with `turnConstraintLoad` (r=0.781), `constrainedObjectDensity` (r=0.852, expected — density is objects/area), and moderately with `portals` (r=0.628); `requiredPathLength` correlates strongly with `area` (r=0.849) and moderately with `blocks` (r=0.439). The full-replication report's ranking (`constrainedObjects` leading at 1.250, ahead of `portals`/`turnConstraintLoad`/`requiredPathLength`) should be read as identifying **a small number of underlying difficulty dimensions** (roughly: an object/constraint-density dimension, and a map-scale dimension) reflected across several correlated named features, not 17 independently-acting risk factors.
> **Remaining gate:** none — a methodological qualification of an existing ranking using already-collected data.
> **Evidence role:** forensic/methodological — a multicollinearity check the original ranking report did not perform
> **Selection:** whole census population (1,962 levels), not a sample

## Method

Computed Pearson correlation between every pair of the eight highest-standardized-difference features from the full-replication risk-factor report, flagging pairs with |r| > 0.4.

## Result

| Feature pair | r |
|---|---:|
| `constrainedObjects` vs `constrainedObjectDensity` | 0.852 |
| `requiredPathLength` vs `area` | 0.849 |
| `constrainedObjects` vs `turnConstraintLoad` | 0.781 |
| `constrainedObjects` vs `portals` | 0.628 |
| `turnConstraintLoad` vs `constrainedObjectDensity` | 0.666 |
| `portals` vs `constrainedObjectDensity` | 0.520 |
| `blocks` vs `area` | 0.503 |
| `requiredPathLength` vs `blocks` | 0.439 |

## Interpretation

Reading the full-replication report's 17-feature ranking as a list of 17 independent contributors would overstate how many distinct structural mechanisms are actually implicated. `constrainedObjects`, `turnConstraintLoad`, `constrainedObjectDensity`, and `portals` — four of the top five entries — are all substantially intercorrelated, meaning a single underlying "object/constraint-heavy" difficulty dimension likely drives most of their individual standardized-difference scores, rather than each representing an independent failure mechanism. Similarly `requiredPathLength`, `area`, and `blocks` cluster together as a "map-scale" dimension. This does not invalidate the ranking's practical use (each named feature is still measurably associated with production failure and cheap to compute), but any future work trying to build a compact risk *model* (rather than a descriptive ranking) from these features should account for this collinearity — e.g. via a reduced feature set or an explicit dimensionality-reduction step — rather than treating all 17 as independent inputs.

## What this does not establish

- Does not perform a formal factor analysis or PCA to identify the exact number/composition of underlying dimensions — only flags which pairs are correlated.
- Does not retest the standardized-difference ranking controlling for these correlations (e.g. via partial correlation or regression) — a natural next step if a compact risk model is pursued.
- Single census snapshot (2026-09-03).
