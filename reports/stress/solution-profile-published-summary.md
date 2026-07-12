# Solution-space fingerprint summary — published

Generated from `data/levels.json` by `npm run stress:solution-profile` (or auto-refreshed by solution-profile-compare.mjs when stale). See [`docs/solution-profile.md`](../../docs/solution-profile.md) for what each field means and the "saturated, not complete" caution.

- Levels: **156** total, **156** with hints, **0** with none.
- **0** levels have at least one hint whose own search terminated `exhaustive` (a real completeness signal, not the plateau heuristic below).
- Mean hints/level: **63.44**. Mean pairwise distinctiveness: **0.7187**. Mean turn rate: **0.4548** (cw fraction **0.4985**).
- Must-cross order: **10** / 26 multi-must-cross levels show a single rigid entry+completion order.
- Mean discovery-saturation plateau point: **0.6078** of a level's hint corpus (heuristic — see doc; not proof of exhaustion).

## Provenance-source coverage

| Source | Levels with ≥ min-hints-per-source |
|---|---|
| witness | 0 |
| complete-enumeration | 0 |
| prefix-anchored-completion | 48 |
| randomized-enumeration | 72 |
| production-solver | 120 |
| other | 104 |
