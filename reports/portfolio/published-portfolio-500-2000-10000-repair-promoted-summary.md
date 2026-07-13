# Portfolio Scheduler Comparison Report

Generated: 2026-07-12T23:53:20.995Z
Commit: 3de130a
Corpus: data/levels.json
Budget: 30000ms
Levels run: 156

## Experiment definition

- Pass 1 cap: 500ms
- Pass 2 cap: 2000ms
- Pass 3 cap: 10000ms
- Pass 2 configs: beam:intersectionHarvest@beam5000(diverse), dfs:perimeterSweep/perimeterCW, beam:perimeterSweep/perimeterCW@beam2000
- Pass 3 configs: beam:intersectionHarvest@beam5000(diverse), beam:objectiveFirst@beam5000(diverse), beam:objectiveFirst@beam5000, beam:perimeterSweep/perimeterCW@beam2000, dfs:repair:repair(mustTurnBiased)

## Solve retention

- Legacy solved: 156
- Portfolio before fallback solved: 155
- Portfolio + fallback solved: 156
- Fallback-only solved: 1
- Unsolved in portfolio+fallback: 0
- Retained all legacy solves: yes

## Pass distribution

- Pass 1: 153
- Pass 2: 1
- Pass 3: 1
- Fallback: 1
- Unsolved: 0

## Runtime breakdown

- Legacy total: 43331ms
- Portfolio total: 70727ms
- Portfolio prep: 4107ms
- Portfolio attempt search: 65866ms
- Portfolio scheduler overhead: 17ms
- Fallback search: 737ms
- Total runtime delta: 27396ms
- Runtime ratio: 1.632

## Restart duplication

- Repeated attempt elapsed time: 7717ms
- Repeated-prefix node upper bound: 144681
- Configs with repeated work: 3
- Config-gate slices with repeated work: 10

## Late and fallback-only wins

- Level 110: fallback, dfs:perimeterSweep/perimeterCCW, gate=0
- Level 147: pass3, beam:perimeterSweep/perimeterCW@beam2000, gate=0
- Level 156: pass2, dfs:perimeterSweep/perimeterCW, gate=262146

