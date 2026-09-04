# 58.5% of doubleton (solverCount=2) levels have both solvers from the same technique family

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — `solvingActions` for all 94 `doubleton===true` levels in `reports/stress/technique-niches/2026-09-03/level-capability.json`, family derived from each action key's prefix (`admissible-order`/`beam`/`repair`/`dfs`), no new dispatch
> **Decision:** among 94 doubleton levels, 55/94 (58.5%) have both solving techniques from the **same** family: `beam`+`beam` (29, 30.9%), `repair`+`repair` (17, 18.1%), `admissible-order`+`admissible-order` (6, 6.4%), `dfs`+`dfs` (3, 3.2%). Only 39/94 (41.5%) are genuine cross-family pairs, led by `beam`+`repair` (21, 22.3%) and `dfs`+`repair` (9, 9.6%). The `level-capability.json`'s own `solvingFamilies` field is uninformative for this — it reads `["other"]` on every sampled doubleton and cannot be used for family analysis; family had to be re-derived from the `solvingActions` action-key prefixes.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — extends the singleton-fragility-by-technique-family analysis (`2026-09-04-singleton-fragility-by-technique-family-001.md`) one multiplicity level up
> **Selection:** whole doubleton population (94 levels), not a sample

## Method

Filtered `level-capability.json` to `doubleton===true`, then for each level derived each of its two `solvingActions`' technique family from the action-key prefix (matching the same `admissible-order`/`beam`/`repair`/`dfs` grouping used in the singleton-fragility report), and tabulated the resulting family-pair.

## Result

| family pair | count | share |
|---|---:|---:|
| `beam`+`beam` | 29 | 30.9% |
| `beam`+`repair` | 21 | 22.3% |
| `repair`+`repair` | 17 | 18.1% |
| `dfs`+`repair` | 9 | 9.6% |
| `admissible-order`+`admissible-order` | 6 | 6.4% |
| `admissible-order`+`repair` | 4 | 4.3% |
| `dfs`+`dfs` | 3 | 3.2% |
| `admissible-order`+`dfs` | 2 | 2.1% |
| `admissible-order`+`beam` | 2 | 2.1% |
| `beam`+`dfs` | 1 | 1.1% |
| **same-family total** | **55** | **58.5%** |
| **cross-family total** | **39** | **41.5%** |

## Interpretation

The standing rule in `solver-optimization-workstreams.md` already cautions that singleton-exclusive claims are fragile and that DFS-singleton claims lose support roughly 2x as fast as beam-singleton ones across a census refresh. This report shows the next multiplicity tier up (doubleton, "has a backup") is less protective against a *family-wide* failure mode than the raw `solverCount=2` label suggests: a majority (58.5%) of doubletons' two solvers share a family, so a change or regression affecting an entire family (e.g. a beam-scoring-profile bug, or a repair-guidance regression) would still zero out most same-family doubletons in one stroke, not just singletons. Only 41.5% of doubletons have genuine cross-family redundancy. `beam`+`beam` alone (30.9%) is the single largest doubleton pattern — consistent with beam's many named scoring-profile/bias/width variants each counting as a distinct "solver" while sharing the same underlying search mechanism and failure modes.

This sharpens the existing multiplicity-as-robustness-predictor line: `solverCount` alone measures redundancy count, not redundancy *diversity*, and the family-conditioned view this report and the singleton-fragility report together provide is a better proxy for actual robustness to a family-wide capability change than raw multiplicity.

## What this does not establish

- Does not test an actual family-wide regression's real effect on these doubletons — this is a structural characterization of the existing capability map, not an intervention study.
- The `admissible-order`/`beam`/`repair`/`dfs` family taxonomy is coarse (e.g. it does not distinguish beam scoring profiles from each other); a finer-grained taxonomy might shift the same-family share.
- Single census snapshot (2026-09-03); not re-checked for temporal stability the way singleton claims were in `2026-09-04-capability-multiplicity-temporal-robustness-001.md`.
