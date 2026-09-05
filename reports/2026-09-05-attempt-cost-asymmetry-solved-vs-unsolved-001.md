# Production spends ~5x more attempts, and a costlier attempt on average, on levels it ultimately fails to solve

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `attemptCount` and `workSpent`/`attemptCount` per level across all 1,802 rows in `reports/stress/capability-runs/33841017634/per-level-corpus{1,2}.json`, no new dispatch
> **Decision:** solved levels average 10.71 attempts before succeeding; unsolved levels average 54.51 attempts before exhausting budget — roughly 5.1x more. Unsolved levels' attempts are also individually costlier on average: mean `workSpent`/`attemptCount` is 4,704,078 for unsolved levels vs. 3,636,954 for solved ones (~29% higher).
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — a direct efficiency/cost-asymmetry characterization not previously computed this session
> **Selection:** whole population (1,802 rows, both corpora), not a sample

## Method

For every row in `per-level-corpus{1,2}.json`, computed `attemptCount` directly, and mean per-attempt work as `workSpent / attemptCount`. Compared solved (`ok===true`) vs. unsolved rows.

## Result

| | solved (n=1,073) | unsolved (n=729) |
|---|---:|---:|
| mean `attemptCount` | 10.71 | 54.51 |
| mean work per attempt | 3,636,954 | 4,704,078 |

## Interpretation

Both dimensions point the same direction: production spends dramatically more total effort — both more attempts and a costlier average attempt — on levels it ultimately fails, compared to levels it solves. This is the expected shape (a solve typically ends the search early via a cheap stage, per the win-share-concentration and config-deconcentration findings, while a genuine failure means the ladder exhausted every stage's retry budget), but this is the first direct quantification of the magnitude this session: roughly 5x the attempts and ~1.3x the per-attempt cost, compounding to a large total-work asymmetry between the two outcomes. This is useful context for Workstream 2's budget-model reasoning: unsolved levels are not just "the ones that didn't get lucky," they are systematically the most expensive levels to process regardless of outcome, meaning any work-budget change that primarily affects late-ladder retry tiers will disproportionately affect exactly this already-most-expensive population.

## What this does not establish

- Does not decompose the per-attempt cost difference by stage (a later addition could check whether the cost premium is concentrated in specific late-ladder tiers, similar to the marginal-cost-solve-technique-attribution work).
- Correlational; attempt count and per-attempt cost are outcomes of the search, not independent causes of failure.
- Single production run, both corpora combined.
