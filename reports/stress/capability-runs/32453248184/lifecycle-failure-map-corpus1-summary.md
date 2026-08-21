# Lifecycle failure map

Sources: reports/stress/benchmark-parallel.json

Population: 102 levels — 96 solved, 6 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 96 | 94.1% | 529,621,568 | 921,348,141 | 11 |
| starved | 6 | 5.9% | 850,000,841 | 880,555,381 | 13 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 6 | 6 | 0 | 0 | 0 | 0 | 4.1% | 13.4% |
| main-ladder | 6 | 6 | 0 | 0 | 0 | 0 | 22.4% | 18.6% |
| repair-fallback | 6 | 0 | 6 | 0 | 0 | 0 | 0.0% | 0.0% |
| attraction-diversity | 6 | 0 | 6 | 0 | 0 | 0 | 0.0% | 0.0% |
| admissible-order | 6 | 6 | 0 | 0 | 0 | 0 | 8.8% | 9.7% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 6 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=49,994 p25=185,251 p50=689,809 p75=4,395,702 p90=15,065,275 p95=32,069,318
Max: 100,199,475
Solves costing >50% of budget: 6
Solves costing >75% of budget: 1
Solves costing >90% of budget: 1

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

