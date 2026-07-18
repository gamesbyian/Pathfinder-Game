# Curated development benchmark — Corpus 2

Generated 2026-07-18T03:00:17.408Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **746** unsolved Corpus-2 levels.
- Mean badness — full pool: **18.58**, selected: **13.30** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 30 |
| must-cross-heavy/budget-edge | 23 | 23 | 79 |
| portal-heavy/budget-edge | 23 | 23 | 80 |
| high-intersection-burden/budget-edge | 49 | 49 | 557 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R02443,R02451,R02456,R02468,R02470,R02471,R02472,R02491,R02498,R02515,R02530,R02547,R02552,R02567,R02575,R02579,R02582,R02597,R02606,R02623,R02637,R02640,R02646,R02647,R02654,R02667,R02679,R02683,R02685,R02696,R02706,R02717,R02723,R02724,R02733,R02744,R02745,R02754,R02756,R02758,R02765,R02768,R02774,R02778,R02779,R02791,R02803,R02812,R02815,R02820,R02823,R02832,R02842,R02849,R02857,R02859,R02861,R02871,R02884,R02898,R02919,R02927,R02943,R02947,R02958,R02959,R02967,R02969,R02971,R02988,R02989,R02992,R03000,R03018,R03019,R03020,R03030,R03033,R03037,R03073,R03076,R03097,R03106,R03122,R03135,R03136,R03149,R03151,R03153,R03161,R03171,R03178,R03190,R03192,R03198,R03205,R03222,R03241,R03246,R03261,R03266,R03269,R03274,R03280,R03288,R03299,R03302,R03323,R03334,R03338,R03357,R03358
```
