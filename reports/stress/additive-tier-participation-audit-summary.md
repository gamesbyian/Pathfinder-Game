# Additive-tier participation audit

Population: 10 levels from `data/stress/stress-levels-random.json` (pos:1-10), node budget 500,000, work budget 670,000, time budget 86,400,000ms. No `disableExtraBudgetPasses`, no `strictTotalWorkBudget` -- matches a real capability-sweep/confirmation-workflow call shape, not the interactive game path (which disables every tier below).

3/10 levels solved. 10/10 levels (100%) produced at least one additive-tier attempt. 3/10 levels (30%) were solved BY an additive tier (i.e. main-loop/repair-probe alone would not have found this solution within this budget).

## Per-tier participation and win rate

| Stage | Levels participated | Participation rate | Levels won | Win rate | Total attempts | Total workSpent |
|---|---:|---:|---:|---:|---:|---:|
| repair-fallback | 5 | 50% | 0 | 0% | 5 | 1,022,368 |
| attraction-diversity | 0 | 0% | 0 | 0% | 0 | 0 |
| repair-probe-shrink-recovery | 0 | 0% | 0 | 0% | 0 | 0 |
| admissible-order | 10 | 100% | 0 | 0% | 10 | 1,965,404 |
| dedup-near-tie-retry | 10 | 100% | 0 | 0% | 129 | 6,028,767 |
| admissible-order-non-default-retry | 10 | 100% | 0 | 0% | 10 | 1,730,533 |
| connectivity-axis-exhausted-retry | 10 | 100% | 1 | 10% | 119 | 12,168,302 |
| repair-elite-prefix-dfs-retry | 0 | 0% | 0 | 0% | 0 | 0 |
| mc-neighbor-budget-retry | 5 | 50% | 0 | 0% | 63 | 10,890,427 |
| repair-late-probe | 4 | 40% | 1 | 10% | 4 | 59,855,302 |
| goal-attraction-legacy-distance-retry | 8 | 80% | 0 | 0% | 98 | 31,957,484 |
| repair-late-probe-multi-seed-retry | 3 | 30% | 1 | 10% | 19 | 313,076,369 |
