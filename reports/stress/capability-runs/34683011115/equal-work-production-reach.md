# Equal-work pricing × production reach

Decision-bearing integration status: **READY**.

EW1: 2015 cells, 60 levels, 34 techniques.
Production: 1802 rows across corpus1, corpus2, 52534 matching attempts, commits 5973d6e4141f1480a5ebe58618e7e0d59dae9b8e.

## Level-local EW1 pricing headroom

EW1-solvable levels: 12; current production misses among them: 2.
- ew1-solvers-not-offered: 2
- no-ew1-solve: 40
- production-solved: 18

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
| `repair|score=repair|guidance=standard` | 2/60 | 9,823,836 | 1341 | 233 | 47,615,300,825 | 0 |
| `dfs|score=objectiveFirst|bias=none` | 0/60 | 10,000,098 | 1077 | 18 | 26,924,806,982 | 0 |
| `beam|score=perimeterSweep|bias=perimeterCCW|width=2000|retention=plain` | 4/60 | 1,483,293 | 1059 | 79 | 3,664,947,970 | 0 |
| `beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain` | 2/60 | 1,393,776 | 1036 | 183 | 3,170,422,312 | 0 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` | 3/60 | 2,927,474 | 1018 | 100 | 8,462,838,969 | 0 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=plain` | 3/60 | 2,943,330 | 988 | 91 | 8,351,454,149 | 0 |
| `dfs|score=intersectionHarvest|bias=none` | 0/60 | 10,000,090 | 978 | 8 | 18,983,642,779 | 0 |
| `admissible-order|tieBreak=default|lds=off` | 1/60 | 9,916,850 | 822 | 44 | 12,091,364,955 | 0 |
| `admissible-order|tieBreak=none|lds=off` | 1/60 | 9,890,850 | 761 | 31 | 11,329,872,193 | 0 |
| `dfs|score=perimeterSweep|bias=perimeterCW` | 0/60 | 10,000,090 | 660 | 27 | 8,000,446,642 | 0 |
| `repair|score=repair|guidance=must-turn-biased` | 0/35 | 10,000,047 | 624 | 35 | 7,275,735,127 | 0 |
| `dfs|score=perimeterSweep|bias=perimeterCCW` | 0/60 | 10,000,092 | 611 | 10 | 5,780,062,825 | 0 |
| `dfs|score=knotBuilder|bias=none` | 1/60 | 9,887,272 | 569 | 2 | 3,310,092,710 | 0 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` | 5/60 | 3,341,314 | 549 | 149 | 7,813,126,426 | 0 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` | 3/60 | 3,330,129 | 413 | 27 | 6,640,803,558 | 0 |
| `dfs|score=perimeterSweep|bias=sideCommitment` | 0/60 | 10,000,101 | 338 | 4 | 2,728,017,722 | 0 |
| `beam|score=objectiveFirst|bias=none|width=2000|retention=plain` | 2/60 | 1,182,440 | 308 | 17 | 1,369,385,989 | 0 |
| `beam|score=intersectionHarvest|bias=none|width=2000|retention=plain` | 2/60 | 1,158,344 | 302 | 31 | 1,348,085,290 | 0 |
| `dfs|score=perimeterSweep|bias=cornerHarvest` | 0/60 | 10,000,083 | 225 | 18 | 765,671,032 | 0 |
| `dfs|score=harvestThenFinish|bias=none` | 1/60 | 9,887,427 | 221 | 4 | 1,338,393,499 | 0 |
| `dfs|score=portalFirstTransfer|bias=none` | 1/60 | 9,887,366 | 183 | 18 | 1,584,079,494 | 0 |
| `dfs|score=mustCrossFirst|bias=none` | 0/60 | 10,000,093 | 182 | 2 | 748,110,222 | 0 |
| `dfs|score=perimeterSweep|bias=none` | 1/60 | 9,886,840 | 172 | 1 | 747,063,297 | 0 |
| `dfs|score=portalCommitted|bias=none` | 0/60 | 10,000,086 | 167 | 5 | 1,328,234,720 | 0 |
| `dfs|score=default|bias=none` | 1/60 | 9,887,412 | 163 | 1 | 75,227,749 | 0 |
| `dfs|score=finishFirst|bias=none` | 1/60 | 9,843,075 | 127 | 0 | 278,108,619 | 0 |
| `dfs|score=nearClosureRescue|bias=none` | 0/60 | 10,000,093 | 126 | 0 | 94,849,230 | 0 |
| `dfs|score=closureCommitment|bias=none` | 0/60 | 10,000,085 | 125 | 0 | 52,718,310 | 0 |
| `beam|score=mustCrossFirst|bias=none|width=2000|retention=plain` | 3/60 | 1,182,010 | 64 | 10 | 213,751,964 | 0 |
| `beam|score=harvestThenFinish|bias=none|width=2000|retention=plain` | 3/60 | 1,170,425 | 31 | 0 | 148,834,478 | 0 |
| `beam|score=knotBuilder|bias=none|width=2000|retention=plain` | 3/60 | 1,177,468 | 31 | 0 | 137,346,012 | 0 |
| `admissible-order|tieBreak=nearClosureRescue|lds=off` | 2/60 | 9,746,449 | 0 | 0 | 0 | 0 |
| `admissible-order|tieBreak=intersectionHarvest|lds=off` | 0/60 | 10,000,180 | 0 | 0 | 0 | 0 |
| `admissible-order|tieBreak=mustCrossFirst|lds=off` | 0/60 | 10,000,158 | 0 | 0 | 0 | 0 |

> This join prices and locates existing actions. It does not simulate predecessor-conditioned displacement or constitute a scheduler policy.
