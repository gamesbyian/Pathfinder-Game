# Lifecycle failure map

Sources: reports/stress/solver-corpus1-latest.json

Population: 102 levels — 101 solved, 1 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 101 | 99.0% | 938,496,201 | 1,331,383,151 | 11 |
| capped | 1 | 1.0% | 190,162,585 | 201,046,776 | 21 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| early-repair-search | 1 | 1 | 0 | 0 | 0 | 0 | 3.2% | 11.5% |
| main-ladder | 1 | 1 | 0 | 0 | 0 | 0 | 15.6% | 13.4% |
| repair-fallback | 1 | 1 | 0 | 0 | 0 | 0 | 0.4% | 1.5% |
| goal-attraction-disabled-retry | 1 | 1 | 0 | 0 | 0 | 0 | 0.4% | 3.1% |
| admissible-order-fallback | 1 | 1 | 0 | 0 | 0 | 0 | 6.6% | 7.0% |
| coarse-state-near-tie-retention-disabled-retry | 1 | 1 | 0 | 0 | 0 | 0 | 6.6% | 7.1% |
| admissible-order-alternate-tiebreak-retry | 1 | 1 | 0 | 0 | 0 | 0 | 6.6% | 7.8% |
| connectivity-axis-prune-disabled-retry | 1 | 1 | 0 | 0 | 0 | 0 | 13.1% | 11.5% |
| repair-elite-prefix-dfs-retry | 1 | 0 | 0 | 0 | 1 | 0 | 0.0% | 0.0% |
| must-cross-neighbor-prune-disabled-retry | 1 | 0 | 0 | 0 | 1 | 0 | 0.0% | 0.0% |
| late-repair-search | 0 | 0 | 0 | 0 | 1 | 0 | 0.0% | 0.0% |
| late-repair-must-turn-biased-retry | 0 | 0 | 0 | 0 | 1 | 0 | 0.0% | 0.0% |
| guidance-goal-distance-retry | 1 | 1 | 0 | 0 | 0 | 0 | 26.3% | 19.8% |
| late-repair-multiseed-retry | 0 | 0 | 0 | 0 | 1 | 0 | 0.0% | 0.0% |
| portal-coarse-state-merge-dead-last-retry | 1 | 1 | 0 | 0 | 0 | 0 | 21.1% | 17.4% |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=41,384 p25=128,047 p50=875,586 p75=4,730,766 p90=33,096,366 p95=35,025,783
Max: 220,437,949
Solves costing >50% of budget: 15
Solves costing >75% of budget: 3
Solves costing >90% of budget: 2

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

