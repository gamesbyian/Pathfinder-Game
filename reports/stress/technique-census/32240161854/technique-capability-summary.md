# Technique capability census — technique summary

Cross-matrix: 78505 unique cells (48 duplicate cell result(s) removed). Missing shards: none.

**Oracle union**: of 888 levels currently unsolved by the production ladder at the frozen baseline, 253 (28.5%) are solved by at least one T1 isolated technique at the full 50,000,000-node budget.

**Regression check**: of 1074 levels the production ladder currently solves, 14 have literally ZERO T1 isolated-technique solvers at the full budget — worth investigating directly if nonzero (see level-technique-coverage.json for which).

## T1 — previously-unsolved population (the capability-gap read)

| technique | solved | unique | node-cap | exhausted | referee-invalid | error | total | solve rate | avg ms | median solve nodes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `dfs:repair:repair` | 121 | 47 | 757 | 10 | 0 | 0 | 888 | 13.6% | 301830 | 9318880 |
| `dfs:repair:repair(turnBiased)` | 45 | 17 | 546 | 5 | 0 | 0 | 596 | 7.6% | 344217 | 8352987 |
| `beam:objectiveFirst@beam5000(diverse)` | 40 | 5 | 0 | 848 | 0 | 0 | 888 | 4.5% | 2041 | 302694 |
| `dfs:repair:repair(mustTurnBiased)` | 38 | 12 | 550 | 8 | 0 | 0 | 596 | 6.4% | 356429 | 10215682 |
| `beam:intersectionHarvest@beam5000(diverse)` | 37 | 1 | 0 | 851 | 0 | 0 | 888 | 4.2% | 2071 | 292231 |
| `beam:objectiveFirst@beam5000+dedup-near-tie-retention-off` | 31 | 3 | 0 | 857 | 0 | 0 | 888 | 3.5% | 2503 | 262204 |
| `beam:objectiveFirst@beam5000` | 29 | 0 | 0 | 859 | 0 | 0 | 888 | 3.3% | 1766 | 279874 |
| `beam:intersectionHarvest@beam5000+dedup-near-tie-retention-off` | 28 | 3 | 0 | 860 | 0 | 0 | 888 | 3.2% | 2530 | 267049 |
| `beam:perimeterSweep/perimeterCCW@beam2000` | 28 | 5 | 0 | 860 | 0 | 0 | 888 | 3.2% | 865 | 131583 |
| `beam:perimeterSweep/perimeterCW@beam2000` | 27 | 6 | 0 | 861 | 0 | 0 | 888 | 3.0% | 848 | 147424 |
| `dfs:perimeterSweep/perimeterCCW` | 26 | 1 | 862 | 0 | 0 | 0 | 888 | 2.9% | 24232 | 21326646 |
| `dfs:perimeterSweep/perimeterCW` | 24 | 1 | 864 | 0 | 0 | 0 | 888 | 2.7% | 23969 | 21925228 |
| `beam:intersectionHarvest@beam5000` | 23 | 0 | 0 | 865 | 0 | 0 | 888 | 2.6% | 1787 | 262283 |
| `ida:mustCrossFirst` | 23 | 0 | 865 | 0 | 0 | 0 | 888 | 2.6% | 32067 | 31329334 |
| `ida:nearClosureRescue` | 22 | 0 | 866 | 0 | 0 | 0 | 888 | 2.5% | 31949 | 28663456 |
| `ida:none` | 22 | 5 | 866 | 0 | 0 | 0 | 888 | 2.5% | 21537 | 30836364 |
| `ida:intersectionHarvest` | 20 | 1 | 868 | 0 | 0 | 0 | 888 | 2.3% | 32668 | 25535935 |
| `beam:objectiveFirst@beam5000+connectivity-axis-exhausted-off` | 19 | 0 | 0 | 869 | 0 | 0 | 888 | 2.1% | 2568 | 274043 |
| `beam:intersectionHarvest@beam5000+connectivity-axis-exhausted-off` | 18 | 0 | 0 | 870 | 0 | 0 | 888 | 2.0% | 2629 | 293401 |
| `ida:default` | 17 | 0 | 871 | 0 | 0 | 0 | 888 | 1.9% | 32880 | 31319414 |
| `beam:harvestThenFinish@beam2000` | 16 | 2 | 0 | 872 | 0 | 0 | 888 | 1.8% | 726 | 105376 |
| `dfs:knotBuilder` | 15 | 1 | 873 | 0 | 0 | 0 | 888 | 1.7% | 22938 | 28765936 |
| `dfs:perimeterSweep/cornerHarvest` | 15 | 1 | 873 | 0 | 0 | 0 | 888 | 1.7% | 23440 | 20964090 |
| `beam:intersectionHarvest@beam2000` | 13 | 2 | 0 | 875 | 0 | 0 | 888 | 1.5% | 693 | 113542 |
| `beam:knotBuilder@beam2000` | 13 | 1 | 0 | 875 | 0 | 0 | 888 | 1.5% | 675 | 99176 |
| `beam:mustCrossFirst@beam2000` | 13 | 1 | 0 | 875 | 0 | 0 | 888 | 1.5% | 673 | 101029 |
| `dfs:perimeterSweep/sideCommitment` | 13 | 2 | 875 | 0 | 0 | 0 | 888 | 1.5% | 23613 | 31696131 |
| `dfs:harvestThenFinish` | 12 | 0 | 876 | 0 | 0 | 0 | 888 | 1.4% | 23033 | 29897870 |
| `dfs:intersectionHarvest` | 12 | 0 | 876 | 0 | 0 | 0 | 888 | 1.4% | 22807 | 33396896 |
| `dfs:default` | 11 | 0 | 877 | 0 | 0 | 0 | 888 | 1.2% | 22984 | 24628264 |
| `dfs:finishFirst` | 11 | 1 | 877 | 0 | 0 | 0 | 888 | 1.2% | 23028 | 35052873 |
| `dfs:mustCrossFirst` | 11 | 0 | 877 | 0 | 0 | 0 | 888 | 1.2% | 22873 | 31903868 |
| `dfs:nearClosureRescue` | 11 | 0 | 877 | 0 | 0 | 0 | 888 | 1.2% | 23106 | 33543800 |
| `dfs:objectiveFirst` | 11 | 0 | 877 | 0 | 0 | 0 | 888 | 1.2% | 22830 | 30883030 |
| `dfs:perimeterSweep` | 11 | 0 | 877 | 0 | 0 | 0 | 888 | 1.2% | 23014 | 28778772 |
| `beam:objectiveFirst@beam2000` | 10 | 1 | 0 | 878 | 0 | 0 | 888 | 1.1% | 669 | 113307 |
| `dfs:closureCommitment` | 10 | 0 | 878 | 0 | 0 | 0 | 888 | 1.1% | 23076 | 31475732 |
| `dfs:portalCommitted` | 10 | 0 | 878 | 0 | 0 | 0 | 888 | 1.1% | 22815 | 29767796 |
| `dfs:portalFirstTransfer` | 10 | 0 | 878 | 0 | 0 | 0 | 888 | 1.1% | 22861 | 29893882 |
| `beam:mustCrossFirst@beam2000+mc-neighbor-budget-off` | 5 | 0 | 0 | 492 | 0 | 0 | 497 | 1.0% | 1041 | 100339 |
| `dfs:mustCrossFirst+mc-neighbor-budget-off` | 5 | 0 | 492 | 0 | 0 | 0 | 497 | 1.0% | 58201 | 24521815 |

## T1 — previously-solved population (the regression-safety read)

| technique | solved | unique | node-cap | exhausted | referee-invalid | error | total | solve rate | avg ms | median solve nodes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `beam:intersectionHarvest@beam5000(diverse)` | 676 | 8 | 0 | 398 | 0 | 0 | 1074 | 62.9% | 1556 | 245822 |
| `beam:objectiveFirst@beam5000(diverse)` | 672 | 6 | 0 | 402 | 0 | 0 | 1074 | 62.6% | 1520 | 247029 |
| `dfs:repair:repair` | 666 | 12 | 407 | 1 | 0 | 0 | 1074 | 62.0% | 114173 | 376612 |
| `beam:intersectionHarvest@beam5000+dedup-near-tie-retention-off` | 642 | 5 | 0 | 432 | 0 | 0 | 1074 | 59.8% | 2001 | 239276 |
| `beam:objectiveFirst@beam5000+dedup-near-tie-retention-off` | 620 | 2 | 0 | 454 | 0 | 0 | 1074 | 57.7% | 1967 | 228802 |
| `beam:objectiveFirst@beam5000` | 603 | 1 | 0 | 471 | 0 | 0 | 1074 | 56.1% | 1373 | 229556 |
| `beam:intersectionHarvest@beam5000` | 595 | 0 | 0 | 479 | 0 | 0 | 1074 | 55.4% | 1416 | 229584 |
| `beam:objectiveFirst@beam5000+connectivity-axis-exhausted-off` | 561 | 0 | 0 | 513 | 0 | 0 | 1074 | 52.2% | 2020 | 220443 |
| `beam:intersectionHarvest@beam5000+connectivity-axis-exhausted-off` | 535 | 0 | 0 | 539 | 0 | 0 | 1074 | 49.8% | 2080 | 217804 |
| `beam:intersectionHarvest@beam2000` | 495 | 1 | 0 | 579 | 0 | 0 | 1074 | 46.1% | 569 | 93518 |
| `beam:harvestThenFinish@beam2000` | 494 | 0 | 0 | 580 | 0 | 0 | 1074 | 46.0% | 599 | 94515 |
| `beam:knotBuilder@beam2000` | 494 | 0 | 0 | 580 | 0 | 0 | 1074 | 46.0% | 542 | 90519 |
| `beam:mustCrossFirst@beam2000` | 492 | 0 | 0 | 582 | 0 | 0 | 1074 | 45.8% | 540 | 94074 |
| `beam:objectiveFirst@beam2000` | 492 | 0 | 0 | 582 | 0 | 0 | 1074 | 45.8% | 542 | 94876 |
| `beam:perimeterSweep/perimeterCW@beam2000` | 477 | 5 | 0 | 597 | 0 | 0 | 1074 | 44.4% | 647 | 89353 |
| `beam:perimeterSweep/perimeterCCW@beam2000` | 474 | 8 | 0 | 600 | 0 | 0 | 1074 | 44.1% | 649 | 89033 |
| `ida:none` | 436 | 10 | 637 | 1 | 0 | 0 | 1074 | 40.6% | 13866 | 224562 |
| `ida:default` | 425 | 0 | 649 | 0 | 0 | 0 | 1074 | 39.6% | 20548 | 267296 |
| `ida:intersectionHarvest` | 419 | 0 | 655 | 0 | 0 | 0 | 1074 | 39.0% | 20658 | 247613 |
| `ida:nearClosureRescue` | 417 | 0 | 657 | 0 | 0 | 0 | 1074 | 38.8% | 20439 | 211135 |
| `ida:mustCrossFirst` | 416 | 0 | 658 | 0 | 0 | 0 | 1074 | 38.7% | 20344 | 251795 |
| `dfs:default` | 387 | 1 | 687 | 0 | 0 | 0 | 1074 | 36.0% | 14147 | 879649 |
| `dfs:perimeterSweep/perimeterCCW` | 377 | 1 | 696 | 1 | 0 | 0 | 1074 | 35.1% | 15589 | 1444079 |
| `dfs:perimeterSweep/perimeterCW` | 376 | 0 | 698 | 0 | 0 | 0 | 1074 | 35.0% | 15546 | 1190262 |
| `dfs:perimeterSweep` | 375 | 0 | 698 | 1 | 0 | 0 | 1074 | 34.9% | 14425 | 1003462 |
| `dfs:portalFirstTransfer` | 375 | 0 | 699 | 0 | 0 | 0 | 1074 | 34.9% | 14387 | 1003425 |
| `dfs:harvestThenFinish` | 370 | 0 | 704 | 0 | 0 | 0 | 1074 | 34.5% | 14485 | 894711 |
| `dfs:perimeterSweep/sideCommitment` | 370 | 0 | 703 | 1 | 0 | 0 | 1074 | 34.5% | 15067 | 811236 |
| `dfs:perimeterSweep/cornerHarvest` | 369 | 0 | 705 | 0 | 0 | 0 | 1074 | 34.4% | 15094 | 639475 |
| `dfs:mustCrossFirst` | 366 | 0 | 708 | 0 | 0 | 0 | 1074 | 34.1% | 14498 | 772464 |
| `dfs:objectiveFirst` | 365 | 0 | 709 | 0 | 0 | 0 | 1074 | 34.0% | 14486 | 742769 |
| `dfs:knotBuilder` | 364 | 0 | 710 | 0 | 0 | 0 | 1074 | 33.9% | 14559 | 968110 |
| `dfs:portalCommitted` | 360 | 0 | 714 | 0 | 0 | 0 | 1074 | 33.5% | 14578 | 902909 |
| `dfs:intersectionHarvest` | 353 | 0 | 720 | 1 | 0 | 0 | 1074 | 32.9% | 14748 | 790731 |
| `dfs:closureCommitment` | 344 | 0 | 730 | 0 | 0 | 0 | 1074 | 32.0% | 14776 | 887195 |
| `dfs:nearClosureRescue` | 341 | 0 | 733 | 0 | 0 | 0 | 1074 | 31.8% | 14929 | 834037 |
| `dfs:finishFirst` | 332 | 0 | 741 | 1 | 0 | 0 | 1074 | 30.9% | 15404 | 775472 |
| `beam:mustCrossFirst@beam2000+mc-neighbor-budget-off` | 202 | 0 | 0 | 343 | 0 | 0 | 545 | 37.1% | 794 | 78457 |
| `dfs:mustCrossFirst+mc-neighbor-budget-off` | 148 | 0 | 397 | 0 | 0 | 0 | 545 | 27.2% | 43055 | 1663137 |
| `dfs:repair:repair(mustTurnBiased)` | 136 | 2 | 235 | 1 | 0 | 0 | 372 | 36.6% | 225021 | 4160387 |
| `dfs:repair:repair(turnBiased)` | 123 | 0 | 248 | 1 | 0 | 0 | 372 | 33.1% | 224501 | 5212635 |
