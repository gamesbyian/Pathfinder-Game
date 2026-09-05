# 3 of `goal-attraction-disabled-retry`'s 10 real production wins have no isolated-census alternative at all

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — all 10 levels with `winningTechnique==='goal-attraction-disabled-retry'` across `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus{1,2}.json`, joined against `isolatedOracleSolved`/`solverCount` in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** `goal-attraction-disabled-retry` has exactly 10 real production wins in this run (consistent with its 0.9% production win-share, per `2026-09-05-production-win-share-concentration-001.md`). 7/10 have an isolated-census alternative (`isolatedOracleSolved===true`); the other 3 (`R02126`, `R02298`, `R02474`) have `isolatedOracleSolved===false, solverCount===0` — no known technique, isolated or production, other than this stage can solve them at all per the current census. This mirrors the redundancy pattern already found for `admissible-order-alternate-tiebreak-retry` (14/28 exclusive), `must-cross-neighbor-prune-disabled-retry` (3/9 exclusive), and `connectivity-axis-prune-disabled-retry` (2/6 exclusive) — a consistent minority-but-nonzero exclusivity rate across the late-ladder retry tiers checked this way.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery/confirmatory — completes the redundancy-analysis pattern for the one major "missing action" this session's marginal-value-tail-audit flagged that had not yet been checked this way
> **Selection:** the full population of real production wins for this stage (n=10), not a sample

## Method

Same method as the existing admissible-order/must-cross/connectivity-axis redundancy reports: found every level whose `winningTechnique` is `goal-attraction-disabled-retry`, then joined each against the census's `isolatedOracleSolved`/`solverCount` fields.

## Result

| level | `isolatedOracleSolved` | `solverCount` | isolated `solvingActions` |
|---|---|---:|---|
| R00373 | true | 5 | admissible-order (4 tie-breaks), repair-standard |
| R00386 | true | 1 | repair-standard |
| R02126 | **false** | **0** | — |
| R02175 | true | 2 | repair-standard, repair-turn-biased |
| R02298 | **false** | **0** | — |
| R02375 | true | 1 | repair-standard |
| R02474 | **false** | **0** | — |
| R02576 | true | 2 | dfs-default, dfs-intersectionHarvest |
| R02726 | true | 11 | mostly dfs variants + repair-standard |
| R03148 | true | 7 | admissible-order, beam (3 variants), repair (3 variants) |

7/10 (70%) have an isolated-census alternative; 3/10 (30%) are `goal-attraction-disabled-retry`-exclusive.

## Interpretation

`goal-attraction-disabled-retry` was flagged in this session's earlier production-ladder marginal-value work as one of the "missing actions" whose absence from the static portfolio cost real solves, and separately shown to appear in 100% of starvation patterns (`2026-09-04-starvation-pattern-combinatorics-at-scale-001.md`). This report completes the redundancy check the other late-ladder tiers already received: like them, it is not fully redundant with isolated-census capability — roughly a third of its real wins are provably irreplaceable by any other known technique. Combined with its already-established starvation-pattern ubiquity, this reinforces that `goal-attraction-disabled-retry` should not be treated as a low-priority stage merely because its aggregate solve-count share is small (0.9%, the smallest of any stage checked this session) — its exclusivity rate (30%) is comparable to `admissible-order-alternate-tiebreak-retry`'s (50%) and higher than `connectivity-axis-prune-disabled-retry`'s (33%), on a much smaller absolute base.

## What this does not establish

- n=10 is small; the 30% exclusivity estimate carries wide uncertainty compared to the larger admissible-order sample (n=28).
- Does not test what would happen if this stage were removed or reduced — only characterizes current redundancy of its existing wins.
- Single production run, both corpora combined.
