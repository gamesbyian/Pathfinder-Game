# Technique capability census — technique summary

Cross-matrix: 65469 cells. Missing shards: none.

**Oracle union**: of 733 levels currently unsolved by the production ladder at the frozen baseline, 199 (27.1%) are solved by at least one T1 isolated technique at the full 50,000,000-node budget.

**Regression check**: of 894 levels the production ladder currently solves, 11 have literally ZERO T1 isolated-technique solvers at the full budget — worth investigating directly if nonzero (see level-technique-coverage.json for which).

## T1 — previously-unsolved population (the capability-gap read)

| technique | solved | unique | node-cap | exhausted | referee-invalid | error | total | solve rate | avg ms | median solve nodes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `dfs:repair:repair` | 92 | 36 | 634 | 7 | 0 | 0 | 733 | 12.6% | 304015 | 9217802 |
| `beam:objectiveFirst@beam5000` | 69 | 6 | 0 | 2130 | 0 | 0 | 2199 | 3.1% | 2270 | 279874 |
| `beam:intersectionHarvest@beam5000` | 58 | 2 | 0 | 2140 | 0 | 0 | 2198 | 2.6% | 2315 | 268988 |
| `dfs:repair:repair(turnBiased)` | 36 | 11 | 458 | 3 | 0 | 0 | 497 | 7.2% | 344090 | 8617978 |
| `dfs:repair:repair(mustTurnBiased)` | 33 | 9 | 458 | 6 | 0 | 0 | 497 | 6.6% | 354092 | 11594419 |
| `beam:objectiveFirst@beam5000(diverse)` | 32 | 4 | 0 | 701 | 0 | 0 | 733 | 4.4% | 2030 | 302694 |
| `beam:intersectionHarvest@beam5000(diverse)` | 28 | 0 | 0 | 705 | 0 | 0 | 733 | 3.8% | 2063 | 288868 |
| `beam:perimeterSweep/perimeterCW@beam2000` | 25 | 6 | 0 | 708 | 0 | 0 | 733 | 3.4% | 845 | 148058 |
| `beam:perimeterSweep/perimeterCCW@beam2000` | 23 | 4 | 0 | 710 | 0 | 0 | 733 | 3.1% | 865 | 135790 |
| `dfs:perimeterSweep/perimeterCCW` | 19 | 1 | 714 | 0 | 0 | 0 | 733 | 2.6% | 23926 | 23521488 |
| `dfs:perimeterSweep/perimeterCW` | 19 | 1 | 714 | 0 | 0 | 0 | 733 | 2.6% | 23672 | 19226858 |
| `ida:none` | 19 | 4 | 714 | 0 | 0 | 0 | 733 | 2.6% | 21220 | 30117337 |
| `beam:mustCrossFirst@beam2000` | 17 | 2 | 0 | 1123 | 0 | 0 | 1140 | 1.5% | 800 | 100339 |
| `beam:harvestThenFinish@beam2000` | 15 | 2 | 0 | 717 | 0 | 0 | 732 | 2.0% | 721 | 104986 |
| `ida:mustCrossFirst` | 15 | 0 | 718 | 0 | 0 | 0 | 733 | 2.0% | 31796 | 36311273 |
| `ida:nearClosureRescue` | 15 | 0 | 718 | 0 | 0 | 0 | 733 | 2.0% | 31720 | 36246156 |
| `ida:intersectionHarvest` | 14 | 1 | 719 | 0 | 0 | 0 | 733 | 1.9% | 32377 | 28088494 |
| `beam:intersectionHarvest@beam2000` | 12 | 1 | 0 | 720 | 0 | 0 | 732 | 1.6% | 692 | 115087 |
| `dfs:mustCrossFirst` | 12 | 0 | 1128 | 0 | 0 | 0 | 1140 | 1.1% | 35103 | 32047774 |
| `dfs:perimeterSweep/cornerHarvest` | 12 | 1 | 721 | 0 | 0 | 0 | 733 | 1.6% | 23136 | 19984158 |
| `ida:default` | 11 | 0 | 722 | 0 | 0 | 0 | 733 | 1.5% | 32589 | 35352899 |
| `beam:knotBuilder@beam2000` | 10 | 1 | 0 | 723 | 0 | 0 | 733 | 1.4% | 672 | 89996 |
| `dfs:knotBuilder` | 10 | 1 | 723 | 0 | 0 | 0 | 733 | 1.4% | 22677 | 29808439 |
| `beam:objectiveFirst@beam2000` | 9 | 0 | 0 | 724 | 0 | 0 | 733 | 1.2% | 666 | 100375 |
| `dfs:perimeterSweep/sideCommitment` | 9 | 2 | 724 | 0 | 0 | 0 | 733 | 1.2% | 23257 | 29614283 |
| `dfs:harvestThenFinish` | 8 | 0 | 725 | 0 | 0 | 0 | 733 | 1.1% | 22780 | 29897870 |
| `dfs:intersectionHarvest` | 8 | 0 | 725 | 0 | 0 | 0 | 733 | 1.1% | 22511 | 38412646 |
| `dfs:objectiveFirst` | 8 | 0 | 725 | 0 | 0 | 0 | 733 | 1.1% | 22509 | 24648345 |
| `dfs:closureCommitment` | 7 | 0 | 726 | 0 | 0 | 0 | 733 | 1.0% | 22774 | 30195990 |
| `dfs:nearClosureRescue` | 7 | 0 | 726 | 0 | 0 | 0 | 733 | 1.0% | 22823 | 35078156 |
| `dfs:perimeterSweep` | 7 | 0 | 726 | 0 | 0 | 0 | 733 | 1.0% | 22685 | 28778772 |
| `dfs:default` | 6 | 0 | 727 | 0 | 0 | 0 | 733 | 0.8% | 22671 | 24928845 |
| `dfs:finishFirst` | 6 | 0 | 727 | 0 | 0 | 0 | 733 | 0.8% | 22779 | 38833653 |
| `dfs:portalCommitted` | 6 | 0 | 727 | 0 | 0 | 0 | 733 | 0.8% | 22573 | 31742547 |
| `dfs:portalFirstTransfer` | 5 | 0 | 728 | 0 | 0 | 0 | 733 | 0.7% | 22628 | 31352305 |

## T1 — previously-solved population (the regression-safety read)

| technique | solved | unique | node-cap | exhausted | referee-invalid | error | total | solve rate | avg ms | median solve nodes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `beam:objectiveFirst@beam5000` | 1468 | 8 | 0 | 1217 | 0 | 0 | 2685 | 54.7% | 1773 | 228567 |
| `beam:intersectionHarvest@beam5000` | 1454 | 8 | 0 | 1231 | 0 | 0 | 2685 | 54.2% | 1821 | 231334 |
| `beam:mustCrossFirst@beam2000` | 568 | 0 | 0 | 781 | 0 | 0 | 1349 | 42.1% | 621 | 88786 |
| `dfs:repair:repair` | 555 | 11 | 340 | 0 | 0 | 0 | 895 | 62.0% | 114984 | 406597 |
| `beam:objectiveFirst@beam5000(diverse)` | 553 | 5 | 0 | 342 | 0 | 0 | 895 | 61.8% | 1507 | 250664 |
| `beam:intersectionHarvest@beam5000(diverse)` | 551 | 7 | 0 | 344 | 0 | 0 | 895 | 61.6% | 1550 | 249684 |
| `dfs:mustCrossFirst` | 429 | 0 | 920 | 0 | 0 | 0 | 1349 | 31.8% | 24041 | 1101362 |
| `beam:intersectionHarvest@beam2000` | 410 | 2 | 0 | 485 | 0 | 0 | 895 | 45.8% | 566 | 94113 |
| `beam:knotBuilder@beam2000` | 402 | 0 | 0 | 493 | 0 | 0 | 895 | 44.9% | 539 | 94437 |
| `beam:objectiveFirst@beam2000` | 398 | 0 | 0 | 497 | 0 | 0 | 895 | 44.5% | 536 | 94876 |
| `beam:harvestThenFinish@beam2000` | 397 | 0 | 0 | 498 | 0 | 0 | 895 | 44.4% | 594 | 94985 |
| `beam:perimeterSweep/perimeterCW@beam2000` | 394 | 5 | 0 | 501 | 0 | 0 | 895 | 44.0% | 646 | 92502 |
| `beam:perimeterSweep/perimeterCCW@beam2000` | 382 | 4 | 0 | 513 | 0 | 0 | 895 | 42.7% | 646 | 88595 |
| `ida:none` | 359 | 8 | 535 | 1 | 0 | 0 | 895 | 40.1% | 13853 | 174659 |
| `ida:default` | 353 | 0 | 542 | 0 | 0 | 0 | 895 | 39.4% | 20603 | 369376 |
| `ida:mustCrossFirst` | 347 | 0 | 548 | 0 | 0 | 0 | 895 | 38.8% | 20314 | 246458 |
| `ida:intersectionHarvest` | 344 | 0 | 551 | 0 | 0 | 0 | 895 | 38.4% | 20756 | 421450 |
| `ida:nearClosureRescue` | 344 | 0 | 551 | 0 | 0 | 0 | 895 | 38.4% | 20504 | 198954 |
| `dfs:default` | 328 | 1 | 567 | 0 | 0 | 0 | 895 | 36.6% | 13958 | 977476 |
| `dfs:perimeterSweep` | 317 | 0 | 578 | 1 | 0 | 0 | 896 | 35.4% | 14297 | 1089223 |
| `dfs:perimeterSweep/perimeterCCW` | 315 | 1 | 580 | 1 | 0 | 0 | 896 | 35.2% | 15385 | 1442605 |
| `dfs:perimeterSweep/sideCommitment` | 315 | 0 | 580 | 1 | 0 | 0 | 896 | 35.2% | 14891 | 933898 |
| `dfs:perimeterSweep/perimeterCW` | 313 | 0 | 583 | 0 | 0 | 0 | 896 | 34.9% | 15399 | 1052276 |
| `dfs:portalFirstTransfer` | 313 | 0 | 583 | 0 | 0 | 0 | 896 | 34.9% | 14280 | 1073714 |
| `dfs:perimeterSweep/cornerHarvest` | 312 | 0 | 584 | 0 | 0 | 0 | 896 | 34.8% | 14862 | 757329 |
| `dfs:harvestThenFinish` | 311 | 0 | 584 | 0 | 0 | 0 | 895 | 34.7% | 14339 | 1044272 |
| `dfs:knotBuilder` | 306 | 0 | 589 | 0 | 0 | 0 | 895 | 34.2% | 14416 | 1052192 |
| `dfs:objectiveFirst` | 306 | 0 | 590 | 0 | 0 | 0 | 896 | 34.2% | 14333 | 833043 |
| `dfs:portalCommitted` | 301 | 0 | 595 | 0 | 0 | 0 | 896 | 33.6% | 14491 | 992770 |
| `dfs:intersectionHarvest` | 295 | 0 | 599 | 1 | 0 | 0 | 895 | 33.0% | 14588 | 821703 |
| `dfs:closureCommitment` | 287 | 0 | 608 | 0 | 0 | 0 | 895 | 32.1% | 14625 | 984148 |
| `dfs:nearClosureRescue` | 280 | 0 | 616 | 0 | 0 | 0 | 896 | 31.3% | 14857 | 852922 |
| `dfs:finishFirst` | 275 | 0 | 619 | 1 | 0 | 0 | 895 | 30.7% | 15335 | 836537 |
| `dfs:repair:repair(mustTurnBiased)` | 108 | 2 | 202 | 0 | 0 | 0 | 310 | 34.8% | 224120 | 4192859 |
| `dfs:repair:repair(turnBiased)` | 99 | 0 | 210 | 1 | 0 | 0 | 310 | 31.9% | 220896 | 5551143 |

