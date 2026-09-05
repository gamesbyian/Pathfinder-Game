# Beam's two named ablations pull in opposite directions in isolation: disabling near-tie retention helps, disabling connectivity-axis-exhausted hurts

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — isolated-census `solvedLevels` for beam's `+coarse-state-near-tie-retention-off` and `+connectivity-axis-exhausted-off` ablation variants vs. their plain-retention baselines, in `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `actions` array, no new dispatch
> **Decision:** for both `objectiveFirst` and `intersectionHarvest` at width 5000, disabling coarse-state near-tie retention *increases* isolated solved-count (`objectiveFirst`: 650→668; `intersectionHarvest`: 614→661), while disabling connectivity-axis-exhausted pruning *decreases* it (`objectiveFirst`: 650→594; `intersectionHarvest`: 614→561). The two ablations named after production's `coarse-state-near-tie-retention-disabled-retry` and `connectivity-axis-prune-disabled-retry` stages have opposite signs in this isolated view.
> **Remaining gate:** none — descriptive characterization using already-collected data.
> **Evidence role:** discovery — the isolated-census analogue of two production retry-tier ablations, not previously cross-checked against isolated capability this session
> **Selection:** the four beam configurations carrying these ablation suffixes at width 5000, not a sample of a larger set (these are the only such pairs in the current action menu)

## Method

Compared each ablation-suffixed beam action's `solvedLevels` against its plain-retention counterpart at the same scoring profile and width.

## Result

| scoring profile (width 5000) | plain | `+coarse-state-near-tie-retention-off` | `+connectivity-axis-exhausted-off` |
|---|---:|---:|---:|
| `objectiveFirst` | 650 | 668 (**+18**) | 594 (**−56**) |
| `intersectionHarvest` | 614 | 661 (**+47**) | 561 (**−53**) |

## Interpretation

This is directly informative for the two production retry tiers these ablations mirror. `coarse-state-near-tie-retention-disabled-retry` (production's retry stage that disables near-tie retention) is isolated-census-supported as a genuinely *better*, not just different, configuration for beam at width 5000 — disabling that retention actually solves more levels in isolation, consistent with it being a real, valuable production retry option rather than merely a diversity/fallback mechanism. `connectivity-axis-prune-disabled-retry`'s namesake ablation, by contrast, isolated-census-*hurts* beam substantially when the axis-exhausted pruning is turned off — meaning the connectivity-axis pruning is isolated-census-supported as beneficial, and its production "disabled" retry variant is winning production solves (6 real wins per `2026-09-05-production-win-share-concentration-001.md`) *despite*, not because of, what disabling it does to beam's raw solve count — plausibly because the disabled-pruning retry catches a small number of specific levels where the general isolated-census pattern doesn't hold, which is exactly the kind of rare-exclusive-capability case this session's redundancy analyses have repeatedly found for late-ladder retry tiers.

## What this does not establish

- Does not test these ablations at width 2000, or for other scoring profiles beyond `objectiveFirst`/`intersectionHarvest`.
- Does not explain the underlying search-mechanism reason either ablation's direction — only reports the isolated-census effect size.
- Single census snapshot (2026-09-03); does not itself confirm or refute the production stages' real-world value, which the existing redundancy-analysis reports address on production data directly.
