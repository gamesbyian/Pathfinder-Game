# must-cross+flipper-heavy plain WIDE beam exposure: confirm-residual-002 and the concurrency-variance finding

> **Status:** inconclusive
> **Last evidence:** 2026-08-27 — `confirm-residual-002` run [`33020293451`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33020293451) at solver revision `e6e6f84e21d1e6ab7ef47a407230a197fab529ba` (includes the 2026-08-26 WORK-budget reserve fix, PR #1506); live debug instrumentation runs [`33040553798`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33040553798) (real worker-pool re-solve of `K00131`, `--workers=1`, `--debug-main-loop`) and [`33037395648`](https://github.com/gamesbyian/Pathfinder-Game/actions/runs/33037395648) (direct `solveLevel()` re-solve of `K00131`)
> **Decision:** `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` remains **inconclusive, not negative**. The 2026-08-26 WORK-budget scheduling fix (`2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`) is verified correct — live instrumentation proves it protects the trailing configs exactly as designed when a level is solved in isolation. But `confirm-residual-002`, dispatched specifically to retest against that fix, came back **byte-identical to `confirm-residual-001`**: zero participation for the candidate's two new beam configs on all 26 archetype-eligible-and-residual rows. The cause is not a scheduler-logic bug this time — it is a real, reproducible difference in how much node/work the SAME preceding (unprotected) configs consume under the standard `--workers=4` production concurrency versus an isolated `--workers=1` re-solve of the identical level and options. **Do not promote to default-on; do not close negative; do not dispatch a fifth confirmation cohort under standard `--workers=4` concurrency** until that concurrency-sensitivity is separately understood — it would very likely repeat this exact result for the same unresolved reason.
> **Remaining gate:** a genuine, currently unexplained mechanism by which real parallel worker-pool dispatch changes a level's own node/work consumption relative to an isolated solve of the identical level and options. Not addressable by a further scheduler-reserve change alone; needs its own investigation (see "Open question" below) before any further scheduling fix or confirmation cohort is worth commissioning for this candidate specifically, and possibly for any candidate living in a trailing-reserve window on a residual population.
> **Evidence role:** confirmation (failed a fourth time; see diagnosis for why it still carries no decision weight either way)
> **Selection:** no new candidate selection in this report — same frozen `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` candidate as `2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`.

## Background

[`2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md`](2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md) diagnosed `confirm-residual-001`'s zero-participation result as a real scheduling gap: `MAIN_LOOP_LATE_RESERVE_CONFIG_COUNT`'s reserve protected only the NODE-budget dimension; `runInterleavedAttempts`/`runGateSerialAttempts` had no equivalent WORK-budget carve-out, so a work-expensive early config population could exhaust `workBudget` while `nodeBudget` still had headroom. That gap was fixed the same day (PR #1506): a mirrored `mainLoopEarlyWorkBudget`/per-gate `earlyGateWorkBudget` reserve, verified by two new regression tests reproducing the exact starvation mechanism (red before, green after).

`confirm-residual-002` was reserved and dispatched specifically to retest the candidate against that fix — same design as `confirm-residual-001` (two-phase control-failure residual, `pool_count=1200`, `node_budget=50,000,000`), fresh identity (master seed `2026082702`, id prefix `K`) so the residual's composition could not have been shaped by having already been inspected for a different candidate.

## Result: byte-identical to confirm-residual-001

`confirm-residual-002`'s phase 1 (1,200 fresh levels, control-only) found 55/1,200 `isMustCrossFlipperHeavy`-eligible levels, 26 of which control failed to solve (the phase-2 residual). Phase 2 ran the real control/treatment A/B on exactly those 26 rows. The archetype audit (`scripts/stress/confirm-residual-001-archetype-audit.mjs`, durable tooling reused unchanged) found, for every one of the 26 rows: `newCandidateConfigAttempts=0` — the two new beam configs' `actionKey`s never appear anywhere in the treatment arm's recorded attempts, identical in shape to `confirm-residual-001`'s finding despite the intervening scheduler fix.

This was the first hint that the 2026-08-26 fix, though logically sound and test-verified, was not changing the real outcome.

## Ruling out a report/audit-tooling bug

Before suspecting the scheduler again, the audit script's own filter and the report-serialization path it reads from were checked line by line:

- `scripts/portfolio-solve-sweep-lib.mjs`'s `attemptRecord`/`attemptActionKey` correctly compute each persisted attempt's `actionKey` via the canonical `modules/solver/attempt-identity.mjs` formatter, using the right field names (`attempt.profile`, not a nonexistent `profileName`; `attempt.template`, already a plain string id, not a `StructuralTemplate` object) — no wiring bug there.
- The candidate's two new configs (`beam('intersectionHarvest', BEAM.WIDE)`, `beam('objectiveFirst', BEAM.WIDE)`, `modules/solver/attempts.ts`) produce `actionKey`s of the exact shape the filter matches (`main-loop|beam:intersectionHarvest@beam5000` / `main-loop|beam:objectiveFirst@beam5000`, no `(diverse)` suffix) — confirmed both by reading `formatAttemptIdentityKey`'s construction and by directly calling `getConfiguredAttemptConfigs(level, {STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE: true})` live against the real row `K00131`: the two new configs appear at list positions 5-6 of 13 (`mainConfigs` positions 5-6 of 6 after filtering out `repair`/`admissibleOrder` entries), exactly where the earlier diagnosis expected.

The report-building path is correct. The zero-participation finding is real: the two configs genuinely never ran for real in the sealed `confirm-residual-002` treatment report.

## Live instrumentation: the scheduler logic is not the problem this time

Two independent re-solves of the real row `K00131` were run to see the scheduler's actual internal state, since static reading of `runGateSerialAttempts` could not by itself explain the discrepancy:

1. **Direct `solveLevel()` call** (`--solve-direct-for-id`, run `33037395648`): re-solving `K00131` in isolation with `attemptBudgetTelemetry: true` showed 6 main-loop-stage attempts (not 4), with `mainLoopLateReserve: true` correctly marked on the 5 reserve-protected configs and escalating `allocatedNodeCeiling`/`allocatedWorkCeiling` values exactly matching the fix's design. Both new candidate configs got a real, non-starved `exhausted` outcome (185,044 and 210,089 nodes respectively).

2. **Live per-iteration debug instrumentation** (temporary `console.error` telemetry added to `runGateSerialAttempts`, gated behind a `debugMainLoop` `SolveOpts` field / `--debug-main-loop` CLI flag threaded through the real `level-blind-capability-sweep.mjs`, run `33040553798`, `--workers=1`): re-solving `K00131` through the ACTUAL worker-pool dispatch path (not a direct call) confirmed the reserve computation is exactly correct at every step. The main-loop round (`nodeBudget=37,500,000`, `lateConfigStart=1`, `lateConfigCount=5`) shows, for the two candidate configs (`ci=4`, `ci=5`):

   | ci | config | nodesExpanded (before) | configNodeBudget | configWorkBudget | gateBudget | dispatched? |
   |---:|---|---:|---:|---:|---:|---|
   | 4 | `intersectionHarvest@beam5000` | 27,816,158 | 36,375,000 | 37,063,315 | 38,209,603 | **yes** — all three stop checks (node, work, flat) pass |
   | 5 | `objectiveFirst@beam5000` | 28,001,202 | 37,500,000 | 38,209,603 (= full `gateBudget`) | 38,209,603 | **yes** — same |

   Both dispatch successfully; the post-dispatch node counts (28,001,202 → 28,186,246 and onward) match the direct-call reproduction exactly. This instrumentation also incidentally confirmed the retry tiers (`dedup-near-tie-retry`, `connectivity-axis-exhausted-retry`, `mc-neighbor-budget-retry`, `goal-attraction-legacy-distance-retry`) each rerun `mainConfigs` with `lateConfigStart` reset to the full list length (no reserve window at all in those tiers) — expected and irrelevant here, since the candidate configs already got their one genuine shot in the main-loop round itself.

Both approaches agree: **the scheduler, run in isolation, correctly dispatches both new candidate configs with a real (non-degenerate) reserve slice.** The 2026-08-26 fix works exactly as designed.

## The actual discrepancy: real concurrent dispatch changes upstream node/work consumption

Comparing the SAME row's SAME two *preceding, unprotected* configs (`ci=1` `dfs:objectiveFirst`, `ci=2` `dfs:intersectionHarvest`) across the two contexts:

| config | real `confirm-residual-002` sealed report (`--workers=4`, production) | isolated re-solve (`--workers=1`, two independent runs, byte-identical to each other) |
|---|---:|---:|
| `dfs:objectiveFirst` | 16,013,766 nodes | 9,291,718 nodes |
| `dfs:intersectionHarvest` | 11,371,082 nodes | 9,730,890 nodes |

These are the two configs whose consumption determines how much of the gate's cumulative work budget is left by the time `ci=4`/`ci=5` (the reserve-protected candidates) are reached. Under production's real 4-worker-per-runner concurrent dispatch, these two configs alone consume ~27.4M nodes (vs. ~19.0M in isolation) — enough extra consumption that, combined with everything the level's repair-probe and earlier configs already spent, the gate's cumulative work crosses `gateBudget` before the protected window is ever reached, even though the reserve computation ITSELF is correct.

`intersectionHarvest`/`objectiveFirst` DFS attempts have no PRNG dependency and `modules/solver/work-meter.ts`'s unit counting has no wall-clock dependency — the search's node/work counting should, in principle, be a pure function of `(level, cfg, budgets)`. However, `modules/solver/search.ts`'s DFS/beam inner loop stop condition is an OR of three checks, one of which is genuinely wall-clock-based:

```js
if (Date.now() - startTime >= budgetMs || nodesExpandedTotal + frontierIndex >= nodeBudget || prep._workMeter.units >= (prep._workCap ?? Infinity)) { ... }
```

`budgetMs` here is derived from the outer 24-hour non-binding deadline (`timeBudgetMs - elapsed-wall-clock-since-main-loop-start`), which should be enormously non-binding for any single-level solve completing in minutes. Whether or under what real-world contention this wall-clock leg can actually bind — or whether the true mechanism is something else entirely (e.g. the long-lived forked worker process reusing the same `Solver` instance across many sequentially-dispatched levels, `scripts/solver-worker-pool.mjs`'s `dispatchNext` reassigning new tasks to the same forked process rather than spawning fresh ones per level) — was not conclusively identified. Both are plausible, neither was confirmed with certainty; further live instrumentation under REAL `--workers=4` concurrency (not attempted here, given cost/scope) would be needed to distinguish them.

## Disposition

- The 2026-08-26 WORK-budget reserve fix (PR #1506) stands: it is real, correct, and merged. It is NOT reverted by this finding.
- `STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE` remains **inconclusive**, now failing confirmation for a fourth, distinct reason. This is still not evidence against the candidate itself — every failure to date has been an instrument/environment problem, not a candidate problem.
- `confirm-residual-002` is spent with this result recorded (`reports/stress/managed-evaluation-populations-2026-08-24.json`).
- **Do not commission a fifth confirmation cohort under the standard `--workers=4` production concurrency** — it would very likely repeat this exact non-participation result for the same unresolved reason, burning another cohort identity without new information. A fifth attempt would only be informative if it either (a) runs under `--workers=1` (removing concurrency as a variable, at the cost of losing production-representativeness) or (b) is preceded by a dedicated investigation into whether/how real parallel dispatch changes a level's own deterministic node/work trajectory.
- The temporary `console.error` debug instrumentation added to `modules/solver/orchestration.ts` and `scripts/level-blind-capability-sweep.mjs` for this investigation has been reverted; the one-shot audit workflow (`confirm-residual-002-archetype-audit-one-shot.yml`) has been deleted per the repository's one-shot retention convention. The durable `scripts/stress/confirm-residual-001-archetype-audit.mjs` script (including its `--dump-full-attempts-for-id` and `--solve-direct-for-id` additions) is retained.

## Open question for a future investigation

Does real multi-worker concurrent dispatch (`--workers=4`, `scripts/solver-worker-pool.mjs`) change a solve's own deterministic node/work trajectory relative to an isolated single-worker solve of the identical level and options, and if so, by what mechanism (wall-clock-influenced search stop conditions, or cross-level state/timing effects in a long-lived forked worker process reused across many sequentially-dispatched levels)? This question is broader than this one candidate: if real, it would mean ANY development/confirmation A/B run at `--workers>1` (the repository's own standard scheduling default, `.github/workflows/README.md`) is not perfectly reproducible against a `--workers=1` or direct-call sanity check of the same level, which has implications for how much weight to put on single-level reproduction checks generally.
