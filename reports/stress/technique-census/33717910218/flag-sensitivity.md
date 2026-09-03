# Technique capability census — flag/variant sensitivity

"flipped on" = variant solves where its default arm fails; "regressed" = default solves where variant fails.

| variant/experiment | arm solved | comparable | baseline solved | flipped on | regressed | regressed on solved level |
|---|---:|---:|---:|---:|---:|---:|
| `beam|score=mustCrossFirst|bias=none|width=2000|retention=plain+mc-neighbor-budget-off` | 204 | 1042 | 245 | 10 | 51 | 49 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain+connectivity-axis-exhausted-off` | 561 | 1962 | 614 | 9 | 62 | 53 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=plain+connectivity-axis-exhausted-off` | 594 | 1962 | 650 | 6 | 62 | 46 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain+coarse-state-near-tie-retention-off` | 661 | 1962 | 614 | 81 | 34 | 27 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=plain+coarse-state-near-tie-retention-off` | 668 | 1962 | 650 | 59 | 41 | 34 |
| `repair|score=repair|guidance=turn-biased` | 184 | 968 | 184 | 0 | 0 | 0 |
| `dfs|score=mustCrossFirst|bias=none+mc-neighbor-budget-off` | 153 | 1042 | 177 | 0 | 24 | 24 |