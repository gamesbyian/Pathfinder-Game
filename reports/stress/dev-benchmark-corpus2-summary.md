# Curated development benchmark — Corpus 2

Generated 2026-09-16T09:38:39.303Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **531** unsolved Corpus-2 levels.
- Mean badness — full pool: **14.07**, selected: **7.37** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Routing regime / stability | Selected | Quota | Pool |
|---|---|---|---|
| general/budget-edge | 9 | 9 | 9 |
| must-cross-heavy/budget-edge | 21 | 21 | 39 |
| multi-portal/budget-edge | 23 | 23 | 49 |
| intersection-heavy/budget-edge | 59 | 59 | 434 |

## Running it

```sh
npm run stress:measure-solver -- --corpus=data/stress/stress-levels-random.json --levels=R00046,R00536,R00709,R01000,R01006,R01011,R01016,R01080,R01086,R01179,R01269,R01380,R01397,R01461,R01551,R01576,R01632,R01652,R01673,R01698,R01854,R01953,R02019,R02029,R02032,R02039,R02049,R02057,R02059,R02072,R02117,R02118,R02121,R02161,R02170,R02174,R02177,R02180,R02183,R02185,R02191,R02196,R02231,R02258,R02260,R02270,R02277,R02282,R02286,R02302,R02309,R02334,R02345,R02356,R02367,R02387,R02392,R02422,R02437,R02445,R02448,R02453,R02459,R02461,R02470,R02486,R02498,R02530,R02531,R02539,R02541,R02552,R02564,R02565,R02567,R02590,R02596,R02625,R02640,R02661,R02664,R02703,R02709,R02733,R02751,R02754,R02789,R02828,R02844,R02857,R02892,R02896,R02951,R02988,R03030,R03033,R03056,R03067,R03115,R03121,R03156,R03168,R03178,R03203,R03216,R03259,R03261,R03269,R03308,R03316,R03323,R03353
```
