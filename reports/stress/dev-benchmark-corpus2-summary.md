# Curated development benchmark — Corpus 2

Generated 2026-08-06T05:30:48.041Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **1016** unsolved Corpus-2 levels.
- Mean badness — full pool: **22.61**, selected: **16.04** (lower = closer to solved).
- Selection reason split: **58** near-miss, **54** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 37 |
| must-cross-heavy/budget-edge | 23 | 23 | 105 |
| portal-heavy/budget-edge | 23 | 23 | 111 |
| high-intersection-burden/budget-edge | 49 | 49 | 763 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00039,R00050,R00059,R00239,R00466,R00477,R00500,R00513,R00691,R00709,R00732,R00866,R00886,R00930,R00960,R00990,R01020,R01022,R01080,R01155,R01190,R01229,R01234,R01333,R01485,R01553,R01609,R01652,R01761,R01778,R01854,R01860,R01870,R02001,R02057,R02119,R02120,R02132,R02138,R02170,R02177,R02195,R02198,R02213,R02242,R02252,R02291,R02303,R02304,R02310,R02314,R02315,R02335,R02347,R02371,R02373,R02444,R02449,R02453,R02456,R02463,R02488,R02491,R02515,R02526,R02533,R02541,R02552,R02555,R02569,R02586,R02593,R02616,R02623,R02638,R02643,R02676,R02697,R02717,R02734,R02735,R02816,R02844,R02857,R02884,R02900,R02919,R02953,R02960,R02963,R02979,R02989,R03030,R03033,R03042,R03054,R03056,R03076,R03115,R03116,R03120,R03160,R03171,R03198,R03201,R03224,R03261,R03269,R03270,R03279,R03299,R03301
```
