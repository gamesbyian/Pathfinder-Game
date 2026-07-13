# Portfolio Scheduler Comparison Report

Generated: 2026-07-12T23:44:02.602Z
Commit: 6fe5de4
Corpus: data/levels.json
Budget: 30000ms
Levels run: 156

## Experiment definition

- Pass 1 cap: 500ms
- Pass 2 cap: 2000ms
- Pass 3 cap: 5000ms
- Pass 2 configs: beam:intersectionHarvest@beam5000(diverse), dfs:perimeterSweep/perimeterCW, beam:perimeterSweep/perimeterCW@beam2000
- Pass 3 configs: beam:intersectionHarvest@beam5000(diverse), beam:objectiveFirst@beam5000(diverse), beam:objectiveFirst@beam5000, beam:perimeterSweep/perimeterCW@beam2000

## Solve retention

- Legacy solved: 156
- Portfolio before fallback solved: 156
- Portfolio + fallback solved: 156
- Fallback-only solved: 0
- Unsolved in portfolio+fallback: 0
- Retained all legacy solves: yes

## Pass distribution

- Pass 1: 154
- Pass 2: 1
- Pass 3: 1
- Fallback: 0
- Unsolved: 0

## Runtime breakdown

- Legacy total: 42139ms
- Portfolio total: 66385ms
- Portfolio prep: 3263ms
- Portfolio attempt search: 63106ms
- Portfolio scheduler overhead: 16ms
- Fallback search: 0ms
- Total runtime delta: 24246ms
- Runtime ratio: 1.575

## Restart duplication

- Repeated attempt elapsed time: 7010ms
- Repeated-prefix node upper bound: 32851
- Configs with repeated work: 3
- Config-gate slices with repeated work: 10

## Late and fallback-only wins

- Level 145: pass2, beam:intersectionHarvest@beam5000(diverse), gate=458756
- Level 147: pass3, beam:perimeterSweep/perimeterCW@beam2000, gate=0

