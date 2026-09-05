# Refinement: admissible-order's >100x failure/success cost ratio is a median-only artifact — its own successful solves already span a 49x median-to-p90 range, and the failure premium compresses to ~2.5x at p90

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `failedNodes.p90 / successfulNodes.p90` and `successfulNodes.p90 / successfulNodes.median` per action in `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `actions` array, no new dispatch
> **Decision:** `2026-09-05-per-action-failure-cost-ratio-asymmetry-001.md`'s headline (admissible-order's median failure/success cost ratio is >100x) is correct but is specifically a **median** phenomenon, not a tail-robust one. At the p90 level, admissible-order's failure/success ratio compresses to **~2.48x** (nearly identical to DFS's 2.23x and repair's 1.97x; beam stays flat at ~1.06x both places). The mechanism: admissible-order's `failedNodes` sits at the exact node-budget ceiling (~50,000,128) at both median and p90 — failures are uniformly maximally expensive — but its own **successful** solves have an enormous median-to-p90 spread (mean **49.07x** across the 5 tie-break profiles, vs. DFS 23.17x, repair 13.05x, beam only **1.91x**). Admissible-order's successes are usually cheap (median ~365K-435K nodes) but roughly 10% of the time cost nearly as much as an outright failure (p90 ~19-22M, approaching the 50M ceiling) — the >100x median ratio reflects typical-case cheap successes against uniformly-expensive failures, not a property that holds when reasoning about worst-case/tail cost.
> **Remaining gate:** none — a tail-behavior refinement of an existing finding using already-collected data.
> **Evidence role:** forensic/methodological — a follow-up tail-vs-median check that materially qualifies a very recently published "most mechanistically important" finding
> **Selection:** whole action population with valid `successfulNodes`/`failedNodes` p90 and median (35 of 41 actions), not a sample

## Method

Computed two additional ratios per action beyond the original report's median-only comparison: (a) `failedNodes.p90 / successfulNodes.p90` (does the failure premium hold at the tail), and (b) `successfulNodes.p90 / successfulNodes.median` (how variable is an action's own successful-solve cost).

## Result

| family | mean failed/successful ratio at p90 | mean successful p90/median spread |
|---|---:|---:|
| `admissible-order` | 2.48x | **49.07x** |
| `dfs` | 2.23x | 23.17x |
| `repair` | 1.97x | 13.05x |
| `beam` | 1.06x | 1.91x |

Per-tie-break-profile detail for `admissible-order` (all 5 profiles behave nearly identically): `failedNodes` median = p90 = ~50,000,128 (the exact node-budget ceiling) for every profile; `successfulNodes` median ranges 365,381-434,524 but p90 ranges 19,076,423-21,785,688 — a ~46-59x spread within just the successful-solve population.

## Interpretation

This does not overturn the original report's mechanism (admissible-order failures really are uniformly maximally expensive, and that really does explain why admissible-order-derived stages dominate the expensive production tail) — but it substantially changes how that mechanism should be used for scheduling decisions. A scheduler reasoning about *typical* cost (e.g. expected work over many attempts) can reasonably use the >100x median ratio. A scheduler reasoning about *worst-case* or *budget-cap* behavior (which is what actually matters for a hard work ceiling or a wall-clock-bounded dispatch) should instead reason about the ~2.5x tail ratio and, more importantly, about the fact that admissible-order's own successful solves are far less predictable in cost (49x spread) than beam's (1.91x spread, essentially deterministic cost when it succeeds). This reframes "beam's failures cost barely more than its successes" (the original report's other headline) into a stronger, more general claim: beam's cost is simply far more *predictable* overall — both its successes and failures cluster tightly — while admissible-order's cost is unpredictable specifically among its successes, not only between success and failure.

## What this does not establish

- Does not test whether the 49x successful-cost spread correlates with any structural feature (would a level's `constrainedObjects`/`portals` etc. predict whether a given admissible-order success lands near the median or near the p90 tail) — a natural follow-up.
- Only two percentiles (median, p90) are available in the census; the true shape of the successful-cost distribution between and beyond these points is not characterized.
- Single census snapshot (2026-09-03).
