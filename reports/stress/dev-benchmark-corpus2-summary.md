# Curated development benchmark — Corpus 2

Generated 2026-07-23T12:36:06.802Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1264** unsolved Corpus-2 levels.
- Mean badness — full pool: **18.99**, selected: **11.92** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 49 |
| portal-heavy/budget-edge | 23 | 23 | 123 |
| must-cross-heavy/budget-edge | 23 | 23 | 130 |
| high-intersection-burden/budget-edge | 49 | 49 | 962 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00156,R00238,R00239,R00242,R00323,R00440,R00866,R01011,R01022,R01024,R01099,R01535,R01554,R01642,R01672,R01698,R01765,R01799,R01854,R01856,R01857,R01860,R01957,R02003,R02025,R02056,R02059,R02062,R02088,R02098,R02117,R02123,R02148,R02154,R02177,R02195,R02196,R02207,R02211,R02213,R02220,R02239,R02252,R02267,R02279,R02315,R02344,R02346,R02367,R02376,R02392,R02427,R02443,R02454,R02480,R02491,R02510,R02534,R02552,R02566,R02567,R02570,R02573,R02575,R02592,R02597,R02606,R02623,R02646,R02649,R02717,R02723,R02728,R02745,R02754,R02757,R02758,R02791,R02802,R02812,R02859,R02883,R02884,R02898,R02902,R02919,R02947,R02969,R02971,R02988,R02989,R03008,R03045,R03097,R03102,R03112,R03151,R03153,R03171,R03178,R03185,R03192,R03201,R03205,R03222,R03241,R03246,R03282,R03286,R03299,R03323,R03358
```
