# Lifecycle failure map

Sources: reports/stress/benchmark-latest-random.json

Population: 1700 levels — 863 solved, 837 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 863 | 50.8% | 14,338,807,469 | 21,105,663,021 | 14 |
| starved | 647 | 38.1% | 85,906,827,141 | 98,250,787,216 | 16 |
| capped | 190 | 11.2% | 20,506,828,033 | 17,249,500,118 | 29 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 558 | 558 | 0 | 0 | 279 | 0 | 3.2% | 10.6% |
| main-ladder | 837 | 837 | 0 | 0 | 0 | 0 | 25.4% | 20.9% |
| repair-fallback | 558 | 78 | 480 | 0 | 279 | 0 | 0.2% | 0.8% |
| attraction-diversity | 837 | 190 | 647 | 0 | 0 | 0 | 0.7% | 0.3% |
| admissible-order | 837 | 837 | 0 | 18 | 0 | 0 | 9.8% | 10.9% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 480 |
| attraction-diversity | 149 |
| attraction-diversity+admissible-order | 18 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=138,935 p25=715,783 p50=6,249,453 p75=32,174,778 p90=50,329,631 p95=62,716,024
Max: 143,053,266
Solves costing >50% of budget: 249
Solves costing >75% of budget: 143
Solves costing >90% of budget: 106

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

