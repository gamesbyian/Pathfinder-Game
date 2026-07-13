# Portfolio Scheduler Comparison Report

Generated: 2026-07-12T23:24:51.571Z
Commit: f83dcf1
Corpus: data/levels.json
Budget: 30000ms
Levels run: 156

## Experiment definition

- Pass 1 cap: 250ms
- Pass 2 cap: 1000ms
- Pass 3 cap: 3000ms
- Pass 2 configs: beam:intersectionHarvest@beam5000(diverse), dfs:perimeterSweep/perimeterCW, beam:perimeterSweep/perimeterCW@beam2000
- Pass 3 configs: beam:objectiveFirst@beam5000, beam:perimeterSweep/perimeterCW@beam2000

## Solve retention

- Legacy solved: 156
- Portfolio before fallback solved: 154
- Portfolio + fallback solved: 156
- Fallback-only solved: 2
- Unsolved in portfolio+fallback: 0
- Retained all legacy solves: yes

## Pass distribution

- Pass 1: 149
- Pass 2: 4
- Pass 3: 1
- Fallback: 2
- Unsolved: 0

## Runtime breakdown

- Legacy total: 42498ms
- Portfolio total: 55615ms
- Portfolio prep: 1834ms
- Portfolio attempt search: 52525ms
- Portfolio scheduler overhead: 18ms
- Fallback search: 1238ms
- Total runtime delta: 13117ms
- Runtime ratio: 1.309

## Restart duplication

- Repeated attempt elapsed time: 5204ms
- Repeated-prefix node upper bound: 782685
- Configs with repeated work: 3
- Config-gate slices with repeated work: 14

## Late and fallback-only wins

- Level 110: fallback, dfs:perimeterSweep/perimeterCCW, gate=0
- Level 125: pass2, dfs:perimeterSweep/perimeterCW, gate=0
- Level 140: pass2, dfs:perimeterSweep/perimeterCW, gate=458759
- Level 144: pass2, beam:intersectionHarvest@beam5000(diverse), gate=655365
- Level 145: fallback, repair:repair, gate=458756
- Level 147: pass3, beam:perimeterSweep/perimeterCW@beam2000, gate=0
- Level 156: pass2, dfs:perimeterSweep/perimeterCW, gate=262146

