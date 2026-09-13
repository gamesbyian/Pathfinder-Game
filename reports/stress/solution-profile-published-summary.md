# Known-solution sample-profile summary — published

Generated from `data/levels.json` by `npm run stress:solution-profile` (or auto-refreshed by solution-profile-compare.mjs when stale). See [`docs/solver-solution-profile.md`](../../docs/solver-solution-profile.md) for what each field means and the "saturated, not complete" caution.

- Levels: **160** total, **160** with hints, **0** with none.
- **0** levels have at least one hint whose own search terminated `exhaustive` (an event-local context marker, not proof the stored library is complete).
- Mean hints/level: **374.35**. Mean pairwise distinctiveness: **0.7311** across **157** levels with at least one path pair. Mean turn rate: **0.4942** (cw fraction **0.4942**).
- Must-cross order: **7** / **26** support-comparable multi-must-cross levels show one observed entry+completion order; **27** levels have the mechanic at all.
- Discovery saturation: **26** / **32** chronology-comparable levels had a detected plateau; mean detected point **0.2692** (heuristic; no-plateau observations stay in the denominator and are not treated as missing).

## Provenance-origin coverage

| Origin | Levels with ≥ min-hints-per-source |
|---|---|
| witness | 0 |
| inherited-witness | 0 |
| transformed-witness | 0 |
| human-solved | 0 |
| external-constraint-solver | 77 |
| variant-parent-replay | 156 |
| pathfinder-solver | 156 |
| other | 94 |
