# Curated development benchmark — Corpus 2

Generated 2026-07-16T10:09:25.410Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1464** unsolved Corpus-2 levels.
- Mean badness — full pool: **18.98**, selected: **15.04** (lower = closer to solved).
- Selection reason split: **57** near-miss, **55** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| must-cross-heavy/known-unsolved | 12 | 12 | 20 |
| default/budget-edge | 14 | 14 | 56 |
| high-intersection-burden/known-unsolved | 15 | 15 | 69 |
| must-cross-heavy/budget-edge | 17 | 17 | 125 |
| portal-heavy/budget-edge | 18 | 18 | 132 |
| high-intersection-burden/budget-edge | 36 | 36 | 1062 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00059,R00156,R00193,R00303,R00373,R00440,R00479,R00544,R00548,R00630,R00990,R01011,R01092,R01099,R01155,R01420,R01500,R01609,R01625,R01698,R01725,R01860,R01905,R02003,R02010,R02022,R02053,R02056,R02059,R02063,R02068,R02078,R02088,R02111,R02114,R02117,R02123,R02165,R02183,R02211,R02220,R02239,R02265,R02279,R02286,R02304,R02315,R02325,R02332,R02344,R02346,R02347,R02348,R02402,R02414,R02427,R02436,R02449,R02452,R02464,R02480,R02487,R02491,R02498,R02560,R02565,R02567,R02570,R02579,R02586,R02597,R02606,R02624,R02655,R02716,R02717,R02728,R02737,R02751,R02754,R02771,R02773,R02791,R02794,R02795,R02861,R02883,R02884,R02898,R02914,R02923,R02939,R02943,R02944,R02958,R02959,R02989,R03018,R03025,R03076,R03161,R03178,R03192,R03225,R03241,R03269,R03273,R03302,R03323,R03345,R03357,R03358
```
