# Curated development benchmark — Corpus 2

Generated 2026-08-05T01:26:05.776Z by `npm run stress:curate-dev-benchmark`. See [`scripts/stress/curate-dev-benchmark.mjs`](../../scripts/stress/curate-dev-benchmark.mjs) for the selection algorithm — NOT a difficulty-sorted top-N.

- **112** levels selected from a pool of **478** unsolved Corpus-2 levels.
- Mean badness — full pool: **24.52**, selected: **21.21** (lower = closer to solved).
- Selection reason split: **57** near-miss, **55** diversity, **0** dedup-backfill.

## Strata coverage

| Archetype / stability | Selected | Quota | Pool |
|---|---|---|---|
| default/budget-edge | 17 | 17 | 20 |
| must-cross-heavy/budget-edge | 22 | 22 | 45 |
| portal-heavy/budget-edge | 25 | 25 | 61 |
| high-intersection-burden/budget-edge | 48 | 48 | 352 |

## Running it

```sh
npm run stress:benchmark -- --corpus=data/stress/stress-levels-random.json --levels=R00039,R00046,R00059,R00112,R00239,R00242,R00285,R00691,R00732,R01080,R01091,R01092,R01129,R01155,R01179,R01234,R01269,R01609,R01613,R01652,R01655,R01673,R01698,R01706,R01719,R01761,R02010,R02011,R02025,R02026,R02032,R02038,R02039,R02099,R02106,R02118,R02119,R02123,R02125,R02134,R02137,R02138,R02180,R02184,R02189,R02192,R02195,R02196,R02198,R02204,R02209,R02213,R02221,R02275,R02277,R02279,R02281,R02282,R02286,R02287,R02291,R02356,R02444,R02451,R02453,R02456,R02463,R02470,R02526,R02527,R02530,R02541,R02545,R02547,R02552,R02610,R02612,R02615,R02616,R02623,R02637,R02646,R02691,R02717,R02724,R02788,R02799,R02810,R02813,R02816,R02864,R02870,R02871,R02875,R02878,R02884,R02956,R02959,R02969,R03043,R03046,R03049,R03115,R03123,R03126,R03141,R03151,R03222,R03241,R03286,R03294,R03298
```
