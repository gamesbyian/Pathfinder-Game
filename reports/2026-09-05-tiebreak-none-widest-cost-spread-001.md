# `tieBreak=none` — the profile under live confirmation — has the widest successful-cost spread of admissible-order's 5 tie-break profiles

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `successfulNodes.p90 / successfulNodes.median` per `admissible-order` tie-break profile in `reports/stress/technique-niches/2026-09-03/level-capability.json`'s `actions` array, no new dispatch
> **Decision:** among admissible-order's 5 tie-break profiles, `tieBreak=none` (the profile solely responsible for `admissible-order-alternate-tiebreak-retry`'s real production wins, per `2026-09-05-admissible-order-tiebreak-production-exposure-001.md`, and the profile the live p75-derived fraction confirmation is testing) has the **widest** successful-solve cost spread: **59.62x** (median-to-p90), vs. 44.46-48.70x for the other four. This is directly relevant to interpreting the in-flight confirmation: a fraction sized off a single percentile (p75) of pooled cost-probe data is inherently more likely to mis-size specifically for the one profile with the widest individual cost distribution.
> **Remaining gate:** none for this specific observation — it is context for interpreting the live confirmation once it completes, not itself a confirmation.
> **Evidence role:** discovery — extends `2026-09-05-admissible-order-success-cost-tail-variance-001.md`'s family-level tail-variance finding to per-tie-break-profile granularity, specifically for the profile under live test
> **Selection:** whole admissible-order tie-break population (5 profiles), not a sample

## Method

Computed `successfulNodes.p90 / successfulNodes.median` for each of the 5 `admissible-order` tie-break profiles individually (extending `2026-09-05-admissible-order-success-cost-tail-variance-001.md`'s family-aggregate version to per-profile resolution).

## Result

| tie-break profile | successful-cost spread (p90/median) |
|---|---:|
| `tieBreak=default` | 44.46x |
| `tieBreak=intersectionHarvest` | 46.35x |
| `tieBreak=mustCrossFirst` | 46.21x |
| `tieBreak=nearClosureRescue` | 48.70x |
| **`tieBreak=none`** | **59.62x** |

## Interpretation

This sharpens the practical relevance of the family-level tail-variance finding: the specific profile under live confirmation is not an arbitrary or representative member of its family for this purpose — it is the profile with the *most* unpredictable successful-solve cost among the five. If the eventual confirmation result comes back mixed or borderline (neither a clean pass nor a clean fail), this cost-spread asymmetry is a concrete, already-quantified candidate explanation: a fraction derived from a single percentile of pooled multi-profile cost-probe data is a coarser fit for `tieBreak=none` specifically than it would be for, say, `tieBreak=default`, simply because `tieBreak=none`'s own cost distribution is the widest of the five to begin with.

## What this does not establish

- Does not itself determine whether the p75-derived fraction is correctly or incorrectly sized — that is the live confirmation's job.
- Does not explain *why* `tieBreak=none` specifically has the widest spread (structural correlate untested).
- Single census snapshot (2026-09-03).
