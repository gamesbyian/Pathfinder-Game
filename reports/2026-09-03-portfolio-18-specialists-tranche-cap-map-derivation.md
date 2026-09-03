# portfolio-18-specialists tranche cap map v1: derivation

> **Status:** concluded-positive
> **Last evidence:** 2026-09-03 — join of already-published/already-measured per-technique cost data against `portfolio-18-specialists`'s own composition and order; no new dispatch
> **Decision:** publishes `data/stress/portfolio-18-specialists-tranche-cap-map-v1.json` — a real, evidence-derived `cell.perTechniqueWorkCapByKey` map for all 18 `portfolio-18-specialists` techniques, sized from real production `meanAttemptWork` (17 techniques) plus `2026-09-03-admissible-order-profile-cost-probe-001-preflight.md`'s measured cost (the 18th, `admissible-order|tieBreak=mustCrossFirst|lds=off`, which has no production data at all), then uniformly scaled so the worst-case cumulative spend across the menu's own committed order exactly equals a 67,000,000 total envelope. This is the "defensible per-technique cap-sizing derivation" `docs/solver-optimization-workstreams.md`'s (b) note has been asking for.
> **Remaining gate:** this is a candidate cap map, not itself a dispatched confirmation. `2026-09-03-portfolio-18-specialists-production-envelope-confirmation-001-preflight.md` prespecifies and dispatches the actual comparison this map exists to feed.
> **Evidence role:** development — a derivation/join of existing evidence into a new artifact (a cap map), not an experiment result.

## Why a derivation, not just "reuse the flat cap"

Every `static-portfolio-confirmation-00N` result measured `portfolio-18-specialists` under a **flat** `per_technique_work_cap=2,000,000` — sized, per that program's own preflight text, "so up to 33 of the 34 `full-menu` techniques could each get a full share," i.e. deliberately generous and uniform, not evidence of what a real scheduler would allocate. `docs/solver-optimization-workstreams.md`'s (b) note already flagged this as the gap blocking a well-posed production-envelope confirmation: "a real scheduler would not divide work evenly across techniques... so a well-posed (b) needs an allocation policy decision first."

## Data sources

- **17 of 18 techniques:** real production `meanAttemptWork` from `reports/stress/capability-runs/33588487486/equal-work-production-reach.json`'s `techniques[].production.meanAttemptWork` — the mean canonical work of every real batch-orchestration attempt this technique made (win or lose), across 1,802 real corpus1+corpus2 rows. This is genuine current-production cost, not a research-harness artifact.
- **1 of 18 (`admissible-order|tieBreak=mustCrossFirst|lds=off`):** has no production `meanAttemptWork` at all (0/1,802 real attempts — see `2026-09-03-admissible-order-reserve-caveat-resolved-by-construction.md`). Uses `2026-09-03-admissible-order-profile-cost-probe-001-preflight.md`'s directly-measured mean workSpent among solved cells (5,559,235) instead — the same kind of "real cost when it does the work" quantity, just measured by a dedicated isolated probe rather than production telemetry, for exactly the technique production telemetry cannot see at all.

## Method

1. Pulled `meanAttemptWork` (or the cost-probe mean, for the one exception) for each of the 18 `portfolio-18-specialists` techniques, in their own committed order (`data/stress/static-portfolio-confirmation-003-arms.json`).
2. **First attempt, discarded:** cap each technique at its own raw mean directly. Sum = 83,495,813 — *larger* than the 67,000,000 standard envelope this program treats as production-equivalent (`solver-broad-confirmation.yml`'s `node_budget=50,000,000` default). Walking the menu in its own committed order, the cumulative worst-case spend crosses 67,000,000 partway through position 11 of 18 — meaning under a real `workBudget=67,000,000` ceiling, techniques 12-18 would receive **zero or near-zero room** if nothing earlier solves, silently reproducing the exact "later positions starved regardless of nominal cap" failure mode `perTechniqueWorkCap` was built to prevent (`reports/2026-09-02-static-portfolio-construction-pilot.md`), just moved from "one technique eating an unbounded shared pool" to "the aggregate pool running out before reaching the back of an evidence-capped list." This is a real, worth-recording finding in its own right: **raw per-technique production means do not fit inside this program's own standard envelope, and cannot be used as caps unscaled.**
3. **Fix:** scale every raw mean by a single constant (`67,000,000 / 83,495,813 ≈ 0.8024`) so the worst-case cumulative sum, walked in the menu's own order, lands at exactly 67,000,000. This preserves each technique's *relative* weight (an expensive technique like `admissible-order|tieBreak=none|lds=off`, raw mean 14,966,885, still gets far more room than a cheap self-exhausting beam like `perimeterSweep|bias=perimeterCW|width=2000`, raw mean 952,640 — the point of a tranche-shaped allocation) while guaranteeing every one of the 18 techniques has real, non-zero room regardless of its own list position.

## Result

`data/stress/portfolio-18-specialists-tranche-cap-map-v1.json` — 18 entries, worst-case cumulative sum 66,999,998 (2 under target from integer rounding).

| rank | technique | raw mean | scaled cap | cumulative worst-case |
|---:|---|---:|---:|---:|
| 1 | `repair\|score=repair\|guidance=standard` | 11,331,032 | 9,092,421 | 9,092,421 |
| 2 | `beam\|score=perimeterSweep\|bias=perimeterCW\|width=2000\|retention=plain` | 952,640 | 764,432 | 9,856,853 |
| 3 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=mechanic-buckets` | 3,523,227 | 2,827,162 | 12,684,015 |
| 4 | `beam\|score=intersectionHarvest\|bias=none\|width=5000\|retention=plain` | 2,141,141 | 1,718,127 | 14,402,142 |
| 5 | `beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=plain` | 2,123,405 | 1,703,895 | 16,106,037 |
| 6 | `beam\|score=perimeterSweep\|bias=perimeterCCW\|width=2000\|retention=plain` | 913,228 | 732,807 | 16,838,844 |
| 7 | `admissible-order\|tieBreak=default\|lds=off` | 14,751,999 | 11,837,526 | 28,676,370 |
| 8 | `beam\|score=objectiveFirst\|bias=none\|width=5000\|retention=mechanic-buckets` | 3,570,733 | 2,865,283 | 31,541,653 |
| 9 | `repair\|score=repair\|guidance=must-turn-biased` | 11,625,536 | 9,328,742 | 40,870,395 |
| 10 | `admissible-order\|tieBreak=none\|lds=off` | 14,966,885 | 12,009,959 | 52,880,354 |
| 11 | `beam\|score=intersectionHarvest\|bias=none\|width=2000\|retention=plain` | 1,195,779 | 959,535 | 53,839,889 |
| 12 | `dfs\|score=portalFirstTransfer\|bias=none` | 2,587,665 | 2,076,434 | 55,916,323 |
| 13 | `beam\|score=objectiveFirst\|bias=none\|width=2000\|retention=plain` | 1,160,863 | 931,518 | 56,847,841 |
| 14 | `dfs\|score=perimeterSweep\|bias=perimeterCCW` | 2,768,069 | 2,221,197 | 59,069,038 |
| 15 | `beam\|score=mustCrossFirst\|bias=none\|width=2000\|retention=plain` | 937,557 | 752,329 | 59,821,367 |
| 16 | `dfs\|score=perimeterSweep\|bias=sideCommitment` | 2,427,439 | 1,947,863 | 61,769,230 |
| 17 | `admissible-order\|tieBreak=mustCrossFirst\|lds=off` | 5,559,235 *(cost-probe)* | 4,460,927 | 66,230,157 |
| 18 | `beam\|score=harvestThenFinish\|bias=none\|width=2000\|retention=plain` | 959,381 | 769,841 | 66,999,998 |

## What this does not establish

- **This is one candidate map, not a validated policy.** Uniform proportional scaling is the simplest defensible transform from raw evidence to a fitting envelope — it is not claimed to be optimal, only principled and reproducible. A future iteration could weight differently (e.g. give repair/admissible-order relatively more room given `solver-budget-determinism.md`'s "protect deep continuations only where measured late yield exists" guidance) but that would be a new, separately-justified design choice, not this one.
- **Production `meanAttemptWork` is not "cost when it wins."** It is the mean cost of every real attempt this technique made under the *current* ladder's own allocation, win or lose — a different quantity from, say, EW1's per-technique solved-cell cost. It is used here because it is the only real, already-collected, per-technique cost signal at population scale for 17 of the 18 techniques; a technique whose real attempts are mostly right-censored by the current ladder's own budget starvation would show an inflated mean, not a true "typical need." No specific technique in this 18 is flagged as suspect on that basis, but this caveat applies uniformly.
- **The 67,000,000 target is this program's existing convention, not independently re-derived here.** See `docs/solver-optimization-workstreams.md`'s (b) note for why it already approximates this program's standard offline/batch envelope (`solver-broad-confirmation.yml`'s `node_budget=50,000,000` default).
- **Does not itself run or promote anything.** See the companion confirmation preflight for the actual dispatched comparison.
