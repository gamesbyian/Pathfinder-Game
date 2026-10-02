# WS1 consumer Gate 2 seam audit

> **Status:** concluded-positive
> **Last evidence:** 2026-10-02 — code read of the additive retry-tier ladder and its stacked node ceilings, plus stage-level analysis of the corrected confirmation run's retained rows (`data/stress/ws1-consumer-ceiling-audit-001.json`, extended with per-stage views).
> **Decision:** the WS1 consumer is **work-only**. The rule's nominated work sits in four late additive tiers (58% in `guidance-goal-distance-retry`) that rarely win, and no unsolved parent was starved of a tier, so a reorder cannot add cold solves. A static tier reorder would cut roughly 8-9% of solved-parent work (gross 11.8% on 17 parents, minus 2.5-3.4% paid by the 3 parents whose winners sit in the moved tiers). Implementation is deferred: park it as a machine-independent-work option, not a cold-solve gate.
> **Remaining gate:** none queued. Reopen only if machine-independent work at the ladder tail becomes an explicit objective; the implementation seam and plan below are the starting point.
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

## Where unsolved parents stop (corrected)

All 35 unsolved parents end `node-budget-reached`. 27 completed the ladder through the dead-last portal tier; 8 did not reach it. The code shows why: that tier runs only when `level.portalMap.size > 0` and its node ceiling is entry-relative (`entryNodes + PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_NODE_BUDGET`), so it is never starved by earlier tiers. Six of the 8 also lack the late-repair tiers (repair-ineligible) and end at `guidance-goal-distance-retry`; two ran through `late-repair-multiseed-retry`. These are ladders that ran every tier available to them, not budget-starved ones, so **reordering cannot add solves** (an earlier draft of this audit read them as a 5% solve opportunity; that was wrong).

## The ladder and the seam

`modules/solver/orchestration-additive-retry-tiers.ts` (`runAdditiveRetryTiers`) runs the tiers in a fixed order, gated on `!result.solution`: goal-attraction-disabled, admissible-order, coarse-near-tie, non-default, connectivity-axis, repair-elite, must-cross, late-repair-search, guidance-goal-distance, late-repair-multiseed, then the portal dead-last tier. In `stage-budget-core.ts` each tier's node ceiling is **stacked**: previous ceiling plus its own reserve, with several reserves defined as a fraction of the previous ceiling. Reorder hazards:

- Moving a tier later changes the cumulative node count it sees against its absolute ceiling, so moved tiers need entry-relative ceilings (as the dead-last tier already has) while unmoved tiers' stacks drop the moved reserves; reserves must still be computed from the original chain so each tier's dose is unchanged.
- Per-tier `withWorkCapScope` extensions, the goal-attraction/shrink-recovery reserves and `earlyTiersHitNodeCeiling` accounting assume the original order.
- Attempt order is part of determinism and request identity; a flag must be default-off and byte-identical when off (`docs/solver-budget-determinism.md`).
- Signature inputs at a tier boundary are available (last attempt stage and outcome, `prep._workMeter.units - workStart`, next tier id), so a dynamic consumer is feasible, but a static order captures the yield structure without it.

## Tier yields and the static reorder estimate

Winners per unit of tier work among this block's parents (solved winners over full-dose work of the tier): dead-last ~8 per G, multiseed ~4 per G, must-cross ~1.4, guidance ~1.2, connectivity-axis 0. The static reorder that runs guidance, connectivity-axis and must-cross after multiseed and dead-last:

- gross savings: 1.43G (11.8% of the 12.16G solved-parent work), all on the 17 solved parents whose winner is in multiseed or dead-last (guidance 0.77G, connectivity 0.38G, must-cross 0.29G);
- cost: the 3 solved parents whose winners sit in the moved tiers (2 guidance, 1 must-cross) now pay for multiseed (mean ~100M) and possibly dead-last (mean ~39M): 0.30-0.42G (2.5-3.4%);
- net: roughly 8-9% of solved-parent work, concentrated in ~13% of solved parents; solves unchanged by construction when budgets are preserved; unsolved parents unchanged.

## What this does not establish

That a reorder preserves every solve (the moved tiers' doses are preserved only if the re-stacking is implemented exactly), or that the 8-9% net holds beyond this single 160-parent block; the stage view and the extra-cost estimate (mean tier work from unsolved parents) were read post hoc.
