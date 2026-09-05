# DFS's 17 scoring/bias profiles are nearly interchangeable — flat solve counts, almost no exclusive territory

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — per-action `solvedLevels`/`exclusiveLevels` for all 17 `dfs` family members in `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `actions` array, no new dispatch
> **Decision:** DFS's 17 profiles solve between 341 and 395 levels each — a narrow ~14% range — and all but 5 of them have `exclusiveLevels===0`; the maximum for any single DFS profile is 1. This is the flattest, most redundant family in the census: no DFS profile carries meaningful unique capability over its siblings.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — first within-family ranking of DFS's profiles reported this session
> **Selection:** whole action population within the family (17 actions), not a sample

## Method

Read `solvedLevels`/`exclusiveLevels` directly from every `dfs` action's entry in `level-capability.json`'s `actions` array.

## Result

| action | solved levels | exclusive levels |
|---|---:|---:|
| `dfs\|score=perimeterSweep\|bias=perimeterCCW` | 395 | 0 |
| `dfs\|score=perimeterSweep\|bias=perimeterCW` | 387 | 1 |
| `dfs\|score=perimeterSweep\|bias=cornerHarvest` | 385 | 1 |
| `dfs\|score=default\|bias=none` | 385 | 0 |
| `dfs\|score=perimeterSweep\|bias=sideCommitment` | 373 | 1 |
| `dfs\|score=intersectionHarvest\|bias=none` | 371 | 1 |
| `dfs\|score=objectiveFirst\|bias=none` | 369 | 0 |
| `dfs\|score=portalFirstTransfer\|bias=none` | 367 | 0 |
| `dfs\|score=mustCrossFirst\|bias=none` | 365 | 0 |
| `dfs\|score=perimeterSweep\|bias=none` | 365 | 0 |
| `dfs\|score=portalCommitted\|bias=none` | 364 | 1 |
| `dfs\|score=harvestThenFinish\|bias=none` | 361 | 0 |
| `dfs\|score=knotBuilder\|bias=none` | 361 | 0 |
| `dfs\|score=nearClosureRescue\|bias=none` | 347 | 0 |
| `dfs\|score=finishFirst\|bias=none` | 345 | 0 |
| `dfs\|score=closureCommitment\|bias=none` | 341 | 0 |
| `dfs\|score=mustCrossFirst\|bias=none+mc-neighbor-budget-off` | 153 | 0 |

(The `mc-neighbor-budget-off` variant is an ablation, not a peer profile — see `2026-09-05-mc-neighbor-budget-off-ablation-effect-001.md`.)

## Interpretation

Excluding the deliberate ablation variant, DFS's 16 peer profiles range only 341-395 solved levels and carry almost zero exclusive capability between them (5 profiles at exactly 1, the rest at 0). This is the clearest evidence this session of a highly substitutable family: unlike `repair` (one dominant variant plus two smaller real niches) or `admissible-order` (one clear best performer plus real exclusivity concentrated there), DFS's many named scoring/bias profiles appear to be close variations on the same underlying search behavior with negligible individual value-add. This is useful context for any future menu-pruning or specialist-portfolio work: DFS is the family where consolidating to fewer profiles would plausibly cost the least isolated-census capability.

## What this does not establish

- Does not test whether DFS's near-interchangeability holds in production specifically (a related but distinct question from isolated-census capability).
- Does not test whether consolidating DFS's menu would actually be safe under the same rare-capability-retention discipline this session's other menu-pruning work applies — only characterizes the current isolated-census picture.
- Single census snapshot (2026-09-03).
