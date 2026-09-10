# Lifecycle failure map

Sources: reports/stress/solver-corpus2-latest.json

Population: 1700 levels — 1029 solved, 671 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 1029 | 60.5% | 26,017,772,875 | 37,350,485,805 | 13 |
| starved | 551 | 32.4% | 103,120,195,076 | 122,182,726,670 | 15 |
| capped | 120 | 7.1% | 23,770,758,736 | 32,531,540,696 | 6 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| early-repair-search | 487 | 487 | 0 | 0 | 184 | 0 | 2.3% | 6.8% |
| main-ladder | 671 | 671 | 0 | 0 | 0 | 0 | 16.0% | 13.3% |
| repair-fallback | 487 | 436 | 51 | 0 | 184 | 0 | 1.2% | 3.8% |
| goal-attraction-disabled-retry | 671 | 120 | 551 | 0 | 0 | 0 | 0.3% | 0.3% |
| admissible-order-fallback | 671 | 671 | 0 | 169 | 0 | 0 | 6.6% | 6.5% |
| coarse-state-near-tie-retention-disabled-retry | 671 | 671 | 0 | 0 | 0 | 0 | 6.6% | 6.6% |
| admissible-order-alternate-tiebreak-retry | 671 | 671 | 0 | 0 | 0 | 0 | 6.6% | 6.6% |
| connectivity-axis-prune-disabled-retry | 671 | 671 | 0 | 0 | 0 | 0 | 13.2% | 10.3% |
| repair-elite-prefix-dfs-retry | 487 | 0 | 0 | 0 | 671 | 0 | 0.0% | 0.0% |
| must-cross-neighbor-prune-disabled-retry | 671 | 381 | 0 | 0 | 290 | 0 | 12.7% | 9.9% |
| late-repair-search | 184 | 184 | 0 | 0 | 487 | 0 | 0.7% | 2.0% |
| guidance-goal-distance-retry | 671 | 671 | 0 | 0 | 0 | 0 | 28.7% | 19.8% |
| late-repair-multiseed-retry | 184 | 184 | 0 | 0 | 487 | 0 | 5.1% | 14.2% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| goal-attraction-disabled-retry | 331 |
| goal-attraction-disabled-retry+admissible-order-fallback | 169 |
| repair-fallback+goal-attraction-disabled-retry | 51 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=171,033 p25=1,690,541 p50=7,001,967 p75=33,654,813 p90=62,729,330 p95=103,459,610
Max: 260,099,808
Solves costing >50% of budget: 370
Solves costing >75% of budget: 192
Solves costing >90% of budget: 153

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

