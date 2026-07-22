# Curated development benchmark — Corpus 2

Generated 2026-07-22T09:38:15.743Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1210** unsolved Corpus-2 levels.
- Mean badness — full pool: **18.24**, selected: **11.39** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 47 |
| must-cross-heavy/budget-edge | 23 | 23 | 120 |
| portal-heavy/budget-edge | 23 | 23 | 125 |
| high-intersection-burden/budget-edge | 49 | 49 | 918 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00039,R00059,R00112,R00156,R00239,R00296,R00323,R00440,R00477,R00546,R00813,R01006,R01011,R01022,R01024,R01155,R01269,R01397,R01535,R01553,R01642,R01655,R01698,R01765,R01854,R01856,R01860,R01870,R01957,R02025,R02029,R02056,R02057,R02059,R02060,R02062,R02088,R02098,R02117,R02123,R02135,R02150,R02154,R02189,R02207,R02211,R02217,R02220,R02239,R02267,R02279,R02344,R02346,R02358,R02364,R02384,R02393,R02419,R02427,R02443,R02456,R02463,R02493,R02498,R02509,R02534,R02547,R02567,R02573,R02579,R02597,R02606,R02623,R02717,R02723,R02728,R02757,R02765,R02812,R02844,R02893,R02898,R02923,R02969,R02971,R02989,R03018,R03028,R03030,R03031,R03068,R03076,R03102,R03112,R03151,R03161,R03171,R03178,R03185,R03192,R03200,R03218,R03222,R03236,R03241,R03261,R03299,R03303,R03320,R03323,R03338,R03345
```
