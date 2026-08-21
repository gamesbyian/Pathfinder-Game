# Lifecycle failure map

Sources: reports/stress/benchmark-latest-random.json

Population: 1700 levels — 824 solved, 876 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 824 | 48.5% | 13,036,810,897 | 19,854,903,882 | 13 |
| starved | 786 | 46.2% | 100,656,845,497 | 110,464,090,812 | 17 |
| capped | 90 | 5.3% | 10,058,771,196 | 7,949,028,720 | 33 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 559 | 559 | 0 | 0 | 317 | 0 | 3.1% | 10.3% |
| main-ladder | 876 | 876 | 0 | 0 | 0 | 0 | 76.7% | 66.1% |
| repair-fallback | 559 | 78 | 481 | 18 | 317 | 0 | 0.1% | 0.4% |
| attraction-diversity | 876 | 90 | 786 | 0 | 0 | 0 | 0.2% | 0.1% |
| admissible-order | 876 | 876 | 0 | 0 | 0 | 0 | 19.9% | 23.0% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 499 |
| attraction-diversity | 287 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=132,944 p25=586,932 p50=4,954,080 p75=28,505,363 p90=49,144,446 p95=56,182,595
Max: 143,053,266
Solves costing >50% of budget: 211
Solves costing >75% of budget: 161
Solves costing >90% of budget: 113

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

