# The top structural production-risk features replicate across a corpus1/corpus2 holdout split, with one small-sample caveat

> **Status:** concluded-positive
> **Last evidence:** 2026-09-05 — `scripts/analyze-structural-holdout-replication.mjs` run against `reports/stress/technique-niches/2026-09-03/level-capability.json`, independently re-ranking all 23 numeric `features` by standardized difference on `productionSolved` within `corpus1` (n=102) and `corpus2` (n=1,700) separately, no new dispatch
> **Decision:** the top of `2026-09-04-production-structural-risk-factors-full-replication-001.md`'s ranking replicates well across this natural holdout: `constrainedObjects` ranks #1 in both corpora, and 7 of the top 8 features are shared between the two independently-computed rankings (Spearman rank correlation 0.819 across all 23 shared features). This is a genuine out-of-sample replication, not a re-scan of the same pooled data, and it survives the multiple-comparisons risk inherent in the original broad 17-feature scan: the leading features are not an artifact of one corpus's idiosyncrasies. **Caveat:** corpus1's split is extremely imbalanced (only 7 of 102 corpus1 levels are `productionSolved: false`), so corpus1's ranking alone is a noisy, low-n estimate and should not be treated as an independent confirmation with the same weight as corpus2's (n=819 solved / 881 unsolved) — the replication is meaningful mainly because corpus2 by itself already has ample sample size and its ranking (independently computed, having never been the basis for the original full-replication report, which pooled both corpora) agrees with the pooled result.
> **Remaining gate:** none — a holdout-replication check of an existing ranking using already-collected data, per the standing instruction to validate broadly-scanned findings against a natural holdout before treating them as strong evidence.
> **Evidence role:** forensic/methodological — a replication check the original ranking report did not perform, using a newly-added reusable script
> **Selection:** whole census population (1,962 levels, split by existing `corpus` field), not a sample

## Method

Built `scripts/analyze-structural-holdout-replication.mjs` (new reusable script; exports `analyzeHoldoutReplication(base, {groupField, splitField, splitValues})`), which generalizes the standardized-difference computation already used in `analyze-technique-relative-advantage.mjs` (previously hardwired to 8 fixed action-pair `solvingActions` comparisons) to any two-way level-level boolean grouping. Ran it with `groupField=productionSolved`, split on the existing `corpus` field into `corpus1` vs `corpus2` (the level-capability dataset's own natural, pre-existing partition — not a new arbitrary split invented for this check), computing the full 23-feature standardized-difference ranking independently within each corpus, then comparing via Spearman rank correlation and top-8 overlap.

## Result

| | corpus1 (n=102, 95 solved/7 unsolved) | corpus2 (n=1,700, 819 solved/881 unsolved) |
|---|---|---|
| #1 | `constrainedObjects` (−2.096) | `constrainedObjects` (−0.994) |
| #2 | `portals` (−1.462) | `portals` (−0.774) |
| #3 | `turnConstraintLoad` (−1.455) | `constrainedObjectDensity` (−0.656) |
| #4 | `constrainedObjectDensity` (−1.369) | `turnConstraintLoad` (−0.578) |
| #5 | `requiredPathLength` (−0.830) | `mustTurn` (−0.537) |
| #6 | `flippingFilters` (−0.759) | `requiredPathCoverageRatio` (−0.452) |
| #7 | `mustTurn` (−0.759) | `surround` (−0.402) |
| #8 | `surround` (−0.688) | `requiredPathLength` (−0.385) |

Spearman rank correlation across all 23 shared features: **0.819**. Top-8 overlap: **7/8** (`flippingFilters` in corpus1's top 8 is corpus2's only top-8 miss, appearing at #16 there instead).

## Interpretation

This is a genuine holdout replication of the `2026-09-04-production-structural-risk-factors-full-replication-001.md` ranking (which pooled both corpora), not a repeat of the same broad scan: the two rankings here are computed from disjoint level sets. `constrainedObjects` leading in both, and the same four features (`constrainedObjects`, `portals`, `turnConstraintLoad`, `constrainedObjectDensity`) occupying the top 4 in both (in slightly different order), directly answers the user's standing multiple-comparisons concern for this specific finding: the leading production-risk features are not a fluke of the pooled sample's specific composition. The `2026-09-05-structural-risk-factor-multicollinearity-001.md` finding (that these same four features are highly intercorrelated, likely reflecting one or two underlying difficulty dimensions rather than four independent mechanisms) is consistent with, and helps explain, why they replicate together as a block: a real, robust "object/constraint-density" difficulty dimension is the more defensible unit of confidence here, not four independently-verified named features.

The one meaningful qualifier is corpus1's tiny unsolved-count (7 rows) — any single feature's exact rank within corpus1 alone is not statistically reliable, and `flippingFilters` ranking #6 in corpus1 vs #16 in corpus2 is plausibly exactly this kind of small-sample noise rather than a genuine corpus-specific effect. The headline replication claim should rest on corpus2's ranking (which has adequate sample size on its own, n=819/881) agreeing with the pooled full-replication report, with corpus1's agreement as corroborating rather than independently decisive evidence.

## Follow-up: a balanced alternating-index split resolves the corpus1 small-sample caveat

To address the corpus1 small-unsolved-n caveat directly, re-ran the same tool with a second, better-balanced holdout: levels sorted by `levelId` and split by index parity (even/odd), giving two near-equal, well-balanced halves (even: n=981, 527 solved/454 unsolved; odd: n=981, 547 solved/434 unsolved — both far better balanced than corpus1's 95/7).

| | even half (n=981) | odd half (n=981) |
|---|---|---|
| #1 | `constrainedObjects` (−1.239) | `constrainedObjects` (−1.259) |
| #2 | `portals` (−0.972) | `turnConstraintLoad` (−0.904) |
| #3 | `constrainedObjectDensity` (−0.882) | `constrainedObjectDensity` (−0.871) |
| #4 | `turnConstraintLoad` (−0.813) | `portals` (−0.828) |
| #5 | `requiredPathCoverageRatio` (−0.765) | `mustTurn` (−0.787) |
| #6 | `requiredPathLength` (−0.707) | `requiredPathLength` (−0.745) |
| #7 | `mustTurn` (−0.632) | `requiredPathCoverageRatio` (−0.712) |
| #8 | `blocks` (−0.565) | `surround` (−0.564) |

Spearman rank correlation: **0.903** (stronger than the corpus1/corpus2 split's 0.819). Top-8 overlap: **7/8**. With both halves well-balanced, this is the more decisive replication check: the same top-4 feature block (`constrainedObjects`, `portals`, `constrainedObjectDensity`, `turnConstraintLoad`) again leads in both halves, in near-identical magnitude, resolving the corpus1-imbalance caveat above — the replication is not an artifact of corpus1's thin unsolved sample.

## What this does not establish

- Does not resolve the multicollinearity issue identified in `2026-09-05-structural-risk-factor-multicollinearity-001.md` — replication of a correlated feature block is not the same as identifying how many independent mechanisms actually exist.
- Single census snapshot (2026-09-03); does not test temporal stability of this ranking across census refreshes.
- The alternating-index split is not an independently-meaningful population boundary (unlike corpus1/corpus2) — it is a generic randomization-style holdout, useful for sample-size balance but not for testing generalization across a substantive population difference.
