# Lifecycle failure map

Sources: reports/stress/benchmark-latest-random.json

Population: 1700 levels — 764 solved, 936 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| starved | 830 | 48.8% | 51,875,106,659 | 62,646,877,814 | 17 |
| solved | 764 | 44.9% | 8,743,289,266 | 15,170,074,683 | 13 |
| capped | 106 | 6.2% | 6,625,012,818 | 5,284,082,631 | 33 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 578 | 578 | 0 | 0 | 358 | 0 | 6.1% | 18.6% |
| main-ladder | 936 | 936 | 0 | 0 | 0 | 0 | 73.0% | 58.8% |
| repair-fallback | 578 | 82 | 496 | 21 | 358 | 0 | 0.3% | 0.8% |
| attraction-diversity | 936 | 106 | 830 | 0 | 0 | 0 | 0.4% | 0.2% |
| admissible-order | 936 | 936 | 0 | 21 | 0 | 0 | 20.2% | 21.6% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 496 |
| attraction-diversity | 313 |
| repair-fallback+attraction-diversity+admissible-order | 21 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=125,083 p25=395,826 p50=4,518,623 p75=10,354,895 p90=38,031,923 p95=50,151,344
Max: 60,827,362
Solves costing >50% of budget: 151
Solves costing >75% of budget: 101
Solves costing >90% of budget: 53

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

