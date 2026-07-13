# Portfolio Scheduler Comparison Report

Generated: 2026-07-12T23:48:56.665Z
Commit: c4f0dbf
Corpus: data/stress/stress-levels.json
Budget: 30000ms
Levels run: 4

## Experiment definition

- Pass 1 cap: 500ms
- Pass 2 cap: 2000ms
- Pass 3 cap: 10000ms
- Pass 2 configs: beam:intersectionHarvest@beam5000(diverse), dfs:perimeterSweep/perimeterCW, beam:perimeterSweep/perimeterCW@beam2000
- Pass 3 configs: beam:intersectionHarvest@beam5000(diverse), beam:objectiveFirst@beam5000(diverse), beam:objectiveFirst@beam5000, beam:perimeterSweep/perimeterCW@beam2000, dfs:repair:repair(mustTurnBiased)

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
- Pass 3: 3
- Fallback: 0
- Unsolved: 0

## Runtime breakdown

- Legacy total: 63909ms
- Portfolio total: 38869ms
- Portfolio prep: 399ms
- Portfolio attempt search: 38467ms
- Portfolio scheduler overhead: 3ms
- Fallback search: 0ms
- Total runtime delta: -25040ms
- Runtime ratio: 0.608

## Restart duplication

- Repeated attempt elapsed time: 6508ms
- Repeated-prefix node upper bound: 239489
- Configs with repeated work: 4
- Config-gate slices with repeated work: 5

## Late and fallback-only wins

- Level 1: pass2, beam:perimeterSweep/perimeterCW@beam2000, gate=589833
- Level 2: pass3, dfs:repair:repair(mustTurnBiased), gate=917513
- Level 3: pass3, beam:intersectionHarvest@beam5000(diverse), gate=196608
- Level 4: pass3, beam:objectiveFirst@beam5000(diverse), gate=786437

