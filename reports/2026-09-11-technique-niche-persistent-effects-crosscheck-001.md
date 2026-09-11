# Technique-niche persistent-effects cross-check 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-11 — direct cross-read of the committed Sep-1 and Sep-3 `relative-advantage-summary.json` artifacts for the same eight frozen action pairs.
> **Decision:** 5/8 pairs retain at least one visible same-direction material effect at `|standardizedDifference| >= 0.30`; prioritize the two 5K plain-vs-mechanic-bucket pairs for difficulty control, then family/profile evidence if they survive.
> **Remaining gate:** none for this manual cross-check; `scripts/analyze-technique-niche-stability.mjs` should mechanically reproduce it before downstream decision use.
> **Evidence role:** observational-development extension of `2026-09-05-relative-advantage-pairs-temporal-drift-001.md`; no new solver dispatch.
> **Threshold:** a feature counts as persistent here only when it appears in both stored top-eight lists, keeps the same sign, and has `|standardizedDifference| >= 0.30` in both snapshots.

## Result

The Sep-5 report correctly found that only **3/8 pairs retained the same single leading feature** across the census refresh. Looking below the leader, however, **5/8 pairs retain at least one material same-direction effect** under the stricter rule above.

| pair | persistent effects visible in both stored top-eight lists | reading |
|---|---|---|
| admissible-order default vs mustCrossFirst | `requiredIntersections` −0.386 -> −0.610 | leader drifted, but one recurring structural distinction remains |
| DFS harvestThenFinish vs portalFirstTransfer | `flippingFilters` +0.851 -> +1.682; `requiredIntersections` −0.938 -> −0.302; `mustCross` −0.584 -> −0.515 | strong secondary persistence despite complete leader change |
| objective-first beam 2K vs 5K | `navigableArea` +0.656 -> +0.411; `constrainedObjectDensity` −0.477 -> −0.428; `requiredPathCoverageRatio` −0.436 -> −0.527; `nonNavigableDensity` −0.423 -> −0.515; `mustPass` −0.413 -> −0.414 | broad burden/scale signature persists even though the top feature changed |
| intersection-harvest beam 2K vs 5K | none at the 0.30 threshold among features present in both stored top-eight lists | outcome inversion persists, but no robust coarse explanation is visible in the censored summaries |
| objective-first beam 5K plain vs mechanic-buckets | `portals` −1.060 -> −0.677; `requiredIntersections` +0.680 -> +0.343; `turnConstraintLoad` +0.532 -> +0.537; `surround` +0.400 -> +0.406; `requiredPathLength` +0.350 -> +0.302 | strong multi-feature persistent niche; high-priority difficulty-control/family candidate |
| intersection-harvest beam 5K plain vs mechanic-buckets | `requiredIntersections` +0.655 -> +0.903; `portals` −0.539 -> −0.825; `requiredPathLength` +0.387 -> +0.602; `constrainedObjectDensity` −0.376 -> −0.532 | strongest current persistent niche candidate |
| perimeter beam CW vs CCW | none; every old effect is below 0.30 | large disagreement remains structurally opaque at this coarse resolution |
| perimeter DFS CW vs CCW | none at the 0.30 threshold among common stored effects | leading explanation drifted strongly; treat as symmetry/operational question rather than current routing signal |

So the useful distinction is now three-way, not simply stable-vs-unstable:

1. **persistent structural niche:** 5K plain-vs-mechanic-buckets, plus meaningful secondary persistence in several other pairs;
2. **persistent outcome inversion but no robust coarse explanation:** intersection-harvest 2K-vs-5K and the orientation cases at this threshold;
3. **leader drift with a surviving secondary signature:** admissible-order, DFS harvest-vs-portal, and objective beam 2K-vs-5K.

## Consequence

The two 5K plain-vs-mechanic-bucket comparisons remain the best first candidates for the new difficulty-stratified analysis and, if they survive it, existing-family controlled flips and source-controlled solution-space mediation.

The objective 2K-vs-5K pair should **not** be summarized as having lost all structural explanation. Its leader changed, but five burden/scale effects remain material and same-direction. That makes generic-difficulty control especially important: the persistent signature may simply describe how hard the two exclusive populations are rather than a width-specific mechanism.

The intersection-harvest 2K-vs-5K and orientation pairs are better mechanism-localization candidates than static-routing candidates unless a stronger explanation appears after recomputing uncensored full-feature effects or controlled-family evidence.

## Censoring and reproduction

This cross-check uses only the top eight effects already persisted in each summary. Therefore:

- a missing feature is **censored**, not evidence that its effect vanished;
- the table can prove visible persistence but cannot prove absence of persistence outside the stored top eight;
- `scripts/analyze-technique-niche-stability.mjs` should reproduce the table's visible persistent effects using the canonical `normalizeAttemptIdentityKey`; any disagreement is a tooling/data-normalization bug to resolve before downstream use.

For a decision that hinges on a feature absent from one snapshot's top eight, recompute the full effect vector directly from the two base `level-capability.json` artifacts rather than inferring zero.
