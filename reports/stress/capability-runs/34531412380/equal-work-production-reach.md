# Equal-work pricing × production reach

Decision-bearing integration status: **READY**.

EW1: 2015 cells, 60 levels, 34 techniques.
Production: 1802 rows across corpus1, corpus2, 48114 matching attempts, commits 92c3155837c695312e9e14b95b631b750a25ac0a.

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
| `repair|score=repair|guidance=standard` | 2/60 | 9,823,836 | 1341 | 222 | 48,567,850,222 | 0 |
| `dfs|score=objectiveFirst|bias=none` | 0/60 | 10,000,098 | 1085 | 19 | 27,624,242,289 | 0 |
| `beam|score=perimeterSweep|bias=perimeterCCW|width=2000|retention=plain` | 4/60 | 1,483,293 | 1069 | 81 | 3,525,231,015 | 0 |
| `beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain` | 2/60 | 1,393,776 | 1040 | 181 | 3,058,765,626 | 0 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` | 3/60 | 2,927,474 | 1022 | 95 | 8,181,255,863 | 0 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=plain` | 3/60 | 2,943,330 | 993 | 91 | 8,016,187,538 | 0 |
| `dfs|score=intersectionHarvest|bias=none` | 0/60 | 10,000,090 | 985 | 10 | 19,647,014,718 | 0 |
| `admissible-order|tieBreak=default|lds=off` | 1/60 | 9,916,850 | 869 | 48 | 12,859,090,151 | 0 |
| `admissible-order|tieBreak=none|lds=off` | 1/60 | 9,890,850 | 788 | 30 | 11,790,172,739 | 0 |
| `dfs|score=perimeterSweep|bias=perimeterCW` | 0/60 | 10,000,090 | 665 | 26 | 8,041,047,066 | 0 |
| `repair|score=repair|guidance=must-turn-biased` | 0/35 | 10,000,047 | 628 | 32 | 7,294,483,214 | 0 |
| `dfs|score=perimeterSweep|bias=perimeterCCW` | 0/60 | 10,000,092 | 617 | 10 | 5,892,963,322 | 0 |
| `dfs|score=knotBuilder|bias=none` | 1/60 | 9,887,272 | 567 | 2 | 3,367,410,912 | 0 |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` | 5/60 | 3,341,314 | 560 | 142 | 6,761,828,114 | 0 |
| `beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` | 3/60 | 3,330,129 | 419 | 31 | 6,064,936,430 | 0 |
| `dfs|score=perimeterSweep|bias=sideCommitment` | 0/60 | 10,000,101 | 340 | 4 | 2,832,080,506 | 0 |
| `beam|score=objectiveFirst|bias=none|width=2000|retention=plain` | 2/60 | 1,182,440 | 312 | 17 | 1,373,618,456 | 0 |
| `beam|score=intersectionHarvest|bias=none|width=2000|retention=plain` | 2/60 | 1,158,344 | 305 | 29 | 1,342,538,717 | 0 |
| `dfs|score=perimeterSweep|bias=cornerHarvest` | 0/60 | 10,000,083 | 226 | 18 | 754,718,329 | 0 |
| `dfs|score=harvestThenFinish|bias=none` | 1/60 | 9,887,427 | 221 | 4 | 1,331,363,550 | 0 |
| `dfs|score=portalFirstTransfer|bias=none` | 1/60 | 9,887,366 | 183 | 17 | 1,567,910,257 | 0 |
| `dfs|score=mustCrossFirst|bias=none` | 0/60 | 10,000,093 | 182 | 2 | 739,593,224 | 0 |
| `dfs|score=perimeterSweep|bias=none` | 1/60 | 9,886,840 | 172 | 1 | 746,972,620 | 0 |
| `dfs|score=portalCommitted|bias=none` | 0/60 | 10,000,086 | 167 | 5 | 1,333,724,843 | 0 |
| `dfs|score=default|bias=none` | 1/60 | 9,887,412 | 164 | 1 | 80,038,223 | 0 |
| `dfs|score=finishFirst|bias=none` | 1/60 | 9,843,075 | 128 | 0 | 278,079,598 | 0 |
| `dfs|score=nearClosureRescue|bias=none` | 0/60 | 10,000,093 | 127 | 0 | 94,802,136 | 0 |
| `dfs|score=closureCommitment|bias=none` | 0/60 | 10,000,085 | 126 | 0 | 52,726,159 | 0 |
| `beam|score=mustCrossFirst|bias=none|width=2000|retention=plain` | 3/60 | 1,182,010 | 66 | 10 | 200,069,663 | 0 |
| `beam|score=harvestThenFinish|bias=none|width=2000|retention=plain` | 3/60 | 1,170,425 | 32 | 0 | 132,783,671 | 0 |
| `beam|score=knotBuilder|bias=none|width=2000|retention=plain` | 3/60 | 1,177,468 | 32 | 0 | 126,644,580 | 0 |
| `admissible-order|tieBreak=nearClosureRescue|lds=off` | 2/60 | 9,746,449 | 0 | 0 | 0 | 0 |
| `admissible-order|tieBreak=intersectionHarvest|lds=off` | 0/60 | 10,000,180 | 0 | 0 | 0 | 0 |
| `admissible-order|tieBreak=mustCrossFirst|lds=off` | 0/60 | 10,000,158 | 0 | 0 | 0 | 0 |

> This join prices and locates existing actions. It does not simulate predecessor-conditioned displacement or constitute a scheduler policy.
