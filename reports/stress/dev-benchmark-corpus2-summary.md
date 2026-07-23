# Curated development benchmark — Corpus 2

Generated 2026-07-23T13:21:56.490Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1259** unsolved Corpus-2 levels.
- Mean badness — full pool: **18.89**, selected: **12.65** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 48 |
| portal-heavy/budget-edge | 23 | 23 | 121 |
| must-cross-heavy/budget-edge | 23 | 23 | 129 |
| high-intersection-burden/budget-edge | 49 | 49 | 961 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00039,R00059,R00112,R00156,R00169,R00239,R00242,R00323,R00367,R00440,R00546,R00646,R00691,R00860,R00934,R00990,R01011,R01022,R01024,R01099,R01157,R01269,R01380,R01397,R01462,R01504,R01642,R01698,R01763,R01765,R01799,R01854,R01857,R01860,R01957,R02025,R02044,R02050,R02056,R02062,R02088,R02117,R02123,R02148,R02189,R02191,R02196,R02211,R02213,R02220,R02239,R02252,R02263,R02267,R02279,R02344,R02346,R02358,R02364,R02376,R02382,R02384,R02393,R02427,R02443,R02448,R02450,R02480,R02515,R02534,R02552,R02555,R02565,R02566,R02567,R02575,R02582,R02597,R02606,R02623,R02717,R02733,R02734,R02745,R02754,R02758,R02812,R02844,R02845,R02883,R02884,R02893,R02898,R02902,R02969,R02988,R02989,R03002,R03021,R03031,R03092,R03097,R03171,R03178,R03192,R03222,R03241,R03299,R03313,R03345,R03354,R03358
```
