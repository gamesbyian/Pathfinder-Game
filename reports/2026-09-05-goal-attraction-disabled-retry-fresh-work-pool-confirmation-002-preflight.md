# STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL: reach-conditioned confirmation 002 preflight

> **Status:** concluded-positive
> **Last evidence:** 2026-09-10 — Confirmation-002 ran clean: control (node reserve alone) 14/150 solved vs. treatment (node reserve + fresh work pool) 17/150 — +3/-0, control's solved set a strict subset of treatment's, all three gains (`R01124`, `R02020`, `R02060`) directly attributable to a winning `goal-attraction-disabled-retry` attempt. Tier reach rose 104/150 → 140/150 between arms, zero errors/deadline truncation, symmetric `node-budget-reached` censoring. See "Result" below.
> **Decision:** promotion supported per the frozen decision rule's first branch (zero losses + treatment-exclusive tier-attributable solve + real participation). Both `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` and `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` promoted to production default-ON as a validated pair (see "Result" for why both, not the pool alone).
> **Remaining gate:** none — closed.
> **Evidence role:** second independent confirmation, conditioned only on historical control-side starvation/reach
> **Candidate:** `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL`
> **Control:** `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE`
> **Treatment:** `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE,STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL`
> **Primary outcome:** paired solve-set gains/losses
> **Secondary outcomes:** stage participation, aggregate/per-level `workSpent`, and whether the fresh pool converts starvation into real dispatches

## Why this line should be reopened now

The 2026-09-02 development A/B was +1/-0 on a population deliberately chosen for likely late-tier reach, and the gained level (`R00355`) was mechanistically reproduced: with only the node reserve the tier received no usable work/dispatched no winning attempt; with the fresh work pool it dispatched and solved.

The first independent confirmation used an ordinary random 150-level draw and returned an exact 84/150 vs 84/150 null. Its own frozen interpretation explicitly left a reach-characterized second cohort as the natural next test because a random draw might simply not exercise the mechanism.

Fresh 2026-09-04 whole-population lifecycle evidence now makes that concern concrete rather than speculative: among 725 production-unsolved Corpus-2 levels, 605 show starvation and **all 605/605 starvation cases include `goal-attraction-disabled-retry`**. The patterns are 392 goal-attraction-only, 156 paired with admissible-order fallback, and 57 paired with repair fallback. This is materially stronger prevalence evidence than existed when confirmation 001 was designed.

The new evidence does **not** itself prove that a fresh pool recovers solves. It does justify spending the next confirmation on a population known, from an independent historical control run, to exhibit the exact resource-starvation mechanism the treatment is intended to change.

## Selection contract

Use `reports/stress/capability-runs/33841017634/lifecycle-failure-map-corpus2.json` only as a **control-side selection source**. Candidate IDs come from `buckets.starved.ids`. Treatment outcomes from any fresh-work-pool experiment must not influence selection.

Exclude at minimum:

- the development A/B population (Corpus-2 positions 1-150);
- confirmation-001's committed 150 IDs;
- any IDs explicitly used for local mechanism reproduction or tuning of this candidate (`R00355` included);
- any later candidate-specific population whose treatment result has already been inspected before this preflight.

From the remaining historical-starved IDs, draw a deterministic 150-level sample with a new frozen seed, e.g. `goal-attraction-fresh-work-pool-confirmation-002`. Commit both the population/ID file and the exclusion manifest before either arm is dispatched.

If fewer than 150 eligible IDs remain after exclusions, use all remaining IDs and record the count; do not refill from non-starved levels merely to hit a round sample size.

A simple materialization command is sufficient; no new permanent selector framework is required. The resulting population is a **conditional confirmation population**, not an estimate of unconditional corpus-wide solve rate.

## Experimental contract

Run both arms through the same level-blind production entrypoint on the exact same frozen IDs.

Use the same candidate definition as the prior development/confirmation work: both arms enable `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE`; treatment additionally enables `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL`. Do not retune reserve/fresh-pool fractions after seeing outcomes.

Because this experiment asks whether the fresh pool changes the tier's own resource availability, preserve ordinary additive-tier semantics unless a pre-dispatch parity check demonstrates that a strict whole-solve cap leaves the candidate mechanism equivalent. The prior confirmation used `node_budget=50,000,000`, `strict_total_work_budget=false`; keep that envelope for direct comparability unless current workflow semantics make it invalid, in which case document the reason before dispatch rather than silently changing the experiment.

Use lifecycle/attempt-budget telemetry if the maintained workflow can emit it without changing solver behavior. The important mechanism-level distinction is not just `ok`; it is whether control remains starved while treatment receives a genuine fresh pool and dispatches the tier.

## Required result fields

Report:

- solved count and exact solved IDs per arm;
- gained/lost IDs;
- aggregate and per-level `workSpent` and nodes;
- count of sampled levels that actually reach/attempt `goal-attraction-disabled-retry` in each arm;
- count where control records work-pool starvation for the tier;
- count where treatment converts that starvation into nonzero dispatch/work;
- any treatment solves attributable to the tier itself;
- errors, deadline truncations, node/work stops, missing shards, or other asymmetric censoring;
- commit SHA, corpus hash, sample hash, exclusion manifest, and resolved flags.

The confirmation is non-informative if the historical-starved cohort no longer exercises the mechanism at current HEAD. That would be evidence of solver drift and should be reported as such, not counted as another efficacy null.

## Frozen decision rule

- **Zero losses + at least one treatment-exclusive solve attributable to the fresh-pool-enabled tier, with real treatment participation:** promotion is supported. Update the opt-in ledger and proceed through the repo's normal default-ON promotion mechanics.
- **Zero losses + zero gains, but the treatment clearly converts substantial control starvation into real tier participation:** do not promote. The fresh pool fixes resource access but has insufficient marginal solve value on a second independent informative population; close or strongly demote the unconditional global fresh-pool form unless another materially narrower premise already exists.
- **Zero losses + zero gains because the cohort no longer reaches/starves the tier:** classify as non-informative due to population drift. Do not treat this as efficacy evidence either way.
- **Any credible loss:** stop and root-cause before further promotion work. Do not promote.

A lower-work treatment is welcome but is not required for this candidate: unlike the six-seed truncation, this mechanism intentionally adds a fresh pool to recover otherwise-starved work. Its promotion case is additional coverage at a justified cost, not pure repricing.

## Interpretation boundary

This test intentionally conditions on a historically starved production population. A positive result establishes value **when the diagnosed starvation mechanism is present**. It does not by itself establish unconditional whole-corpus prevalence or justify widening the candidate beyond its existing level-blind gate.

Conversely, the full-scale 605/725 starvation prevalence must not be misread as 605 plausible extra solves. Starvation is opportunity denial, not proof the denied action would have won. This confirmation exists specifically to measure that conversion rate.

## Reproduction shape

Maintained workflow: `solver-level-blind-targeted-sweep.yml`.

Control:

`enable_flags=STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE`

Treatment:

`enable_flags=STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE,STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL`

Use the same committed IDs file for both arms and distinct concurrency suffixes only if parallel dispatch is desired and no shared-run interference exists.

## Result (2026-09-10)

**Execution.** Population materialized per the selection contract: `scripts/stress/materialize-goal-attraction-fresh-work-pool-confirmation-002.mjs` drew 150 of 484 eligible unexposed ids from `buckets.starved.ids` (605 historical control-side starved candidates, 300 distinct prior-exposure ids excluded — development A/B + confirmation-001 + `R00355`), seed `goal-attraction-fresh-work-pool-confirmation-002`. Both arms dispatched via `solver-level-blind-targeted-sweep.yml` on main at commit `7ac1a99`, `node_budget=50000000`, `strict_total_work_budget=false` (the frozen envelope, unchanged), `enable_flags` as specified above and otherwise identical dispatch inputs (same `ids_file`, `corpus`, `workers=4`) — the only intended difference between arms. Both first passes completed the full 150/150 population with zero timeout-recovery needed (`Plan recovery shards for missing ids` skipped on both runs); `validate-solver-sweep-integrity.mjs` confirmed exact population match on both.

**Solved sets.**

- Control: 14/150 — `R02427, R02038, R03014, R01590, R02647, R02815, R02081, R03031, R03137, R02900, R02168, R02915, R03205, R03153`
- Treatment: 17/150 — control's 14 plus `R01124, R02020, R02060`
- Gained: `R01124, R02020, R02060` (+3). Lost: none (-0). Control's solved set is a strict subset of treatment's.

**Attribution.** All three gains are directly attributable to the fresh-pool-enabled tier itself: in the treatment arm each shows a `goal-attraction-disabled-retry` attempt with `stageSolved: true` (a single winning attempt, not an incidental earlier-stage solve). In control, `R01124` and `R02020` never reached the tier at all (0 attempts — full starvation); `R02060` reached it (13 attempts, 843,896 nodes) but did not win there.

**Stage reach/participation/starvation conversion** (population-wide, `goal-attraction-disabled-retry`):

| | control | treatment |
|---|---:|---:|
| reach (levels with ≥1 attempt) | 104/150 | 140/150 |
| attempts | 877 | 1,127 |
| stage solves | 2 (`R02038`, `R03031`) | 5 (`R02038`, `R03031`, `R01124`, `R02020`, `R02060`) |
| aggregate nodesExpanded | 85,938,206 | 115,366,483 |

Control shows full starvation (zero attempts, zero nodes) on 46/150 levels — the tier never gets a single dispatch before the shared, already-depleting pool is spent. Treatment's own fresh pool is purely additive (never removes an attempt control would have gotten), so the reach increase (+36, 104→140) is the pool converting control-side non-dispatch into genuine treatment dispatch on those levels.

**Work/censoring.** Aggregate `workSpent`: control 30,736,644,907, treatment 30,714,901,902 (net change under 0.1%, no directional cost regression). All 136 (control) / 133 (treatment) remaining unsolved levels carry status `node-budget-reached` — a real, symmetric, enforced stop in both arms. Zero attempt errors, zero `deadlineTruncated` levels, in either arm.

**Effective-configuration agreement.** Both arms' workflow dispatch inputs are identical apart from `enable_flags` (confirmed directly from each run's own dispatch record: same `ids_file`, `corpus`, `node_budget`, `strict_total_work_budget`, `workers`); the workflow has no per-shard config override mechanism, so shards within each arm cannot diverge from that dispatch-level config (see `docs/solver-correctness-hardening.md`'s effective-configuration-contract entry). No gap-fill/recovery pass was needed on either arm.

**Decision rule applied.** Zero losses + three treatment-exclusive solves directly attributable to the fresh-pool-enabled tier + real, substantial treatment participation (93% reach, not a non-participating population) — matches the frozen rule's first branch exactly: **promotion supported.**

**Promotion scope.** The candidate is `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL`, but every A/B in this line (development, confirmation-001, confirmation-002) ran it paired with `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` also on — the pool's tested value was never isolated from the reserve. Promoting the pool alone would ship an untested combination (pool on, reserve off) in production. Both flags were promoted to default-ON together as the validated unit; `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE`'s earlier "closed, node-dimension-only, negligible" verdict is superseded by this result, which supplies the work-dimension evidence that closure explicitly flagged as missing.

**Applied changes:** both flags removed from `OPT_IN_FEATURES` (`modules/solver/ablation-config.ts`), descriptions updated to reflect default-ON status and this result; `docs/solver-opt-in-experiment-ledger.md` and `docs/solver-optimization-workstreams.md` updated; `orchestration.test.ts`'s opt-in-convention test for this reserve rewritten to assert the new default-ON resolution. Full suite (`npm run ci` equivalent: `check`, `test:unit`, `test:node`, `build`) green; `solver:regression --check` reports 160/160 published-corpus solves with no regressions; CI's 9-level canary unaffected.
