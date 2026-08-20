# Technique capability census — technique summary

Cross-matrix: 78553 cells. Missing shards: none.

**Oracle union**: of 879 levels currently unsolved by the production ladder at the frozen baseline, 246 (28.0%) are solved by at least one T1 isolated technique at the full 50,000,000-node budget.

**Regression check**: of 1083 levels the production ladder currently solves, 16 have literally ZERO T1 isolated-technique solvers at the full budget — worth investigating directly if nonzero (see level-technique-coverage.json for which).

## T1 — previously-unsolved population (the capability-gap read)

| technique | solved | unique | node-cap | exhausted | referee-invalid | error | total | solve rate | avg ms | median solve nodes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `dfs:repair:repair` | 119 | 47 | 750 | 10 | 0 | 0 | 879 | 13.5% | 302561 | 9116724 |
| `beam:objectiveFirst@beam5000` | 75 | 6 | 0 | 2562 | 0 | 0 | 2637 | 2.8% | 2279 | 279874 |
| `beam:intersectionHarvest@beam5000` | 68 | 3 | 0 | 2569 | 0 | 0 | 2637 | 2.6% | 2316 | 281576 |
| `dfs:repair:repair(turnBiased)` | 45 | 17 | 542 | 5 | 0 | 0 | 592 | 7.6% | 343857 | 8352987 |
| `beam:objectiveFirst@beam5000(diverse)` | 39 | 5 | 0 | 840 | 0 | 0 | 879 | 4.4% | 2041 | 305877 |
| `dfs:repair:repair(mustTurnBiased)` | 38 | 12 | 546 | 8 | 0 | 0 | 592 | 6.4% | 356269 | 10215682 |
| `beam:intersectionHarvest@beam5000(diverse)` | 34 | 1 | 0 | 845 | 0 | 0 | 879 | 3.9% | 2071 | 290791 |
| `beam:perimeterSweep/perimeterCCW@beam2000` | 28 | 5 | 0 | 851 | 0 | 0 | 879 | 3.2% | 865 | 131583 |
| `beam:perimeterSweep/perimeterCW@beam2000` | 27 | 6 | 0 | 852 | 0 | 0 | 879 | 3.1% | 848 | 147424 |
| `dfs:perimeterSweep/perimeterCCW` | 25 | 1 | 854 | 0 | 0 | 0 | 879 | 2.8% | 24240 | 23521488 |
| `dfs:perimeterSweep/perimeterCW` | 23 | 1 | 856 | 0 | 0 | 0 | 879 | 2.6% | 23959 | 19226858 |
| `ida:none` | 22 | 5 | 857 | 0 | 0 | 0 | 879 | 2.5% | 21520 | 30836364 |
| `ida:mustCrossFirst` | 21 | 0 | 858 | 0 | 0 | 0 | 879 | 2.4% | 32077 | 31329334 |
| `ida:intersectionHarvest` | 19 | 1 | 860 | 0 | 0 | 0 | 879 | 2.2% | 32640 | 23101200 |
| `ida:nearClosureRescue` | 19 | 0 | 860 | 0 | 0 | 0 | 879 | 2.2% | 31985 | 28877090 |
| `beam:mustCrossFirst@beam2000` | 17 | 2 | 0 | 1350 | 0 | 0 | 1367 | 1.2% | 805 | 100339 |
| `beam:harvestThenFinish@beam2000` | 16 | 2 | 0 | 863 | 0 | 0 | 879 | 1.8% | 726 | 105376 |
| `ida:default` | 16 | 0 | 863 | 0 | 0 | 0 | 879 | 1.8% | 32857 | 28202905 |
| `dfs:mustCrossFirst` | 14 | 0 | 1353 | 0 | 0 | 0 | 1367 | 1.0% | 35515 | 32047774 |
| `dfs:perimeterSweep/cornerHarvest` | 13 | 1 | 866 | 0 | 0 | 0 | 879 | 1.5% | 23444 | 20964090 |
| `beam:intersectionHarvest@beam2000` | 12 | 1 | 0 | 867 | 0 | 0 | 879 | 1.4% | 692 | 115087 |
| `dfs:knotBuilder` | 12 | 1 | 867 | 0 | 0 | 0 | 879 | 1.4% | 22983 | 30933741 |
| `dfs:perimeterSweep/sideCommitment` | 12 | 2 | 867 | 0 | 0 | 0 | 879 | 1.4% | 23600 | 30655207 |
| `beam:knotBuilder@beam2000` | 11 | 1 | 0 | 868 | 0 | 0 | 879 | 1.3% | 674 | 90320 |
| `dfs:intersectionHarvest` | 11 | 0 | 868 | 0 | 0 | 0 | 879 | 1.3% | 22799 | 35033190 |
| `dfs:finishFirst` | 10 | 1 | 869 | 0 | 0 | 0 | 879 | 1.1% | 23028 | 36910272 |
| `dfs:harvestThenFinish` | 10 | 0 | 869 | 0 | 0 | 0 | 879 | 1.1% | 23050 | 31644403 |
| `dfs:nearClosureRescue` | 10 | 0 | 869 | 0 | 0 | 0 | 879 | 1.1% | 23107 | 34310978 |
| `dfs:objectiveFirst` | 10 | 0 | 869 | 0 | 0 | 0 | 879 | 1.1% | 22822 | 31077166 |
| `beam:objectiveFirst@beam2000` | 9 | 0 | 0 | 870 | 0 | 0 | 879 | 1.0% | 669 | 100375 |
| `dfs:closureCommitment` | 9 | 0 | 870 | 0 | 0 | 0 | 879 | 1.0% | 23075 | 32755473 |
| `dfs:perimeterSweep` | 9 | 0 | 870 | 0 | 0 | 0 | 879 | 1.0% | 23029 | 31719784 |
| `dfs:default` | 8 | 0 | 871 | 0 | 0 | 0 | 879 | 0.9% | 23008 | 31721906 |
| `dfs:portalCommitted` | 8 | 0 | 871 | 0 | 0 | 0 | 879 | 0.9% | 22841 | 33145785 |
| `dfs:portalFirstTransfer` | 7 | 0 | 872 | 0 | 0 | 0 | 879 | 0.8% | 22904 | 31911183 |

## T1 — previously-solved population (the regression-safety read)

| technique | solved | unique | node-cap | exhausted | referee-invalid | error | total | solve rate | avg ms | median solve nodes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `beam:objectiveFirst@beam5000` | 1790 | 10 | 0 | 1462 | 0 | 0 | 3252 | 55.0% | 1791 | 227536 |
| `beam:intersectionHarvest@beam5000` | 1775 | 8 | 0 | 1477 | 0 | 0 | 3252 | 54.6% | 1836 | 227287 |
| `beam:mustCrossFirst@beam2000` | 696 | 0 | 0 | 943 | 0 | 0 | 1639 | 42.5% | 628 | 88786 |
| `beam:intersectionHarvest@beam5000(diverse)` | 679 | 8 | 0 | 405 | 0 | 0 | 1084 | 62.6% | 1562 | 246168 |
| `beam:objectiveFirst@beam5000(diverse)` | 673 | 6 | 0 | 411 | 0 | 0 | 1084 | 62.1% | 1526 | 247778 |
| `dfs:repair:repair` | 669 | 12 | 414 | 1 | 0 | 0 | 1084 | 61.7% | 115034 | 395826 |
| `dfs:mustCrossFirst` | 516 | 0 | 1123 | 0 | 0 | 0 | 1639 | 31.5% | 24286 | 1073722 |
| `beam:intersectionHarvest@beam2000` | 496 | 2 | 0 | 588 | 0 | 0 | 1084 | 45.8% | 570 | 93772 |
| `beam:knotBuilder@beam2000` | 496 | 0 | 0 | 588 | 0 | 0 | 1084 | 45.8% | 544 | 90913 |
| `beam:harvestThenFinish@beam2000` | 494 | 0 | 0 | 590 | 0 | 0 | 1084 | 45.6% | 601 | 94515 |
| `beam:objectiveFirst@beam2000` | 493 | 1 | 0 | 591 | 0 | 0 | 1084 | 45.5% | 544 | 94973 |
| `beam:perimeterSweep/perimeterCW@beam2000` | 477 | 5 | 0 | 607 | 0 | 0 | 1084 | 44.0% | 650 | 89353 |
| `beam:perimeterSweep/perimeterCCW@beam2000` | 474 | 8 | 0 | 610 | 0 | 0 | 1084 | 43.7% | 652 | 89033 |
| `ida:none` | 436 | 10 | 647 | 1 | 0 | 0 | 1084 | 40.2% | 13962 | 224562 |
| `ida:default` | 426 | 0 | 658 | 0 | 0 | 0 | 1084 | 39.3% | 20692 | 283457 |
| `ida:intersectionHarvest` | 420 | 0 | 664 | 0 | 0 | 0 | 1084 | 38.7% | 20805 | 249949 |
| `ida:nearClosureRescue` | 420 | 0 | 664 | 0 | 0 | 0 | 1084 | 38.7% | 20529 | 202208 |
| `ida:mustCrossFirst` | 418 | 0 | 666 | 0 | 0 | 0 | 1084 | 38.6% | 20459 | 251795 |
| `dfs:default` | 390 | 1 | 694 | 0 | 0 | 0 | 1084 | 36.0% | 14212 | 930398 |
| `dfs:perimeterSweep/perimeterCCW` | 378 | 1 | 706 | 1 | 0 | 0 | 1085 | 34.8% | 15692 | 1465461 |
| `dfs:portalFirstTransfer` | 378 | 0 | 707 | 0 | 0 | 0 | 1085 | 34.8% | 14439 | 1028722 |
| `dfs:perimeterSweep` | 377 | 0 | 707 | 1 | 0 | 0 | 1085 | 34.7% | 14500 | 1007752 |
| `dfs:perimeterSweep/perimeterCW` | 377 | 0 | 708 | 0 | 0 | 0 | 1085 | 34.7% | 15639 | 1205270 |
| `dfs:harvestThenFinish` | 372 | 0 | 712 | 0 | 0 | 0 | 1084 | 34.3% | 14554 | 931190 |
| `dfs:perimeterSweep/cornerHarvest` | 372 | 0 | 713 | 0 | 0 | 0 | 1085 | 34.3% | 15160 | 687359 |
| `dfs:perimeterSweep/sideCommitment` | 371 | 0 | 713 | 1 | 0 | 0 | 1085 | 34.2% | 15163 | 829092 |
| `dfs:knotBuilder` | 367 | 0 | 717 | 0 | 0 | 0 | 1084 | 33.9% | 14604 | 997356 |
| `dfs:objectiveFirst` | 366 | 0 | 719 | 0 | 0 | 0 | 1085 | 33.7% | 14578 | 759602 |
| `dfs:portalCommitted` | 362 | 0 | 723 | 0 | 0 | 0 | 1085 | 33.4% | 14642 | 950327 |
| `dfs:intersectionHarvest` | 354 | 0 | 729 | 1 | 0 | 0 | 1084 | 32.7% | 14832 | 795689 |
| `dfs:closureCommitment` | 345 | 0 | 739 | 0 | 0 | 0 | 1084 | 31.8% | 14856 | 901866 |
| `dfs:nearClosureRescue` | 342 | 0 | 743 | 0 | 0 | 0 | 1085 | 31.5% | 15012 | 834823 |
| `dfs:finishFirst` | 333 | 0 | 750 | 1 | 0 | 0 | 1084 | 30.7% | 15478 | 787812 |
| `dfs:repair:repair(mustTurnBiased)` | 136 | 2 | 239 | 1 | 0 | 0 | 376 | 36.2% | 226672 | 4160387 |
| `dfs:repair:repair(turnBiased)` | 123 | 0 | 252 | 1 | 0 | 0 | 376 | 32.7% | 226341 | 5212635 |

