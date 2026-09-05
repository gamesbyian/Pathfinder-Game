# Starvation patterns with more co-starved techniques carry proportionally higher mustCross/requiredIntersections/turnConstraintLoad

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — mean `mustCross`/`requiredIntersections`/`turnConstraintLoad` for the three most common starvation patterns among corpus2's 605 `starved` levels in `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json`, joined against `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** the three most common starvation patterns show a graded structural signature that tracks how many techniques the pattern names: `goal-attraction-disabled-retry` alone (n=392, the plurality pattern) has the lowest load (mustCross 3.08, requiredIntersections 6.54, turnConstraintLoad 16.86); `admissible-order-fallback+goal-attraction-disabled-retry` (n=156) is higher on all three (4.69, 7.72, 19.00); `goal-attraction-disabled-retry+repair-fallback` (n=57) is highest on two of three (4.84, 4.96, 19.42).
> **Remaining gate:** none — descriptive characterization extending `2026-09-04-starvation-pattern-combinatorics-at-scale-001.md` with structural context per pattern rather than just pattern frequency.
> **Evidence role:** discovery — the existing starvation-pattern report counted pattern frequency; this checks whether patterns differ structurally
> **Selection:** the three most common patterns (605 of 605 starved levels fall into one of many patterns; these three cover the plurality), not an exhaustive pattern-by-pattern breakdown

## Method

Grouped `starved` corpus2 levels by their exact `starvedTechniques` combination (sorted, joined), took the three most frequent patterns, and computed mean structural features for each via the census join.

## Result

| starvation pattern | n | mean `mustCross` | mean `requiredIntersections` | mean `turnConstraintLoad` |
|---|---:|---:|---:|---:|
| `goal-attraction-disabled-retry` (alone) | 392 | 3.08 | 6.54 | 16.86 |
| `admissible-order-fallback` + `goal-attraction-disabled-retry` | 156 | 4.69 | 7.72 | 19.00 |
| `goal-attraction-disabled-retry` + `repair-fallback` | 57 | 4.84 | 4.96 | 19.42 |

## Interpretation

This is a small but coherent gradient: levels whose ladder starves out two named techniques rather than one tend to carry more `mustCross` and `turnConstraintLoad` load than the single-technique-starvation pattern, consistent with the interpretation already established in `2026-09-04-starved-vs-capped-structural-signature-001.md` that this constraint load is what drives ladder starvation in the first place — more of it apparently costs the level more than one stage's worth of exposure, not just the first. This is a useful refinement for any future Workstream 1 work using starvation-pattern identity as an input: pattern richness (how many techniques starve) is itself a rough proxy for constraint-load severity, not just an arbitrary combinatorial label.

## What this does not establish

- Only the top 3 (of many) patterns were checked; a full pattern-by-pattern regression against structural load was not attempted.
- Correlational, not causal.
- Corpus2 only; corpus1 has too few starved levels (n=4, all one pattern) for a comparable breakdown.
