# Curated development benchmark — Corpus 2

Generated 2026-09-12T10:41:15.469Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **652** unsolved Corpus-2 levels.
- Mean badness — full pool: **13.45**, selected: **7.12** (lower = closer to solved).
- Selection reason split: **57** near-miss, **55** diversity, **0** dedup-backfill.

## Strata coverage

| Routing regime / stability | Selected | Quota | Pool |
|---|---|---|---|
| general/budget-edge | 9 | 9 | 9 |
| must-cross-heavy/budget-edge | 22 | 22 | 51 |
| multi-portal/budget-edge | 24 | 24 | 64 |
| intersection-heavy/budget-edge | 57 | 57 | 528 |

## Running it

```sh
npm run stress:measure-solver -- --corpus=data/stress/stress-levels-random.json --levels=R00417,R00506,R00536,R00709,R01000,R01006,R01011,R01016,R01080,R01086,R01179,R01380,R01397,R01461,R01504,R01632,R01642,R01652,R01764,R01854,R02029,R02032,R02039,R02049,R02059,R02072,R02117,R02118,R02149,R02170,R02177,R02180,R02183,R02191,R02196,R02216,R02231,R02258,R02260,R02270,R02277,R02302,R02303,R02309,R02334,R02340,R02356,R02367,R02387,R02392,R02398,R02422,R02431,R02437,R02445,R02446,R02448,R02456,R02459,R02530,R02531,R02533,R02539,R02541,R02545,R02555,R02565,R02567,R02586,R02588,R02590,R02596,R02625,R02640,R02643,R02655,R02661,R02664,R02696,R02733,R02751,R02757,R02789,R02802,R02844,R02857,R02956,R02988,R03030,R03031,R03033,R03038,R03049,R03056,R03067,R03115,R03121,R03156,R03161,R03168,R03178,R03216,R03241,R03259,R03261,R03269,R03303,R03308,R03316,R03323,R03325,R03353
```
