# Lifecycle failure map

Sources: reports/stress/benchmark-latest-random.json

Population: 1700 levels — 731 solved, 969 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| starved | 863 | 50.8% | 43,150,118,701 | 52,096,959,980 | 17 |
| solved | 731 | 43.0% | 6,638,991,380 | 12,226,416,585 | 13 |
| capped | 106 | 6.2% | 5,300,013,186 | 4,398,244,967 | 34 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 603 | 603 | 0 | 0 | 366 | 0 | 7.7% | 23.5% |
| main-ladder | 969 | 969 | 0 | 0 | 0 | 0 | 66.2% | 48.3% |
| repair-fallback | 603 | 88 | 515 | 26 | 366 | 0 | 0.3% | 1.0% |
| attraction-diversity | 969 | 106 | 863 | 0 | 0 | 0 | 0.5% | 0.2% |
| admissible-order | 969 | 969 | 0 | 26 | 0 | 0 | 25.3% | 27.1% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 515 |
| attraction-diversity | 322 |
| repair-fallback+attraction-diversity+admissible-order | 26 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=122,047 p25=362,295 p50=4,392,385 p75=8,590,609 p90=34,924,603 p95=38,148,852
Max: 49,707,053
Solves costing >50% of budget: 109
Solves costing >75% of budget: 62
Solves costing >90% of budget: 13

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

