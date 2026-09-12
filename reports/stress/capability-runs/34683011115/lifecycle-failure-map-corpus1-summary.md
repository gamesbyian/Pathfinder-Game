# Lifecycle failure map

Sources: reports/stress/solver-corpus1-latest.json

Population: 102 levels — 100 solved, 2 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 100 | 98.0% | 718,058,252 | 1,090,931,613 | 11 |
| capped | 2 | 2.0% | 369,900,445 | 400,660,763 | 5 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| early-repair-search | 2 | 2 | 0 | 0 | 0 | 0 | 4.4% | 14.5% |
| main-ladder | 2 | 2 | 0 | 0 | 0 | 0 | 15.1% | 12.9% |
| repair-fallback | 2 | 2 | 0 | 0 | 0 | 0 | 0.4% | 1.3% |
| goal-attraction-disabled-retry | 2 | 2 | 0 | 0 | 0 | 0 | 0.5% | 3.3% |
| admissible-order-fallback | 2 | 2 | 0 | 0 | 0 | 0 | 6.8% | 7.5% |
| coarse-state-near-tie-retention-disabled-retry | 2 | 2 | 0 | 0 | 0 | 0 | 6.8% | 7.1% |
| admissible-order-alternate-tiebreak-retry | 2 | 2 | 0 | 0 | 0 | 0 | 6.8% | 7.7% |
| connectivity-axis-prune-disabled-retry | 2 | 2 | 0 | 0 | 0 | 0 | 13.5% | 11.3% |
| repair-elite-prefix-dfs-retry | 2 | 0 | 0 | 0 | 2 | 0 | 0.0% | 0.0% |
| must-cross-neighbor-prune-disabled-retry | 2 | 1 | 0 | 0 | 1 | 0 | 12.4% | 9.9% |
| late-repair-search | 0 | 0 | 0 | 0 | 2 | 0 | 0.0% | 0.0% |
| guidance-goal-distance-retry | 2 | 2 | 0 | 0 | 0 | 0 | 33.5% | 24.5% |
| late-repair-multiseed-retry | 0 | 0 | 0 | 0 | 2 | 0 | 0.0% | 0.0% |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=32,884 p25=127,096 p50=856,792 p75=4,474,346 p90=33,060,839 p95=34,998,172
Max: 63,045,005
Solves costing >50% of budget: 14
Solves costing >75% of budget: 2
Solves costing >90% of budget: 1

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

