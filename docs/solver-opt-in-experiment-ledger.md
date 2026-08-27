# Solver opt-in experiment disposition ledger

Authoritative compact disposition for solver mechanisms whose **production default is OFF** but code remains invokable. It answers: **is a promotion decision still open?**

It is not a queue. Rank lives in [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md); research/promotion rules in [`solver-research-operating-model.md`](solver-research-operating-model.md); default polarity in `OPT_IN_FEATURES` in [`../modules/solver/ablation-config.ts`](../modules/solver/ablation-config.ts). Documentation checks require every current member of that set below.

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
| `STRATEGY_REPAIR_FALLBACK_GATE_WIDEN` | **CLOSED NEGATIVE.** Population-scale broad `isHighInt`/portal-heavy widening produced 0 gains / 2 losses. Reopen only with a materially different narrower selection mechanism. |
| `SCORE_GOAL_ATTRACTION_LEGACY_DISTANCE` | **CLOSED NEGATIVE, GLOBAL-SWAP FORM.** Selected populations produced gains but larger losses; the useful descendant is the separately promoted dead-last retry. Do not reopen the global form without a selector that avoids the loss population. |
| `STRATEGY_REPAIR_FALLBACK_NODE_RESERVE` | **CLOSED, SAFE BUT USELESS FOR TARGET.** More fallback participation produced no solves; more of the same repair work is not the missing capability. |
| `STRATEGY_ATTRACTION_DIVERSITY_NODE_RESERVE` | **CLOSED.** Multiple budget scales produced negligible useful participation/solve movement. |
| `STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE` | **CLOSED NEGATIVE, POPULATION-VALIDATED.** Corpus-2 validation lost four solves with essentially flat work. |
| `STRATEGY_REPAIR_BEAM_SEED` | **CLOSED.** Isolated apparent gain vanished through the real full ladder while adding cost. |
| `STRATEGY_REPAIR_PROBE_SHRINK_RECOVERY` | **RETAINED, NO CURRENT PROMOTION GATE.** Can restore budget withheld by adaptive probe shrink; keep as a counterfactual unless current evidence shows a meaningful shrink-caused regression it fixes economically. |
| `STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY` | **CLOSED.** Additive dead-last form removed displacement but recovered zero levels at both tested budgets. |
| `STRATEGY_RETRY_TIER_NODE_STAIRCASE` | **CLOSED NEGATIVE.** Fixed first-config monopolization but traded away load-bearing early work and raised wall cost. Reopen only with a different protection mechanism. |
| `STRATEGY_MUSTCROSS_RESERVE_WIDEN_BEAM_EXPOSURE` | **CLOSED NEGATIVE (2026-08-26).** Widens `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` by one (mirroring the validated 4->5 precedent) and appends the missing plain WIDE beam to attempts.ts's other two must-cross-heavy sibling rules (the ones `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` deliberately left untouched because their reserve windows were full). Population-scale development A/B (`solver-archetype-sample-ab.yml`, 486-level must-cross-heavy sample): control 389/486, treatment 389/486 — 0 gains, 0 losses, with real nonzero work/node engagement (not a non-participation artifact — contrast the sibling flag's confirmation attempt). Reopen only with a materially different technique/envelope, or evidence the reserve-widen itself (not the beam choice) was the limiting factor. See [`2026-08-26-mustcross-reserve-widen-beam-exposure-development-ab.md`](../reports/2026-08-26-mustcross-reserve-widen-beam-exposure-development-ab.md). |
| `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` | **CONFIRMED (2026-08-27); STILL OPT-IN — TRANSFER EVIDENCE RECOMMENDED BEFORE DEFAULT-ON.** Appends plain `beam:intersectionHarvest@beam5000` + `beam:objectiveFirst@beam5000` to attempts.ts's must-cross+flipper-heavy rule only. Development: prespecified `solver-archetype-sample-ab.yml` pilot restricted to `must-cross-heavy` (486-level fixed population): +3/-0, `R00817`/`R02010`/`R02151` gained, aggregate work +1.03%. Four confirmation attempts (`confirm-broad-003`, `confirm-broad-004`, `confirm-residual-001`, `confirm-residual-002`) were previously each diagnosed as a distinct instrument failure (repair-fallback saturation twice, a main-loop late-reserve scheduling gap, then a worker-concurrency-correlated variance) — **all four were actually control-vs-control**: `.github/workflows/solver-broad-confirmation.yml`/`solver-residual-confirmation.yml` referenced `matrix.arm` (nonexistent) instead of `matrix.shard.arm` in the step that adds `--enable-flags`, so no treatment arm of either workflow ever actually carried this flag, from each workflow's introduction through `confirm-residual-002`. See [`2026-08-27-confirmation-workflow-treatment-flag-wiring-bug.md`](../reports/2026-08-27-confirmation-workflow-treatment-flag-wiring-bug.md) for the full account. Both workflows are now fixed (`matrix.shard.arm`) and hardened (per-shard resolved-flags artifact + fail-fast on a mismatch). Redispatched against the fixed, hardened workflow as `confirm-residual-003` (master seed `2026082703`, id prefix `L`, run [`33054538000`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33054538000)): all 64 phase-2 shards (32 control, 32 treatment) genuinely carried the correct arm, directly verified via job logs and each shard's `*-flags.json` artifact. The run's combine-phase2 job then hit a second, unrelated bug (the new `*-flags.json` file matched the combine step's own glob); shard artifacts were intact, so a one-shot workflow recombined them with the fixed glob as run [`33083577386`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33083577386). **RESULT (first genuine confirmation for this candidate): control 0/516, treatment 3/516, work +0.15% (124,739,052,106 → 124,924,680,731). Gained: `L00278`, `L00831`, `L00933`. Lost: none.** A clean gain matching the development A/B's shape. The 2026-08-26 `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` WORK-budget carve-out fix (`orchestration.ts`, PR #1506) stands independently on its own regression tests — it was never actually responsible for any confirmation outcome, but remains a real scheduler-correctness improvement. **Do not flip to default-on yet:** per the durable confirmation contract, materialize `transfer-envelope-001` (still locked/untouched) against this candidate first, to test generalization beyond its development/confirmation distribution. See [`2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`](../reports/2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md), [`2026-08-24-solver-confirmation-transfer-cohort-reservation.md`](../reports/2026-08-24-solver-confirmation-transfer-cohort-reservation.md), and [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) Priority 1. |

## Recently promoted/default-ON mechanisms worth remembering

Listed only so old experiment names are not mistaken for dangling opt-in tasks. Code owns polarity; [`solver-scheduling-policy.md`](solver-scheduling-policy.md) owns future budget valuation.

| Mechanism | Current disposition |
|---|---|
| `PRUNE_MC_NEIGHBOR_BUDGET` | Default-ON after level-blind population gain; retry-tier evidence shows it can still alter search order in both directions. |
| `STRATEGY_DEDUP_NEAR_TIE_RETRY` | Default-ON additive dead-last retry; safe placement does not make its work free. |
| `STRATEGY_ADMISSIBLE_ORDER_NON_DEFAULT_RETRY` | Default-ON after population gain; retain as baseline but reprice residual value. |
| `STRATEGY_CONNECTIVITY_AXIS_EXHAUSTED_RETRY` | Default-ON after population gain; retain as baseline but reprice residual value. |
| `STRATEGY_MC_NEIGHBOR_BUDGET_RETRY` | Default-ON after +9 / 0-loss Corpus-2 evidence; material cost makes it a scheduler tail-audit candidate. |
| `STRATEGY_GOAL_ATTRACTION_LEGACY_DISTANCE_RETRY` | Default-ON dead-last descendant of the negative global swap; population test added three solves without losses in reached controls. Reprice through scheduler work rather than increasing reserve in isolation. |
| `STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY` | Default-ON after five additive rescues without measured losses; can buy substantial failed-tail work, so seed/budget expansion requires fixed-work repricing. |
| `STRATEGY_REPAIR_LATE_PROBE` | Default-ON after same-commit population gain; future cap growth competes with other actions under shared work. |
| `STRATEGY_MAIN_LOOP_LATE_RESERVE` | Historical default-ON mechanism. Its broad “give late repair more work” interpretation is closed; do not infer an active research lane from code presence. |

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
12. A best arm selected from several alternatives remains tuned evidence and needs independent confirmation for broad claims.