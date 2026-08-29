# Solver opt-in experiment disposition ledger

Authoritative compact disposition for solver mechanisms whose **production default is OFF** but code remains invokable. It answers: **is a promotion decision still open?**

It is not a queue. Rank lives in [`solver-optimization-workstreams.md`](solver-optimization-workstreams.md); research/promotion rules in [`solver-research-operating-model.md`](solver-research-operating-model.md); default polarity in `OPT_IN_FEATURES` in [`../modules/solver/ablation-config.ts`](../modules/solver/ablation-config.ts). Documentation checks require every current member of that set below.

Full pre-consolidation chronology: [`archive/snapshots/solver-opt-in-experiment-ledger-2026-08-20.md`](archive/snapshots/solver-opt-in-experiment-ledger-2026-08-20.md). Later measurements remain in dated reports/git history.

## Retention rule

Git is the archive. Closed default-OFF code should remain only when it provides reusable generic plumbing, an unusually valuable counterfactual/diagnostic, or is cheaper/safer to retain than remove. “Could be useful someday,” code presence, and historical interest are not retention reasons.

Likewise, default-ON retries/reserves have no permanent budget entitlement. Scheduler work may reprice, shrink, reorder, condition, decompose, or remove them under a fixed aggregate `workSpent` envelope.

## Current production-default-OFF flags

| Flag | Disposition / reopen condition |
|---|---|
| `PRUNE_PORTAL_PARITY_ENVELOPE` | **CLOSED NEGLIGIBLE.** Sound but effectively non-firing in measured portal populations. Reopen only for a materially stronger formulation. |
| `STRATEGY_REPAIR_ELITE_PREFIX_DFS` | **CLOSED NEGATIVE IN CURRENT FORM.** Dedicated equal-budget test lost against control through ordinary-repair displacement. Descendant needs a cheaper/materially different operator or selector. |
| `STRATEGY_REPAIR_TURN_BIAS` | **CLOSED NEGATIVE.** Deterministic Corpus-2 evidence reproduced a net loss. |
| `STRATEGY_REPAIR_FALLBACK_GATE_WIDEN` | **CLOSED NEGATIVE.** Population-scale broad `isHighInt`/multi-portal widening produced 0 gains / 2 losses. Reopen only with a materially different narrower selection mechanism. |
| `SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE` | **CLOSED NEGATIVE, GLOBAL-SWAP FORM.** Selected populations produced gains but larger losses; the useful descendant is the separately promoted dead-last retry. Do not reopen the global form without a selector that avoids the loss population. |
| `STRATEGY_REPAIR_FALLBACK_NODE_RESERVE` | **CLOSED, SAFE BUT USELESS FOR TARGET.** More fallback participation produced no solves; more of the same repair work is not the missing capability. |
| `STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE` | **CLOSED.** Multiple budget scales produced negligible useful participation/solve movement. |
| `STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE` | **CLOSED NEGATIVE, POPULATION-VALIDATED.** Corpus-2 validation lost four solves with essentially flat work. |
| `STRATEGY_REPAIR_BEAM_SEED` | **CLOSED.** Isolated apparent gain vanished through the real full ladder while adding cost. |
| `STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY` | **RETAINED, NO CURRENT PROMOTION GATE.** Can restore budget withheld by adaptive probe shrink; keep as a counterfactual unless current evidence shows a meaningful shrink-caused regression it fixes economically. |
| `STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY` | **CLOSED.** Additive dead-last form removed displacement but recovered zero levels at both tested budgets. |
| `STRATEGY_RETRY_TIER_NODE_STAIRCASE` | **CLOSED NEGATIVE.** Fixed first-config monopolization but traded away load-bearing early work and raised wall cost. Reopen only with a different protection mechanism. |
| `STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE` | **CLOSED NEGATIVE (2026-08-26).** Widens `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` by one (mirroring the validated 4->5 precedent) and appends the missing plain WIDE beam to attempts.ts's other two must-cross-heavy sibling rules (the ones `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` deliberately left untouched because their reserve windows were full). Population-scale development A/B (`solver-routing-regime-sample-ab.yml`, 486-level must-cross-heavy sample): control 389/486, treatment 389/486 — 0 gains, 0 losses, with real nonzero work/node engagement (not a non-participation artifact — contrast the sibling flag's confirmation attempt). Reopen only with a materially different technique/envelope, or evidence the reserve-widen itself (not the beam choice) was the limiting factor. See [`2026-08-26-mustcross-reserve-widen-beam-exposure-development-ab.md`](../reports/2026-08-26-mustcross-reserve-widen-beam-exposure-development-ab.md). |
| `STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_BEAM_EXPOSURE` | **CLOSED NEGATIVE (2026-08-28, APPEND-LAST FORM).** Selected replay was +1/-0, but the prespecified mechanics-eligible 120-level strict-67M development A/B was control 56/120 vs treatment 55/120: 0 gains, 1 loss (`R02965`), new action reached 68/120, +29.0M aggregate work, no errors/deadline censoring. Appending the new beam changed the fixed five-config protected suffix and starved an existing `beam|score=objectiveFirst|bias=none|width=5000|retention=plain` winner. Do not repeat append-last placement. See [development report](../reports/2026-08-28-highint-standard-ih-exposure-development.md). |
| `STRATEGY_HIGHINT_STANDARD_INTERSECTION_HARVEST_RESERVE_PRESERVING_EXPOSURE` | **CLOSED NEGATIVE (2026-08-28).** Same missing `beam|score=intersectionHarvest|bias=none|width=2000|retention=plain` and same very-high-intersection rules as the append-last parent, but inserted immediately before the old protected five-config suffix. Selected mechanism replay run `33151801662` was still +1/-1: `R02440` remained a direct treatment rescue, but `R02965` still regressed. Preserving suffix membership did not preserve the old winner's usable allocation because the inserted beam consumed work before it; the 5K objective winner stopped about 134K work short of its known solve. Gate 2's disjoint 120-level cohort was therefore never executed. Do not repeat nearby placement tweaks without a materially new scheduler premise. See [development report](../reports/2026-08-28-highint-standard-ih-reserve-preserving-development.md). |

## Recently promoted/default-ON mechanisms worth remembering

Listed only so old experiment names are not mistaken for dangling opt-in tasks. Code owns polarity; [`solver-scheduling-policy.md`](solver-scheduling-policy.md) owns future budget valuation.

| Mechanism | Current disposition |
|---|---|
| `PRUNE_MC_NEIGHBOR_BUDGET` | Default-ON after level-blind population gain; retry-tier evidence shows it can still alter search order in both directions. |
| `STRATEGY_DEDUP_NEAR_TIE_RETRY` | Default-ON additive dead-last retry; safe placement does not make its work free. |
| `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` | Default-ON after population gain; retain as baseline but reprice residual value. |
| `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY` | Default-ON after population gain; retain as baseline but reprice residual value. |
| `STRATEGY_MC_NEIGHBOR_BUDGET_RETRY` | Default-ON after +9 / 0-loss Corpus-2 evidence; material cost makes it a scheduler tail-audit candidate. |
| `STRATEGY_GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY` | Default-ON dead-last descendant of the negative global swap; population test added three solves without losses in reached controls. Reprice through scheduler work rather than increasing reserve in isolation. |
| `STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY` | Default-ON after five additive rescues without measured losses; can buy substantial failed-tail work, so seed/budget expansion requires fixed-work repricing. |
| `STRATEGY_REPAIR_LATE_PROBE` | Default-ON after same-commit population gain; future cap growth competes with other actions under shared work. |
| `STRATEGY_MAIN_LOOP_LATE_RESERVE` | Historical default-ON mechanism. Its broad “give late repair more work” interpretation is closed; do not infer an active research lane from code presence. |
| `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` | Default-ON, promoted 2026-08-27 after development A/B +3/-0, same-generator confirmation +3/-0 (`confirm-residual-003`), and a cross-generator topology-composition transfer attempt (`confirm-transfer-topology-001`) that came back a clean null with zero losses (ceiling-limited, not evidence against the mechanism). Appends plain `beam|score=intersectionHarvest|bias=none|width=5000|retention=plain`/`beam|score=objectiveFirst|bias=none|width=5000|retention=plain` to attempts.ts's must-cross+flipper-heavy rule only; its two sibling must-cross-heavy rules remain untouched (see `STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE`, closed negative). See [`2026-08-24-solver-confirmation-transfer-cohort-reservation.md`](../reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md). |

This is intentionally not an exhaustive production-feature list.

## Interpretation rules

1. Default-OFF does not mean pending; most retained opt-ins are closed.
2. Code presence does not reopen a result.
3. Evidence applies to the tested wiring/protocol; a materially different mechanism may need a new verdict.
4. Historical hints/winners/level outcomes may label research but may not steer cold level-blind capability.
5. A small decisive negative can close a form; do not buy a giant run merely for ceremony.
6. Isolated-technique wins nominate full-policy tests; they do not promote themselves.
7. A polarity change must update both `OPT_IN_FEATURES` and read-site semantics.
8. Compare gains, losses, `workSpent`, and wall cost; no one metric is sufficient.
9. Dead-last placement proves non-interference with earlier winners, not economic value.
10. Closed code must justify retention; Git/reports preserve history.
11. Promoted retries are repriced, not grandfathered.
12. A best arm selected from several alternatives remains tuned evidence. Apply independent confirmation proportional to the selection search, and use cross-generator transfer/challenge when the intended claim is broader than the development distribution; see [`solver-evaluation-evidence.md`](solver-evaluation-evidence.md).