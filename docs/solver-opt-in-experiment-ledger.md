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
| `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` | **DEVELOPMENT POSITIVE (+3/-0); CONFIRMATION INCONCLUSIVE x3 VIA TWO DISTINCT INSTRUMENT MECHANISMS, CANDIDATE VERIFIED INTACT TWICE, NOT NEGATIVE (2026-08-26).** Appends plain `beam:intersectionHarvest@beam5000` + `beam:objectiveFirst@beam5000` to attempts.ts's must-cross+flipper-heavy rule only. Development: prespecified `solver-archetype-sample-ab.yml` pilot restricted to `must-cross-heavy` (486-level fixed population): +3/-0, `R00817`/`R02010`/`R02151` gained, aggregate work +1.03%. Three confirmation attempts, three instrument failures: `confirm-broad-003` (256 levels) and `confirm-broad-004` (1,200 levels, ≈4.7x) via **repair-fallback saturation** (the early repair probe solves nearly every fresh archetype-eligible row first; `P(zero participation at n=1,200)≈7×10⁻¹⁰` rules out chance); `confirm-residual-001` (a 520-level control-failure residual specifically built to rule that mechanism out) via a **second, distinct scheduling gap**: 25/520 rows are genuinely archetype-eligible (verified directly via the real exported `extractFeatures`/`isMustCrossFlipperHeavy`/`getConfiguredAttemptConfigs` functions, not reimplemented or estimated), and the live config list correctly includes both new configs — yet the real solve's main loop stopped after only 4 of 6 configs on every one of those 25 rows, despite `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT` nominally protecting the trailing 5, apparently because each row's `nodesExpanded` (~225,000,000) overshoots the nominal `node_budget` (50,000,000) by ~4.5x under non-strict "legacy additive-pass" semantics. A local sanity check and this run's own direct `getConfiguredAttemptConfigs` call both independently confirm the candidate mechanism is real and intact, not a wiring bug. **Do not promote to default-on; do not close negative either** — the barrier has consistently been the confirmation instrument, not the candidate. **2026-08-26: the scheduling gap itself is now fixed.** `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT`'s reserve previously protected only the NODE-budget dimension (`stage-budget.ts`); `orchestration.ts`'s `runInterleavedAttempts`/`runGateSerialAttempts` had no equivalent WORK-budget carve-out, so a work-expensive early config population could exhaust `workBudget` while `nodeBudget` still had headroom — exactly what happened to `confirm-residual-001`. A mirrored `mainLoopEarlyWorkBudget`/per-gate `earlyGateWorkBudget` reserve now gives the trailing configs their own escalating WORK slice the same way nodes already had; two regression tests reproduce the exact starvation against the pre-fix code (red) and pass against the fix (green). **2026-08-27: `confirm-residual-002` (a fourth confirmation attempt against the fixed scheduler, same 1,200-level-pool/50,000,000-node-budget design as `confirm-residual-001`) came back byte-identical to `confirm-residual-001` — still zero participation on all 26 archetype-eligible-and-residual rows.** Live instrumentation (temporary `console.error` telemetry inside `runGateSerialAttempts`, later reverted) directly confirmed the scheduler LOGIC itself is not at fault: re-solving the real row `K00131` through the real `level-blind-capability-sweep.mjs` worker-pool path with `--workers=1` reproduces the reserve working exactly as designed — both new beam configs get dispatched with valid escalating node/work ceilings and run to a real (non-starved) `exhausted` outcome. Yet the row's REAL sealed `confirm-residual-002` report (produced under the standard `--workers=4` concurrent dispatch) shows measurably different node counts for the same two unprotected DFS configs that precede the reserve window (16,013,766 / 11,371,082 nodes under real 4-worker production dispatch vs. 9,291,718 / 9,730,890 nodes reproduced identically across two independent single-worker runs of the exact same level+options) — a difference large enough to exhaust the gate's cumulative work budget before the protected window is ever reached. The scheduler-fix mechanism is verified correct; the unexplained remainder is a worker-concurrency-correlated variance in how much node/work the SAME unprotected early configs consume before the protected suffix gets its turn, not a reserve-logic bug. **Do not promote; do not close negative; do not dispatch a fifth confirmation cohort until this concurrency-sensitivity is separately understood** — a fifth cohort under the same `--workers=4` production concurrency would very likely repeat the same non-participation result for the same as-yet-unexplained reason. See [`2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`](../reports/2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md), [`2026-08-27-mustcross-flipper-wide-beam-exposure-scheduling-gap-part-2.md`](../reports/2026-08-27-mustcross-flipper-wide-beam-exposure-scheduling-gap-part-2.md), and [`solver-optimization-current-queue.md`](solver-optimization-current-queue.md) Priority 1. |

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