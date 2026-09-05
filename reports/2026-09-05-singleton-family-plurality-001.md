# `repair` and `beam` hold the vast majority of singleton-exclusive claims by count; DFS holds almost none

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — technique family of the sole `solvingActions` entry for all 175 `singleton===true` levels in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** of 175 singletons, `repair` holds 81 (46.3%), `beam` holds 67 (38.3%), `admissible-order` holds 22 (12.6%), and `dfs` holds only 5 (2.9%). This is a count-based complement to the already-reported *rate*-based finding that DFS-singleton claims lose support roughly 2x as fast as beam's on refresh (`2026-09-04-singleton-fragility-by-technique-family-001.md`): DFS's fragility rate is high, but DFS accounts for a small share of total singleton exposure, while `repair` and `beam` — together 84.6% of all singletons — carry most of the actual re-verification burden by volume, even though neither was flagged as the highest-risk family by rate.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — a count-based companion fact to the existing rate-based family-fragility finding
> **Selection:** whole singleton population (175 levels), not a sample

## Method

For each `singleton===true` level, took the technique family (`admissible-order`/`beam`/`repair`/`dfs`) of its single `solvingActions` entry and tabulated.

## Result

| family | singleton count | share |
|---|---:|---:|
| `repair` | 81 | 46.3% |
| `beam` | 67 | 38.3% |
| `admissible-order` | 22 | 12.6% |
| `dfs` | 5 | 2.9% |

## Interpretation

Combining this with the existing fragility-rate finding gives a fuller risk picture than rate alone: DFS-singleton claims are the most *individually* fragile (highest per-claim loss rate on refresh), but there are so few of them (5/175, 2.9%) that DFS contributes little to the *total* re-verification workload or total expected loss in absolute terms. `repair` and `beam` are comparatively more stable per-claim, but because they hold 84.6% of all singleton exposure between them, they still account for the bulk of any aggregate singleton-support loss across a census refresh. A prioritization scheme built only on the existing per-family fragility *rate* would under-invest in re-verifying `repair`/`beam` singletons relative to their share of total exposure; one built on this report's counts alone would ignore DFS's disproportionate per-claim risk. Both figures are needed together.

## What this does not establish

- Does not recompute expected total loss (rate × count) as a single combined risk score — left as an easy follow-up if a single prioritization number is wanted.
- Single census snapshot (2026-09-03); counts by family could themselves shift on a future refresh.
