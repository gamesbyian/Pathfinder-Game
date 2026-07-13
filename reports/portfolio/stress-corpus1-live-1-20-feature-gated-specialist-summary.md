# Portfolio Scheduler Comparison Report

Generated: 2026-07-13T01:22:24.478Z
Commit: a2ce1bb
Corpus: data/stress/stress-levels.json
Budget: 30000ms
Levels run: 20

## Experiment definition

- Pass 1 cap: 500ms
- Pass 2 cap: 2000ms
- Pass 3 cap: 5000ms
- Pass 2 configs: beam:intersectionHarvest@beam5000(diverse), dfs:perimeterSweep/perimeterCW, beam:perimeterSweep/perimeterCW@beam2000
- Pass 3 configs: beam:intersectionHarvest@beam5000(diverse), beam:objectiveFirst@beam5000(diverse), beam:objectiveFirst@beam5000, beam:perimeterSweep/perimeterCW@beam2000
- Conditional passes: pass 4 @ 60000ms (dfs:repair:repair); pass 4 @ 2000ms (dfs:repair:repair); pass 4 @ 10000ms (dfs:repair:repair(mustTurnBiased))

## Solve retention

- Legacy solved: 20
- Portfolio before fallback solved: 20
- Portfolio + fallback solved: 20
- Fallback-only solved: 0
- Unsolved in portfolio+fallback: 0
- Retained all legacy solves: yes

## Pass distribution

- Pass 1: 13
- Pass 2: 1
- Pass 3: 2
- Conditional: 4
- Fallback: 0
- Unsolved: 0

## Runtime breakdown

- Legacy total: 174578ms
- Portfolio total: 99182ms
- Portfolio prep: 636ms
- Portfolio attempt search: 98541ms
- Portfolio scheduler overhead: 5ms
- Fallback search: 0ms
- Total runtime delta: -75396ms
- Runtime ratio: 0.568

## Restart duplication

- Repeated attempt elapsed time: 12506ms
- Repeated-prefix node upper bound: 1524006
- Configs with repeated work: 6
- Config-gate slices with repeated work: 13

## Late and fallback-only wins

- Level 1: pass2, beam:perimeterSweep/perimeterCW@beam2000, gate=589833
- Level 2: pass4, dfs:repair:repair(mustTurnBiased), gate=917513
- Level 3: pass3, beam:intersectionHarvest@beam5000(diverse), gate=196608
- Level 4: pass3, beam:objectiveFirst@beam5000(diverse), gate=786437
- Level 5: pass4, dfs:repair:repair, gate=917516
- Level 12: pass4, dfs:repair:repair, gate=458758
- Level 13: pass4, dfs:repair:repair, gate=327681

