# Curated development benchmark — Corpus 2

Generated 2026-07-23T20:57:20.038Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1265** unsolved Corpus-2 levels.
- Mean badness — full pool: **19.00**, selected: **12.24** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 48 |
| portal-heavy/budget-edge | 23 | 23 | 121 |
| must-cross-heavy/budget-edge | 23 | 23 | 131 |
| high-intersection-burden/budget-edge | 49 | 49 | 965 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00059,R00156,R00239,R00323,R00440,R00477,R00546,R00813,R00877,R01011,R01019,R01022,R01024,R01155,R01157,R01269,R01380,R01397,R01504,R01553,R01642,R01698,R01763,R01799,R01854,R01857,R01860,R01957,R02019,R02025,R02029,R02050,R02056,R02060,R02062,R02088,R02098,R02117,R02123,R02148,R02150,R02189,R02191,R02196,R02211,R02213,R02220,R02239,R02263,R02267,R02279,R02315,R02344,R02358,R02360,R02364,R02376,R02382,R02393,R02427,R02443,R02448,R02450,R02451,R02480,R02488,R02515,R02530,R02534,R02547,R02552,R02555,R02565,R02566,R02567,R02569,R02575,R02606,R02717,R02754,R02758,R02812,R02844,R02845,R02883,R02884,R02898,R02902,R02912,R02919,R02969,R02971,R02986,R02988,R02989,R03020,R03021,R03031,R03148,R03151,R03161,R03169,R03171,R03178,R03192,R03222,R03241,R03261,R03299,R03345,R03354,R03358
```
