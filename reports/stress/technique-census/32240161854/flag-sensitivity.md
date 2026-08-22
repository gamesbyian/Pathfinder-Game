# Technique capability census — flag/variant sensitivity

"flipped on" = variant solves where its default arm fails; "regressed" = default solves where variant fails.

| variant/experiment | arm solved | comparable | baseline solved | flipped on | regressed | regressed on solved level |
|---|---:|---:|---:|---:|---:|---:|
| `beam:mustCrossFirst@beam2000+mc-neighbor-budget-off` | 207 | 1042 | 241 | 14 | 48 | 48 |
| `beam:intersectionHarvest@beam5000+connectivity-axis-exhausted-off` | 553 | 1962 | 618 | 6 | 71 | 65 |
| `beam:objectiveFirst@beam5000+connectivity-axis-exhausted-off` | 580 | 1962 | 632 | 9 | 61 | 50 |
| `beam:intersectionHarvest@beam5000+dedup-near-tie-retention-off` | 670 | 1962 | 618 | 91 | 39 | 34 |
| `beam:objectiveFirst@beam5000+dedup-near-tie-retention-off` | 651 | 1962 | 632 | 54 | 35 | 30 |
| `dfs:mustCrossFirst+mc-neighbor-budget-off` | 153 | 1042 | 182 | 0 | 29 | 29 |