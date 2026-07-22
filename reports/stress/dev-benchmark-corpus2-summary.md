# Curated development benchmark — Corpus 2

Generated 2026-07-22T07:06:27.657Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1423** unsolved Corpus-2 levels.
- Mean badness — full pool: **18.59**, selected: **11.75** (lower = closer to solved).
- Selection reason split: **57** near-miss, **55** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 52 |
| portal-heavy/budget-edge | 22 | 22 | 132 |
| must-cross-heavy/budget-edge | 23 | 23 | 134 |
| high-intersection-burden/budget-edge | 50 | 50 | 1105 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00039,R00112,R00156,R00239,R00242,R00323,R00355,R00440,R00546,R00630,R00691,R00813,R00860,R00990,R01019,R01022,R01024,R01063,R01099,R01129,R01269,R01380,R01397,R01504,R01698,R01765,R01799,R01857,R01860,R01957,R02010,R02022,R02025,R02026,R02029,R02062,R02088,R02098,R02117,R02123,R02133,R02148,R02165,R02183,R02189,R02196,R02207,R02211,R02213,R02220,R02239,R02267,R02279,R02310,R02344,R02346,R02356,R02358,R02364,R02376,R02393,R02411,R02419,R02427,R02443,R02455,R02473,R02480,R02547,R02565,R02566,R02567,R02570,R02579,R02597,R02606,R02608,R02623,R02679,R02680,R02709,R02717,R02728,R02758,R02844,R02861,R02883,R02884,R02895,R02898,R02902,R02943,R02958,R02969,R02989,R03008,R03030,R03031,R03073,R03074,R03102,R03115,R03156,R03192,R03201,R03236,R03241,R03261,R03299,R03316,R03345,R03358
```
