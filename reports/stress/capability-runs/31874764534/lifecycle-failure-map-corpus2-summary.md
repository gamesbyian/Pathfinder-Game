# Lifecycle failure map

Sources: reports/stress/benchmark-latest-random.json

Population: 1700 levels — 724 solved, 976 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| starved | 870 | 51.2% | 43,500,116,514 | 52,580,041,860 | 17 |
| solved | 724 | 42.6% | 6,676,983,221 | 12,124,105,362 | 13 |
| capped | 106 | 6.2% | 5,300,013,474 | 4,399,584,826 | 34 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| repair-probe | 611 | 611 | 0 | 0 | 365 | 0 | 7.7% | 23.4% |
| main-ladder | 976 | 976 | 0 | 0 | 0 | 0 | 66.2% | 48.3% |
| repair-fallback | 611 | 85 | 526 | 24 | 365 | 0 | 0.3% | 0.9% |
| attraction-diversity | 976 | 106 | 870 | 0 | 0 | 0 | 0.5% | 0.2% |
| admissible-order | 976 | 976 | 0 | 24 | 0 | 0 | 25.3% | 27.1% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback+attraction-diversity | 526 |
| attraction-diversity | 320 |
| repair-fallback+attraction-diversity+admissible-order | 24 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=118,953 p25=355,776 p50=4,406,722 p75=9,387,710 p90=34,932,085 p95=38,031,923
Max: 49,707,053
Solves costing >50% of budget: 111
Solves costing >75% of budget: 61
Solves costing >90% of budget: 13

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

