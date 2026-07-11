# Solution-space fingerprint summary — stress-levels

Generated from `data/stress/stress-levels.json` by `npm run stress:solution-profile`. See [`docs/solution-profile.md`](../../docs/solution-profile.md) for what each field means and the "saturated, not complete" caution.

- Levels: **102** total, **102** with hints, **0** with none.
- **0** levels have at least one hint whose own search terminated `exhaustive` (a real completeness signal, not the plateau heuristic below).
- Mean hints/level: **6.49**. Mean pairwise distinctiveness: **0.124**. Mean turn rate: **0.5417** (cw fraction **0.5098**).
- Must-cross order: **40** / 43 multi-must-cross levels show a single rigid entry+completion order.
- Discovery-saturation plateau: n/a (no level had enough hints to detect one).

## Provenance-source coverage

| Source | Levels with ≥ min-hints-per-source |
|---|---|
| witness | 0 |
| complete-enumeration | 0 |
| prefix-anchored-completion | 0 |
| randomized-enumeration | 0 |
| production-solver | 33 |
| other | 0 |
