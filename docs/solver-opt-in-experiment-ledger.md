# Solver opt-in experiment disposition ledger

This is the authoritative compact ledger for solver mechanisms whose **production default is OFF** but whose code remains invokable for research. It answers one question:

> Does this retained mechanism have a promotion decision outstanding?

It is not a priority queue. Current ranked solver work lives in [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md). The full pre-consolidation experiment chronology is frozen at [`archive/snapshots/solver-opt-in-experiment-ledger-2026-08-20.md`](archive/snapshots/solver-opt-in-experiment-ledger-2026-08-20.md).

`OPT_IN_FEATURES` in [`../modules/solver/ablation-config.ts`](../modules/solver/ablation-config.ts) is the source of truth for **default polarity**, not experiment status. Documentation checks require every current member of that set to appear below.

Capability decisions obey [`solver-level-blindness.md`](solver-level-blindness.md). Historical winners, hints, and exact-level outcomes may label research; they may not guide a headline cold-capability solve.

## Current production-default-OFF flags

| Flag | Disposition | Decision-bearing evidence / reopen condition |
|---|---|---|
| `PRUNE_PORTAL_PARITY_ENVELOPE` | **CLOSED NEGLIGIBLE** | Sound, but live testing found effectively no useful firing in the measured portal population. Reopen only for a materially stronger formulation, not another unchanged run. |
| `STRATEGY_REPAIR_ELITE_PREFIX_DFS` | **CLOSED NEGATIVE IN CURRENT FORM** | Equal-budget dedicated test was 4/20 ON vs 5/20 OFF with confirmed displacement of ordinary repair work. A descendant needs a cheaper or materially different operator/selection premise. |
| `STRATEGY_REPAIR_TURN_BIAS` | **CLOSED NEGATIVE** | Deterministic Corpus-2 evidence reproduced a net loss. Reopen only with materially new mechanism evidence. |
| `STRATEGY_REPAIR_FALLBACK_NODE_RESERVE` | **CLOSED, SAFE BUT USELESS FOR ITS TARGET** | Population test increased fallback participation dramatically with no solve gain; targeted repair attempts still plateaued. More of the same repair budget is not the missing capability. |
| `STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE` | **CLOSED** | Local tests at multiple budget scales showed essentially no useful participation/solve movement. Reopen only with a population shown to reach this gate and plausibly benefit. |
| `STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE` | **CLOSED NEGATIVE, POPULATION-VALIDATED** | 2026-08-19 full-corpus A/B: Corpus 1 unchanged; Corpus 2 828 -> 824, **0 gained / 4 lost**, with essentially flat node/work cost. Do not rerun the same 0.15 form. |
| `STRATEGY_REPAIR_BEAM_SEED` | **CLOSED** | An isolated repair-only apparent gain disappeared when re-tested through the real full ladder; same solved set with added cost. Reopen only on a full-ladder positive premise. |
| `STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY` | **RETAINED, NO CURRENT PROMOTION GATE** | The mechanism can restore a budget shrunken by adaptive repair-probe control and reproduced the known R00408 recovery. It has not earned a current ranked promotion lane. Keep default-OFF unless current evidence again shows the shrink controller causing a meaningful population regression that this recovery fixes without unacceptable cost. |
| `STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY` | **CLOSED** | Additive dead-last retry removed the original displacement concern, but the original 20-level closest-miss sample produced **zero recoveries** at both tested retry budgets. More budget did not turn intermediate badness improvement into solves. |
| `STRATEGY_RETRY_TIER_NODE_STAIRCASE` | **CLOSED NEGATIVE** | Per-config node redistribution fixed a real first-config monopolization shape but traded away load-bearing early-config work; measured wall time also rose sharply despite slightly lower nodes. Reopen only with a mechanism that protects later configs without simply capping the first winner-producing config. |
| `STRATEGY_REPAIR_FALLBACK_GATE_WIDEN` | **CLOSED NEGATIVE** | 2026-08-23 population-scale GHA A/B (`solver-archetype-sample-ab.yml`, `archetypes=portal-heavy,high-intersection-burden`, 562-level sample, control run `32607083688` vs treatment run `32607087026`): control 417/562, treatment 415/562, **0 gains, 2 losses** (`R01944`, `R02474`). Confirms `claude/solver-regressions-wmu3im`'s independent "no clean feature separates repair-wins from the ineligible population" finding. Reopen only with a materially different (narrower) selection mechanism, not a bigger/different threshold on the same `isHighInt`/archetype feature set. |
| `SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE` | **CLOSED NEGATIVE (global-swap form)** | 2026-08-23, `solver-level-blind-targeted-sweep.yml` (GHA) + local `level-blind-capability-sweep.mjs`, production 50M work/node budget, commit `4a78534b6`: 73-level loss population 15→21 (**+9/-3**); 90-level gain population 90→79 (**0/-11**); published corpus 160/160 unchanged. **Net 9-3-11=-5.** The global swap breaks levels that already solve early under the corrected distances. Not reverted — reused by the dead-last additive retry-tier form (`STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY`, see `solver-optimization-current-queue.md` Priority 7), which cannot touch this loss population by construction. Reopen the global form only with evidence the loss population can be avoided without a retry-tier scope. |

## Recently promoted/default-ON mechanisms relevant to this ledger

These are listed only to stop an old experiment name from being mistaken for a dangling opt-in task. Production polarity is defined in code.

| Mechanism | Current status |
|---|---|
| `PRUNE_MC_NEIGHBOR_BUDGET` | Promoted default-ON after level-blind population gain; later retry-tier work handles part of its double-edged search-order effect. |
| `STRATEGY_DEDUP_NEAR_TIE_RETRY` | Promoted default-ON after the additive dead-last design produced a strict solved-set superset at population scale. |
| `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` | Promoted default-ON after population validation produced +45 with zero regressions against its baseline. |
| `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY` | Promoted default-ON after population validation produced +10 with zero regressions. |
| `STRATEGY_MC_NEIGHBOR_BUDGET_RETRY` | Promoted default-ON 2026-08-19 after Corpus-2 819 -> 828, +9 with zero regressions; cost increased materially and remains part of the production price. |
| `STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY` | Promoted default-ON 2026-08-23 after a population-scale A/B (`solver-level-blind-targeted-sweep.yml`, commit `95927c6df`): 73-level loss population 15/73 -> 18/73 (+3/-0, R02158/R02575/R03211); 90-level gain population 90/90 -> 90/90 (0/-0, confirming the dead-last placement structurally never fires on already-solving levels); published corpus unchanged. Smaller recovery than the closed-negative global-swap form's +9 since this tier only gets a fraction of the node ceiling the global form had from move zero — a larger reserve fraction could recover more but needs its own matched-work check first. |
| `STRATEGY_REPAIR_LATE_PROBE` | Promoted default-ON 2026-08-21 (one day after being built) after a same-commit deterministic A/B (GHA 32453248184 vs 32459711208, main@e5034e8c): Corpus-1 95 -> 96, Corpus-2 863 -> 881, +19 net with zero regressions on either corpus. |
| `STRATEGY_MAIN_LOOP_LATE_RESERVE` | Default-ON historically; its original broad “give late repair more of the same search” research interpretation is now closed by the isolated-technique census. Do not infer an active optimization lane from the retained mechanism. |

This table is intentionally not an exhaustive list of every production feature. Use code for polarity and the current queue for active work.

## Interpretation rules

1. **Default-OFF does not mean pending.** Most retained opt-ins are closed experiments.
2. **Code presence does not reopen a result.** Prototype infrastructure may remain useful even when its tested policy is negative.
3. **Evidence belongs to the tested wiring and protocol.** A materially revised caller policy or operator can require a new verdict; a renamed unchanged mechanism does not.
4. **Capability is level-blind.** `primeAttempt`, `--prime-winner`, saved-hint guidance, exact-level caches, or historical status used for scheduling make a run research/re-verification evidence, not cold capability evidence.
5. **Small negative tests can close a form.** Do not buy a giant population run merely to make a directly falsified premise feel more official.
6. **Isolated-technique wins are nominations, not promotions.** Confirm through the real ladder before trusting a treatment whose receptor receives a different effective budget there.
7. **Promotion checks both halves of a flag.** Changing `OPT_IN_FEATURES` is insufficient if read sites still implement the old polarity convention.
8. **Compare gains, losses, work, and wall cost.** Node/work meters can miss changes in the cost of an operation; a redistribution can lower nodes while becoming much slower.

## Historical evidence

The old ledger contained detailed A/B histories, wiring-confound investigations, per-level examples, calibration notes, and promotion narratives. They remain available verbatim in [`archive/snapshots/solver-opt-in-experiment-ledger-2026-08-20.md`](archive/snapshots/solver-opt-in-experiment-ledger-2026-08-20.md) and in the dated reports it cites.
