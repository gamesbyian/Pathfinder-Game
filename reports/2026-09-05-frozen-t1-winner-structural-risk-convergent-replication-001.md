# A second, independent outcome variable (frozen-T1 winner presence) converges on the same structural risk-factor block, with its own holdout replication

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — standardized-difference ranking on the pre-computed `hasFrozenT1Winner` grouping (derived from `frozenT1SupportClass`, matching `level-capability.json`'s own embedded `frozenT1SupportedVsNoWinnerEffects` field), holdout-split by `corpus` via `scripts/analyze-structural-holdout-replication.mjs`, no new dispatch
> **Decision:** `level-capability.json` already embeds a `frozenT1SupportedVsNoWinnerEffects` field — a standardized-difference ranking on a *different* outcome variable (whether a level has any frozen-T1 winner at all, not whether production solved it) that no report this session had queried before. Its top features (`constrainedObjects` 1.276, `turnConstraintLoad` 0.971, `constrainedObjectDensity` 0.838, `requiredPathLength` 0.828, `portals` 0.789) closely match the independently-derived `productionSolved`-based ranking's leaders. Running this outcome variable through the same corpus1/corpus2 holdout check used for the `productionSolved` ranking, it **also replicates**: Spearman 0.817, top-8 overlap 7/8, with the identical core feature block (`constrainedObjects`, `portals`, `turnConstraintLoad`, `constrainedObjectDensity`, `requiredPathLength`, `mustTurn`) leading in both corpora. Two distinct outcome definitions, evaluated independently, converge on the same structural risk block and both hold up under a holdout split — meaningfully stronger triangulation than replicating the same outcome variable twice.
> **Remaining gate:** none — a convergent-validity check using an already-embedded, previously-unqueried field plus already-collected census data.
> **Evidence role:** discovery — first use of `level-capability.json`'s embedded `frozenT1SupportedVsNoWinnerEffects` field this session, cross-checked against the independently-built `productionSolved` ranking
> **Selection:** whole census population (1,962 levels), not a sample

## Method

Noticed `level-capability.json` carries its own top-level `frozenT1SupportedVsNoWinnerEffects` array — a standardized-difference computation the census-generation tooling already performs for "does this level have any frozen-T1 winner" (independent of production-solved status), which no report this session had surfaced. Derived the equivalent per-level boolean (`hasFrozenT1Winner = frozenT1SupportClass` not in `{production-miss-without-frozen-t1-winner, production-solved-without-frozen-t1-winner}`, matching the embedded field's `noFrozenT1Winner: 646` count exactly) and ran it through the same holdout-replication tool used for the `productionSolved` ranking, split by `corpus1`/`corpus2`.

## Result

| | embedded (pooled, `frozenT1SupportedVsNoWinnerEffects`) | corpus1 (n=102) | corpus2 (n=1,700) |
|---|---:|---:|---:|
| `constrainedObjects` | 1.276 | −2.244 | −1.075 |
| `turnConstraintLoad` | 0.971 | −1.338 | −0.747 |
| `constrainedObjectDensity` | 0.838 | −1.270 | −0.648 |
| `requiredPathLength` | 0.828 | −1.672 | −0.570 |
| `portals` | 0.789 | −2.274 | −0.666 |

Spearman rank correlation between corpus1-only and corpus2-only rankings: **0.817**. Top-8 overlap: **7/8** (`width` in corpus1's top 8 is the one miss).

## Interpretation

This is convergent evidence from a genuinely different angle than the earlier holdout replications: `productionSolved` and `hasFrozenT1Winner` are related but distinct outcome definitions (`2026-09-05-frozen-t1-support-class-structural-risk-join-001.md` already showed the rare 35-cohort decouples them — solved without a frozen-T1 winner), yet both independently point to the same structural risk block, and both survive the same corpus1/corpus2 holdout check that caught a false positive in `2026-09-05-support-class-churn-structural-signal-holdout-failure-001.md`. This substantially raises confidence that `constrainedObjects`/`portals`/`turnConstraintLoad`/`constrainedObjectDensity`/`requiredPathLength` reflect a real, robust structural difficulty axis rather than an artifact of one specific outcome-labeling choice or a pooling quirk — the same holdout-check methodology now has one confirmed replication, one convergent replication on a second outcome variable, and one caught false positive, giving a calibrated sense of when this technique does and doesn't confirm a broadly-scanned finding.

Practically, this also means `level-capability.json`'s own embedded `frozenT1SupportedVsNoWinnerEffects` field can be trusted as a second, already-computed reference ranking for future structural-risk work, rather than something that needs re-deriving from scratch each time.

## What this does not establish

- Does not resolve the multicollinearity among these features (`2026-09-05-structural-risk-factor-multicollinearity-001.md`) — convergence across outcome variables is consistent with either several independently-replicating features or one underlying dimension expressed through correlated proxies.
- Does not test the parity-split holdout (only corpus1/corpus2) for this second outcome variable — the corpus split alone is a sufficient triangulation check given the goal (comparing against a different outcome, not re-testing split-balance sensitivity already covered for `productionSolved`).
- Single census snapshot (2026-09-03).
