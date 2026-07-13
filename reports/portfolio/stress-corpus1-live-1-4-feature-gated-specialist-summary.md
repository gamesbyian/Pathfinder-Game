# Portfolio Scheduler Comparison Report

Generated: 2026-07-13T00:17:48.821Z
Commit: 1bcacbb
Corpus: data/stress/stress-levels.json
Budget: 30000ms
Levels run: 4

## Experiment definition

- Pass 1 cap: 500ms
- Pass 2 cap: 2000ms
- Pass 3 cap: 5000ms
- Pass 2 configs: beam:intersectionHarvest@beam5000(diverse), dfs:perimeterSweep/perimeterCW, beam:perimeterSweep/perimeterCW@beam2000
- Pass 3 configs: beam:intersectionHarvest@beam5000(diverse), beam:objectiveFirst@beam5000(diverse), beam:objectiveFirst@beam5000, beam:perimeterSweep/perimeterCW@beam2000
- Conditional passes: pass 4 @ 10000ms (dfs:repair:repair(mustTurnBiased))

## Solve retention

- Legacy solved: 4
- Portfolio before fallback solved: 4
- Portfolio + fallback solved: 4
- Fallback-only solved: 0
- Unsolved in portfolio+fallback: 0
- Retained all legacy solves: yes

## Pass distribution

- Pass 1: 0
- Pass 2: 1
- Pass 3: 2
- Conditional: 1
- Fallback: 0
- Unsolved: 0

## Runtime breakdown

- Legacy total: 65391ms
- Portfolio total: 39417ms
- Portfolio prep: 777ms
- Portfolio attempt search: 38637ms
- Portfolio scheduler overhead: 3ms
- Fallback search: 0ms
- Total runtime delta: -25974ms
- Runtime ratio: 0.603

## Restart duplication

- Repeated attempt elapsed time: 6513ms
- Repeated-prefix node upper bound: 225211
- Configs with repeated work: 4
- Config-gate slices with repeated work: 5

## Late and fallback-only wins

- Level 1: pass2, beam:perimeterSweep/perimeterCW@beam2000, gate=589833
- Level 2: pass4, dfs:repair:repair(mustTurnBiased), gate=917513
- Level 3: pass3, beam:intersectionHarvest@beam5000(diverse), gate=196608
- Level 4: pass3, beam:objectiveFirst@beam5000(diverse), gate=786437

