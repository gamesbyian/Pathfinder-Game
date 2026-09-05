# Admissible-order has the lowest production-exposure rate of any family: only 2 of its 5 isolated-census configs ever win in real production

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — for each of 41 actions in `reports/stress/technique-niches/2026-09-03/level-capability.json`, whether it appears as a `winningConfig` anywhere in `reports/stress/capability-runs/33841017634/per-level-corpus{1,2}.json`, grouped by family, no new dispatch
> **Decision:** the share of a family's isolated-census menu that ever delivers a real production win is: `dfs` 13/17 (76.5%), `repair` 2/3 (66.7%), `beam` 9/16 (56.3%), `admissible-order` 2/5 (40.0%). Admissible-order has the lowest production-exposure rate of any family, generalizing `2026-09-05-admissible-order-tiebreak-production-exposure-001.md`'s specific finding into a cross-family pattern.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — a cross-family generalization of the admissible-order-specific production-exposure finding
> **Selection:** whole action population (41 actions), not a sample

## Method

For each action, checked membership in the set of `winningConfig` values observed across all solved rows in `per-level-corpus{1,2}.json`, grouped the result by family.

## Result

| family | isolated-census configs | ever won in production | exposure rate |
|---|---:|---:|---:|
| `dfs` | 17 | 13 | 76.5% |
| `repair` | 3 | 2 | 66.7% |
| `beam` | 16 | 9 | 56.3% |
| `admissible-order` | 5 | 2 | 40.0% |

## Interpretation

This is consistent with, and generalizes, this session's other admissible-order findings: it is not just that 3 of admissible-order's 4 alternate-tiebreak profiles specifically never win, it is that admissible-order as a whole has the family's lowest fraction of its own isolated-census menu ever converting to a real production win. DFS, by contrast — despite being the flattest, most redundant family by solved-count (`2026-09-05-dfs-family-internal-ranking-001.md`) — has the *highest* production-exposure rate, meaning even its near-interchangeable profiles each get a real, if perhaps rare, chance to win in production. This is a useful general framing for any future menu-pruning or specialist-portfolio discussion: production exposure rate and isolated-census redundancy are not the same axis, and a family can be highly redundant in isolation while still being broadly exposed in production (DFS), or comparatively less redundant in isolation while still being narrowly exposed in production (admissible-order).

## What this does not establish

- Does not test whether the non-exposed configs in each family (e.g. 3/5 for admissible-order, 4/16 for beam) would win given a different production population or budget configuration.
- Small sample sizes for `repair` (n=3) and `admissible-order` (n=5) make their exact rates less statistically robust than beam's or DFS's.
- Single production run, single census snapshot (2026-09-03).
