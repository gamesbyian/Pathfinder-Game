# H3 length allocation value simulation result 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-17 — deterministic replay simulation over Card-E's already-recorded real search costs (156 rows, 50 randomized-baseline trials), current HEAD.
> **Decision:** remaining length is not merely descriptively correlated with rescuability (H3's own finding) -- it has large, practical **allocation value** under a fixed shared search budget. Prioritizing near-misses by ascending remaining length massively outperforms an unprioritized (random) order: at just 2% of a full per-row-cap budget, length-first solves 7/17 possible rescues vs. random's mean of 0.32 (~22x); by 20% of budget, length-first has captured 16/17 (94%) of everything achievable at any budget, while random is still only at a mean of 3.5/17 (21%). Descending-length (worst-case order) solves **zero** until the budget is large enough to nearly cover everyone.
> **Remaining gate:** this is a simulation on one already-committed 156-row population using one specific completion-search technique (`searchCompletionFromPartialPath`) and one scheduling model (sequential, per-row-capped). It does not test generalization to other populations/techniques, nor the prior question of whether spending a shared budget on completion search at all is worthwhile versus other uses of the same work.
> **Evidence role:** direct answer to H3's own explicitly flagged open question (`reports/2026-09-17-h3-repair-commitment-interface-result-001.md`'s "Relation to existing evidence": "does not test whether length itself is an economically actionable allocation signal under fixed work").
> **Population identity:** Card-E's own already-committed 156-row population (`reports/stress/card-e-sizing-cross-tab-001.json`, real recorded `reachNodes` per row) joined to H3's own already-extracted `lengthRemaining` feature (`reports/stress/h3-repair-commitment-interface-2026-09-17.json`). No new labelling, no new search.

## Why this ran

H3 found remaining length dominates rescuability descriptively (Cohen's d = -1.81) but explicitly flagged that it never tested whether *using* that fact to prioritize search actually buys more solves under a shared, fixed budget -- a different, stronger, production-relevant claim than a correlation. Card-E's own sizing pass already recorded, for every row, either the exact node count at which a solution was found (`reachNodes`, for the 17 reconstructable rows) or confirmation that no solution exists within its 2,000,000-node cap (the other 139). Because `searchCompletionFromPartialPath` is deterministic, these already-recorded costs are sufficient to simulate any allocation *order* without re-running any search.

## Method

Each row is processed sequentially in a chosen order, given up to a fixed per-row cap (2,000,000 nodes, matching Card-E's own cap) drawn from one shared budget pool. A reconstructable row is "solved" if the budget it's given (`min(cap, budget remaining)`) is at least its recorded `reachNodes`; a non-reconstructable row is never solved (Card-E's own run already showed it fails even with the full cap). Compared four deterministic orders -- ascending remaining length, descending remaining length, the dataset's own incidental order, and an oracle ascending-actual-cost order (an upper bound, since it requires knowing the answer in advance) -- against a randomized baseline (50 seeded shuffles, reporting mean/min/max), across budgets from 2% to 100% of "every row gets its own full cap."

## Result

| Budget (% of full-cap-for-all) | Total budget (nodes) | Ascending length | Descending length | Dataset order | Random mean (n=50) | Oracle (upper bound) |
|---:|---:|---:|---:|---:|---:|---:|
| 2% | 6.24M | **7** | 0 | 0 | 0.32 | 13 |
| 5% | 15.6M | **8** | 0 | 0 | 0.86 | 17 |
| 10% | 31.2M | **11** | 0 | 1 | 1.72 | 17 |
| 20% | 62.4M | **16** | 0 | 4 | 3.50 | 17 |
| 35% | 109.2M | **17** | 0 | 10 | 6.34 | 17 |
| 50% | 156M | 17 | 0 | 13 | 9.12 | 17 |
| 100% | 312M | 17 | 17 | 17 | 17.00 | 17 |

(17 = every reconstructable row in the population; random-baseline min/max at 2% were 0/2, at 20% were 0/8, at 35% were 2/12 -- full spread in the committed JSON.)

## Interpretation

**Ordering matters enormously, and the direction matters exactly as H3's descriptive finding predicts.** Ascending-length order reaches near-saturation (16/17) at 20% of the budget that guarantees every row its own full cap, and full saturation (17/17) at 35%. The random baseline needs roughly 100% of that budget to reach the same point on average, and descending-length (deliberately the worst order) needs effectively the entire budget before solving anything at all. This is not a marginal effect -- at low budgets the gap between length-first and random is more than an order of magnitude (7 vs. 0.32 at 2%).

**This is the allocation-value claim H3 left untested, now positively answered on this population.** A correlation between a feature and an outcome does not by itself imply the feature is useful for scheduling; here it clearly is, because the underlying search cost is itself strongly related to remaining length (short-remaining rows are cheap to solve when solvable at all), so processing them first lets a shared budget "clear" the cheap wins before being exhausted by expensive near-misses that were never going to finish anyway.

## What this earns

Earned:
- A concrete, quantified, zero-new-compute answer to H3's own named gap: remaining length has real, large allocation value, not just descriptive correlation, on this population.
- A specific, simple, immediately-testable candidate policy: **when running a shared/fixed completion-search budget across multiple near-miss candidates, process them in ascending remaining-length order.**

Not earned:
- Production deployment. This is a simulation over one already-committed population and one specific search technique/scheduling model; it does not establish that spending a shared budget on completion search is the right use of that work in the first place (a separate, prior economics question this report does not touch), nor that the effect generalizes beyond Card-E's 156-row population or beyond `searchCompletionFromPartialPath`'s specific behavior.
- Confirmation against the closed Class-2 must-turn-biased late-repair economics result or generic positional/prefix repair's negative -- those tested whether *using* a distance/positional signal to prioritize repair buys net solves under a different production mechanism; this result is a different, narrower, offline simulation and does not reopen either.

## Artifacts

- `scripts/stress/h3-length-allocation-value-simulation.mjs`
- `reports/stress/h3-length-allocation-value-simulation-2026-09-17.json` — full per-budget results including random-baseline min/max
