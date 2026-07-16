# Curated development benchmark — Corpus 2

Generated 2026-07-16T06:15:02.280Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1486** unsolved Corpus-2 levels.
- Mean badness — full pool: **35.32**, selected: **23.69** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| must-cross-heavy/known-unsolved | 11 | 11 | 11 |
| high-intersection-burden/known-unsolved | 13 | 13 | 36 |
| default/budget-edge | 15 | 15 | 56 |
| must-cross-heavy/budget-edge | 18 | 18 | 126 |
| portal-heavy/budget-edge | 18 | 18 | 132 |
| high-intersection-burden/budget-edge | 37 | 37 | 1125 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00073,R00094,R00156,R00296,R00314,R00367,R00386,R00434,R00477,R00479,R00488,R00506,R00544,R00563,R00593,R00635,R00648,R00707,R00728,R00988,R01011,R01019,R01061,R01155,R01269,R01380,R01416,R01420,R01428,R01489,R01531,R01614,R01625,R01799,R01857,R01913,R02036,R02056,R02117,R02122,R02129,R02131,R02137,R02155,R02165,R02171,R02211,R02212,R02271,R02304,R02315,R02347,R02355,R02356,R02362,R02383,R02443,R02449,R02454,R02480,R02483,R02560,R02565,R02566,R02567,R02579,R02588,R02600,R02606,R02623,R02628,R02641,R02679,R02686,R02717,R02733,R02737,R02748,R02754,R02771,R02774,R02784,R02791,R02823,R02861,R02878,R02883,R02898,R02908,R02917,R02923,R02939,R02943,R02959,R02986,R03018,R03025,R03036,R03110,R03135,R03148,R03151,R03161,R03189,R03192,R03225,R03232,R03241,R03261,R03345,R03348,R03357
```
