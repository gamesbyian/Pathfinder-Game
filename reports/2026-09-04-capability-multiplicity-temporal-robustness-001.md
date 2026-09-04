# Capability multiplicity predicts temporal robustness: a clean, monotonic signal from already-collected census data

> **Status:** concluded-positive
> **Last evidence:** 2026-09-04 — direct join of `reports/stress/technique-niches/2026-09-01/level-capability.json` (old) and `reports/stress/technique-niches/2026-09-03/level-capability.json` (fresh), the full 1,962-level comparable universe, no new dispatch
> **Decision:** across the full comparable census universe, a level's old-census solver multiplicity (`solverCount`) strongly and monotonically predicts whether it stays oracle-solvable after a solver revision. The rate of a level going from solvable-by-something to solvable-by-nothing (`flippedToZero`) falls **34.3% at singleton (solverCount=1) → 9.4% at doubleton → 3.6% (3-5) → 1.0% (6-10) → 0.3% (11+)** — an 11x range from a single ordinal feature already sitting in the committed census. This answers `solver-future-work.md`'s deferred "capability multiplicity as a predictor of ... temporal ... robustness" question, for the temporal-robustness clause specifically, with a real, clean, whole-population effect rather than a selected sample.
> **Remaining gate:** none for the temporal-robustness clause. The same future-work bullet's other two clauses (multiplicity as a predictor of budget-edge robustness, and of variant-family robustness) remain untested and are separate questions, not closed by this report.
> **Evidence role:** discovery — the question (does multiplicity predict robustness) was named in advance by `solver-future-work.md`; the specific bucketing/comparison used here was chosen after inspecting the data, and this is one temporal comparison pair, not a replicated design
> **Selection:** whole comparable population (1,962/1,962 levels present in both censuses), not a drawn sample — there is no population-selection pressure in the usual sense, but this is a single Sept-1-to-Sept-3 comparison; a different, larger, or smaller temporal gap could show a different magnitude

## Why this question, why now

`docs/solver-future-work.md`'s "Census cross-evidence reservoir" section lists, among deferred questions to keep untouched "until those cheaper gates nominate a recurring mechanism": *"capability multiplicity as a predictor of temporal, budget-edge, or variant-family robustness."* This session's own Gate 0C work (`scripts/analyze-technique-census-temporal-stability.mjs`, `reports/stress/technique-niches/2026-09-03/temporal-stability.{json,md}`) already built and ran exactly one of those cheaper gates — the refreshed-census temporal-stability join — and found real, substantial capability-ownership churn (e.g. repair's own solve-set Jaccard of only 0.713 despite a near-flat aggregate solved count). That is precisely the kind of "cheaper gate nominating a recurring mechanism" the future-work doc's stop rule asks for before testing a deferred question is worthwhile. This report tests the temporal-robustness clause directly, using data already sitting on disk from that same gate — no new census, no new dispatch, no bulk variant generation.

## Method

Loaded both already-committed `level-capability.json` snapshots directly and joined on `levelId` (1,962/1,962 comparable, matching Gate 0C's own `levelUniverse` accounting). Reused Gate 0C's exact definitions for consistency: `classStable` (`isolatedOracleSolved` matches between snapshots) and technique-identity comparison via `normalizeAttemptIdentityKey` from `modules/solver/attempt-identity.mjs` (the same normalizer this session's Gate 0A-0F work used throughout, needed because the old census used pre-naming-cleanup legacy spellings and the fresh one uses canonical pipe-delimited ones). Bucketed levels by their **old-census** `solverCount` (0, 1, 2, 3-5, 6-10, 11+) and measured, per bucket, the rate of losing all solving support entirely (`solverCount` old ≥1 → fresh `solverCount` = 0).

`productionSolved` was checked too but found 100.0% stable in every bucket — expected and uninformative, since it reflects the corpus's accumulated production-solve history (a monotone historical fact) rather than something the isolated-T1 census re-derives per snapshot; it is not part of this report's finding.

## Result

### Binary solvability loss rate by old-census multiplicity

| old `solverCount` | n | flipped to zero solvers | rate |
|---:|---:|---:|---:|
| 1 (singleton) | 181 | 62 | **34.3%** |
| 2 (doubleton) | 96 | 9 | **9.4%** |
| 3-5 | 197 | 7 | **3.6%** |
| 6-10 | 198 | 2 | **1.0%** |
| 11+ | 641 | 2 | **0.3%** |

(The `solverCount=0` bucket, 649 levels, is excluded here — "flipping to zero" is not a meaningful question for a level with no solvers to begin with; its own oracle-solved-stability rate was 86.9%, describing how often it stays at zero rather than gaining support, a different question from the one this table answers.)

### Among levels that stay solved, does the *specific* winning technique also survive?

Multiplicity's protective effect is not just about staying solved by *something* — it also predicts whether the *same* technique keeps solving the level:

| old `solverCount` | stayed solved (n) | at least one original technique retained (normalized) | fully replaced by a different technique |
|---:|---:|---:|---:|
| 1 (singleton) | 119 | 76 (**63.9%**) | 43 (36.1%) |
| 2 (doubleton) | 87 | 68 (**78.2%**) | 19 (21.8%) |

Even conditional on the level remaining oracle-solvable, singleton levels lose their *specific* solving-technique identity more than a third of the time — doubleton levels lose it noticeably less often. The same monotonic direction holds at this finer grain, not just at the binary solved/unsolved level.

## Interpretation

This is a clean, whole-population, monotonic effect spanning an 11x range on a single already-tracked ordinal feature (`solverCount`). The mechanism is intuitive and not circular: a level solved by many independent techniques has redundancy against any single technique's behavior drifting with a solver revision, while a singleton-solved level's entire "is this level in the capability map" status rests on one technique's exact current behavior. This has a direct, practical implication for how this repo's own research should weight census evidence: **a singleton-exclusive capability claim from one census snapshot is meaningfully less durable than a claim backed by several independent solving techniques**, and this is now a measured rate (roughly 1-in-3 singleton levels lose all support, and even among those that don't, roughly 1-in-3 lose their specific claimed winning technique) rather than an assumption.

This does not establish a causal mechanism beyond the redundancy story above (this report does not test *why* singleton levels are more fragile — e.g. whether it is really about redundancy specifically, versus singleton levels being structurally "harder"/more marginal in some other way that both explains their singleton status and their fragility). Both readings are consistent with the same data and are not distinguished here.

## What this does not establish

- **Single temporal pair.** This compares exactly one old census (2026-09-01) to one fresh census (2026-09-03), roughly a two-day solver-revision gap. Whether the same magnitude holds over a longer or shorter gap, or whether this specific window happened to include an unusually large/small drift-causing change, is untested.
- **Not causal.** The redundancy interpretation is plausible and consistent with the data but not isolated from a "singleton levels are structurally more marginal" alternative explanation.
- **Only the temporal clause.** The future-work bullet also named multiplicity as a possible predictor of *budget-edge* robustness (does a level solved by many techniques also solve more robustly near a work/node budget boundary?) and *variant-family* robustness (does multiplicity transfer to sibling variants of the same parent level?). Neither is tested here; both remain open, deferred questions if pursued.
- **Observational, not a designed experiment.** No new evidence was generated; this is a join of two already-independently-collected artifacts, consistent with this report's discovery evidence role.

## Recommended change to `solver-future-work.md`

The "capability multiplicity as a predictor of ... temporal ... robustness" clause is answered — positively, cleanly, with a real effect size — and should be removed from the deferred list rather than left implying it is still an open question. The budget-edge and variant-family clauses remain genuinely open and should stay deferred until a comparably cheap, already-available-data test presents itself for either of them.
