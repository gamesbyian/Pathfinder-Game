# Lifecycle failure map

Sources: reports/stress/benchmark-latest-random.json

Population: 1700 levels — 707 solved, 993 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| starved | 993 | 58.4% | 49,650,128,290 | 56,994,678,562 | 19 |
| solved | 707 | 41.6% | 5,165,381,386 | 11,749,672,330 | 12 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 592 | 592 | 0 | 0 | 401 | 0 | 7.3% | 22.6% |
| main-ladder | 993 | 993 | 0 | 0 | 0 | 0 | 92.2% | 76.7% |
| repair-fallback | 592 | 64 | 528 | 3 | 401 | 0 | 0.2% | 0.6% |
| attraction-diversity | 993 | 110 | 883 | 0 | 0 | 0 | 0.3% | 0.2% |
| admissible-order | 993 | 0 | 993 | 0 | 0 | 0 | 0.0% | 0.0% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity+admissible-order | 531 |
| attraction-diversity+admissible-order | 352 |
| admissible-order | 110 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=112,108 p25=349,234 p50=4,322,423 p75=8,000,447 p90=23,402,646 p95=25,579,767
Max: 49,529,341
Solves costing >50% of budget: 59
Solves costing >75% of budget: 14
Solves costing >90% of budget: 8

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

