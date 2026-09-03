# Technique capability census — pair synergy (T3)

"neither alone" = the pair solved a level where T1 data shows neither member solved it alone.

| pair | pair solved | neither alone | total | synergy rate |
|---|---:|---:|---:|---:|
| `dfs|score=objectiveFirst|bias=none+beam|score=objectiveFirst|bias=none|width=5000|retention=mechanic-buckets` | 44 | 0 | 200 | 0.0% |
| `dfs|score=mustCrossFirst|bias=none+admissible-order|tieBreak=mustCrossFirst|lds=off` | 44 | 0 | 200 | 0.0% |
| `dfs|score=perimeterSweep|bias=cornerHarvest+beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain` | 42 | 0 | 200 | 0.0% |
| `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain+beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets` | 70 | 0 | 200 | 0.0% |
| `admissible-order|tieBreak=default|lds=off+admissible-order|tieBreak=none|lds=off` | 45 | 0 | 200 | 0.0% |
| `dfs|score=harvestThenFinish|bias=none+beam|score=harvestThenFinish|bias=none|width=2000|retention=plain` | 44 | 0 | 200 | 0.0% |
| `dfs|score=knotBuilder|bias=none+beam|score=knotBuilder|bias=none|width=2000|retention=plain` | 43 | 0 | 200 | 0.0% |
| `dfs|score=nearClosureRescue|bias=none+admissible-order|tieBreak=nearClosureRescue|lds=off` | 36 | 0 | 200 | 0.0% |
| `dfs|score=portalFirstTransfer|bias=none+dfs|score=portalCommitted|bias=none` | 45 | 0 | 200 | 0.0% |
| `repair|score=repair|guidance=standard+repair|score=repair|guidance=must-turn-biased` | 18 | 0 | 91 | 0.0% |