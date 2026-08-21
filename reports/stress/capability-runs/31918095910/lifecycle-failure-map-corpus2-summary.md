# Lifecycle failure map

Sources: reports/stress/benchmark-latest-random.json

Population: 1700 levels — 819 solved, 881 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 819 | 48.2% | 12,507,213,106 | 19,225,382,892 | 14 |
| starved | 789 | 46.4% | 78,900,100,188 | 92,093,837,729 | 17 |
| capped | 92 | 5.4% | 9,200,012,635 | 7,404,785,776 | 33 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 564 | 564 | 0 | 0 | 317 | 0 | 3.9% | 12.4% |
| main-ladder | 881 | 881 | 0 | 0 | 0 | 0 | 70.5% | 59.4% |
| repair-fallback | 564 | 81 | 483 | 20 | 317 | 0 | 0.2% | 0.5% |
| attraction-diversity | 881 | 92 | 789 | 0 | 0 | 0 | 0.2% | 0.1% |
| admissible-order | 881 | 881 | 0 | 0 | 0 | 0 | 25.1% | 27.5% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 503 |
| attraction-diversity | 286 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=132,282 p25=578,741 p50=4,946,269 p75=25,155,713 p90=50,441,501 p95=62,716,024
Max: 96,382,454
Solves costing >50% of budget: 206
Solves costing >75% of budget: 156
Solves costing >90% of budget: 108

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

