# A level's hint pool typically spans ~3 distinct solver code versions, up to 12

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — distinct `provenance[0].solver.version` values per level across all 1,700 files in `data/stress/hints-random/`, no new dispatch
> **Decision:** mean distinct solver versions per level's hint pool is 2.89, with a maximum of 12 for at least one level.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — a hint-corpus staleness/provenance-diversity check not previously computed this session
> **Selection:** whole corpus2 population (1,700 levels), not a sample

## Method

For each level's hint file, collected the distinct non-null `provenance[0].solver.version` values across all its stored hints and counted them.

## Result

| | value |
|---|---:|
| mean distinct versions per level | 2.89 |
| max distinct versions for one level | 12 |

## Interpretation

A typical level's stored solution hints were discovered across roughly 3 different points in the solver's development history, and at least one level's hints span 12 distinct versions. This is expected and healthy for a long-lived hint stash (solutions found by an older solver version generally remain valid unless the level schema or scoring itself changed), but it is useful context before treating a level's full hint pool as a single homogeneous population: a hint discovered under a much older solver version could in principle reflect different scoring/technique behavior than the current codebase's. This report does not find evidence of a problem, only surfaces the diversity as context for anyone doing provenance-sensitive analysis on this data in the future (e.g. filtering to only current-version hints for a stricter comparison).

## What this does not establish

- Does not check whether any specific old-version hint is actually invalid or stale under current code (would require re-validating solutions against the current solver, not attempted here).
- Does not correlate version diversity with anything else (level difficulty, hint count, etc.).
- Single hint-stash snapshot, corpus2 only.
