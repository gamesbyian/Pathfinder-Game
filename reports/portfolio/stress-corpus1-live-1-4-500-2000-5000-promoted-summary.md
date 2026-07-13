# Portfolio Scheduler Comparison Report

Generated: 2026-07-12T23:41:59.956Z
Commit: 6fe5de4
Corpus: data/stress/stress-levels.json
Budget: 30000ms
Levels run: 4

## Experiment definition

- Pass 1 cap: 500ms
- Pass 2 cap: 2000ms
- Pass 3 cap: 5000ms
- Pass 2 configs: beam:intersectionHarvest@beam5000(diverse), dfs:perimeterSweep/perimeterCW, beam:perimeterSweep/perimeterCW@beam2000
- Pass 3 configs: beam:intersectionHarvest@beam5000(diverse), beam:objectiveFirst@beam5000(diverse), beam:objectiveFirst@beam5000, beam:perimeterSweep/perimeterCW@beam2000

## Solve retention

- Legacy solved: 4
- Portfolio before fallback solved: 3
- Portfolio + fallback solved: 4
- Fallback-only solved: 1
- Unsolved in portfolio+fallback: 0
- Retained all legacy solves: yes

## Pass distribution

- Pass 1: 0
- Pass 2: 1
- Pass 3: 2
- Fallback: 1
- Unsolved: 0

## Runtime breakdown

- Legacy total: 62870ms
- Portfolio total: 43357ms
- Portfolio prep: 420ms
- Portfolio attempt search: 32520ms
- Portfolio scheduler overhead: 3ms
- Fallback search: 10414ms
- Total runtime delta: -19513ms
- Runtime ratio: 0.69

## Restart duplication

- Repeated attempt elapsed time: 6005ms
- Repeated-prefix node upper bound: 0
- Configs with repeated work: 3
- Config-gate slices with repeated work: 4

## Late and fallback-only wins

- Level 1: pass2, beam:perimeterSweep/perimeterCW@beam2000, gate=589833
- Level 2: fallback, repair:repair(mustTurnBiased), gate=917513
- Level 3: pass3, beam:intersectionHarvest@beam5000(diverse), gate=196608
- Level 4: pass3, beam:objectiveFirst@beam5000(diverse), gate=786437

