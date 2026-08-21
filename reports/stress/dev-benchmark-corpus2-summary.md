# Curated development benchmark — Corpus 2

Generated 2026-08-21T01:57:19.903Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **837** unsolved Corpus-2 levels.
- Mean badness — full pool: **20.00**, selected: **16.32** (lower = closer to solved).
- Selection reason split: **57** near-miss, **55** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 10 | 10 | 10 |
| must-cross-heavy/budget-edge | 23 | 23 | 80 |
| portal-heavy/budget-edge | 24 | 24 | 90 |
| high-intersection-burden/budget-edge | 55 | 55 | 657 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00039,R00046,R00112,R00355,R00466,R00477,R00506,R00692,R00709,R00726,R00923,R01000,R01011,R01022,R01080,R01179,R01229,R01290,R01368,R01485,R01642,R01652,R01849,R01860,R01953,R01998,R02002,R02057,R02077,R02117,R02131,R02149,R02170,R02180,R02195,R02222,R02270,R02282,R02286,R02297,R02334,R02335,R02347,R02348,R02356,R02382,R02387,R02419,R02432,R02451,R02454,R02455,R02456,R02459,R02470,R02488,R02497,R02509,R02515,R02526,R02527,R02533,R02535,R02541,R02543,R02552,R02565,R02570,R02586,R02593,R02598,R02616,R02637,R02640,R02643,R02654,R02676,R02691,R02723,R02724,R02745,R02751,R02758,R02816,R02839,R02883,R02884,R02902,R02915,R02963,R02979,R02988,R03020,R03031,R03037,R03071,R03115,R03153,R03180,R03200,R03205,R03215,R03223,R03241,R03254,R03261,R03269,R03274,R03301,R03316,R03321,R03353
```
