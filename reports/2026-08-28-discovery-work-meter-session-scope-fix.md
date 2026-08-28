# Discovery-tooling session work accounting: caller-owned scope fix

> **Status:** concluded-positive
> **Last evidence:** 2026-08-28 — implemented on top of `d833b16` (queue #2's post-976 head)
> **Decision:** Every discovery-tooling caller capable of owning its own work scope now does: `createDiversificationSession` (`modules/solver/diversification.ts`), `modules/solver/hint-ablation-generator.ts`'s `createHintAblationGenerator` (baseline phase + `runCascade`/`runStrategyPhase`, ~30 sites across all 7 phase loops), and three of `scripts/hint-workbench.mjs`'s own top-level steps (`runAblationUi`, `runCandidateGrid`, `runPortalGrid`) all accumulate a session-local work counter from each solve's own `SolveResult.workSpent` instead of reading the realm-global `workMeter`. Along the way, a real bug was found and fixed: `runCandidateGrid`'s corner-flip mutation candidates were never actually reaching the acceptance pipeline (see below).
> **Remaining gate:** only `hint-workbench.mjs`'s `runEnumeration` `shouldStop` callback (a secondary, non-binding hang-safety net inside `variety-search.ts`'s `run()`, which has no caller-visible per-step result to intercept) still reads the realm-global meter — explicitly flagged in place, not silently left. Closing it requires plumbing a session-scoped counter into `variety-search.ts` itself, a materially different (and lower-priority, since this bound is already non-binding) change than the caller-owned-accumulation pattern used everywhere else. Separately, `scripts/technique-census-cell.mjs`'s `runCell` now also supports an opt-in `cell.workBudget` (queue item #2 step 2, "equal-work evidence substrate") — the execution primitive only; wiring an actual equal-work plan tier is deliberately deferred as its own decision-bearing research step (see below).

## Scope

Follow-up to [`2026-08-27-solver-budget-model-rationalization.md`](2026-08-27-solver-budget-model-rationalization.md)'s debt item #4 ("module-global discovery work meter"), which is queue item #2's step 1 ("ownership/parity first ... session-isolated multi-solve work accounting").

Goal: characterize whether/where the module-global `workMeter` (see `docs/solver-budget-determinism.md`'s counter table) is actually at risk of cross-call contamination in current discovery tooling, and close that risk where a caller can own its own session-local accumulation without changing search behavior.

## Characterization

`modules/solver/work-meter.ts` increments two counters on every `applyMove`/`isConnected` call: the per-solve `prep._workMeter` (already correctly isolated) and the realm-global `workMeter` (a monotonic process/realm total, not scoped to any one caller). Any code that reads the realm-global counter to bound a multi-solve "session" is implicitly assuming no unrelated solve runs concurrently in the same realm.

Grepping every module-global `workMeter` read (excluding the already-migrated `scripts/method-probe.mjs`, which now supports an explicit `--work-budget` isolated mode):

- `modules/solver/diversification.ts`'s `createDiversificationSession`/`runUntil` — a resumable multi-solve session (baseline + gate-direction + portal-direction cascades) that reads the ceiling live so a "+1 minute" extension works. Its header comment states it is designed for use **inside the running game** (Editor "Solve Options" diverse search) — not yet wired to any browser caller today, but its only current callers (`diversification.test.ts`, `scripts/hint-workbench.mjs`'s `runAblationUi`) already run it strictly sequentially in one process with no concurrency, so today's behavior was unaffected by the risk — the risk is specifically what would happen once it's live in a browser tab running other solver-driven UI concurrently.
- `scripts/hint-workbench.mjs`'s own top-level `runAblationUi`, `runCandidateGrid`, `runPortalGrid` — each computes its own local ceiling from the realm-global counter, sequentially, once per level, in one CLI process.
- `scripts/hint-workbench.mjs`'s `runEnumeration` — a **secondary, non-binding** hang-safety net passed as `shouldStop` into `variety-search.ts`'s `search.run()`. The primary bound is the deterministic `nodeBudget x restarts x seeds` already passed into `createVarietySearch`; this callback only prevents an already-bounded search from also hanging.
- `modules/solver/hint-ablation-generator.ts` — ~30 sites across baseline/cascade/strategy/swap/portal/combined phase loops, structurally identical in kind to the other production sites but far larger in surface.

None of `getNeighbors`/`isMoveDynamicallyValid` (used by diversification/hint-workbench's own direction-enumeration helpers) touch the work meter — confirmed by reading `search-state.ts`; only `applyMove` and `isConnected` do. So a session's own `SolveResult.workSpent`, summed across every `solverApi.solve()` call it makes, is byte-identical to the realm-global counter's own delta over that session **as long as nothing else concurrently touches the realm-global counter during it** — exactly the assumption being removed.

## Implemented

### `diversification.ts`

`createDiversificationSession` now owns `ctx.sessionWork` (starts at 0). Every `solverApi.solve()` call inside `cascadeSteps`, `strategySteps`, and the baseline phase adds its own `result?.workSpent ?? 0` to it, whether the attempt won or lost (a losing probe still spends real work and must count, exactly like the old realm-global read did). `buildResult`/`shouldStop`/`workLeft` now compare against `ctx.sessionWork` instead of `workMeter.units`.

This changes `runUntil(getWorkCeiling, ...)`'s contract: `getWorkCeiling()` is now measured from the session's own zero baseline, not an absolute realm-global checkpoint. `diversification.test.ts`'s `() => workMeter.units + 500_000_000` / `() => workMeter.units - 1` expressions became `() => 500_000_000` / `() => -1` — same effective budget size, no `workMeter` import needed anymore. `hint-workbench.mjs`'s `runAblationUi` dropped its `workMeter.units +` prefix for the same reason.

### `hint-workbench.mjs`: `runCandidateGrid` / `runPortalGrid`

`solveGridAttempt` now returns `workSpent` alongside `solution`/`attemptInfo` (present even on a failed/no-solution attempt, since `SolveResult.workSpent` is always set by `orchestration.ts`'s `finish()`). Each step's own `record()` closure accumulates `workSpent` from every result it sees, replacing that step's own `workMeter.units`-based ceiling read.

One known, accepted edge case: if `Solver.solve()` throws (a genuine error, not ordinary exhaustion — rare, since these steps also set `disableExtraBudgetPasses: true`), the work it spent before throwing cannot be recovered from the caller side the way the realm-global read could. This is conservative in the safe direction only (the session may run marginally longer than its nominal budget on that path, never shorter) and is documented at the `catch` site.

### Bug found and fixed: corner-flip candidates never reached the acceptance pipeline

While converting `runCandidateGrid`'s `record()` to accumulate work, its call site for corner-flip mutations turned out to pass a bare path array (`record(mutation.path, {...})`) into a function whose contract is `record(result, provenance)` with `result.solution`/`result.attemptInfo` — i.e. `solveGridAttempt()`'s own return shape. `mutation.path?.solution` is `undefined` on a plain array, so `record()`'s `if (!result?.solution) return;` guard silently no-op'd on every corner-flip mutation, for as long as this code path has existed (present unchanged across every historical revision of `candidate-grid`'s introduction).

Evidence this was a real, live bug, not merely a defensive branch: `grep -rl "corner-flip" data/hints/` returns zero files, while `candidate-grid` (which stamps `technique: 'candidate-grid:<phase>'`, including `corner-flip`) is present in 121 hint files — every other `candidate-grid` phase (`baseline`, `strategy`, `forced-first-step`, `forced-first-step-strategy`) has produced saved hints; `corner-flip` never has.

Fix: wrap the mutation as `record({ solution: mutation.path, attemptInfo: null }, {...})`. Verified against real level 1 (`data/levels.json`, 227 existing hints via `data/hints/P00001.json`): `--preset=candidate-grid --policy=audit-only --audit-policy=save-all --wall-ms=3000 --seeds=3 --policy-report=full` now reports 31 corner-flip policy entries (0 before the fix), 12 of which `wouldAccept` as genuinely novel valid hints — accounting for the entire run's `+12 would-accept` total (the other phases on this well-mined level found only already-known duplicates). This is a read-only audit-mode run; no hint files were written by this verification.

A defensive comment was added at `record()`'s own definition (`runCandidateGrid`) describing its expected input shape, so the same mistake is caught by inspection rather than by a silent no-op if it recurs (e.g. in a future non-solve candidate source).

### `hint-ablation-generator.ts` (~30 sites)

Same pattern as `diversification.ts`, applied to `RunCtx` (already threaded through `runCascade`/`runStrategyPhase`/every phase loop in `createHintAblationGenerator`): added `ctx.workSpent`, changed `ctx.workCeiling`'s meaning from an absolute `workMeter.units` checkpoint to a session-relative budget, and replaced every `workMeter.units >= workCeiling` / `workMeter.units < workCeiling` (26 checks: 2 inside the two helpers via `ctx.workCeiling`, 1 in the baseline-phase gate, 15 `>=`/6 `<` across the cascade/swap/portalCascade/swapPortal/combined/swapCombined phase loops, plus the two initialization sites) with the equivalent `ctx.workSpent` comparison. `createHintAblationGenerator`'s own public `workBudget`/`wallClockDeadlineMs` options were already amount-shaped (not absolute checkpoints), so no external caller (`hint-workbench.mjs`'s `runAblationFull`, `scripts/hint-diversification.mjs`, `hint-ablation-generator.test.ts`) needed any change — this was purely an internal representation fix.

Verified with a real end-to-end run against level 1 (`data/levels.json`, 227 existing hints): a generous `--wall-ms=9000` ablation-full run completes all 7 phases (`haltedByWorkBudget: false`, `combosTried` baseline 1 / cascade 6 / swap 4 / portalCascade 8 / swapPortal 16 / combined 36 / swapCombined 24, 22 accepted candidates), and a starved `--wall-ms=1` run correctly halts after 1 combo (`phasesRun: ['baseline', 'cascade']`, `haltedByWorkBudget: true`) — confirming the ceiling still functions as a real stopping condition, not just a type-correct no-op.

### Left as documented remaining debt

`runEnumeration`'s `shouldStop` callback fires from inside `variety-search.ts`'s own `run()` call, which has no caller-visible per-step result to sum a `workSpent` delta from the outside — closing this one requires either plumbing a session-scoped counter into `variety-search.ts` itself or accepting that this specific bound is already secondary/non-binding (the deterministic `nodeBudget` governs the discovered set; this callback only prevents hangs). Documented in place at the call site.

### `scripts/technique-census-cell.mjs`: equal-work census execution capability (queue #2 step 2)

Separate from the module-global-`workMeter` debt item above, but the natural next queue-ordered step ("equal-work evidence substrate: extend isolated/census tooling where scheduler pricing still relies on node-depth-only evidence"): `runCell` now accepts an optional `cell.workBudget`. When finite, it shares/divides canonical work across gates/technique keys the same way the pre-existing default mode divides raw nodes — same per-gate `Math.floor(remaining / gatesLeft)` share math, same "first config gets the whole gate ceiling, a second config (T3 pairs) gets only the leftover" behavior — bounding each attempt via `prep._workCap` (read internally by the real search primitives) instead of `runAttempt`'s own `nodeBudget` parameter. This mirrors `method-probe.mjs`'s already-shipped `--work-budget` deterministic mode rather than inventing new resource semantics.

New result fields (`workBudget`, `workSpent`, `deadlineTruncated`) and statuses (`work-budget-reached`, `deadline-truncated`) appear **only** on a cell that supplies `workBudget`; every existing node-budget-only T1/T3 cell is untouched byte-for-byte (`useWork` gates the entire new branch off). `deadlineTruncated` follows the same discipline as `method-probe.mjs`'s: a wall-safety timeout (`outcome: 'timed-out'`) before an attempt's own work share is exhausted right-censors that cell's evidence rather than recording it as ordinary unsolved-at-budget.

**What this is not**: a new census tier, a new CLI flag, or a decision about what population/scale to run at equal work. `build-technique-census-plan.mjs` (tier/population/scale) and `combine-technique-census-shards.mjs` (its `status` bucketing hardcodes `node-budget-reached`; the two new statuses would currently fall through its summary uncounted) are untouched — nothing today can reach `cell.workBudget` except a direct `runCell({...workBudget})` call, which is deliberate: choosing a real population/scale for equal-work evidence is itself a decision-bearing research choice under the operating model's premise/pilot/gate discipline, not a plumbing task to fold into a representation fix.

`technique-census-cell.mjs` had **zero** prior test coverage (verified: no test file referenced it anywhere in the repo before this change). `scripts/technique-census-cell-node-test.mjs` (new, wired into `npm run test:node` as `test:technique-census-cell`) now covers both modes: stubbed tests (`runAttemptForTesting`, a new test-only injection point mirroring `orchestration.ts`'s `attemptSearchForTesting`, per `docs/testing.md`'s "mocked deadline-path unit test" convention — no real wall-clock race) prove the exact share/ceiling/deadline-truncation arithmetic deterministically; real-solver tests against published level 1 prove the wiring holds against genuine search primitives — notably, a generous work budget reproduces the *exact* unconstrained cost (1884 work units for `dfs:nearClosureRescue` on gate 4, matching a real unconstrained probe run byte-for-byte), and a real losing technique (`beam:objectiveFirst@beam2000`) genuinely gets capped (`work-budget-reached` at a 50,000-unit budget).

## Verification

- `node_modules/.bin/vitest run modules/solver/diversification.test.ts` — 7/7 pass (integration tests use the real solver against a small portal fixture; unaffected by the ceiling-contract change since all call sites were updated together).
- `node_modules/.bin/vitest run modules/solver/hint-ablation-generator.test.ts` — 7/7 pass.
- `node_modules/.bin/tsx scripts/hint-workbench-node-test.mjs` — passes (exit 0); this suite does not exercise `candidate-grid`/`portal-grid`, so it did not previously catch the corner-flip bug.
- `node_modules/.bin/tsx scripts/hint-diversification-node-test.mjs` — passes (exit 0); exercises `createHintAblationGenerator` through the legacy CLI wrapper.
- `node_modules/.bin/tsc --noEmit -p tsconfig.json` — clean.
- `node scripts/check-solver-budget-boundaries.mjs` — still passes; this change does not touch any of the 9 inventoried `orchestration.ts` ms-derived allocation sites.
- `node_modules/.bin/eslint` on the touched files — clean.
- Manual `candidate-grid` run against real level 1 — corner-flip fix confirmed functional, not just type-correct (31 corner-flip candidates evaluated, 12 accepted; 0 before the fix).
- Manual `ablation-full` runs against real level 1 — both the generous-budget (all 7 phases complete, 22 accepted) and starved-budget (`--wall-ms=1`, halts after 1 combo) paths behave correctly, confirming the ceiling still functions as a real stopping condition.
- `node_modules/.bin/tsx scripts/technique-census-cell-node-test.mjs` (new) — 9/9 pass: node-budget regression, work-budget share/ceiling arithmetic, deadline-truncation, multi-technique gate-sharing (all stubbed/deterministic), plus real-solver generous-budget/losing-technique/node-mode-baseline cases.
- `node scripts/check-package-scripts.mjs` — passes with the new `test:technique-census-cell` entrypoint wired into `test:node`.
- `npm run ci` — run three times (after the `diversification.ts`/`hint-workbench.mjs` pass, after adding `hint-ablation-generator.ts`, after adding the technique-census-cell equal-work capability); see this report's commit(s) for the run logs. All green: 100 vitest files / 1268 tests, 34-then-35 `test:node` scripts, all checks.

## Production impact

No production solver ordering/scoring/pruning/budget changed. `diversification.ts`/`hint-ablation-generator.ts`/`hint-workbench.mjs` are discovery-tooling-only modules (CLI hint workbench and hint-diversification tooling; `diversification.ts`'s session is not yet wired into any browser caller). The corner-flip fix changes candidate-grid's own **output** (it now actually produces the candidates its own documentation always claimed it did) but does not change any accepted candidate's validation: every corner-flip candidate still passes through the same downstream `validateCandidatePath`/acceptance pipeline as every other generator's candidates before being saved.
