# Lifecycle failure map

Sources: reports/stress/benchmark-parallel.json

Population: 102 levels — 98 solved, 4 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 98 | 96.1% | 750,284,924 | 1,067,016,714 | 11 |
| starved | 4 | 3.9% | 550,000,647 | 599,740,777 | 7 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 4 | 4 | 0 | 0 | 0 | 0 | 4.4% | 14.4% |
| main-ladder | 4 | 4 | 0 | 0 | 0 | 0 | 22.9% | 18.7% |
| repair-fallback | 4 | 0 | 4 | 0 | 0 | 0 | 0.0% | 0.0% |
| attraction-diversity | 4 | 0 | 4 | 0 | 0 | 0 | 0.0% | 0.0% |
| admissible-order | 4 | 4 | 0 | 0 | 0 | 0 | 9.1% | 9.7% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 4 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=41,384 p25=171,182 p50=1,101,393 p75=4,713,563 p90=32,312,145 p95=38,130,058
Max: 63,044,846
Solves costing >50% of budget: 13
Solves costing >75% of budget: 6
Solves costing >90% of budget: 3

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

