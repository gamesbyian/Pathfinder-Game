# Lifecycle failure map

Sources: reports/stress/benchmark-latest-random.json

Population: 1700 levels — 828 solved, 872 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 828 | 48.7% | 13,560,160,427 | 20,411,043,980 | 13 |
| starved | 782 | 46.0% | 100,156,845,081 | 109,978,204,971 | 17 |
| capped | 90 | 5.3% | 10,058,771,196 | 7,949,478,077 | 33 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 558 | 558 | 0 | 0 | 314 | 0 | 3.1% | 10.4% |
| main-ladder | 872 | 872 | 0 | 0 | 0 | 0 | 76.7% | 66.2% |
| repair-fallback | 558 | 78 | 480 | 18 | 314 | 0 | 0.1% | 0.4% |
| attraction-diversity | 872 | 90 | 782 | 0 | 0 | 0 | 0.2% | 0.1% |
| admissible-order | 872 | 872 | 0 | 0 | 0 | 0 | 19.9% | 22.9% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 498 |
| attraction-diversity | 284 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=132,944 p25=596,894 p50=5,045,630 p75=31,454,054 p90=50,539,413 p95=63,011,527
Max: 143,053,266
Solves costing >50% of budget: 215
Solves costing >75% of budget: 165
Solves costing >90% of budget: 117

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

