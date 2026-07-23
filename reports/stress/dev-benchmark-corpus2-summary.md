# Curated development benchmark — Corpus 2

Generated 2026-07-23T12:04:49.205Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1227** unsolved Corpus-2 levels.
- Mean badness — full pool: **19.18**, selected: **12.08** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 47 |
| portal-heavy/budget-edge | 23 | 23 | 120 |
| must-cross-heavy/budget-edge | 23 | 23 | 120 |
| high-intersection-burden/budget-edge | 49 | 49 | 940 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00046,R00059,R00156,R00239,R00323,R00440,R00477,R00546,R00632,R00813,R00866,R01011,R01022,R01024,R01155,R01380,R01535,R01553,R01554,R01642,R01698,R01765,R01799,R01854,R01860,R01957,R02025,R02056,R02059,R02062,R02088,R02098,R02112,R02117,R02119,R02123,R02148,R02154,R02191,R02196,R02204,R02207,R02211,R02213,R02220,R02239,R02252,R02267,R02279,R02286,R02315,R02344,R02346,R02360,R02376,R02392,R02427,R02443,R02448,R02451,R02479,R02491,R02521,R02527,R02534,R02552,R02566,R02567,R02573,R02592,R02597,R02606,R02717,R02723,R02728,R02734,R02754,R02757,R02758,R02802,R02812,R02859,R02878,R02919,R02947,R02959,R02969,R02971,R02989,R02992,R03056,R03102,R03112,R03141,R03151,R03153,R03161,R03171,R03178,R03185,R03192,R03218,R03222,R03241,R03261,R03282,R03299,R03320,R03323,R03327,R03345,R03358
```
