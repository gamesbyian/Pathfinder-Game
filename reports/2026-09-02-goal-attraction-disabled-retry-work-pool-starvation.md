# goal-attraction-disabled-retry's unprotected shared work pool independently starves most eligible attempts

> **Status:** active
> **Last evidence:** 2026-09-02 — two 40-level local probes (`pos:1-40`, `nodeBudget=2,000,000`/`workBudget=2,680,000`) via a temporary debug hook in `orchestration.ts` (not committed; reverted after this investigation), one with `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` off (production default) and one with it on
> **Decision:** the tier's node-dimension starvation is already closed (see below), but its separate, never-independently-tested work-dimension starvation is real and dominant: with the node reserve on (so the tier is eligible on 39/40 levels), **25/39 (64%) still get zero real attempts** because the shared, unprotected `(workBudget, workStart)` pool is already exhausted — every zero-attempt level shows `workSpentSoFar` 1.1x-2.4x over `workBudget` while `nodesExpanded` sits comfortably (~97-98%) under its own protected node ceiling. This is additive to, not explained by, the already-closed node question.
> **Remaining gate:** whether giving this tier a fresh work pool (the same `withWorkCapScope`/`scaledStageWorkBudget` shape every other migrated additive tier already uses) would convert any of these 25 recovered-eligibility levels into real solves is untested — this report closes the "is the starvation premise real" question, not the "does fixing it help" question. See "What this does not establish."

## Context

`docs/solver-budget-determinism.md`'s "Remaining ms-shaped allocation debt" section flags `goal-attraction-disabled-retry` as structurally different from the nine migrated ms-derived-allocation sites: its call site passes the OUTER, already-depleting `(workBudget, workStart)` pool directly instead of a fresh one, and its own in-code comment calls this "predates that fix and has never been re-measured with it." Unlike `admissible-order-fallback` (resolved earlier today as confirmed-harmless — that tier's search primitive never consults the soft work cap at all outside an opt-in research harness), `goal-attraction-disabled-retry` dispatches through the ordinary `runGateSerialAttempts`/`runInterleavedAttempts` DFS/beam ladder, which **does** genuinely enforce `workBudget`/`workStart` as a real, binding constraint (`workSpent = prep._workMeter.units - workStart; if (workSpent >= workBudget) return { solution: null, attempts: [] }`, checked before any attempt is even considered). So for this sibling tier, the "shares the outer pool" caveat is a real risk, not a diagnostic-only inert field — the open question was purely empirical: does it actually bind?

## What was already known (node dimension, closed)

`STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` — an opt-in that carves a slice of `earlyTierNodeBudget` specifically for this tier, protecting it from the main loop/repair-fallback's own node consumption — is listed in `docs/solver-opt-in-experiment-ledger.md` as **CLOSED**: "Multiple budget scales produced negligible useful participation/solve movement." The full historical account (`docs/archive/snapshots/solver-opt-in-experiment-ledger-2026-08-20.md`) is more precise: a 20-level local repair-gated sample at two node-budget scales (5M/25M) found participation barely moved (0/20 with the flag off, 1/20 with it on, at both scales) — "most sampled levels appear to solve or fail well before ever reaching the diversity pass's own ceiling check, regardless of budget." Their own reopen condition: "evidence that identifies levels which actually reach the diversity pass's gate with room to spare yet still don't benefit, or a differently-targeted sample."

That population/budget combination mostly never reached this tier's gate at all (with or without the node reserve), which — as this report's own probe shows below — makes it structurally unable to isolate a work-dimension effect: you cannot observe work-pool starvation in a sample that almost never clears the node gate in the first place.

## This report's probe: a population that does reach the gate, isolating the work dimension

Reused `additive-tier-participation-audit.mjs`'s own reference call shape (`Solver.solveLevel({ nodeBudget: 2,000,000, workBudget: 2,680,000, attemptBudgetTelemetry: true })`, no `disableExtraBudgetPasses`) on `pos:1-40` of `data/stress/stress-levels-random.json` — the SAME population/budget the existing, already-built `additive-tier-participation-audit.mjs` tool already reports on. That tool's own current-head output confirms this report's baseline directly, with no instrumentation needed: **`goal-attraction-disabled-retry` participates in 0/40 (0%) levels** at this budget — a stronger, current-vocabulary, current-code reproduction of the same "not reaching the gate" pattern the 2026-08-20 closure found on its own smaller sample.

To see past that 0%, this report added a temporary debug hook (two `console.error` calls gated behind `globalThis.PF_GOAL_ATTRACTION_DEBUG`, never referenced anywhere else, reverted via `git checkout` before any commit — never part of this report's diff) printing, at the tier's own eligibility check: `nodesExpanded`, `earlyTierNodeBudget`, `workSpentSoFar`, `workBudget`; and after dispatch: `attemptCount`. Two runs, same population/budget:

| Run | Eligible (`nodesExpanded < earlyTierNodeBudget`) | Zero real attempts | Got a real chance | Won |
|---|---:|---:|---:|---:|
| `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` off (production default) | 0/40 | — | — | — |
| `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` on | 39/40 | **25/39 (64%)** | 14/39 (36%) | 0/14 |

The node reserve works exactly as designed — eligibility jumps from 0% to 97.5% — confirming this population is the right tool for isolating whatever happens next, unlike the 2026-08-20 sample. But **64% of now-eligible levels still get zero real attempts**, and the reason is unambiguous in the raw telemetry. Every zero-attempt level's own eligibility snapshot:

| level | `nodesExpanded` | `earlyTierNodeBudget` | `workSpentSoFar` | `workBudget` | over budget by |
|---|---:|---:|---:|---:|---:|
| `R00001` | 1,466,260 | 1,500,000 | 4,751,213 | 2,680,000 | 1.77x |
| `R00044` | 1,466,273 | 1,500,000 | 4,859,841 | 2,680,000 | 1.81x |
| `R00050` | 1,466,292 | 1,500,000 | 5,808,250 | 2,680,000 | 2.17x |
| `R00073` | 1,466,258 | 1,500,000 | 5,561,508 | 2,680,000 | 2.08x |
| `R00082` | 1,466,261 | 1,500,000 | 5,785,409 | 2,680,000 | 2.16x |
| `R00093` | 1,466,272 | 1,500,000 | 5,540,082 | 2,680,000 | 2.07x |
| `R00094` | 1,466,262 | 1,500,000 | 5,135,492 | 2,680,000 | 1.92x |
| `R00108` | 1,466,260 | 1,500,000 | 5,514,837 | 2,680,000 | 2.06x |
| `R00118` | 1,466,252 | 1,500,000 | 5,566,047 | 2,680,000 | 2.08x |
| `R00137` | 1,466,270 | 1,500,000 | 6,265,311 | 2,680,000 | 2.34x |
| `R00139` | 1,466,250 | 1,500,000 | 5,226,435 | 2,680,000 | 1.95x |
| `R00143` | 1,466,265 | 1,500,000 | 3,924,216 | 2,680,000 | 1.46x |
| `R00153` | 1,466,256 | 1,500,000 | 5,872,051 | 2,680,000 | 2.19x |
| `R00169` | 1,466,270 | 1,500,000 | 3,775,985 | 2,680,000 | 1.41x |
| `R00180` | 1,466,283 | 1,500,000 | 5,562,336 | 2,680,000 | 2.08x |
| `R00181` | 1,466,259 | 1,500,000 | 6,373,990 | 2,680,000 | 2.38x |
| `R00193` | 1,466,270 | 1,500,000 | 5,861,515 | 2,680,000 | 2.19x |
| `R00209` | 1,466,255 | 1,500,000 | 5,638,030 | 2,680,000 | 2.10x |
| `R00228` | 1,466,252 | 1,500,000 | 5,539,381 | 2,680,000 | 2.07x |
| `R00234` | 1,466,251 | 1,500,000 | 3,618,202 | 2,680,000 | 1.35x |
| `R00239` | 1,466,273 | 1,500,000 | 5,095,626 | 2,680,000 | 1.90x |
| `R00274` | 1,466,264 | 1,500,000 | 5,980,650 | 2,680,000 | 2.23x |
| `R00303` | 1,466,250 | 1,500,000 | 3,074,129 | 2,680,000 | 1.15x |
| `R00306` | 1,466,286 | 1,500,000 | 5,643,732 | 2,680,000 | 2.11x |
| `R00312` | 1,466,250 | 1,500,000 | 2,693,015 | 2,680,000 | 1.00x |

**Every single one** shows `nodesExpanded` comfortably under `earlyTierNodeBudget` (~97.7-97.8%, real protected room left) while `workSpentSoFar` already exceeds `workBudget` by 1.0x-2.4x. The node dimension has exactly the room its own reserve promised; the work dimension was already spent several times over by main-search and repair-fallback alone, because nothing reserves or refreshes a slice of it for this tier. This is the precise, decisive confirmation the sibling caveat asked for: not a plausibility argument, a direct per-level telemetry trace showing the two dimensions diverge exactly as the "unprotected shared pool" theory predicts.

## Why this is additive to, not a re-litigation of, the closed node question

The 2026-08-20 closure is not wrong or reopened by this report — it correctly found that on ITS sample, the node gate itself was the dominant reason for near-zero participation, and fixing it alone didn't move solves. This report used a population/budget where the node gate is NOT the dominant blocker once its own reserve is on (39/40 eligible), which is precisely the condition their own reopen note asked for ("levels which actually reach the diversity pass's gate with room to spare") — and found a second, independent, much larger blocker sitting right behind the first one. Fixing only the node dimension without also fixing the work dimension will keep looking like "negligible movement," because 64% of the levels the node fix successfully unblocks immediately re-block on the untouched work dimension.

## What this does not establish

- **Not a demonstrated solve gain.** 0/14 levels that did get a real chance were won by this tier on this population, matching the flavor (though not the exact levels or budget) of the already-closed node-only experiment's own "negligible useful solve movement." Giving this tier a fresh work pool would very likely raise its real-attempt rate from 36% toward 100% of eligible levels, but nothing here shows that additional search finds more solutions — only that it would finally get to try.
- **Not a proposed fix.** No code change is included. A fresh pool (mirroring `repair-fallback`'s 2026-08-20 `withWorkCapScope`/`scaledStageWorkBudget` fix, or `coarse-state-near-tie-retention-disabled-retry`'s 2026-08-28 migration) is a genuine allocation-shape change requiring its own dedicated before/after evidence and, per this codebase's standing discipline for every reserve/allocation mechanism, should land as an opt-in first.
- **Not evidence about any other tier.** `admissible-order-fallback`'s own soft-cap gap was resolved today as inert by design (different search primitive, ignores the cap entirely outside an opt-in harness) — this tier's mechanism and conclusion are unrelated and should not be conflated.
- **Population-specific numbers, structural conclusion.** The exact 1.0x-2.4x overshoot figures are this population/budget's own; the qualitative finding (node room routinely exists while the shared work pool is already several times over budget) follows directly from the code structure (repair-fallback alone gets its own multiplier-6 fresh pool via `REPAIR_ADDITIVE_BUDGET_MULTIPLIER`, i.e. up to 6x `workBudget` on top of whatever main-search already spent from the SAME base — the shared pool this tier reads from was never designed to have anything left after that) and should generalize, but was not separately confirmed on a second population in this pass.

## Suggested next step (not started)

If this line continues: design a bounded, opt-in fresh-pool candidate for `goal-attraction-disabled-retry` (same shape as `repair-fallback`'s own fix) with **both** reserves — node (existing, closed-but-compatible) and a new fresh work pool — enabled together, and measure real solve movement (not just participation) on a population, larger than this report's 40 levels, confirmed to reach the tier's gate. Per this codebase's standing discipline, land it opt-in/default-OFF first and require a dedicated before/after A/B before any promotion discussion.

## Reproduction

The debug hook itself was never committed. To reproduce: add two `console.error` calls to `modules/solver/orchestration.ts` at the `goal-attraction-disabled-retry` eligibility check (`!result.solution && diversityBudgetFraction > 0 && ...`) and immediately after its `runWholeLadderRetryTier` call, printing `{ nodesExpanded, earlyTierNodeBudget, workSpentSoFar: prep._workMeter.units - workStart, workBudget }` and `{ attemptCount: diversityResult.attempts.length }` respectively, gated behind a global flag (not `process.env` — `modules/solver/` is browser-free logic with no Node types). Run `Solver.solveLevel(level, { nodeBudget: 2_000_000, workBudget: 2_680_000, timeBudgetMs: 86_400_000, attemptBudgetTelemetry: true, ablation: { STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE: true } })` across `pos:1-40` of `data/stress/stress-levels-random.json`.
