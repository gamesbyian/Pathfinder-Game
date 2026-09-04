# Equal-work pricing × production reach

Decision-bearing integration status: **READY**.

EW1: 2015 cells, 60 levels, 34 techniques.
Production: 1802 rows across corpus1, corpus2, 51231 matching attempts, commits 045bbe904a567929ef4ed3aeeded110bd13b5491.

## Level-local EW1 pricing headroom

EW1-solvable levels: 12; current production misses among them: 2.
- ew1-solvers-not-offered: 2
- no-ew1-solve: 41
- production-solved: 17

> EW1 solve-work is historical development evidence. Current-attempt work below/above that value is a pricing/reach comparison, not proof that identical work would reproduce the historical solve across revisions or stage contexts.

| corpus/level | production | EW1 solves | comparison | frozen capability |
|---|---:|---:|---|---|
| corpus2/R00118 | miss | 1 | ew1-solvers-not-offered | production-miss-frozen-t1-solvable |
| corpus2/R00732 | solved | 2 | production-solved | production-miss-without-frozen-t1-winner |
| corpus2/R02095 | solved | 1 | production-solved | production-miss-frozen-t1-solvable |
| corpus2/R02128 | solved | 7 | production-solved | production-miss-frozen-t1-solvable |
| corpus2/R02221 | solved | 5 | production-solved | production-miss-frozen-t1-solvable |
| corpus2/R02657 | solved | 12 | production-solved | production-miss-frozen-t1-solvable |
| corpus2/R02696 | miss | 3 | ew1-solvers-not-offered | production-miss-frozen-t1-solvable |
| corpus2/R02800 | solved | 1 | production-solved | production-miss-frozen-t1-solvable |
| corpus2/R02940 | solved | 1 | production-solved | production-miss-frozen-t1-solvable |
| corpus2/R03068 | solved | 1 | production-solved | production-miss-without-frozen-t1-winner |
| corpus2/R03171 | solved | 10 | production-solved | production-miss-frozen-t1-solvable |
| corpus2/R03274 | solved | 1 | production-solved | production-miss-without-frozen-t1-winner |

## Joined action view

| attempt config | EW1 solves/cells | EW1 mean work | production reached levels | production wins | production work | missing attempt work |
|---|---:|---:|---:|---:|---:|---:|
| `repair|score=repair|guidance=standard` | 2/60 | 9,823,836 | 1352 | 224 | 48,927,394,645 | 0 |
| `dfs|score=objectiveFirst|bias=none` | 0/60 | 10,000,098 | 1132 | 14 | 29,669,897,951 | 0 |
| `beam|score=perimeterSweep|bias=perimeterCCW|width=2000|retention=plain` | 4/60 | 1,483,293 | 1110 | 76 | 3,738,756,544 | 0 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` | 3/60 | 2,927,474 | 1062 | 93 | 8,577,409,825 | 0 |
| `beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain` | 2/60 | 1,393,776 | 1060 | 170 | 3,186,580,869 | 0 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=plain` | 3/60 | 2,943,330 | 1032 | 90 | 8,423,547,065 | 0 |
| `dfs|score=intersectionHarvest|bias=none` | 0/60 | 10,000,090 | 1028 | 9 | 20,997,159,547 | 0 |
| `admissible-order|tieBreak=default|lds=off` | 1/60 | 9,916,850 | 922 | 48 | 13,601,342,622 | 0 |
| `admissible-order|tieBreak=none|lds=off` | 1/60 | 9,890,850 | 836 | 29 | 12,512,316,043 | 0 |
| `dfs|score=perimeterSweep|bias=perimeterCW` | 0/60 | 10,000,090 | 697 | 21 | 8,930,071,754 | 0 |
| `dfs|score=perimeterSweep|bias=perimeterCCW` | 0/60 | 10,000,092 | 648 | 11 | 6,527,107,571 | 0 |
| `repair|score=repair|guidance=must-turn-biased` | 0/35 | 10,000,047 | 629 | 31 | 7,312,462,106 | 0 |
| `dfs|score=knotBuilder|bias=none` | 1/60 | 9,887,272 | 596 | 2 | 3,683,366,827 | 0 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` | 5/60 | 3,341,314 | 585 | 121 | 7,250,801,664 | 0 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` | 3/60 | 3,330,129 | 457 | 36 | 6,630,851,210 | 0 |
| `dfs|score=perimeterSweep|bias=sideCommitment` | 0/60 | 10,000,101 | 349 | 5 | 3,061,000,177 | 0 |
| `beam|score=objectiveFirst|bias=none|width=2000|retention=plain` | 2/60 | 1,182,440 | 339 | 12 | 1,511,443,537 | 0 |
| `beam|score=intersectionHarvest|bias=none|width=2000|retention=plain` | 2/60 | 1,158,344 | 328 | 29 | 1,489,940,546 | 0 |
| `dfs|score=harvestThenFinish|bias=none` | 1/60 | 9,887,427 | 231 | 4 | 1,360,841,454 | 0 |
| `dfs|score=perimeterSweep|bias=cornerHarvest` | 0/60 | 10,000,083 | 228 | 16 | 808,913,102 | 0 |
| `dfs|score=mustCrossFirst|bias=none` | 0/60 | 10,000,093 | 191 | 1 | 836,577,717 | 0 |
| `dfs|score=portalFirstTransfer|bias=none` | 1/60 | 9,887,366 | 183 | 16 | 1,581,063,589 | 0 |
| `dfs|score=perimeterSweep|bias=none` | 1/60 | 9,886,840 | 173 | 1 | 751,160,648 | 0 |
| `dfs|score=portalCommitted|bias=none` | 0/60 | 10,000,086 | 168 | 5 | 1,344,250,878 | 0 |
| `dfs|score=default|bias=none` | 1/60 | 9,887,412 | 166 | 1 | 81,352,305 | 0 |
| `dfs|score=finishFirst|bias=none` | 1/60 | 9,843,075 | 130 | 0 | 279,363,562 | 0 |
| `dfs|score=nearClosureRescue|bias=none` | 0/60 | 10,000,093 | 129 | 0 | 96,138,442 | 0 |
| `dfs|score=closureCommitment|bias=none` | 0/60 | 10,000,085 | 128 | 0 | 54,097,041 | 0 |
| `beam|score=mustCrossFirst|bias=none|width=2000|retention=plain` | 3/60 | 1,182,010 | 75 | 8 | 229,701,413 | 0 |
| `beam|score=harvestThenFinish|bias=none|width=2000|retention=plain` | 3/60 | 1,170,425 | 37 | 0 | 150,622,749 | 0 |
| `beam|score=knotBuilder|bias=none|width=2000|retention=plain` | 3/60 | 1,177,468 | 37 | 0 | 149,168,055 | 0 |
| `admissible-order|tieBreak=nearClosureRescue|lds=off` | 2/60 | 9,746,449 | 0 | 0 | 0 | 0 |
| `admissible-order|tieBreak=intersectionHarvest|lds=off` | 0/60 | 10,000,180 | 0 | 0 | 0 | 0 |
| `admissible-order|tieBreak=mustCrossFirst|lds=off` | 0/60 | 10,000,158 | 0 | 0 | 0 | 0 |

> This join prices and locates existing actions. It does not simulate predecessor-conditioned displacement or constitute a scheduler policy.
