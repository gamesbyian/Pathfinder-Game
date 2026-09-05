# Routing regime does not meaningfully predict late-ladder-stage reliance

> **Status:** concluded-negative
> **Last evidence:** 2026-09-04 — join of `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `features.routingRegime` against `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`'s per-level `winningTechnique` (1,700-level population), no new dispatch
> **Decision:** grouping every corpus2 level by its census-recorded `routingRegime` and checking how often a late-ladder retry stage (`admissible-order-alternate-tiebreak-retry`, `coarse-state-near-tie-retention-disabled-retry`, `connectivity-axis-prune-disabled-retry`, `must-cross-neighbor-prune-disabled-retry`, `guidance-goal-distance-retry`) wins, the rate is flat and unremarkable across three of the four regimes (`intersection-heavy` 5.07%, `multi-portal` 5.66%, `must-cross-heavy` 5.75%, all n≥159) with only `general` (1.54%, n=65) sitting noticeably lower. This is a clean negative: routing regime is not a useful predictor of which levels need the expensive late-ladder machinery, at least not through this coarse a lens.
> **Remaining gate:** none — this closes the specific hypothesis tested, using already-collected data.
> **Evidence role:** discovery — a natural question given this session's heavy focus on late-ladder-tier cost, tested with an already-available structural feature
> **Selection:** whole population, not a sample; the hypothesis (does routing regime predict late-stage reliance) was formed before inspecting the result, the specific regime groupings are the census's own pre-existing categorical field

## Result

| routing regime | n | late-ladder-stage wins | rate |
|---|---:|---:|---:|
| `intersection-heavy` | 1,302 | 66 | 5.07% |
| `multi-portal` | 159 | 9 | 5.66% |
| `must-cross-heavy` | 174 | 10 | 5.75% |
| `general` | 65 | 1 | 1.54% |

## Interpretation

Three of four regimes cluster tightly around 5-5.75%, which is not a meaningful spread relative to their sample sizes — routing regime alone does not identify which levels will need late-ladder rescue. `general`'s lower rate (1.54%, n=65) is the only regime that stands out, but the sample is thin enough (1 event) that this should be read as suggestive at most, not a real effect. This rules out one candidate structural predictor for "which levels are expensive to solve," narrowing (slightly) the search space for anyone pursuing a structural early-warning signal for late-ladder cost, without needing to spend new dispatch to find that out.

## What this does not establish

- Does not test finer-grained structural features (the individual counts — `portals`, `mustCross`, `constrainedObjects`, etc. — rather than the coarse `routingRegime` bucket) as predictors; a continuous-feature version of this question remains open.
- Single production run.
