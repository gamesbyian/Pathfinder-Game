# Lifecycle failure map

Sources: reports/stress/benchmark-parallel.json

Population: 102 levels — 93 solved, 9 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 93 | 91.2% | 315,609,579 | 667,596,089 | 11 |
| starved | 9 | 8.8% | 450,000,943 | 511,977,748 | 14 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 6 | 6 | 0 | 0 | 3 | 0 | 7.7% | 23.0% |
| main-ladder | 9 | 9 | 0 | 0 | 0 | 0 | 92.3% | 77.0% |
| repair-fallback | 6 | 0 | 6 | 0 | 3 | 0 | 0.0% | 0.0% |
| attraction-diversity | 9 | 0 | 9 | 0 | 0 | 0 | 0.0% | 0.0% |
| admissible-order | 9 | 0 | 9 | 0 | 0 | 0 | 0.0% | 0.0% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity+admissible-order | 6 |
| attraction-diversity+admissible-order | 3 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=49,994 p25=185,251 p50=683,422 p75=4,240,829 p90=9,203,505 p95=17,329,361
Max: 23,253,102
Solves costing >50% of budget: 0
Solves costing >75% of budget: 0
Solves costing >90% of budget: 0

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

