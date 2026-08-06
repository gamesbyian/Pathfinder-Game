# Curated development benchmark — Corpus 2

Generated 2026-08-06T21:12:43.876Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **975** unsolved Corpus-2 levels.
- Mean badness — full pool: **20.95**, selected: **15.56** (lower = closer to solved).
- Selection reason split: **57** near-miss, **55** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 35 |
| must-cross-heavy/budget-edge | 23 | 23 | 94 |
| portal-heavy/budget-edge | 24 | 24 | 109 |
| high-intersection-burden/budget-edge | 48 | 48 | 737 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00039,R00046,R00180,R00239,R00242,R00500,R00813,R00866,R00886,R01020,R01022,R01080,R01155,R01229,R01234,R01485,R01535,R01609,R01642,R01799,R01860,R02057,R02064,R02117,R02120,R02125,R02149,R02170,R02177,R02189,R02195,R02213,R02221,R02252,R02270,R02282,R02291,R02296,R02297,R02304,R02310,R02335,R02347,R02356,R02419,R02454,R02456,R02515,R02533,R02547,R02552,R02561,R02565,R02570,R02573,R02586,R02593,R02615,R02616,R02623,R02637,R02643,R02654,R02676,R02717,R02723,R02733,R02734,R02745,R02758,R02773,R02787,R02813,R02816,R02844,R02884,R02902,R02919,R02923,R02963,R02979,R02989,R02994,R03008,R03020,R03030,R03031,R03033,R03042,R03046,R03049,R03066,R03071,R03073,R03076,R03116,R03126,R03136,R03151,R03171,R03192,R03201,R03205,R03223,R03241,R03254,R03261,R03269,R03274,R03286,R03301,R03303
```
