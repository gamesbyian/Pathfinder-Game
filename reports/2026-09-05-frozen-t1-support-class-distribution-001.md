# Reference distribution: `frozenT1SupportClass` across the full 2026-09-03 census

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `frozenT1SupportClass` tabulated across all 1,962 levels in `reports/stress/technique-niches/2026-09-03/level-capability.json`, no new dispatch
> **Decision:** the census carries five `frozenT1SupportClass` values: `frozen-t1-broadly-supported` (920, 46.9%), `production-miss-without-frozen-t1-winner` (611, 31.1%), `production-miss-frozen-t1-solvable` (277, 14.1%), `frozen-t1-thin-boundary` (119, 6.1%), and `production-solved-without-frozen-t1-winner` (35, 1.8%). The last figure (35) matches this session's prior handoff work's "35 production-solved/no-isolated-winner cohort" exactly, cross-confirming both counts independently.
> **Remaining gate:** none — reference characterization using already-collected data.
> **Evidence role:** discovery — this exact five-way breakdown had not been reported as a standalone reference table this session
> **Selection:** whole census population (1,962 levels), not a sample

## Method

Tabulated the `frozenT1SupportClass` field directly from `level-capability.json` across every level.

## Result

| `frozenT1SupportClass` | count | share |
|---|---:|---:|
| `frozen-t1-broadly-supported` | 920 | 46.9% |
| `production-miss-without-frozen-t1-winner` | 611 | 31.1% |
| `production-miss-frozen-t1-solvable` | 277 | 14.1% |
| `frozen-t1-thin-boundary` | 119 | 6.1% |
| `production-solved-without-frozen-t1-winner` | 35 | 1.8% |

## Interpretation

This is a small but useful reference table: nearly half the census (46.9%) is comfortably in the "broadly supported" class where both isolated and production capability agree the level is solvable, while the two "production-miss" classes together (45.2%) are where Workstream 1's action-selection work has its addressable residual — split between levels an isolated technique *can* solve but production currently misses (14.1%, the `-frozen-t1-solvable` class — Workstream 1's most direct target) and levels neither isolated nor production capability currently supports (31.1%). The rare `production-solved-without-frozen-t1-winner` class (1.8%, 35 levels) is the interesting inverse case already analyzed in prior session work — production succeeding where no isolated frozen-T1 technique does, presumably via retry/repair machinery the isolated single-technique cells do not model. `frozen-t1-thin-boundary` (6.1%) is the smallest class and was not otherwise characterized this session.

## What this does not establish

- Does not re-analyze the `production-solved-without-frozen-t1-winner` or `-thin-boundary` cohorts in depth — both already have or could use dedicated prior-session treatment.
- Single census snapshot (2026-09-03); per the standing multiplicity-fragility caution, class membership for any individual level is not guaranteed stable across a future refresh.
