# STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL: reach-conditioned confirmation 002 preflight

> **Status:** active
> **Last evidence:** 2026-09-05 — Prior development was +1/-0 with direct mechanism reproduction, confirmation 001 was a clean null, and fresh lifecycle evidence shows goal-attraction-disabled retry starvation on all 605/605 starvation cases among 725 current production-unsolved levels.
> **Decision:** run confirmation 002 on a cohort selected only from independent historical control-side starvation so the candidate mechanism is genuinely exercised.
> **Remaining gate:** materialize and freeze the starvation-conditioned cohort, then dispatch matched control/treatment arms and require real tier participation before interpreting efficacy.
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
