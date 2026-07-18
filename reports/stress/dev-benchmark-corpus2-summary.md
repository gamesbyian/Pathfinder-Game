# Curated development benchmark — Corpus 2

Generated 2026-07-18T04:26:33.052Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1396** unsolved Corpus-2 levels.
- Mean badness — full pool: **18.51**, selected: **11.96** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 51 |
| portal-heavy/budget-edge | 23 | 23 | 132 |
| must-cross-heavy/budget-edge | 23 | 23 | 135 |
| high-intersection-burden/budget-edge | 49 | 49 | 1078 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00059,R00112,R00156,R00193,R00239,R00242,R00323,R00440,R00477,R00813,R00988,R00990,R01011,R01019,R01022,R01024,R01063,R01269,R01397,R01642,R01698,R01719,R01765,R01799,R01854,R01857,R01860,R01957,R02002,R02003,R02022,R02025,R02059,R02062,R02088,R02098,R02117,R02123,R02133,R02148,R02181,R02183,R02189,R02196,R02207,R02211,R02216,R02217,R02220,R02239,R02267,R02279,R02315,R02344,R02346,R02376,R02392,R02419,R02427,R02443,R02454,R02480,R02491,R02534,R02541,R02547,R02552,R02565,R02566,R02567,R02579,R02597,R02606,R02608,R02717,R02728,R02758,R02771,R02811,R02859,R02861,R02883,R02884,R02898,R02919,R02943,R02958,R02969,R02989,R03008,R03030,R03102,R03112,R03135,R03150,R03153,R03171,R03180,R03192,R03198,R03200,R03201,R03216,R03236,R03241,R03246,R03265,R03282,R03299,R03323,R03345,R03358
```
