# Portfolio-18 rare-capability temporal holdout on the refreshed census

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — direct join of the fixed `portfolio-18-specialists` composition from `data/stress/static-portfolio-confirmation-003-arms.json` against the refreshed `reports/stress/technique-niches/2026-09-03/level-capability.json`
> **Decision:** the old rare-capability conclusion survives the refreshed census. The fixed 18-technique portfolio retains **147/155 (94.8%)** of current singleton-exclusive wins carried by the 34-technique `full-menu`, versus **144/151 (95.4%)** on the earlier census. The eight current dropped-technique exclusives remain diffuse across seven techniques, with no dropped technique carrying more than two. This is a useful temporal holdout for the portfolio composition, not a production-wiring recommendation.
> **Remaining gate:** none — this holdout is complete; do not re-run it merely because a future census refreshes again unless the portfolio composition itself changes.
> **Evidence role:** observational-development / temporal holdout. The portfolio was selected before the refreshed census existed; no composition was retuned from the new outcomes.

## Why this is unusually useful

The earlier retention audit used the 2026-09-01 niche snapshot derived from the August technique census and found `portfolio-18-specialists` retained 144/151 full-menu singleton exclusives (95.4%). The 2026-09-03 census then produced substantial bidirectional capability churn: 229/1,962 levels changed support class, 94 gained singleton status, 100 lost it, and the isolated-oracle union itself moved only 1,313 -> 1,316.

That makes the refreshed census a natural temporal holdout for a portfolio chosen on earlier evidence. The question here is not whether the portfolio wins a production A/B; that was tested separately and closed negative for production replacement. The question is whether the portfolio's **rare-capability preservation claim** was an artifact of the old capability matrix.

## Current full-menu accounting

Canonicalized the refreshed action rows to the same 34 current attempt-config identities used by `full-menu` and split them by the already-fixed `portfolio-18-specialists` membership.

| group | techniques | singleton-exclusive participations | thin-boundary participations |
|---|---:|---:|---:|
| `portfolio-18-specialists` kept | 18 | **147** | **283** |
| dropped from `full-menu` | 16 | **8** | **25** |
| full 34-technique menu | 34 | **155** | **308** |

Singleton exclusives are true one-technique ownership within the measured action universe, so the kept/dropped sums can be read as a retention fraction: **147/155 = 94.8%**. Thin-boundary rows are technique participations on doubleton levels, so 283/308 is descriptive only and should not be treated as a distinct-level retention percentage.

The full current niche artifact reports 175 singleton levels overall. The 34-technique `full-menu` accounts for 155 of them; the remainder belong to measured ablation/flag variants outside this menu. The denominator here intentionally matches the earlier audit's scope: rare capability available to the same 34-technique menu the portfolio was curated from.

## Dropped techniques carrying current exclusives

Only seven of the sixteen dropped techniques carry any refreshed singleton-exclusive capability:

| exclusive wins | technique |
|---:|---|
| 2 | `admissible-order|tieBreak=nearClosureRescue|lds=off` |
| 1 | `dfs|score=perimeterSweep|bias=perimeterCW` |
| 1 | `dfs|score=perimeterSweep|bias=cornerHarvest` |
| 1 | `dfs|score=intersectionHarvest|bias=none` |
| 1 | `dfs|score=portalCommitted|bias=none` |
| 1 | `admissible-order|tieBreak=intersectionHarvest|lds=off` |
| 1 | `beam|score=knotBuilder|bias=none|width=2000|retention=plain` |

The other nine dropped techniques carry zero current singleton exclusives. This is essentially the same shape as the prior audit: rare losses remain distributed across a long tail rather than concentrated in one omitted specialist.

## Old vs refreshed holdout

| metric | old census audit | refreshed census | reading |
|---|---:|---:|---|
| full-menu singleton exclusives | 151 | 155 | small increase |
| kept singleton exclusives | 144 | 147 | small increase |
| dropped singleton exclusives | 7 | 8 | +1 |
| retention | **95.4%** | **94.8%** | essentially stable |
| dropped techniques with >=1 exclusive | 7 | 7 | unchanged concentration |
| maximum exclusives on one dropped technique | 1 | 2 | still diffuse |

The solver changed enough between censuses for the refreshed map to be genuinely different, yet the portfolio's rare-capability retention moved by only about 0.6 percentage points. This is stronger evidence for the *stability of the curation principle* than another analysis of the original matrix would have been.

## Important separation from production scheduling

This does **not** overturn `2026-09-04-static-portfolio-entrypoint-production-ab-001.md`. The real production ladder beat `portfolio-18-tranche-v2` 18/40 to 14/40, and three losses were dose truncations of techniques already present in the portfolio while one came from a production-only retry action. The refreshed rare-capability holdout answers a different question: whether the 18-technique composition itself silently discarded a concentrated block of census-measured specialist capability. It still does not.

The practical implication is therefore narrow:

- do not alter the 18-technique composition merely because the census refreshed;
- continue treating the production A/B's dose/context failures as the reason production replacement is closed;
- use refreshed singleton/doubleton membership for any future repricing or retention claim.

## Reproduction note

This is a deterministic join of two already-committed JSON artifacts, with attempt identities interpreted using the same current canonical identities already present in `data/stress/static-portfolio-confirmation-003-arms.json`. No new solving was performed.
