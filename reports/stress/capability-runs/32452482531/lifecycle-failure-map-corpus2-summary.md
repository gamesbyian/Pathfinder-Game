# Lifecycle failure map

Sources: reports/stress/benchmark-latest-random.json

Population: 1700 levels — 861 solved, 839 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 861 | 50.6% | 13,824,440,913 | 21,037,135,968 | 14 |
| starved | 647 | 38.1% | 85,957,029,251 | 98,357,018,850 | 16 |
| capped | 192 | 11.3% | 20,919,984,565 | 17,468,512,455 | 29 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 568 | 568 | 0 | 0 | 271 | 0 | 3.2% | 10.5% |
| main-ladder | 839 | 839 | 0 | 0 | 0 | 0 | 25.4% | 21.0% |
| repair-fallback | 568 | 79 | 489 | 0 | 271 | 0 | 0.2% | 0.7% |
| attraction-diversity | 839 | 192 | 647 | 0 | 0 | 0 | 0.6% | 0.3% |
| admissible-order | 839 | 839 | 0 | 19 | 0 | 0 | 9.8% | 11.0% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 489 |
| attraction-diversity | 139 |
| attraction-diversity+admissible-order | 19 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=156,054 p25=737,024 p50=6,249,329 p75=32,119,083 p90=50,211,255 p95=62,514,860
Max: 143,053,437
Solves costing >50% of budget: 245
Solves costing >75% of budget: 136
Solves costing >90% of budget: 94

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

