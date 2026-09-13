# Known-solution sample-profile summary — stress-levels

Generated from `data/stress/stress-levels.json` by `npm run stress:solution-profile` (or auto-refreshed by solution-profile-compare.mjs when stale). See [`docs/solver-solution-profile.md`](../../docs/solver-solution-profile.md) for what each field means and the "saturated, not complete" caution.

- Levels: **102** total, **102** with hints, **0** with none.
- **0** levels have at least one hint whose own search terminated `exhaustive` (an event-local context marker, not proof the stored library is complete).
- Mean hints/level: **331.52**. Mean pairwise distinctiveness: **0.5607** across **101** levels with at least one path pair. Mean turn rate: **0.532** (cw fraction **0.502**).
- Must-cross order: **4** / **43** support-comparable multi-must-cross levels show one observed entry+completion order; **43** levels have the mechanic at all.
- Discovery saturation: **59** / **100** chronology-comparable levels had a detected plateau; mean detected point **0.5367** (heuristic; no-plateau observations stay in the denominator and are not treated as missing).

## Provenance-origin coverage

| Origin | Levels with ≥ min-hints-per-source |
|---|---|
| witness | 0 |
| inherited-witness | 0 |
| transformed-witness | 0 |
| human-solved | 0 |
| external-constraint-solver | 0 |
| variant-parent-replay | 101 |
| pathfinder-solver | 100 |
| other | 0 |
