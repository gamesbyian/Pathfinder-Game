# Lifecycle failure map

Sources: reports/stress/benchmark-latest-random.json

Population: 1700 levels — 809 solved, 891 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 809 | 47.6% | 11,675,604,154 | 18,092,402,344 | 13 |
| starved | 795 | 46.8% | 59,625,103,747 | 73,037,582,643 | 17 |
| capped | 96 | 5.6% | 7,200,012,104 | 6,099,430,635 | 34 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 568 | 568 | 0 | 0 | 323 | 0 | 5.2% | 15.8% |
| main-ladder | 891 | 891 | 0 | 0 | 0 | 0 | 60.7% | 48.3% |
| repair-fallback | 568 | 82 | 486 | 21 | 323 | 0 | 0.2% | 0.7% |
| attraction-diversity | 891 | 96 | 795 | 0 | 0 | 0 | 0.3% | 0.2% |
| admissible-order | 891 | 891 | 0 | 0 | 0 | 0 | 33.5% | 35.1% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 507 |
| attraction-diversity | 288 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=130,449 p25=551,351 p50=4,912,148 p75=22,600,755 p90=50,261,345 p95=62,502,017
Max: 74,870,130
Solves costing >50% of budget: 196
Solves costing >75% of budget: 146
Solves costing >90% of budget: 98

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

