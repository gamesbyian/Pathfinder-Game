# `mustCross`/`requiredIntersections` load separates "starved" unsolved levels from "capped" ones, and each has a distinct near-miss technique

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`'s two unsolved buckets (`starved`: ladder ran dry, some `starvedTechniques` recorded, n=605; `capped`: full ladder reached with zero `starvedTechniques`, raw node budget alone stopped it, n=120) joined against `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `features`, no new dispatch
> **Decision:** the two unsolved buckets are structurally distinct, not just cost-distinct. `mustCross` (standardized diff 1.780) and `requiredIntersections` (1.631) are far higher on `starved` levels than `capped` ones (means 3.658 vs 0.175, and 6.698 vs 3.083); `requiredPathCoverageRatio` (0.644) and `turnConstraintLoad` (0.528) are secondary. The two buckets also have almost disjoint near-miss techniques: `starved`'s `bestBadnessTechnique` is 84.3% `early-repair-search` (510/605), while `capped`'s is 99.2% late-ladder repair (`late-repair-multiseed-retry` 97/120 + `late-repair-search` 22/120).
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — the `starved`/`capped` bucket split in this dataset had not previously been analyzed as a distinguishing axis (prior work used their union, e.g. `2026-09-04-starvation-pattern-combinatorics-at-scale-001.md`)
> **Selection:** whole comparable population (605 starved + 120 capped, corpus2), not a sample

## Method

`lifecycle-failure-map-corpus2.json` already splits every non-`success` level into `starved` (some technique in the ladder recorded `starvedTechniques`, i.e. the ladder itself ran out of retry allotment before the raw node cap) or `capped` (the full ladder was reached with no technique ever starving — the run simply spent through the raw 50,000,000-node ceiling). This report is the first to treat that split as a variable rather than pooling both under "unsolved." For each bucket: joined `level-capability.json`'s `features` by level id and computed standardized mean differences (pooled-SD normalized), and tabulated `bestBadnessTechnique` (which technique recorded the level's lowest badness — its best near-miss).

## Result

| feature | starved mean | capped mean | standardized diff |
|---|---:|---:|---:|
| `mustCross` | 3.658 | 0.175 | **1.780** |
| `requiredIntersections` | 6.698 | 3.083 | **1.631** |
| `requiredPathCoverageRatio` | 0.801 | 0.736 | 0.644 |
| `turnConstraintLoad` | 17.656 | 14.708 | 0.528 |
| `mustTurn` | 4.415 | 5.200 | 0.261 |
| `portals` | 4.106 | 4.683 | 0.232 |
| `constrainedObjectDensity` | 0.233 | 0.224 | 0.113 |

`bestBadnessTechnique` distribution:

| technique | starved (n=605) | capped (n=120) |
|---|---:|---:|
| `early-repair-search` | 510 (84.3%) | 0 |
| `late-repair-multiseed-retry` | 59 (9.8%) | 97 (80.8%) |
| `repair-fallback` | 24 (4.0%) | 0 |
| `late-repair-search` | 8 (1.3%) | 22 (18.3%) |
| `guidance-goal-distance-retry` | 4 (0.7%) | 0 |
| `goal-attraction-disabled-retry` | 0 | 1 (0.8%) |

Mean `starvedTechniques.length` is 1.35 on `starved` levels and (by construction) 0 on `capped` levels. Mean nodes/work spent are similar between the two buckets (starved: 189M nodes/221M work; capped: 198M nodes/271M work) — the buckets are not separated by raw cost, only by structure/failure mode.

## Interpretation

Two qualitatively different production failure modes hide inside "unsolved." `capped` levels (120/725, 16.6%) are ones the whole ladder legitimately reaches and works through — its best attempt comes from the late-ladder repair retries, and it simply runs out of raw node budget doing real, late-stage work. `starved` levels (605/725, 83.4%) are dominated by heavy `mustCross`/`requiredIntersections` load, and their best attempt is overwhelmingly still `early-repair-search` — the very first, cheapest ladder stage — while `starvedTechniques` shows some later stage(s) never even got a full shot. This is consistent with (and sharpens) the existing starvation-pattern finding that `goal-attraction-disabled-retry` appears in 100% of starvation patterns (`2026-09-04-starvation-pattern-combinatorics-at-scale-001.md`): high-`mustCross` levels appear to consume enough of the shared retry/work pool early that downstream stages, including `goal-attraction-disabled-retry`, never get a real chance, and the level's best recorded attempt stays pinned at `early-repair-search`.

This is useful context for Workstream 1 (automatic solver action selection): a `mustCross`/`requiredIntersections`-heavy level that goes unsolved is diagnosably different from a level that simply needs more raw budget, and the two would plausibly benefit from different interventions (mustCross-aware early routing vs. more budget/skipping already-exhausted-for-this-level stages).

## What this does not establish

- Correlational, not causal — does not show that `mustCross`/`requiredIntersections` load *causes* starvation of a specific downstream stage, only that it co-occurs with the starved-vs-capped split.
- Single corpus (corpus2) and single run; corpus1 has only 4 unsolved levels total and no `capped` bucket at all (see `2026-09-04-corpus1-starvation-profile-001.md`), so this split could not be cross-checked there.
- Does not propose or test a specific routing intervention — that is Workstream 1's territory, gated behind a materially new routing/allocation premise per `solver-optimization-workstreams.md`.
