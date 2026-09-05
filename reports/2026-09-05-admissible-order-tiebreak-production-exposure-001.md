# Only 2 of admissible-order's 5 isolated-census tie-break profiles ever actually win in real production

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `winningConfig` for every admissible-order-attributed solve across `reports/stress/capability-runs/33841017634/per-level-corpus{1,2}.json` (1,802 rows, both corpora), no new dispatch
> **Decision:** of the 77 real production solves attributed to `admissible-order` in this run, all 77 are split between exactly two specific tie-break profiles: `tieBreak=default` (48 wins, matching the `admissible-order-fallback` stage's reported win count) and `tieBreak=none` (29 wins, matching `admissible-order-alternate-tiebreak-retry`'s reported win count). The other three isolated-census tie-break profiles this session's confirmation work has been testing (`intersectionHarvest`, `mustCrossFirst`, `nearClosureRescue`) contributed **zero** actual winning solves in this run, despite being reached/attempted (per `2026-09-05-production-arm-work-share-by-stage-and-profile-001.md`'s attempt counts for these same profile names in a different 40-level A/B).
> **Remaining gate:** none — descriptive characterization using already-collected data. Directly relevant to interpreting the in-flight admissible-order-alternate-tiebreak-retry fraction confirmation: if the confirmation comes back zero-loss, this finding is part of why — 3 of the 4 tie-break profiles sharing the tested work pool never convert to an actual win in this population, so shrinking their shared allowance costs nothing for those three regardless of the fraction chosen.
> **Evidence role:** discovery — a specific-config breakdown of the already-known 48/29 admissible-order-fallback/alternate-tiebreak-retry win split, not previously attributed to individual tie-break identities
> **Selection:** whole solved population attributed to admissible-order (77 of 1,073 total solves), not a sample

## Method

Filtered `per-level-corpus{1,2}.json`'s solved rows to `winningConfig` starting with `admissible-order`, tabulated exact tie-break identity.

## Result

| `winningConfig` | production wins | matches stage |
|---|---:|---|
| `tieBreak=default\|lds=off` | 48 | `admissible-order-fallback` |
| `tieBreak=none\|lds=off` | 29 | `admissible-order-alternate-tiebreak-retry` |
| `tieBreak=intersectionHarvest\|lds=off` | 0 | — |
| `tieBreak=mustCrossFirst\|lds=off` | 0 | — |
| `tieBreak=nearClosureRescue\|lds=off` | 0 | — |

## Interpretation

This resolves an apparent tension noticed while cross-referencing datasets this session: `equal-work-production-reach.json` (a different, earlier development artifact) also shows zero `reachedLevels`/`winningLevels` for these same three tie-break profiles, which is now confirmed as a real, consistent pattern in this run's production behavior rather than a data anomaly — these three profiles are attempted (they consume shared work-pool budget within `admissible-order-alternate-tiebreak-retry`) but never personally deliver the winning solve in this population; `tieBreak=none` captures all 29 real alternate-tiebreak-retry wins by itself. Combined with `2026-09-05-admissible-order-family-internal-ranking-001.md`'s finding that `tieBreak=none` also holds 17 of the family's 22 isolated-census exclusive claims (vs. 1 each for the other three), the isolated-census ranking and the real production behavior agree: `tieBreak=none` is doing essentially all of the useful work among the four alternate-tiebreak profiles, both in isolation and in production, on this population.

## What this does not establish

- Does not establish that `intersectionHarvest`/`mustCrossFirst`/`nearClosureRescue` never win in *any* production population — only that they did not in this specific run's solved levels.
- Does not itself determine whether the p75-based fraction sizing (which summed cost-probes across all four profiles) is correctly scoped given this finding — that is exactly what the in-flight confirmation and any follow-up sizing work should account for.
- Single production run.
