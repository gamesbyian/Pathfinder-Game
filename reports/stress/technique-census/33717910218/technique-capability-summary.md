# Technique capability census — technique summary

Cross-matrix: 78505 unique cells (0 duplicate cell result(s) removed). Missing shards: none.

**Oracle union**: of 888 levels currently unsolved by the production ladder at the frozen baseline, 277 (31.2%) are solved by at least one T1 isolated technique at the full 50,000,000-node budget.

**Regression check**: of 1074 levels the production ladder currently solves, 35 have literally ZERO T1 isolated-technique solvers at the full budget — worth investigating directly if nonzero (see level-technique-coverage.json for which).

## T1 — previously-unsolved population (the capability-gap read)

| technique | solved | unique | node-cap | exhausted | referee-invalid | error | total | solve rate | avg ms | median solve nodes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `repair|score=repair|guidance=standard` | 113 | 37 | 306 | 469 | 0 | 0 | 888 | 12.7% | 448211 | 8279092 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` | 52 | 4 | 0 | 836 | 0 | 0 | 888 | 5.9% | 3561 | 357606 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` | 51 | 4 | 0 | 837 | 0 | 0 | 888 | 5.7% | 3679 | 305736 |
| `repair|score=repair|guidance=must-turn-biased` | 49 | 17 | 175 | 372 | 0 | 0 | 596 | 8.2% | 513585 | 16205371 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=plain+coarse-state-near-tie-retention-off` | 45 | 2 | 0 | 843 | 0 | 0 | 888 | 5.1% | 4683 | 290985 |
| `repair|score=repair|guidance=turn-biased` | 45 | 9 | 173 | 378 | 0 | 0 | 596 | 7.6% | 513939 | 10753928 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=plain` | 40 | 1 | 0 | 848 | 0 | 0 | 888 | 4.5% | 3262 | 290047 |
| `admissible-order|tieBreak=none|lds=off` | 38 | 7 | 850 | 0 | 0 | 0 | 888 | 4.3% | 46730 | 14090395 |
| `admissible-order|tieBreak=mustCrossFirst|lds=off` | 35 | 1 | 853 | 0 | 0 | 0 | 888 | 3.9% | 79385 | 11832651 |
| `admissible-order|tieBreak=nearClosureRescue|lds=off` | 34 | 1 | 854 | 0 | 0 | 0 | 888 | 3.8% | 78923 | 9196201 |
| `beam|score=perimeterSweep|bias=perimeterCCW|width=2000|retention=plain` | 34 | 6 | 0 | 854 | 0 | 0 | 888 | 3.8% | 1642 | 137310 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain+coarse-state-near-tie-retention-off` | 33 | 0 | 0 | 855 | 0 | 0 | 888 | 3.7% | 4746 | 297769 |
| `admissible-order|tieBreak=default|lds=off` | 31 | 1 | 857 | 0 | 0 | 0 | 888 | 3.5% | 80048 | 12941514 |
| `admissible-order|tieBreak=intersectionHarvest|lds=off` | 30 | 1 | 858 | 0 | 0 | 0 | 888 | 3.4% | 80282 | 11400130 |
| `beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain` | 30 | 7 | 0 | 858 | 0 | 0 | 888 | 3.4% | 1626 | 152972 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` | 26 | 0 | 0 | 862 | 0 | 0 | 888 | 2.9% | 3339 | 300705 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=plain+connectivity-axis-exhausted-off` | 24 | 0 | 0 | 864 | 0 | 0 | 888 | 2.7% | 4805 | 312497 |
| `beam|score=mustCrossFirst|bias=none|width=2000|retention=plain` | 22 | 0 | 0 | 866 | 0 | 0 | 888 | 2.5% | 1294 | 146759 |
| `beam|score=knotBuilder|bias=none|width=2000|retention=plain` | 21 | 1 | 0 | 867 | 0 | 0 | 888 | 2.4% | 1293 | 122390 |
| `dfs|score=perimeterSweep|bias=perimeterCCW` | 21 | 0 | 867 | 0 | 0 | 0 | 888 | 2.4% | 63805 | 4442220 |
| `dfs|score=perimeterSweep|bias=perimeterCW` | 20 | 0 | 868 | 0 | 0 | 0 | 888 | 2.3% | 63229 | 9482908 |
| `beam|score=harvestThenFinish|bias=none|width=2000|retention=plain` | 19 | 0 | 0 | 869 | 0 | 0 | 888 | 2.1% | 1474 | 122171 |
| `beam|score=intersectionHarvest|bias=none|width=2000|retention=plain` | 19 | 3 | 0 | 869 | 0 | 0 | 888 | 2.1% | 1386 | 123751 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain+connectivity-axis-exhausted-off` | 19 | 0 | 0 | 869 | 0 | 0 | 888 | 2.1% | 4928 | 297483 |
| `dfs|score=default|bias=none` | 18 | 0 | 870 | 0 | 0 | 0 | 888 | 2.0% | 61858 | 12403940 |
| `dfs|score=intersectionHarvest|bias=none` | 17 | 0 | 871 | 0 | 0 | 0 | 888 | 1.9% | 60257 | 20907462 |
| `dfs|score=perimeterSweep|bias=cornerHarvest` | 16 | 1 | 872 | 0 | 0 | 0 | 888 | 1.8% | 62949 | 8192935 |
| `dfs|score=portalFirstTransfer|bias=none` | 16 | 0 | 872 | 0 | 0 | 0 | 888 | 1.8% | 59070 | 15630035 |
| `beam|score=objectiveFirst|bias=none|width=2000|retention=plain` | 15 | 0 | 0 | 873 | 0 | 0 | 888 | 1.7% | 1286 | 147727 |
| `dfs|score=finishFirst|bias=none` | 15 | 0 | 873 | 0 | 0 | 0 | 888 | 1.7% | 61703 | 29696590 |
| `dfs|score=knotBuilder|bias=none` | 15 | 0 | 873 | 0 | 0 | 0 | 888 | 1.7% | 61585 | 25577170 |
| `dfs|score=harvestThenFinish|bias=none` | 14 | 0 | 874 | 0 | 0 | 0 | 888 | 1.6% | 61332 | 23204674 |
| `dfs|score=nearClosureRescue|bias=none` | 14 | 0 | 874 | 0 | 0 | 0 | 888 | 1.6% | 61636 | 39004525 |
| `dfs|score=perimeterSweep|bias=sideCommitment` | 14 | 1 | 874 | 0 | 0 | 0 | 888 | 1.6% | 61771 | 10014532 |
| `dfs|score=portalCommitted|bias=none` | 14 | 1 | 874 | 0 | 0 | 0 | 888 | 1.6% | 61122 | 23063124 |
| `dfs|score=objectiveFirst|bias=none` | 13 | 0 | 875 | 0 | 0 | 0 | 888 | 1.5% | 60341 | 27371900 |
| `dfs|score=closureCommitment|bias=none` | 12 | 0 | 876 | 0 | 0 | 0 | 888 | 1.4% | 61316 | 39469716 |
| `dfs|score=mustCrossFirst|bias=none` | 12 | 0 | 876 | 0 | 0 | 0 | 888 | 1.4% | 61767 | 31937133 |
| `dfs|score=perimeterSweep|bias=none` | 11 | 0 | 877 | 0 | 0 | 0 | 888 | 1.2% | 61831 | 7965107 |
| `dfs|score=mustCrossFirst|bias=none+mc-neighbor-budget-off` | 6 | 0 | 491 | 0 | 0 | 0 | 497 | 1.2% | 132079 | 25638838 |
| `beam|score=mustCrossFirst|bias=none|width=2000|retention=plain+mc-neighbor-budget-off` | 5 | 0 | 0 | 492 | 0 | 0 | 497 | 1.0% | 2002 | 118611 |

## T1 — previously-solved population (the regression-safety read)

| technique | solved | unique | node-cap | exhausted | referee-invalid | error | total | solve rate | avg ms | median solve nodes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` | 662 | 7 | 0 | 412 | 0 | 0 | 1074 | 61.6% | 2689 | 241134 |
| `repair|score=repair|guidance=standard` | 657 | 13 | 225 | 192 | 0 | 0 | 1074 | 61.2% | 186758 | 362290 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` | 653 | 10 | 0 | 421 | 0 | 0 | 1074 | 60.8% | 2589 | 244659 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain+coarse-state-near-tie-retention-off` | 628 | 4 | 0 | 446 | 0 | 0 | 1074 | 58.5% | 3686 | 227240 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=plain+coarse-state-near-tie-retention-off` | 623 | 2 | 0 | 451 | 0 | 0 | 1074 | 58.0% | 3641 | 223620 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=plain` | 610 | 1 | 0 | 464 | 0 | 0 | 1074 | 56.8% | 2448 | 228768 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` | 588 | 2 | 0 | 486 | 0 | 0 | 1074 | 54.7% | 2532 | 228314 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=plain+connectivity-axis-exhausted-off` | 570 | 0 | 0 | 504 | 0 | 0 | 1074 | 53.1% | 3734 | 222589 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain+connectivity-axis-exhausted-off` | 542 | 0 | 0 | 532 | 0 | 0 | 1074 | 50.5% | 3836 | 222629 |
| `beam|score=harvestThenFinish|bias=none|width=2000|retention=plain` | 497 | 0 | 0 | 577 | 0 | 0 | 1074 | 46.3% | 1153 | 90345 |
| `beam|score=objectiveFirst|bias=none|width=2000|retention=plain` | 491 | 0 | 0 | 583 | 0 | 0 | 1074 | 45.7% | 989 | 90769 |
| `beam|score=knotBuilder|bias=none|width=2000|retention=plain` | 490 | 0 | 0 | 584 | 0 | 0 | 1074 | 45.6% | 1003 | 89016 |
| `beam|score=mustCrossFirst|bias=none|width=2000|retention=plain` | 489 | 0 | 0 | 585 | 0 | 0 | 1074 | 45.5% | 994 | 89653 |
| `beam|score=intersectionHarvest|bias=none|width=2000|retention=plain` | 480 | 1 | 0 | 594 | 0 | 0 | 1074 | 44.7% | 1090 | 90364 |
| `beam|score=perimeterSweep|bias=perimeterCCW|width=2000|retention=plain` | 472 | 4 | 0 | 602 | 0 | 0 | 1074 | 43.9% | 1193 | 88455 |
| `beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain` | 469 | 8 | 0 | 605 | 0 | 0 | 1074 | 43.7% | 1200 | 88968 |
| `admissible-order|tieBreak=none|lds=off` | 452 | 10 | 621 | 1 | 0 | 0 | 1074 | 42.1% | 30287 | 228593 |
| `admissible-order|tieBreak=default|lds=off` | 425 | 0 | 649 | 0 | 0 | 0 | 1074 | 39.6% | 51107 | 241933 |
| `admissible-order|tieBreak=intersectionHarvest|lds=off` | 424 | 0 | 650 | 0 | 0 | 0 | 1074 | 39.5% | 51497 | 273064 |
| `admissible-order|tieBreak=mustCrossFirst|lds=off` | 417 | 0 | 657 | 0 | 0 | 0 | 1074 | 38.8% | 51455 | 255977 |
| `admissible-order|tieBreak=nearClosureRescue|lds=off` | 410 | 1 | 664 | 0 | 0 | 0 | 1074 | 38.2% | 51422 | 212418 |
| `dfs|score=perimeterSweep|bias=perimeterCCW` | 374 | 0 | 699 | 1 | 0 | 0 | 1074 | 34.8% | 42607 | 1048448 |
| `dfs|score=perimeterSweep|bias=cornerHarvest` | 369 | 0 | 705 | 0 | 0 | 0 | 1074 | 34.4% | 40368 | 660529 |
| `dfs|score=default|bias=none` | 367 | 0 | 707 | 0 | 0 | 0 | 1074 | 34.2% | 38907 | 520707 |
| `dfs|score=perimeterSweep|bias=perimeterCW` | 367 | 1 | 707 | 0 | 0 | 0 | 1074 | 34.2% | 42170 | 956750 |
| `dfs|score=perimeterSweep|bias=sideCommitment` | 359 | 0 | 714 | 1 | 0 | 0 | 1074 | 33.4% | 40675 | 789741 |
| `dfs|score=objectiveFirst|bias=none` | 356 | 0 | 718 | 0 | 0 | 0 | 1074 | 33.1% | 39466 | 703762 |
| `dfs|score=intersectionHarvest|bias=none` | 354 | 1 | 719 | 1 | 0 | 0 | 1074 | 33.0% | 39690 | 825711 |
| `dfs|score=perimeterSweep|bias=none` | 354 | 0 | 719 | 1 | 0 | 0 | 1074 | 33.0% | 39463 | 763301 |
| `dfs|score=mustCrossFirst|bias=none` | 353 | 0 | 721 | 0 | 0 | 0 | 1074 | 32.9% | 39835 | 633925 |
| `dfs|score=portalFirstTransfer|bias=none` | 351 | 0 | 723 | 0 | 0 | 0 | 1074 | 32.7% | 38798 | 750963 |
| `dfs|score=portalCommitted|bias=none` | 350 | 0 | 724 | 0 | 0 | 0 | 1074 | 32.6% | 39681 | 690895 |
| `dfs|score=harvestThenFinish|bias=none` | 347 | 0 | 727 | 0 | 0 | 0 | 1074 | 32.3% | 39965 | 699418 |
| `dfs|score=knotBuilder|bias=none` | 346 | 0 | 728 | 0 | 0 | 0 | 1074 | 32.2% | 40302 | 665225 |
| `dfs|score=nearClosureRescue|bias=none` | 333 | 0 | 741 | 0 | 0 | 0 | 1074 | 31.0% | 40986 | 652460 |
| `dfs|score=finishFirst|bias=none` | 330 | 0 | 743 | 1 | 0 | 0 | 1074 | 30.7% | 41686 | 775879 |
| `dfs|score=closureCommitment|bias=none` | 329 | 0 | 745 | 0 | 0 | 0 | 1074 | 30.6% | 40854 | 626308 |
| `beam|score=mustCrossFirst|bias=none|width=2000|retention=plain+mc-neighbor-budget-off` | 199 | 0 | 0 | 346 | 0 | 0 | 545 | 36.5% | 1549 | 77195 |
| `dfs|score=mustCrossFirst|bias=none+mc-neighbor-budget-off` | 147 | 0 | 398 | 0 | 0 | 0 | 545 | 27.0% | 101836 | 1333848 |
| `repair|score=repair|guidance=turn-biased` | 139 | 3 | 90 | 143 | 0 | 0 | 372 | 37.4% | 351563 | 4992436 |
| `repair|score=repair|guidance=must-turn-biased` | 138 | 2 | 101 | 133 | 0 | 0 | 372 | 37.1% | 351673 | 3775558 |
