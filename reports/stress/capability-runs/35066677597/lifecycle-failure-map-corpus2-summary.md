# Lifecycle failure map

Sources: reports/stress/solver-corpus2-latest.json

Population: 1700 levels — 1169 solved, 531 unsolved.

## Terminal bucket (mutually exclusive)

| bucket | levels | share | nodes | work | best badness p50 |
|---|---:|---:|---:|---:|---:|
| solved | 1169 | 68.8% | 50,763,460,274 | 69,302,968,971 | 12 |
| capped | 484 | 28.5% | 103,669,766,883 | 127,246,758,319 | 13 |
| starved | 47 | 2.8% | 12,175,009,499 | 10,480,479,187 | 16 |

## Technique lifecycle on unsolved levels

| technique | instantiated | reached | node-starved | work-starved | routing-skipped | exhausted | node share | work share |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| early-repair-search | 382 | 382 | 0 | 0 | 149 | 0 | 2.0% | 6.0% |
| main-ladder | 531 | 531 | 0 | 0 | 0 | 0 | 13.7% | 11.5% |
| repair-fallback | 382 | 335 | 47 | 0 | 149 | 0 | 1.0% | 3.0% |
| goal-attraction-disabled-retry | 531 | 531 | 0 | 0 | 0 | 0 | 0.6% | 2.0% |
| admissible-order-fallback | 531 | 531 | 0 | 0 | 0 | 0 | 5.7% | 5.7% |
| coarse-state-near-tie-retention-disabled-retry | 531 | 531 | 0 | 0 | 0 | 0 | 5.7% | 5.7% |
| admissible-order-alternate-tiebreak-retry | 531 | 531 | 0 | 0 | 0 | 0 | 5.7% | 5.8% |
| connectivity-axis-prune-disabled-retry | 531 | 531 | 0 | 0 | 0 | 0 | 11.5% | 8.9% |
| repair-elite-prefix-dfs-retry | 382 | 0 | 0 | 0 | 531 | 0 | 0.0% | 0.0% |
| must-cross-neighbor-prune-disabled-retry | 531 | 297 | 0 | 0 | 234 | 0 | 10.8% | 8.7% |
| late-repair-search | 149 | 149 | 0 | 0 | 382 | 0 | 0.6% | 1.8% |
| late-repair-must-turn-biased-retry | 111 | 0 | 0 | 0 | 531 | 0 | 0.0% | 0.0% |
| guidance-goal-distance-retry | 531 | 531 | 0 | 0 | 0 | 0 | 24.8% | 17.3% |
| late-repair-multiseed-retry | 149 | 149 | 0 | 0 | 382 | 0 | 4.5% | 13.0% |
| portal-coarse-state-merge-dead-last-retry | 365 | 365 | 0 | 0 | 166 | 0 | 13.5% | 10.5% |

## Starvation patterns (unfed technique sets)

| starved techniques | levels |
|---|---:|
| repair-fallback | 47 |

## Solve cost (budget elasticity estimate)

Node budget: 50000000
Quantiles: p10=187,813 p25=2,322,502 p50=9,495,590 p75=37,289,161 p90=178,025,997 p95=204,910,281
Max: 307,796,899
Solves costing >50% of budget: 503
Solves costing >75% of budget: 287
Solves costing >90% of budget: 252

Solve cost is a one-run estimate, not a matched two-budget A/B: internal reserves scale with `nodeBudget`, so a lower-ceiling run is not a prefix of this one.

