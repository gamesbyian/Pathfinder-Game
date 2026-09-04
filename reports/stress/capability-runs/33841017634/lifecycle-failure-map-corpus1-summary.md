# Lifecycle failure map

Sources: reports/stress/solver-corpus1-latest.json

Population: 102 levels — 98 solved, 4 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 98 | 96.1% | 701,933,385 | 1,045,963,848 | 11 |
| starved | 4 | 3.9% | 737,279,465 | 827,287,525 | 7 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| early-repair-search | 4 | 4 | 0 | 0 | 0 | 0 | 3.3% | 10.4% |
| main-ladder | 4 | 4 | 0 | 0 | 0 | 0 | 15.8% | 14.8% |
| repair-fallback | 4 | 4 | 0 | 0 | 0 | 0 | 1.2% | 4.0% |
| goal-attraction-disabled-retry | 4 | 0 | 4 | 0 | 0 | 0 | 0.0% | 0.0% |
| admissible-order-fallback | 4 | 4 | 0 | 0 | 0 | 0 | 6.8% | 7.0% |
| coarse-state-near-tie-retention-disabled-retry | 4 | 4 | 0 | 0 | 0 | 0 | 6.8% | 7.6% |
| admissible-order-alternate-tiebreak-retry | 4 | 4 | 0 | 0 | 0 | 0 | 6.8% | 7.2% |
| connectivity-axis-prune-disabled-retry | 4 | 4 | 0 | 0 | 0 | 0 | 13.6% | 11.6% |
| repair-elite-prefix-dfs-retry | 4 | 0 | 0 | 0 | 4 | 0 | 0.0% | 0.0% |
| must-cross-neighbor-prune-disabled-retry | 4 | 3 | 0 | 0 | 1 | 0 | 15.5% | 13.8% |
| late-repair-search | 0 | 0 | 0 | 0 | 4 | 0 | 0.0% | 0.0% |
| guidance-goal-distance-retry | 0 | 4 | 0 | 0 | 0 | 0 | 30.2% | 23.6% |
| late-repair-multiseed-retry | 0 | 0 | 0 | 0 | 4 | 0 | 0.0% | 0.0% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| goal-attraction-disabled-retry | 4 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=41,384 p25=171,182 p50=1,101,393 p75=4,713,563 p90=32,002,893 p95=35,440,939
Max: 63,045,064
Solves costing >50% of budget: 13
Solves costing >75% of budget: 3
Solves costing >90% of budget: 2

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

