# Solution-space fingerprint summary — stress-levels

Generated from `data/stress/stress-levels.json` by `npm run stress:solution-profile` (or auto-refreshed by solution-profile-compare.mjs when stale). See [`docs/solution-profile.md`](../../docs/solution-profile.md) for what each field means and the "saturated, not complete" caution.

- Levels: **102** total, **102** with hints, **0** with none.
- **0** levels have at least one hint whose own search terminated `exhaustive` (a real completeness signal, not the plateau heuristic below).
- Mean hints/level: **14.6**. Mean pairwise distinctiveness: **0.3262**. Mean turn rate: **0.5389** (cw fraction **0.5079**).
- Must-cross order: **35** / 43 multi-must-cross levels show a single rigid entry+completion order.
- Discovery-saturation plateau: n/a (no level had enough hints to detect one).

## Provenance-source coverage

| Source | Levels with ≥ min-hints-per-source |
|---|---|
| witness | 0 |
| human-solved | 0 |
| complete-enumeration | 0 |
| prefix-anchored-completion | 73 |
| randomized-enumeration | 34 |
| production-solver | 33 |
| other | 0 |
