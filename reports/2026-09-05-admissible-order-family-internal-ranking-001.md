# `tieBreak=none` is admissible-order's best isolated performer, carrying 17 of the family's 22 total exclusive claims

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — per-action `solvedLevels`/`exclusiveLevels`/`thinBoundaryLevels` for all 5 `admissible-order` family members in `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `actions` array, no new dispatch
> **Decision:** `tieBreak=none` solves the most levels (490) and carries by far the most exclusive claims (17 of the family's 22 total, 77%). The other four tie-breaks (`default`, `intersectionHarvest`, `mustCrossFirst`, `nearClosureRescue`) cluster tightly at 444-456 solved with only 1-2 exclusive claims each.
> **Remaining gate:** none — descriptive characterization using already-collected data. Directly relevant background for the in-flight admissible-order-alternate-tiebreak-retry confirmation: see `2026-09-05-admissible-order-tiebreak-production-exposure-001.md` for how this isolated-census ranking maps onto real production wins.
> **Evidence role:** discovery — first within-family ranking of admissible-order's 5 tie-break profiles reported this session
> **Selection:** whole action population within the family (5 actions), not a sample

## Method

Read `solvedLevels`/`exclusiveLevels`/`thinBoundaryLevels` directly from every `admissible-order` action's entry in `level-capability.json`'s `actions` array.

## Result

| action | solved | exclusive | thin boundary |
|---|---:|---:|---:|
| `tieBreak=none\|lds=off` | 490 | 17 | 24 |
| `tieBreak=default\|lds=off` | 456 | 1 | 6 |
| `tieBreak=intersectionHarvest\|lds=off` | 454 | 1 | 4 |
| `tieBreak=mustCrossFirst\|lds=off` | 452 | 1 | 4 |
| `tieBreak=nearClosureRescue\|lds=off` | 444 | 2 | 4 |

## Interpretation

Within the family, `tieBreak=none` is clearly the strongest and most distinctively valuable tie-break rule, both solving more levels outright and carrying the vast majority of the family's exclusive-claim territory. The other three non-default tie-breaks (`intersectionHarvest`, `mustCrossFirst`, `nearClosureRescue`) look, from the isolated census alone, nearly redundant with `default` — each solving slightly fewer levels with only 1-2 exclusive claims apiece. This raises a natural question the companion production-exposure report addresses directly: does production's real usage of these tie-breaks match this isolated ranking?

## What this does not establish

- Does not test whether the isolated ranking predicts real production win share — see `2026-09-05-admissible-order-tiebreak-production-exposure-001.md`.
- Does not identify what specifically makes `tieBreak=none`'s 17 exclusive levels distinctive structurally.
- Single census snapshot (2026-09-03).
