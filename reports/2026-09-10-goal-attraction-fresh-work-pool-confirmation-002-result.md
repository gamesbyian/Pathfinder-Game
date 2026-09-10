# Goal-attraction-disabled retry fresh-work-pool confirmation 002

> **Status:** concluded-positive
> **Last evidence:** 2026-09-10 — frozen 150-level confirmation completed in both arms at commit `7ac1a9907bd02783238e137f07fe2254203751c8`: 14/150 control versus 17/150 treatment, +3/-0 with all gains inside the target stage.
> **Decision:** promotion of `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` is supported by the frozen confirmation rule. The independent historical-starvation cohort produced **3 treatment-exclusive solves and 0 losses**, all three gains were won inside `goal-attraction-disabled-retry`, and treatment materially increased real stage participation.
> **Remaining gate:** normal default-ON promotion mechanics plus opt-in-ledger and Workstream-2 2A reconciliation; no further confirmation of this unchanged global form is earned before promotion.
> **Evidence role:** second independent confirmation, conditioned only on historical control-side starvation/reach as prespecified.
> **Control:** GHA `34444934580`, artifact `targeted-sweep-combined` / `10141247127`
> **Treatment:** GHA `34444937307`, artifact `targeted-sweep-combined` / `10141871432`
> **Commit:** `7ac1a9907bd02783238e137f07fe2254203751c8` both arms
> **Population:** the same frozen 150 IDs from `data/stress/goal-attraction-fresh-work-pool-confirmation-002-ids.txt`

## Result

| measure | control | treatment | delta |
|---|---:|---:|---:|
| solved | 14/150 | 17/150 | **+3** |
| failed | 136 | 133 | -3 |
| `goal-attraction-disabled-retry` levels with recorded attempts | 104 | 140 | **+36** |
| target-stage attempts | 877 | 1,127 | +250 |
| target-stage conditional solves | 2 | 5 | **+3** |
| aggregate `workSpent` | 30,736,644,907 | 30,714,901,902 | -21,743,005 (-0.071%) |
| aggregate nodes | 25,626,186,713 | 25,247,967,661 | -378,219,052 (-1.48%) |
| errors | 0 | 0 | 0 |
| deadline truncations | 0 | 0 | 0 |

All 14 control solves remain solved under treatment. All 17 treatment solutions are independently marked `refereeValid: true` in the combined result.

Treatment-exclusive gains:

| id | control | treatment winner | treatment whole-level work |
|---|---|---|---:|
| `R01124` | unsolved, no target-stage attempt recorded | `goal-attraction-disabled-retry|beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` | 85,802,860 |
| `R02060` | unsolved after 13 target-stage attempts | `goal-attraction-disabled-retry|beam|score=perimeterSweep|bias=perimeterCW|width=2000|retention=plain` | 63,870,388 |
| `R02020` | unsolved, no target-stage attempt recorded | `goal-attraction-disabled-retry|beam|score=intersectionHarvest|bias=none|width=5000|retention=plain` | 182,876,665 |

There are **no control-exclusive solves**.

## Mechanism check

The paired configuration differs only by the candidate flag: both arms enable `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE`; treatment additionally enables `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL`. Both use the same commit, corpus, 150 IDs, `nodeBudget=50,000,000`, nominal `workBudget=67,000,000`, non-strict additive work semantics, and level-blind production scheduler.

The candidate changes the thing it was designed to change rather than merely moving the aggregate solve count:

- real target-stage participation rises from 104/150 to 140/150;
- every control-participating level also participates under treatment; the treatment adds 36 participating levels and loses none;
- `R01124` and `R02020` record zero target-stage attempts in control, but treatment reaches the tier and solves on its first target-stage attempt;
- `R02060` reaches the same first target action in both arms, but control gets only 43,272 nodes on that attempt before timing out, while treatment gets 188,953 nodes and solves. Its earlier pre-target attempt sequence is identical between arms.

For `R01124` and `R02020`, treatment's pre-target attempt prefix is also identical to the corresponding control prefix. The control simply continues into later stages after failing to obtain a usable target-stage dispatch; treatment receives fresh target-stage work and solves. This is direct mechanism-level attribution to fresh resource access, consistent with the earlier `R00355` development reproduction.

The dispatch did not enable lifecycle/attempt-budget telemetry, so the current artifact does not directly emit the requested per-level `starvedByWorkBudget` count. That missing diagnostic field does not make the efficacy result non-participating: actual attempt records show a 104→140 participation increase, and all three new solves occur in the target stage under the only treatment-side behavioral difference. The missing starvation flag should be recorded as an instrumentation omission, not silently reconstructed as an exact count.

## Cost interpretation

The fresh pool intentionally buys additional failed-tail work, so lower total work was not required by the frozen rule. On the 133 levels neither arm solves, treatment spends 385,316,892 additional work in aggregate (about 2.90M per level on average); common solved levels add 8,389,421 work. The three newly solved levels terminate much earlier and save 415,449,318 work versus their unsolved control executions, leaving the treatment's whole-population aggregate slightly **lower** by 21.7M work.

That aggregate reduction should not be misread as "the fresh pool is free." Its direct price is extra work on misses; on this conditional starvation cohort, the three additional solves more than repay that price in total canonical work because they prevent much more expensive downstream failure tails.

## Frozen decision rule

The preflight's promotion condition was:

> zero losses + at least one treatment-exclusive solve attributable to the fresh-pool-enabled tier, with real treatment participation.

Observed: **zero losses, three treatment-exclusive target-stage solves, and +36 levels of real target-stage participation.** The confirmation therefore passes the prespecified promotion gate.

This result is conditional evidence. The population was deliberately drawn from historical control-side starvation, so `+3/150` is not an unconditional Corpus-2 solve-rate estimate. It establishes that the global level-blind candidate has real marginal value when the diagnosed starvation mechanism is present. Any production promotion should retain the candidate's existing gate and should not infer that all historically starved levels are plausible recoveries.

## Next repo action

Proceed through the normal default-ON promotion mechanics for `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL`, update `docs/solver-opt-in-experiment-ledger.md` and the Workstream-2 2A entry, and retain this report as the confirmation authority. No further confirmation of this unchanged global form is earned before promotion.
