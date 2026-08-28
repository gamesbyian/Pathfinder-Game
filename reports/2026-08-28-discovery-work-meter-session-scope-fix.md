# Discovery-tooling session work accounting: caller-owned scope fix

> **Status:** concluded-positive
> **Last evidence:** 2026-08-28 — implemented on top of `d833b16` (queue #2's post-976 head)
> **Decision:** `createDiversificationSession` (`modules/solver/diversification.ts`) and three of `scripts/hint-workbench.mjs`'s own top-level steps (`runAblationUi`, `runCandidateGrid`, `runPortalGrid`) now accumulate a session-local work counter from each solve's own `SolveResult.workSpent` instead of reading the realm-global `workMeter`. Along the way, a real bug was found and fixed: `runCandidateGrid`'s corner-flip mutation candidates were never actually reaching the acceptance pipeline (see below).
> **Remaining gate:** `modules/solver/hint-ablation-generator.ts` (~30 `workMeter.units`/`workCeiling` sites across its phase loops) and `hint-workbench.mjs`'s `runEnumeration` `shouldStop` callback (a secondary, non-binding hang-safety net inside `variety-search.ts`'s `run()`) still read the realm-global meter. Both are explicitly flagged as follow-up debt, not silently left.

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

### Left as documented remaining debt

- `hint-ablation-generator.ts`'s ~30 sites are the single largest remaining piece of this debt item. They are structurally the same fix (session-local accumulation from each `solverApi.solve()`'s `workSpent`) but scattered across many nested phase loops (baseline/cascade/strategy/swap/portalCascade/swapPortal/combined/swapCombined) in a single large file; converting them is a self-contained follow-up, not folded into this pass to keep this change reviewable and its verification precise.
- `runEnumeration`'s `shouldStop` callback fires from inside `variety-search.ts`'s own `run()` call, which has no caller-visible per-step result to sum a `workSpent` delta from the outside — closing this one requires either plumbing a session-scoped counter into `variety-search.ts` itself or accepting that this specific bound is already secondary/non-binding (the deterministic `nodeBudget` governs the discovered set; this callback only prevents hangs). Documented in place at the call site.

## Verification

- `node_modules/.bin/vitest run modules/solver/diversification.test.ts` — 7/7 pass (integration tests use the real solver against a small portal fixture; unaffected by the ceiling-contract change since all call sites were updated together).
- `node_modules/.bin/tsx scripts/hint-workbench-node-test.mjs` — passes (exit 0); this suite does not exercise `candidate-grid`/`portal-grid`, so it did not previously catch the corner-flip bug.
- `node_modules/.bin/tsc --noEmit -p tsconfig.json` — clean.
- `node scripts/check-solver-budget-boundaries.mjs` — still passes; this change does not touch any of the 9 inventoried `orchestration.ts` ms-derived allocation sites.
- `node_modules/.bin/eslint` on the touched files — clean.
- Manual `candidate-grid` run against real level 1 (above) — corner-flip fix confirmed functional, not just type-correct.
- `npm run ci` — see this report's commit for the run log.

## Production impact

No production solver ordering/scoring/pruning/budget changed. `diversification.ts`/`hint-workbench.mjs` are discovery-tooling-only modules (CLI hint workbench; `diversification.ts`'s session is not yet wired into any browser caller). The corner-flip fix changes candidate-grid's own **output** (it now actually produces the candidates its own documentation always claimed it did) but does not change any accepted candidate's validation: every corner-flip candidate still passes through the same downstream `validateCandidatePath`/acceptance pipeline as every other generator's candidates before being saved.
