# Portfolio Scheduler Comparison Report

Generated: 2026-07-13T01:08:30.985Z
Commit: 8ed70e2
Corpus: data/levels.json
Budget: 30000ms
Levels run: 156

## Experiment definition

- Pass 1 cap: 500ms
- Pass 2 cap: 2000ms
- Pass 3 cap: 5000ms
- Pass 2 configs: beam:intersectionHarvest@beam5000(diverse), dfs:perimeterSweep/perimeterCW, beam:perimeterSweep/perimeterCW@beam2000
- Pass 3 configs: beam:intersectionHarvest@beam5000(diverse), beam:objectiveFirst@beam5000(diverse), beam:objectiveFirst@beam5000, beam:perimeterSweep/perimeterCW@beam2000
- Conditional passes: pass 4 @ 60000ms (dfs:repair:repair); pass 4 @ 2000ms (dfs:repair:repair); pass 4 @ 10000ms (dfs:repair:repair(mustTurnBiased))

## Solve retention

- Legacy solved: 156
- Portfolio before fallback solved: 156
- Portfolio + fallback solved: 156
- Fallback-only solved: 0
- Unsolved in portfolio+fallback: 0
- Retained all legacy solves: yes

## Pass distribution

- Pass 1: 155
- Pass 2: 0
- Pass 3: 1
- Conditional: 0
- Fallback: 0
- Unsolved: 0

## Runtime breakdown

- Legacy total: 41697ms
- Portfolio total: 64034ms
- Portfolio prep: 3023ms
- Portfolio attempt search: 60990ms
- Portfolio scheduler overhead: 21ms
- Fallback search: 0ms
- Total runtime delta: 22337ms
- Runtime ratio: 1.536

## Restart duplication

- Repeated attempt elapsed time: 6522ms
- Repeated-prefix node upper bound: 32851
- Configs with repeated work: 3
- Config-gate slices with repeated work: 9

## Late and fallback-only wins

- Level 147: pass3, beam:perimeterSweep/perimeterCW@beam2000, gate=0

