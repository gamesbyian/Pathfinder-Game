# WS1 consumer Gate 2 seam audit

> **Status:** concluded-positive
> **Last evidence:** 2026-10-02 — code read of the additive retry-tier ladder plus stage-level analysis of the corrected confirmation run's retained rows (`data/stress/ws1-consumer-ceiling-audit-001.json`, extended with per-stage views).
> **Decision:** the frozen signature's nominated work is concentrated in four late additive tiers, one of which (`guidance-goal-distance-retry`) carries 58% of it, and those tiers rarely produce winners. A signature-driven dynamic reorder is therefore premature: the first falsifier is a **static tier reorder** (opt-in flag, order change only) that needs no signature code. Implementation is scoped to `runAdditiveRetryTiers`; no solver change is made here.
> **Remaining gate:** implement the opt-in static reorder behind a default-off flag with an equivalence test, then a preregistered work-matched A/B on a fresh block (Gate 2a); the dynamic signature consumer (Gate 2b) only if 2a shows value.
> **Evidence role:** design.
> **Research question:** `WS1-ACTION-SELECTION-LEGAL-SIGNAL-CAPTURE`
> **Owner:** `docs/solver-optimization-workstreams.md`.

## Where the signature's work sits (160 fresh parents, 22.6G total work, 1.84G nominated)

| Nominated next stage | nominated work | share of nominated | solved / unsolved parents touched | winners from this tier (of 125 solved) |
|---|---:|---:|---:|---:|
| `guidance-goal-distance-retry` | 1.06G | 58% | 15 / 20 | 2 |
| `connectivity-axis-prune-disabled-retry` | 0.44G | 24% | 20 / 35 | 0 |
| `must-cross-neighbor-prune-disabled-retry` | 0.19G | 10% | 7 / 13 | 1 |
| `coarse-state-near-tie-retention-disabled-retry` | 0.14G | 8% | 22 / 35 | 7 |
| `goal-attraction-disabled-retry` | ~0 | ~0% | 31 / 35 | 34 |

All 15 frozen signatures name late additive tiers (median attempt index 12-71). Winners come overwhelmingly from other stages: main-search 38, goal-attraction-disabled-retry 34, early-repair 22, `portal-coarse-state-merge-dead-last-retry` 12. Only 10/125 winners (8%) come from the four nominated tiers; goal-attraction-disabled-retry, the biggest winner tier after main search, carries almost no nominated work.

## Where unsolved parents stop

All 35 unsolved parents end `node-budget-reached`. 27 of them completed the ladder through the dead-last portal tier (the last tier); **8 stopped earlier**: 6 at `guidance-goal-distance-retry` and 2 at `late-repair-multiseed-retry`. Those 8 are the parents where moving low-yield nominated work later could let the ladder reach tiers it currently never runs. Whether the dead-last tier (12/125 solved parents win there) is eligible for them (it needs portal structure) is not recorded in the rows; this is the first thing the Gate 2a population must establish. The upper bound on added solves from reordering alone is therefore 8 of 160 parents (5%), and only to the extent the untried tiers win.

## The ladder and the seam

`modules/solver/orchestration-additive-retry-tiers.ts` (`runAdditiveRetryTiers`) runs every last-resort tier in a fixed order, gated on `!result.solution`, mutating one shared `result`. Hazards for any reorder:

- **Budget plan is precomputed per tier**: `stageBudgetPlan` carries `*TierWillRun`, `*NodeCeiling` and (opt-in, default off) `retryTierStaircase`; tiers check cumulative `prep._metrics.nodesExpanded` against absolute ceilings. A tier moved later sees a higher cumulative node count, so its ceiling must be re-based to preserve its dose; otherwise a reorder silently changes allocation (the `workSpent`-allocation rule).
- **Per-tier work-cap scopes** (`withWorkCapScope`) and per-tier reserves (goal-attraction reserve, shrink-recovery) assume their original position.
- **Determinism and request identity**: attempt order is part of the solve; a flag must enter `solverRequestProjection`/budget-determinism contracts and be default-off with byte-identical behavior when off (`docs/solver-budget-determinism.md`).
- **Signature inputs at a tier boundary are available** (last attempt's stage and outcome, `prep._workMeter.units - workStart`, the next tier's stage id), so a dynamic consumer is feasible later; it is not needed for the first falsifier.

## Recommended Gate 2 staging

**2a. Static reorder (smallest consumer).** Opt-in flag that runs `guidance-goal-distance-retry` (optionally with `connectivity-axis-prune-disabled-retry`) after `late-repair-multiseed-retry` and the dead-last portal tier, each tier keeping its own dose (re-based ceiling), no signature logic. Falsifier: work-matched A/B on a fresh block, parents as the unit, primary metric solves at the fixed cap plus paired `workSpent` on parents solved by both arms, informative population = parents that stop before the last tier or solve via a moved tier. Closes the lane cheaply if the 8-parent opportunity does not convert.

**2b. Dynamic signature consumer.** Only if 2a shows value: evaluate the frozen signature at tier boundaries so the deferral applies exactly where the rule fires (e.g. only after long censored work), preserving winners from the same tiers.

## What this does not establish

That any reorder improves solves or work. The audit is one 160-parent block with the stage view read post hoc; tier eligibility for the 8 early-stopping parents is unknown; the 58% concentration describes this run's production configuration.
