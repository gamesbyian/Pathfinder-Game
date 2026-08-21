# Lifecycle failure map

Sources: reports/stress/benchmark-latest-random.json

Population: 1700 levels — 881 solved, 819 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 881 | 51.8% | 16,518,555,445 | 23,338,500,709 | 14 |
| starved | 638 | 37.5% | 85,016,816,256 | 97,575,389,747 | 14 |
| capped | 181 | 10.6% | 19,752,608,552 | 17,478,175,300 | 14 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 558 | 558 | 0 | 0 | 261 | 0 | 3.3% | 10.6% |
| main-ladder | 819 | 819 | 0 | 0 | 0 | 0 | 25.2% | 20.5% |
| repair-fallback | 558 | 78 | 480 | 0 | 261 | 0 | 0.2% | 0.8% |
| attraction-diversity | 819 | 181 | 638 | 0 | 0 | 0 | 0.6% | 0.3% |
| admissible-order | 819 | 819 | 0 | 18 | 0 | 0 | 9.8% | 10.7% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 480 |
| attraction-diversity | 140 |
| attraction-diversity+admissible-order | 18 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=140,455 p25=769,540 p50=6,383,384 p75=32,377,741 p90=50,680,345 p95=66,858,878
Max: 151,555,475
Solves costing >50% of budget: 267
Solves costing >75% of budget: 161
Solves costing >90% of budget: 124

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

