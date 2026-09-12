# Lifecycle failure map

Sources: reports/stress/solver-corpus2-latest.json

Population: 1700 levels — 1048 solved, 652 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 1048 | 61.6% | 26,112,466,721 | 37,708,387,557 | 13 |
| capped | 602 | 35.4% | 112,240,127,180 | 143,415,961,642 | 12 |
| starved | 50 | 2.9% | 11,250,006,657 | 9,756,854,474 | 16 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| early-repair-search | 470 | 470 | 0 | 0 | 182 | 0 | 2.3% | 6.7% |
| main-ladder | 652 | 652 | 0 | 0 | 0 | 0 | 15.7% | 12.9% |
| repair-fallback | 470 | 420 | 50 | 0 | 182 | 0 | 1.1% | 3.3% |
| goal-attraction-disabled-retry | 652 | 652 | 0 | 0 | 0 | 0 | 0.7% | 2.4% |
| admissible-order-fallback | 652 | 652 | 0 | 0 | 0 | 0 | 6.6% | 6.3% |
| coarse-state-near-tie-retention-disabled-retry | 652 | 652 | 0 | 0 | 0 | 0 | 6.6% | 6.4% |
| admissible-order-alternate-tiebreak-retry | 652 | 652 | 0 | 0 | 0 | 0 | 6.6% | 6.5% |
| connectivity-axis-prune-disabled-retry | 652 | 652 | 0 | 0 | 0 | 0 | 13.2% | 10.1% |
| repair-elite-prefix-dfs-retry | 470 | 0 | 0 | 0 | 652 | 0 | 0.0% | 0.0% |
| must-cross-neighbor-prune-disabled-retry | 652 | 372 | 0 | 0 | 280 | 0 | 12.7% | 9.9% |
| late-repair-search | 182 | 182 | 0 | 0 | 470 | 0 | 0.7% | 2.0% |
| guidance-goal-distance-retry | 652 | 652 | 0 | 0 | 0 | 0 | 28.6% | 19.4% |
| late-repair-multiseed-retry | 182 | 182 | 0 | 0 | 470 | 0 | 5.2% | 14.2% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback | 50 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=170,866 p25=1,617,340 p50=7,027,462 p75=33,672,394 p90=62,500,208 p95=103,483,901
Max: 260,099,808
Solves costing >50% of budget: 382
Solves costing >75% of budget: 166
Solves costing >90% of budget: 131

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

