# Curated development benchmark — Corpus 2

Generated 2026-09-04T08:47:33.376Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **725** unsolved Corpus-2 levels.
- Mean badness — full pool: **13.66**, selected: **7.54** (lower = closer to solved).
- Selection reason split: **57** near-miss, **55** diversity, **0** dedup-backfill.

## Strata coverage

| Routing regime / stability | Selected | Quota | Pool |
|---|---|---|---|
| general/budget-edge | 9 | 9 | 9 |
| must-cross-heavy/budget-edge | 22 | 22 | 60 |
| multi-portal/budget-edge | 23 | 23 | 65 |
| intersection-heavy/budget-edge | 58 | 58 | 591 |

## Running it

```sh
npm run stress:measure-solver -- --corpus=data/stress/stress-levels-random.json --levels=R00143,R00355,R00417,R00506,R01000,R01006,R01011,R01016,R01052,R01080,R01086,R01124,R01174,R01179,R01461,R01477,R01489,R01504,R01568,R01571,R01642,R01652,R01764,R01849,R01854,R02019,R02020,R02029,R02032,R02049,R02059,R02072,R02077,R02080,R02117,R02118,R02150,R02151,R02162,R02168,R02170,R02180,R02183,R02191,R02231,R02270,R02277,R02302,R02356,R02367,R02387,R02398,R02419,R02422,R02427,R02431,R02437,R02445,R02446,R02448,R02451,R02456,R02459,R02468,R02530,R02533,R02541,R02565,R02567,R02586,R02588,R02590,R02625,R02640,R02643,R02661,R02733,R02741,R02751,R02757,R02789,R02802,R02896,R02902,R02956,R02975,R03030,R03031,R03033,R03049,R03056,R03067,R03115,R03137,R03153,R03156,R03161,R03168,R03169,R03178,R03201,R03205,R03216,R03241,R03242,R03259,R03261,R03269,R03303,R03308,R03316,R03353
```
