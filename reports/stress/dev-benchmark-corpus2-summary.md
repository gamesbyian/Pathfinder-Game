# Curated development benchmark — Corpus 2

Generated 2026-07-17T16:31:30.048Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1405** unsolved Corpus-2 levels.
- Mean badness — full pool: **18.12**, selected: **13.21** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 52 |
| portal-heavy/budget-edge | 23 | 23 | 132 |
| must-cross-heavy/budget-edge | 23 | 23 | 132 |
| high-intersection-burden/budget-edge | 49 | 49 | 1089 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00094,R00156,R00193,R00238,R00296,R00440,R00477,R00479,R00506,R00544,R00548,R00635,R00813,R00990,R01011,R01022,R01134,R01269,R01397,R01500,R01535,R01553,R01642,R01698,R01854,R01857,R01860,R02002,R02003,R02026,R02068,R02076,R02088,R02117,R02123,R02138,R02198,R02211,R02220,R02232,R02239,R02267,R02279,R02315,R02344,R02346,R02347,R02376,R02387,R02392,R02402,R02409,R02427,R02436,R02443,R02454,R02456,R02478,R02491,R02510,R02541,R02560,R02566,R02567,R02579,R02586,R02597,R02606,R02655,R02679,R02706,R02716,R02717,R02758,R02762,R02771,R02791,R02802,R02820,R02823,R02830,R02861,R02881,R02898,R02919,R02923,R02943,R02944,R02947,R02958,R02965,R02969,R03001,R03005,R03018,R03020,R03023,R03112,R03135,R03161,R03171,R03178,R03192,R03200,R03216,R03257,R03261,R03303,R03323,R03345,R03348,R03358
```
