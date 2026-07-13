# Portfolio Scheduler Comparison Report

Generated: 2026-07-12T23:36:29.741Z
Commit: b8ec5a0
Corpus: data/stress/stress-levels.json
Budget: 30000ms
Levels run: 4

## Experiment definition

- Pass 1 cap: 500ms
- Pass 2 cap: 2000ms
- Pass 3 cap: 5000ms
- Pass 2 configs: beam:intersectionHarvest@beam5000(diverse), dfs:perimeterSweep/perimeterCW, beam:perimeterSweep/perimeterCW@beam2000
- Pass 3 configs: beam:objectiveFirst@beam5000, beam:perimeterSweep/perimeterCW@beam2000

## Solve retention

- Legacy solved: 4
- Portfolio before fallback solved: 1
- Portfolio + fallback solved: 4
- Fallback-only solved: 3
- Unsolved in portfolio+fallback: 0
- Retained all legacy solves: yes

## Pass distribution

- Pass 1: 0
- Pass 2: 1
- Pass 3: 0
- Fallback: 3
- Unsolved: 0

## Runtime breakdown

- Legacy total: 64381ms
- Portfolio total: 93630ms
- Portfolio prep: 601ms
- Portfolio attempt search: 30359ms
- Portfolio scheduler overhead: 6ms
- Fallback search: 62664ms
- Total runtime delta: 29249ms
- Runtime ratio: 1.454

## Restart duplication

- Repeated attempt elapsed time: 2508ms
- Repeated-prefix node upper bound: 0
- Configs with repeated work: 3
- Config-gate slices with repeated work: 5

## Late and fallback-only wins

- Level 1: pass2, beam:perimeterSweep/perimeterCW@beam2000, gate=589833
- Level 2: fallback, repair:repair(mustTurnBiased), gate=917513
- Level 3: fallback, beam:intersectionHarvest@beam5000(diverse), gate=196608
- Level 4: fallback, beam:objectiveFirst@beam5000(diverse), gate=786437

