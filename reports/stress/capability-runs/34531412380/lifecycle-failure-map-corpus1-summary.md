# Lifecycle failure map

Sources: reports/stress/solver-corpus1-latest.json

Population: 102 levels — 99 solved, 3 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 99 | 97.1% | 695,820,485 | 1,035,496,411 | 11 |
| starved | 3 | 2.9% | 534,247,908 | 579,894,169 | 21 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| early-repair-search | 3 | 3 | 0 | 0 | 0 | 0 | 3.8% | 12.5% |
| main-ladder | 3 | 3 | 0 | 0 | 0 | 0 | 15.8% | 14.1% |
| repair-fallback | 3 | 3 | 0 | 0 | 0 | 0 | 1.5% | 4.9% |
| goal-attraction-disabled-retry | 3 | 0 | 3 | 0 | 0 | 0 | 0.0% | 0.0% |
| admissible-order-fallback | 3 | 3 | 0 | 0 | 0 | 0 | 7.0% | 7.6% |
| coarse-state-near-tie-retention-disabled-retry | 3 | 3 | 0 | 0 | 0 | 0 | 7.0% | 7.0% |
| admissible-order-alternate-tiebreak-retry | 3 | 3 | 0 | 0 | 0 | 0 | 7.0% | 7.7% |
| connectivity-axis-prune-disabled-retry | 3 | 3 | 0 | 0 | 0 | 0 | 14.0% | 11.3% |
| repair-elite-prefix-dfs-retry | 3 | 0 | 0 | 0 | 3 | 0 | 0.0% | 0.0% |
| must-cross-neighbor-prune-disabled-retry | 3 | 2 | 0 | 0 | 1 | 0 | 13.4% | 11.6% |
| late-repair-search | 0 | 0 | 0 | 0 | 3 | 0 | 0.0% | 0.0% |
| guidance-goal-distance-retry | 3 | 3 | 0 | 0 | 0 | 0 | 30.4% | 23.3% |
| late-repair-multiseed-retry | 0 | 0 | 0 | 0 | 3 | 0 | 0.0% | 0.0% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| goal-attraction-disabled-retry | 3 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=32,884 p25=127,096 p50=856,792 p75=4,474,346 p90=32,002,893 p95=35,440,939
Max: 63,044,925
Solves costing >50% of budget: 13
Solves costing >75% of budget: 3
Solves costing >90% of budget: 2

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

