# Lifecycle failure map

Sources: reports/stress/solver-corpus2-latest.json

Population: 1700 levels — 975 solved, 725 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 975 | 57.4% | 25,834,987,693 | 35,756,396,460 | 14 |
| starved | 605 | 35.6% | 114,575,347,946 | 133,620,218,633 | 14 |
| capped | 120 | 7.1% | 23,783,327,243 | 32,504,834,992 | 6 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| early-repair-search | 538 | 538 | 0 | 0 | 187 | 0 | 2.3% | 6.9% |
| main-ladder | 725 | 725 | 0 | 0 | 0 | 0 | 15.9% | 13.3% |
| repair-fallback | 538 | 481 | 57 | 0 | 187 | 0 | 1.2% | 3.6% |
| goal-attraction-disabled-retry | 725 | 120 | 605 | 0 | 0 | 0 | 0.2% | 0.3% |
| admissible-order-fallback | 725 | 725 | 0 | 156 | 0 | 0 | 6.6% | 6.5% |
| coarse-state-near-tie-retention-disabled-retry | 725 | 725 | 0 | 0 | 0 | 0 | 6.5% | 6.6% |
| admissible-order-alternate-tiebreak-retry | 725 | 725 | 0 | 0 | 0 | 0 | 6.6% | 6.7% |
| connectivity-axis-prune-disabled-retry | 725 | 725 | 0 | 0 | 0 | 0 | 13.1% | 10.3% |
| repair-elite-prefix-dfs-retry | 538 | 0 | 0 | 0 | 725 | 0 | 0.0% | 0.0% |
| must-cross-neighbor-prune-disabled-retry | 725 | 435 | 0 | 0 | 290 | 0 | 13.3% | 10.6% |
| late-repair-search | 187 | 187 | 0 | 0 | 538 | 0 | 0.7% | 1.9% |
| guidance-goal-distance-retry | 0 | 725 | 0 | 0 | 0 | 0 | 28.9% | 20.1% |
| late-repair-multiseed-retry | 0 | 187 | 0 | 0 | 538 | 0 | 4.7% | 13.3% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| goal-attraction-disabled-retry | 392 |
| goal-attraction-disabled-retry+admissible-order-fallback | 156 |
| repair-fallback+goal-attraction-disabled-retry | 57 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=171,033 p25=1,453,174 p50=7,019,296 p75=34,109,380 p90=62,517,775 p95=137,643,994
Max: 260,099,665
Solves costing >50% of budget: 367
Solves costing >75% of budget: 190
Solves costing >90% of budget: 150

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

