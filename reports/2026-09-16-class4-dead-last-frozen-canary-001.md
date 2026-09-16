# Class-4 portal coarse-state dead-last retry: frozen canary 001

> **Status:** concluded-positive
> **Last evidence:** 2026-09-16 — local matched control/treatment execution of the frozen canary population under current HEAD (`4421bd8`)
> **Decision:** the canary passes every prespecified gate. `advance-to-113`: the 113-row class-4 portal-coarse allocation population is now earned.
> **Remaining gate:** run/measure the 113-row allocation population (gains, losses, additive `workSpent`, wall cost, unexpected collateral); freeze IDs and current residual identity before dispatch.
> **Evidence role:** decision-bearing frozen canary per `reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md` and `reports/2026-09-15-ws2-execution-readiness-closeout-001.md`. Answers `WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION`'s canary sub-question.

## Question

Does the default-off `STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY` (+ `_TREATMENT` selector) rescue the prespecified freshness sample through the real orchestration ladder, with no non-portal participation, no change to the `R01273` regression control, and a nonbinding wall deadline — the exact gate the 2026-09-15 bounded-preparation closeout could not complete under a 2-core container in its allotted time?

## Treatment

Both arms enable the identical funded dead-last shell (`STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY=true`); only the treatment arm additionally enables the retry-local selector (`STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT=true`). The global `STRATEGY_PORTAL_COARSE_STATE_MERGE` stays `false` in both arms. No other flags changed.

## Population

The exact frozen 11-row canary from the preflight: the 8 stratified freshness rows (`R00082, R02173, R02807, R03365` intersection-heavy; `R00466, R03228` multi-portal; `R00329, R03303` must-cross-heavy), the `R01273` global-form regression control, and two non-portal no-op controls (`R00001`, `R00039`). Positions in `data/stress/stress-levels-random.json`: `1, 2, 9, 43, 63, 209, 504, 1138, 1559, 1634, 1696`.

## Execution

`node scripts/run-bundled.mjs scripts/level-blind-capability-sweep.mjs` on current HEAD, both arms: `--node-budget=50000000 --work-budget=67000000` (production-shaped starting envelope, default 24h nonbinding deadline), `--workers=2`, `--lifecycle-telemetry --attempt-budget-telemetry`, `--experiment-id=ws2-class4-frozen-canary-001 --research-question=WS2-PORTAL-COARSE-DEAD-LAST-ALLOCATION --preflight=reports/2026-09-13-ws2-class2-class4-allocation-preflight-001.md`. Control: `--enable-flags=STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY`. Treatment: same plus `,STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT`. A tiny-budget smoke run plus `verify-canary-cell.mjs` validated the execution family before committing to the full-budget dispatch. Full artifacts: `reports/stress/ws2-class4-canary-{control,treatment}-001.json` (`effectiveConfigDigest` `9b596932...` control / `425fd104...` treatment).

## Participation

`ws2-experiment-readiness.mjs class4-canary` (`scripts/ws2-experiment-readiness-lib.mjs`'s `analyzeClass4Canary`) reports **zero validation reasons**: both arms' resolved `effectiveConfig`/population/SHA/scheduler identity checked out, no earlier-stage divergence, no retry-envelope divergence, no missing lifecycle telemetry, and the control shell genuinely participated (reached + nonzero work/nodes) on all 8 freshness rows — control dispatch is not being mistaken for participation. Non-portal controls show zero participation in the new stage in either arm. The wall deadline never bound (`deadlineBinding: false`).

## Result

| id | regime | control | treatment | retry stage work/nodes | whole-solve work Δ | wall Δ |
|---|---|---|---|---:|---:|---:|
| R00082 | intersection-heavy | node-budget-reached | **SOLVED** (referee-valid) | 18,954,227 / 1,859,784 | −24.1M | −174s |
| R02173 | intersection-heavy | node-budget-reached | **SOLVED** (referee-valid) | 3,909,473 / 347,450 | −34.7M | −192s |
| R02807 | intersection-heavy | node-budget-reached | **SOLVED** (referee-valid) | 2,593,718 / 251,615 | −46.4M | −224s |
| R03365 | intersection-heavy | node-budget-reached | node-budget-reached | 49,855,592 / 43,039,617 | +3.8M | −32s |
| R00466 | multi-portal | node-budget-reached | **SOLVED** (referee-valid) | 28,835,611 / 40,695,756 | +0.02M | −8s |
| R03228 | multi-portal | node-budget-reached | **SOLVED** (referee-valid) | 30,604,687 / 40,948,220 | +1.1M | −29s |
| R00329 | must-cross-heavy | node-budget-reached | **SOLVED** (referee-valid) | 4,282,558 / 417,266 | −24.3M | −148s |
| R03303 | must-cross-heavy | node-budget-reached | **SOLVED** (referee-valid) | 7,334,129 / 10,168,855 | −24.7M | −139s |
| R01273 | sentinel | SOLVED (`must-cross-neighbor-prune-disabled-retry`) | **identical** solution/path, retry work=0 | 0 / 0 | 0 | −5s |
| R00001 | non-portal control | SOLVED | identical, zero retry participation | 0 / 0 | 0 | 0s |
| R00039 | non-portal control | SOLVED | identical, zero retry participation | 0 / 0 | 0 | 0s |

**7/8 freshness rows solved, 7/7 referee-valid.** `R03365` is a genuine dose miss in this canary (its retry alone burned ~49.9M work / 43.0M nodes and still fell short — consistent with the 2026-09-13 isolated freshness replay's 101,313,315 `nodesExpanded` for this row, well beyond this canary's dose). `R01273`'s earlier production solution is byte-identical between arms with zero retry-stage engagement — the known global-merge regression does **not** reappear in the dead-last form, exactly as the additive-tier design predicts. Both non-portal controls are untouched. Every treatment row that finished faster than control did so *because* it stopped once solved rather than exhausting the node budget — the retry costs real additional work only on rows it doesn't rescue (`R03365`) or barely tips into rescuing (`R00466`, `R03228`), and net whole-solve work goes *down* on 5 of 7 gains.

## Interpretation

The fresh capability identified by the 2026-09-13 freshness replay survives the real dead-last additive-retry integration, not just the isolated single-flag replay: 7 of 8 freshness rows are rescued through the actual orchestration ladder with genuine nonzero retry engagement, all referee-valid, with no collateral cost to the sentinel or the non-portal controls and no case of the wall deadline binding. This is exactly the "least-disruptive changed-treatment exposure form" the 2026-09-13 freshness replay and the 2026-09-13 allocation preflight called for, now measured rather than merely designed.

## Disposition

`STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY` / `_TREATMENT`: **CANARY PASSED, still default-off.** Advance to the 113-row allocation population per the preflight's promotion contract (participation, referee-valid gains, additive `workSpent`, wall cost, unexpected collateral) before considering default-on promotion. This does not reopen or retest the closed-negative global `STRATEGY_PORTAL_COARSE_STATE_MERGE` form; `R01273` remains valid evidence for that closure specifically, and separately now demonstrates non-recurrence in the dead-last form.

## Next gate

Run the earned **113-row class-4 portal-coarse allocation population** (the corrected capability-memory union's class-4 nominations intersected with the closed treatment's referee-valid gain set, per the 2026-09-13 freshness replay's reconstruction method) under the identical arm identity/envelope used here. Freeze the exact ID list and current residual identity before dispatch, since it is a materially different population from the canary's stratified 8.
