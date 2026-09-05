# Solution-space profiles join safely to census corpus1 by array position, not the `level` field's literal value; production-solved signal is exploratory only (n=7 unsolved)

> **Status:** inconclusive
> **Last evidence:** 2026-09-05 — joined `reports/stress/solution-profile-corpus1.json` (102 rows) to `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `corpus1` rows (102 rows) via `data/stress/stress-levels.json`'s file-order `levels` array, no new dispatch
> **Decision:** the join methodology is established and safe (102/102 rows matched, no ambiguity) — see Method. The substantive question (does solution-space diversity predict production-solved status) gets only exploratory support: `pairwiseDistinctiveness.meanDistance` (path diversity) and raw hint/path count are much higher for production-solved corpus1 levels (0.340 vs 0.136, standardized diff 1.48; and 15.2 vs 6.6 paths, standardized diff 1.00) than unsolved ones, but corpus1 has only **7** production-unsolved levels, so this is a small-sample descriptive signal, not a confirmed effect, and no larger-n replication corpus exists (`solution-space-profiles` has no corpus2/1,700-level equivalent file committed).
> **Remaining gate:** would need either a materially larger unsolved-corpus1 sample (not available) or a `solution-profile-corpus2.json` generation (new dispatch, out of scope for this local-only session) to move past exploratory.
> **Evidence role:** discovery — first use this session of the previously-untapped `solution-space-profiles` research-data asset (status `current`, never inspected before this report)
> **Selection:** whole corpus1 population (102 levels), not a sample

## Method

`reports/stress/solution-profile-corpus1.json`'s per-level `level` field is a **1-indexed array position** into whatever levels file it was generated from (`scripts/stress/solution-profile-lib.mjs`'s `regenerateCorpusProfile`: `levels[levelNumber - 1]`), **not** the level's actual id string — a naming trap for any future naive join, since the census's `corpus1` rows in `level-capability.json` use real id strings (`S00001`, `R00408`, etc., 78 `R`-prefixed + 24 `S`-prefixed). Confirmed the mapping is safe by cross-checking: `data/stress/stress-levels.json`'s `levels` array is read by `readLevelsWithHints` in unmodified file order (no re-sort), so position `i+1` in the profile file corresponds exactly to `stress-levels.json.levels[i].id`. Verified `stress-levels.json` has the identical 102-level, 78-R/24-S composition as census `corpus1`, and joined by extracting `stress-levels.json`'s ids in file order and matching by position — 102/102 rows matched with no ambiguity.

Computed standardized mean differences (mean difference / pooled SD) between production-solved and production-unsolved corpus1 levels for the solution-profile's `combined` fields: `pairwiseDistinctiveness.meanDistance`, raw `pathCount`/`hintCount`, `cellVisitFrequency.entropy`, `turnDistribution.turnRateMean`/`cwFraction`, and `mustCrossOrder.rigid`/`distinctFirstEntryOrders`.

## Result

| feature | solved mean (n=95) | unsolved mean (n=7) | standardized diff |
|---|---:|---:|---:|
| `pairwiseDistinctiveness.meanDistance` | 0.340 | 0.136 | **1.483** |
| `hintCount` / `pathCount` (identical) | 15.19 | 6.57 | 1.000 |
| `mustCrossOrder.rigid` (n=38/5 with a must-cross order at all) | 0.789 | 1.000 | −0.730 |
| `mustCrossOrder.distinctFirstEntryOrders` | 1.158 | 1.000 | 0.518 |
| `turnDistribution.turnRateMean` | 0.537 | 0.562 | −0.401 |
| `cellVisitFrequency.entropy` | 6.409 | 6.558 | −0.388 |
| `turnDistribution.cwFraction` | 0.509 | 0.492 | 0.232 |
| `edgeUsageFrequency.entropy` | 6.679 | 6.617 | 0.143 |
| `cellVisitFrequency.touchedCells` | 98.98 | 97.71 | 0.047 |

## Interpretation

The two largest effects (`pairwiseDistinctiveness.meanDistance` and raw hint/path count) point the same direction: production-solved corpus1 levels have a richer, more diverse recorded solution space. But this is very plausibly reversed causality or a measurement artifact rather than a real solvability driver — a level's hint/path count in this legacy corpus reflects how much historical search effort was invested in that level (including from `isolatedOracleSolved` capability work), and a currently production-unsolved level is mechanically less likely to have accumulated many diverse solution paths regardless of any latent structural property. With only 7 unsolved rows, this cannot distinguish "harder levels have less diverse recorded solution spaces" from "harder levels simply received less historical solving effort, hence fewer recorded paths." `mustCrossOrder.rigid` (100% rigid among the 5 unsolved levels with any must-cross order, vs. 78.9% among the 38 solved ones) is directionally consistent with a real difficulty signal (rigid ordering more common where the level is unsolved) but again n=5 is far too small to weight heavily.

## What this does not establish

- Does not establish a causal or even a reliable correlational signal — n=7 unsolved is too small for the two headline effects to be trusted as anything beyond descriptive/exploratory.
- No `solution-profile-corpus2.json` (1,700-level) exists in the repo to attempt a larger-n replication; generating one would require new dispatch (running `npm run stress:solution-profile` against corpus2's hint stash), out of scope for this local-only session.
- Does not test whether the `hintCount`/diversity confound (effort-invested vs. structural difficulty) can be disentangled — a natural follow-up would condition on a proxy for "how many distinct solving attempts were made" rather than raw stored-hint count.
- The join methodology finding (position-based, not literal-`level`-value) is the more durable and immediately reusable output of this report regardless of the substantive signal's weakness.
