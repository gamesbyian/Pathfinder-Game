# Curated development benchmark — Corpus 2

Generated 2026-07-23T23:59:07.452Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1266** unsolved Corpus-2 levels.
- Mean badness — full pool: **19.10**, selected: **12.76** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 48 |
| portal-heavy/budget-edge | 23 | 23 | 121 |
| must-cross-heavy/budget-edge | 23 | 23 | 130 |
| high-intersection-burden/budget-edge | 49 | 49 | 967 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00046,R00059,R00156,R00239,R00323,R00440,R00466,R00477,R00691,R00860,R01019,R01022,R01024,R01099,R01155,R01157,R01269,R01397,R01504,R01698,R01763,R01799,R01854,R01860,R01957,R02025,R02050,R02056,R02060,R02062,R02117,R02123,R02148,R02150,R02189,R02191,R02196,R02211,R02213,R02220,R02239,R02263,R02267,R02279,R02286,R02296,R02310,R02315,R02344,R02347,R02358,R02360,R02364,R02376,R02393,R02416,R02419,R02427,R02443,R02448,R02450,R02480,R02488,R02493,R02530,R02534,R02545,R02552,R02565,R02566,R02567,R02569,R02575,R02597,R02606,R02616,R02717,R02733,R02758,R02810,R02812,R02815,R02844,R02845,R02859,R02883,R02884,R02898,R02902,R02919,R02960,R02971,R02988,R02989,R03021,R03030,R03031,R03092,R03148,R03151,R03156,R03169,R03171,R03178,R03192,R03222,R03299,R03325,R03345,R03354,R03358,R03367
```
