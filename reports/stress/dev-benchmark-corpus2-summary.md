# Curated development benchmark — Corpus 2

Generated 2026-07-17T11:38:22.678Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1414** unsolved Corpus-2 levels.
- Mean badness — full pool: **18.45**, selected: **13.57** (lower = closer to solved).
- Selection reason split: **57** near-miss, **55** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| must-cross-heavy/known-unsolved | 12 | 12 | 21 |
| default/budget-edge | 14 | 14 | 54 |
| high-intersection-burden/known-unsolved | 15 | 15 | 74 |
| must-cross-heavy/budget-edge | 17 | 17 | 109 |
| portal-heavy/budget-edge | 18 | 18 | 131 |
| high-intersection-burden/budget-edge | 36 | 36 | 1025 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00156,R00239,R00296,R00303,R00314,R00440,R00506,R01011,R01019,R01022,R01099,R01269,R01397,R01416,R01420,R01500,R01625,R01698,R01857,R01860,R02002,R02003,R02022,R02050,R02056,R02088,R02098,R02099,R02117,R02123,R02131,R02150,R02189,R02207,R02211,R02217,R02220,R02239,R02256,R02279,R02304,R02315,R02344,R02346,R02348,R02349,R02387,R02392,R02402,R02427,R02436,R02443,R02464,R02491,R02517,R02554,R02560,R02567,R02570,R02575,R02579,R02582,R02586,R02597,R02623,R02649,R02716,R02717,R02758,R02771,R02791,R02792,R02823,R02839,R02849,R02861,R02878,R02883,R02891,R02923,R02943,R02947,R02958,R02959,R02969,R03014,R03018,R03030,R03064,R03076,R03087,R03115,R03135,R03161,R03177,R03178,R03188,R03192,R03200,R03210,R03216,R03225,R03241,R03257,R03261,R03269,R03302,R03317,R03323,R03345,R03348,R03357
```
