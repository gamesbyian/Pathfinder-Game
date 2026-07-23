# Curated development benchmark — Corpus 2

Generated 2026-07-23T22:59:24.380Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1268** unsolved Corpus-2 levels.
- Mean badness — full pool: **19.37**, selected: **12.68** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 48 |
| portal-heavy/budget-edge | 23 | 23 | 121 |
| must-cross-heavy/budget-edge | 23 | 23 | 129 |
| high-intersection-burden/budget-edge | 49 | 49 | 970 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00046,R00059,R00143,R00156,R00239,R00323,R00440,R00647,R00701,R00728,R00860,R00990,R01022,R01024,R01099,R01129,R01155,R01269,R01344,R01397,R01462,R01553,R01672,R01698,R01799,R01857,R01860,R02020,R02025,R02056,R02068,R02117,R02123,R02135,R02148,R02150,R02177,R02189,R02196,R02211,R02213,R02220,R02239,R02267,R02277,R02310,R02315,R02344,R02347,R02356,R02358,R02364,R02376,R02393,R02419,R02421,R02427,R02443,R02454,R02463,R02480,R02487,R02530,R02534,R02547,R02552,R02565,R02567,R02569,R02570,R02571,R02575,R02595,R02597,R02606,R02623,R02649,R02717,R02734,R02745,R02751,R02758,R02812,R02815,R02845,R02859,R02871,R02883,R02884,R02898,R02902,R02969,R02986,R02989,R03030,R03031,R03076,R03156,R03161,R03169,R03178,R03188,R03192,R03222,R03261,R03274,R03282,R03299,R03325,R03345,R03354,R03358
```
