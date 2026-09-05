# Solution-space fingerprint summary — published

Generated from `data/levels.json` by `npm run stress:solution-profile` (or auto-refreshed by solution-profile-compare.mjs when stale). See [`docs/solution-profile.md`](../../docs/solution-profile.md) for what each field means and the "saturated, not complete" caution.

- Levels: **160** total, **160** with hints, **0** with none.
- **0** levels have at least one hint whose own search terminated `exhaustive` (a real completeness signal, not the plateau heuristic below).
- Mean hints/level: **374.35**. Mean pairwise distinctiveness: **0.7173**. Mean turn rate: **0.4942** (cw fraction **0.4942**).
- Must-cross order: **8** / 27 multi-must-cross levels show a single rigid entry+completion order.
- Mean discovery-saturation plateau point: **0.2672** of a level's hint corpus (heuristic — see doc; not proof of exhaustion).

## Provenance-source coverage

| Source | Levels with ≥ min-hints-per-source |
|---|---|
| witness | 0 |
| human-solved | 0 |
| complete-enumeration | 0 |
| prefix-anchored-completion | 56 |
| randomized-enumeration | 107 |
| isolated-technique | 153 |
| production-solver | 156 |
| other | 156 |
