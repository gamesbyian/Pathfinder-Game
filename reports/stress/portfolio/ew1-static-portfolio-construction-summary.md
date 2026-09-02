Source run: 33156541827 (d1d02501a9fb833a732e918fc978a36da405396d)
Levels: 60; techniques: 34; oracle union: 12

| k | added technique | family | coverage | frac of oracle union | aggregate work | work-budget-reached share | exclusive levels still missing |
|---:|---|---|---:|---:|---:|---:|---:|
| 1 | `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` | beam | 5 | 41.7% | 200,478,833 | 0.0% | 5 |
| 2 | `beam|score=perimeterSweep|bias=perimeterCCW|width=2000|retention=plain` | beam | 7 | 58.3% | 283,510,891 | 0.0% | 3 |
| 3 | `beam|score=harvestThenFinish|bias=none|width=2000|retention=plain` | beam | 8 | 66.7% | 346,195,321 | 0.0% | 3 |
| 4 | `admissible-order|tieBreak=nearClosureRescue|lds=off` | ida | 9 | 75.0% | 860,972,500 | 0.0% | 3 |
| 5 | `repair|score=repair|guidance=standard` | repair | 10 | 83.3% | 1,370,175,861 | 0.0% | 2 |
| 6 | `dfs|score=finishFirst|bias=none` | dfs | 11 | 91.7% | 1,860,759,554 | 0.0% | 1 |
| 7 | `admissible-order|tieBreak=none|lds=off` | ida | 12 | 100.0% | 2,344,208,536 | 0.0% | 0 |
| 8 | `beam|score=intersectionHarvest|bias=none|width=2000|retention=plain` | beam | 12 | 100.0% | 2,401,274,544 | 0.0% | 0 |
| 9 | `beam|score=knotBuilder|bias=none|width=2000|retention=plain` | beam | 12 | 100.0% | 2,458,480,292 | 0.0% | 0 |
| 10 | `beam|score=mustCrossFirst|bias=none|width=2000|retention=plain` | beam | 12 | 100.0% | 2,516,879,993 | 0.0% | 0 |
| 11 | `beam|score=objectiveFirst|bias=none|width=2000|retention=plain` | beam | 12 | 100.0% | 2,575,379,247 | 0.0% | 0 |
| 12 | `beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain` | beam | 12 | 100.0% | 2,643,577,267 | 0.0% | 0 |
| 13 | `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` | beam | 12 | 100.0% | 2,787,981,391 | 0.0% | 0 |
| 14 | `beam|score=objectiveFirst|bias=none|width=5000|retention=plain` | beam | 12 | 100.0% | 2,933,989,878 | 0.0% | 0 |
| 15 | `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` | beam | 12 | 100.0% | 3,099,718,309 | 0.0% | 0 |
| 16 | `dfs|score=perimeterSweep|bias=none` | dfs | 12 | 100.0% | 3,579,722,892 | 0.0% | 0 |
| 17 | `dfs|score=knotBuilder|bias=none` | dfs | 12 | 100.0% | 4,059,727,309 | 0.0% | 0 |
| 18 | `dfs|score=portalFirstTransfer|bias=none` | dfs | 12 | 100.0% | 4,539,731,214 | 0.0% | 0 |
| 19 | `dfs|score=default|bias=none` | dfs | 12 | 100.0% | 5,019,735,538 | 0.0% | 0 |
| 20 | `dfs|score=harvestThenFinish|bias=none` | dfs | 12 | 100.0% | 5,499,740,186 | 0.0% | 0 |
| 21 | `admissible-order|tieBreak=default|lds=off` | ida | 12 | 100.0% | 5,979,747,510 | 0.0% | 0 |
| 22 | `repair|score=repair|guidance=must-turn-biased` | repair | 12 | 100.0% | 6,279,748,879 | 0.0% | 0 |
| 23 | `dfs|score=perimeterSweep|bias=cornerHarvest` | dfs | 12 | 100.0% | 6,759,752,942 | 0.0% | 0 |
| 24 | `dfs|score=closureCommitment|bias=none` | dfs | 12 | 100.0% | 7,239,757,163 | 0.0% | 0 |
| 25 | `dfs|score=portalCommitted|bias=none` | dfs | 12 | 100.0% | 7,719,761,188 | 0.0% | 0 |
| 26 | `dfs|score=intersectionHarvest|bias=none` | dfs | 12 | 100.0% | 8,199,765,617 | 0.0% | 0 |
| 27 | `dfs|score=perimeterSweep|bias=perimeterCW` | dfs | 12 | 100.0% | 8,679,770,186 | 0.0% | 0 |
| 28 | `dfs|score=perimeterSweep|bias=perimeterCCW` | dfs | 12 | 100.0% | 9,159,774,679 | 0.0% | 0 |
| 29 | `dfs|score=mustCrossFirst|bias=none` | dfs | 12 | 100.0% | 9,639,779,289 | 0.0% | 0 |
| 30 | `dfs|score=nearClosureRescue|bias=none` | dfs | 12 | 100.0% | 10,119,783,491 | 0.0% | 0 |
| 31 | `dfs|score=objectiveFirst|bias=none` | dfs | 12 | 100.0% | 10,599,788,054 | 0.0% | 0 |
| 32 | `dfs|score=perimeterSweep|bias=sideCommitment` | dfs | 12 | 100.0% | 11,079,792,695 | 0.0% | 0 |
| 33 | `admissible-order|tieBreak=mustCrossFirst|lds=off` | ida | 12 | 100.0% | 11,559,800,248 | 0.0% | 0 |
| 34 | `admissible-order|tieBreak=intersectionHarvest|lds=off` | ida | 12 | 100.0% | 12,039,808,152 | 0.0% | 0 |

## Real production technique-win ranking (full corpus1+corpus2)

Real production wins across the joined corpus: 1073; total charged work: 203,754,701,458

| k | technique | family | wins at k | cumulative wins | frac of total wins | cumulative work | frac of total work |
|---:|---|---|---:|---:|---:|---:|---:|
| 1 | `repair|score=repair|guidance=standard` | repair | 224 | 224 | 20.9% | 48,927,394,645 | 24.0% |
| 2 | `beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain` | beam | 170 | 394 | 36.7% | 52,113,975,514 | 25.6% |
| 3 | `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` | beam | 121 | 515 | 48.0% | 59,364,777,178 | 29.1% |
| 4 | `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` | beam | 93 | 608 | 56.7% | 67,942,187,003 | 33.3% |
| 5 | `beam|score=objectiveFirst|bias=none|width=5000|retention=plain` | beam | 90 | 698 | 65.1% | 76,365,734,068 | 37.5% |
| 6 | `beam|score=perimeterSweep|bias=perimeterCCW|width=2000|retention=plain` | beam | 76 | 774 | 72.1% | 80,104,490,612 | 39.3% |
| 7 | `admissible-order|tieBreak=default|lds=off` | ida | 48 | 822 | 76.6% | 93,705,833,234 | 46.0% |
| 8 | `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` | beam | 36 | 858 | 80.0% | 100,336,684,444 | 49.2% |
| 9 | `repair|score=repair|guidance=must-turn-biased` | repair | 31 | 889 | 82.9% | 107,649,146,550 | 52.8% |
| 10 | `admissible-order|tieBreak=none|lds=off` | ida | 29 | 918 | 85.6% | 120,161,462,593 | 59.0% |
| 11 | `beam|score=intersectionHarvest|bias=none|width=2000|retention=plain` | beam | 29 | 947 | 88.3% | 121,651,403,139 | 59.7% |
| 12 | `dfs|score=perimeterSweep|bias=perimeterCW` | dfs | 21 | 968 | 90.2% | 130,581,474,893 | 64.1% |
| 13 | `dfs|score=perimeterSweep|bias=cornerHarvest` | dfs | 16 | 984 | 91.7% | 131,390,387,995 | 64.5% |
| 14 | `dfs|score=portalFirstTransfer|bias=none` | dfs | 16 | 1000 | 93.2% | 132,971,451,584 | 65.3% |
| 15 | `dfs|score=objectiveFirst|bias=none` | dfs | 14 | 1014 | 94.5% | 162,641,349,535 | 79.8% |
| 16 | `beam|score=objectiveFirst|bias=none|width=2000|retention=plain` | beam | 12 | 1026 | 95.6% | 164,152,793,072 | 80.6% |
| 17 | `dfs|score=perimeterSweep|bias=perimeterCCW` | dfs | 11 | 1037 | 96.6% | 170,679,900,643 | 83.8% |
| 18 | `dfs|score=intersectionHarvest|bias=none` | dfs | 9 | 1046 | 97.5% | 191,677,060,190 | 94.1% |
| 19 | `beam|score=mustCrossFirst|bias=none|width=2000|retention=plain` | beam | 8 | 1054 | 98.2% | 191,906,761,603 | 94.2% |
| 20 | `dfs|score=perimeterSweep|bias=sideCommitment` | dfs | 5 | 1059 | 98.7% | 194,967,761,780 | 95.7% |
| 21 | `dfs|score=portalCommitted|bias=none` | dfs | 5 | 1064 | 99.2% | 196,312,012,658 | 96.3% |
| 22 | `dfs|score=harvestThenFinish|bias=none` | dfs | 4 | 1068 | 99.5% | 197,672,854,112 | 97.0% |
| 23 | `dfs|score=knotBuilder|bias=none` | dfs | 2 | 1070 | 99.7% | 201,356,220,939 | 98.8% |
| 24 | `dfs|score=default|bias=none` | dfs | 1 | 1071 | 99.8% | 201,437,573,244 | 98.9% |
| 25 | `dfs|score=mustCrossFirst|bias=none` | dfs | 1 | 1072 | 99.9% | 202,274,150,961 | 99.3% |
| 26 | `dfs|score=perimeterSweep|bias=none` | dfs | 1 | 1073 | 100.0% | 203,025,311,609 | 99.6% |
| 27 | `admissible-order|tieBreak=intersectionHarvest|lds=off` | ida | 0 | 1073 | 100.0% | 203,025,311,609 | 99.6% |
| 28 | `admissible-order|tieBreak=mustCrossFirst|lds=off` | ida | 0 | 1073 | 100.0% | 203,025,311,609 | 99.6% |
| 29 | `admissible-order|tieBreak=nearClosureRescue|lds=off` | ida | 0 | 1073 | 100.0% | 203,025,311,609 | 99.6% |
| 30 | `beam|score=harvestThenFinish|bias=none|width=2000|retention=plain` | beam | 0 | 1073 | 100.0% | 203,175,934,358 | 99.7% |
| 31 | `beam|score=knotBuilder|bias=none|width=2000|retention=plain` | beam | 0 | 1073 | 100.0% | 203,325,102,413 | 99.8% |
| 32 | `dfs|score=closureCommitment|bias=none` | dfs | 0 | 1073 | 100.0% | 203,379,199,454 | 99.8% |
| 33 | `dfs|score=finishFirst|bias=none` | dfs | 0 | 1073 | 100.0% | 203,658,563,016 | 100.0% |
| 34 | `dfs|score=nearClosureRescue|bias=none` | dfs | 0 | 1073 | 100.0% | 203,754,701,458 | 100.0% |
