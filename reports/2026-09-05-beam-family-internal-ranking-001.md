# `mechanic-buckets` retention is beam's strongest configuration by a clear margin, both in solved count and exclusivity

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — per-action `solvedLevels`/`exclusiveLevels`/`thinBoundaryLevels` for all 16 `beam` family members in `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `actions` array, no new dispatch
> **Decision:** the two `mechanic-buckets`-retention configs are beam's top performers: `intersectionHarvest|width=5000|retention=mechanic-buckets` (713 solved, 11 exclusive) and `objectiveFirst|width=5000|retention=mechanic-buckets` (705 solved, 14 exclusive) — both ahead of every `plain`-retention peer, including the same scoring-profile/width combination without mechanic-buckets retention (614 and 650 solved respectively).
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — first within-family ranking of beam's 16 configurations reported this session
> **Selection:** whole action population within the family (16 actions), not a sample

## Method

Read `solvedLevels`/`exclusiveLevels`/`thinBoundaryLevels` directly from every `beam` action's entry in `level-capability.json`'s `actions` array, sorted by `solvedLevels`.

## Result

| action | solved | exclusive | thin boundary |
|---|---:|---:|---:|
| `intersectionHarvest\|width=5000\|retention=mechanic-buckets` | 713 | 11 | 22 |
| `objectiveFirst\|width=5000\|retention=mechanic-buckets` | 705 | 14 | 21 |
| `objectiveFirst\|width=5000\|retention=plain+coarse-state-near-tie-retention-off` | 668 | 4 | 10 |
| `intersectionHarvest\|width=5000\|retention=plain+coarse-state-near-tie-retention-off` | 661 | 4 | 12 |
| `objectiveFirst\|width=5000\|retention=plain` | 650 | 2 | 6 |
| `intersectionHarvest\|width=5000\|retention=plain` | 614 | 2 | 5 |
| `objectiveFirst\|width=5000\|retention=plain+connectivity-axis-exhausted-off` | 594 | 0 | 2 |
| `intersectionHarvest\|width=5000\|retention=plain+connectivity-axis-exhausted-off` | 561 | 0 | 1 |
| `harvestThenFinish\|width=2000\|retention=plain` | 516 | 0 | 2 |
| `knotBuilder\|width=2000\|retention=plain` | 511 | 1 | 2 |
| `mustCrossFirst\|width=2000\|retention=plain` | 511 | 0 | 2 |
| `objectiveFirst\|width=2000\|retention=plain` | 506 | 0 | 1 |
| `perimeterSweep\|bias=perimeterCCW\|width=2000\|retention=plain` | 506 | 10 | 27 |
| `intersectionHarvest\|width=2000\|retention=plain` | 499 | 4 | 5 |
| `perimeterSweep\|bias=perimeterCW\|width=2000\|retention=plain` | 499 | 15 | 30 |
| `mustCrossFirst\|width=2000\|retention=plain+mc-neighbor-budget-off` | 204 | 0 | 1 |

## Interpretation

`mechanic-buckets` retention (grouping near-tie states by game-mechanic bucket rather than a flat plain pool) is beam's single most impactful configuration choice at width 5000 — a ~15-16% solve-count gain over the same scoring profile with plain retention, and the family's two highest exclusive-claim counts. The two `perimeterSweep` bias variants (`perimeterCW`/`perimeterCCW`) are notable for carrying real exclusivity (15 and 10 respectively) despite modest solved counts (499/506) — a niche-but-real specialist pair, consistent with `2026-09-01-technique-relative-advantage-followup.md`'s existing "portal-heavy niche" nomination for beam width/retention inversions. See the companion reports on the `coarse-state-near-tie-retention-off`/`connectivity-axis-exhausted-off` ablation pairs (`2026-09-05-beam-retention-ablation-effects-001.md`) and `mc-neighbor-budget-off` (`2026-09-05-mc-neighbor-budget-off-ablation-effect-001.md`) for the deliberate-ablation entries in this list.

## What this does not establish

- Does not test whether `mechanic-buckets` retention's advantage holds at width 2000 (only tested at width 5000 in this census's action set).
- Does not test production exposure of these specific configs — see `2026-09-05-family-production-exposure-rate-001.md` for the cross-family production-exposure angle.
- Single census snapshot (2026-09-03).
