# Lifecycle failure map

Sources: reports/stress/benchmark-parallel.json

Population: 102 levels — 95 solved, 7 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 95 | 93.1% | 429,422,093 | 752,179,812 | 11 |
| starved | 7 | 6.9% | 950,000,883 | 1,048,681,505 | 13 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 6 | 6 | 0 | 0 | 1 | 0 | 3.7% | 11.2% |
| main-ladder | 7 | 7 | 0 | 0 | 0 | 0 | 24.0% | 19.6% |
| repair-fallback | 6 | 0 | 6 | 0 | 1 | 0 | 0.0% | 0.0% |
| attraction-diversity | 7 | 0 | 7 | 0 | 0 | 0 | 0.0% | 0.0% |
| admissible-order | 7 | 7 | 0 | 0 | 0 | 0 | 9.2% | 12.6% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 6 |
| attraction-diversity | 1 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=49,994 p25=185,251 p50=689,809 p75=4,291,656 p90=10,421,034 p95=22,524,336
Max: 34,815,598
Solves costing >50% of budget: 5
Solves costing >75% of budget: 0
Solves costing >90% of budget: 0

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

