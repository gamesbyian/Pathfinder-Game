# The most expensive production solves (>90% of node budget) are attributed entirely to late-ladder retry tiers, never to `main-ladder`/`early-repair-search`

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — per-level `nodes` and `winningTechnique` joined against `solveCost.marginalSolves` thresholds (`above50pctOfBudget`, `above75pctOfBudget`, `above90pctOfBudget`) in `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus{1,2}.json`, no new dispatch
> **Decision:** technique attribution for `production-scale-budget-edge-fragility-001`'s marginal-solve counts (37.6%/19.5%/15.4% of solves at >50/75/90% of node cap). At the >90%-of-budget tier, **zero** solves in either corpus are won by `main-ladder` or `early-repair-search` — 100% of the 150 corpus2 solves and both corpus1 solves in that tier come from late-ladder tiers (`coarse-state-near-tie-retention-disabled-retry`, `late-repair-multiseed-retry`, `admissible-order-alternate-tiebreak-retry`, `late-repair-search`, `must-cross-neighbor-prune-disabled-retry`, `admissible-order-fallback`, `connectivity-axis-prune-disabled-retry`, `guidance-goal-distance-retry`).
> **Remaining gate:** none — descriptive attribution using already-collected data.
> **Evidence role:** discovery/confirmatory — quantifies which specific techniques the already-known budget-edge-fragility mass belongs to
> **Selection:** whole comparable population (975 corpus2 + 98 corpus1 solved levels), not a sample

## Method

For each corpus, took the set of solved levels whose `nodes` exceeded 50%/75%/90% of `solveCost.nodeBudget` (50,000,000), then tabulated `winningTechnique` within each threshold tier.

## Result

**Corpus2** (975 solved; budget-edge counts already established at 367/190/150 for >50/75/90%):

| `winningTechnique` | >50% (n=367) | >90% (n=150) |
|---|---:|---:|
| `main-ladder` | 161 | 0 |
| `admissible-order-fallback` | 47 | 7 |
| `coarse-state-near-tie-retention-disabled-retry` | 37 | 37 |
| `late-repair-multiseed-retry` | 36 | 36 |
| `admissible-order-alternate-tiebreak-retry` | 28 | 28 |
| `late-repair-search` | 21 | 21 |
| `goal-attraction-disabled-retry` | 10 | 0 |
| `must-cross-neighbor-prune-disabled-retry` | 9 | 9 |
| `connectivity-axis-prune-disabled-retry` | 6 | 6 |
| `guidance-goal-distance-retry` | 6 | 6 |
| `repair-fallback` | 6 | 0 |
| `early-repair-search` | 0 | 0 |

**Corpus1** (98 solved; 13/3/2 for >50/75/90%): at >90%, both solves are `admissible-order-alternate-tiebreak-retry` (1) and `coarse-state-near-tie-retention-disabled-retry` (1) — same late-ladder pattern, just thinner (n=2).

Note the >90% column is a strict subset structurally: every technique appearing there (except `admissible-order-fallback`, which drops from 47 to 7) shows the *identical* count at >75% and >90% for `coarse-state-near-tie-retention-disabled-retry`, `late-repair-multiseed-retry`, `admissible-order-alternate-tiebreak-retry`, `late-repair-search`, `must-cross-neighbor-prune-disabled-retry`, `connectivity-axis-prune-disabled-retry`, and `guidance-goal-distance-retry` — meaning essentially every solve these techniques win in corpus2 lands above 90% of the node budget, not just above 75%.

## Interpretation

This sharpens `production-scale-budget-edge-fragility-001`'s aggregate finding with a technique breakdown: the expensive tail is not spread across the ladder, it *is* the late-ladder retry tiers, cleanly. `main-ladder` and `early-repair-search` — which together win 864/975 (88.6%) of corpus2's solves overall — contribute **nothing** to the >90%-of-budget tier; every one of those solves is cheap relative to the cap. This directly validates the premise behind Workstream 2's `admissible-order-alternate-tiebreak-retry` repricing work (that tier alone is 28/150, 18.7%, of the most expensive solves) while also showing five *other* late-ladder tiers occupy the same expensive-tail territory and would face the same node-budget/work-budget confound if tested the same way the alternate-tiebreak retry was (see `2026-09-04-admissible-order-non-default-retry-repricing-confirmation-001.md`). Any future repricing work on `coarse-state-near-tie-retention-disabled-retry` or `late-repair-multiseed-retry` specifically should budget for the same near-100%-of-solves-are-at-the-edge property this report finds for `admissible-order-alternate-tiebreak-retry`.

## What this does not establish

- Does not test whether these techniques' work could be reduced without losing the solves — that is exactly the repricing-confirmation question already gated in Workstream 2, not re-opened here.
- `nodes` (raw), not `workSpent`, is the cost metric available in this file; per standing rules `workSpent` is the canonical cross-technique currency, but node count is the field this dataset actually carries the budget-edge threshold in.
- Single run, both corpora.
