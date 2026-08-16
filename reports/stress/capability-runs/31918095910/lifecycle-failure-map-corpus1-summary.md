# Lifecycle failure map

Sources: reports/stress/benchmark-parallel.json

Population: 102 levels — 95 solved, 7 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 95 | 93.1% | 411,818,713 | 737,193,638 | 11 |
| starved | 7 | 6.9% | 700,000,852 | 851,086,310 | 13 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 6 | 6 | 0 | 0 | 1 | 0 | 5.0% | 13.8% |
| main-ladder | 7 | 7 | 0 | 0 | 0 | 0 | 70.0% | 56.8% |
| repair-fallback | 6 | 0 | 6 | 0 | 1 | 0 | 0.0% | 0.0% |
| attraction-diversity | 7 | 0 | 7 | 0 | 0 | 0 | 0.0% | 0.0% |
| admissible-order | 7 | 7 | 0 | 0 | 0 | 0 | 25.0% | 29.4% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 6 |
| attraction-diversity | 1 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=49,994 p25=185,251 p50=689,809 p75=4,243,561 p90=10,379,599 p95=19,940,411
Max: 38,997,321
Solves costing >50% of budget: 4
Solves costing >75% of budget: 1
Solves costing >90% of budget: 0

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

