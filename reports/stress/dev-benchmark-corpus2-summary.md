# Curated development benchmark — Corpus 2

Generated 2026-07-17T23:43:29.887Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1398** unsolved Corpus-2 levels.
- Mean badness — full pool: **18.28**, selected: **12.28** (lower = closer to solved).
- Selection reason split: **57** near-miss, **55** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 54 |
| must-cross-heavy/budget-edge | 22 | 22 | 131 |
| portal-heavy/budget-edge | 23 | 23 | 133 |
| high-intersection-burden/budget-edge | 50 | 50 | 1080 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00059,R00156,R00193,R00239,R00296,R00323,R00440,R00477,R00544,R00866,R00877,R00977,R01011,R01022,R01024,R01063,R01099,R01155,R01190,R01269,R01290,R01397,R01535,R01642,R01698,R01765,R01857,R01860,R02003,R02022,R02026,R02056,R02076,R02088,R02117,R02123,R02154,R02211,R02220,R02232,R02239,R02267,R02279,R02282,R02304,R02346,R02347,R02376,R02378,R02392,R02419,R02427,R02443,R02448,R02451,R02454,R02456,R02534,R02565,R02566,R02567,R02573,R02579,R02597,R02606,R02608,R02623,R02634,R02655,R02679,R02706,R02717,R02723,R02732,R02733,R02737,R02756,R02758,R02771,R02788,R02791,R02795,R02812,R02820,R02823,R02830,R02861,R02881,R02898,R02923,R02958,R02965,R02988,R02989,R03018,R03112,R03153,R03161,R03171,R03178,R03188,R03192,R03198,R03211,R03222,R03261,R03299,R03300,R03323,R03345,R03353,R03358
```
