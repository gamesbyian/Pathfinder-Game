# Lifecycle failure map

Sources: reports/stress/benchmark-parallel.json

Population: 102 levels — 94 solved, 8 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 94 | 92.2% | 404,865,731 | 708,028,801 | 11 |
| starved | 8 | 7.8% | 400,001,030 | 515,822,543 | 13 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 7 | 7 | 0 | 0 | 1 | 0 | 10.3% | 27.4% |
| main-ladder | 8 | 8 | 0 | 0 | 0 | 0 | 64.7% | 44.2% |
| repair-fallback | 7 | 0 | 7 | 0 | 1 | 0 | 0.0% | 0.0% |
| attraction-diversity | 8 | 0 | 8 | 0 | 0 | 0 | 0.0% | 0.0% |
| admissible-order | 8 | 8 | 0 | 0 | 0 | 0 | 25.0% | 28.3% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 7 |
| attraction-diversity | 1 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=46,210 p25=175,706 p50=683,422 p75=4,240,829 p90=10,379,599 p95=19,940,411
Max: 38,997,321
Solves costing >50% of budget: 4
Solves costing >75% of budget: 1
Solves costing >90% of budget: 0

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

