# Curated development benchmark — Corpus 2

Generated 2026-07-22T18:40:14.021Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1112** unsolved Corpus-2 levels.
- Mean badness — full pool: **17.83**, selected: **12.73** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 45 |
| must-cross-heavy/budget-edge | 23 | 23 | 108 |
| portal-heavy/budget-edge | 23 | 23 | 112 |
| high-intersection-burden/budget-edge | 49 | 49 | 847 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00039,R00082,R00112,R00156,R00239,R00296,R00306,R00320,R00323,R00367,R00440,R00466,R00477,R00506,R00813,R00943,R01006,R01011,R01020,R01022,R01024,R01155,R01234,R01269,R01290,R01333,R01397,R01504,R01535,R01655,R01698,R01718,R01860,R02001,R02006,R02025,R02026,R02056,R02057,R02088,R02089,R02098,R02105,R02117,R02123,R02134,R02142,R02150,R02189,R02211,R02220,R02239,R02279,R02282,R02286,R02296,R02343,R02344,R02346,R02356,R02358,R02367,R02384,R02393,R02443,R02454,R02456,R02468,R02487,R02493,R02509,R02526,R02565,R02567,R02597,R02602,R02623,R02667,R02717,R02733,R02745,R02765,R02786,R02812,R02844,R02858,R02871,R02888,R02898,R02923,R02969,R02971,R02986,R02989,R03018,R03151,R03178,R03188,R03192,R03198,R03201,R03236,R03241,R03257,R03261,R03269,R03270,R03299,R03323,R03325,R03338,R03358
```
