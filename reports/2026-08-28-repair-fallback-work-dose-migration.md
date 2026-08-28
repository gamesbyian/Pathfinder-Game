# repair-fallback: second queue #2 step-3 additive-tier work-dose migration

> **Status:** concluded-positive
> **Last evidence:** 2026-08-28 — code migration, full 160-level `solver:bench --check` byte-identical, targeted unit tests, a pre-existing test correction, and a full `pos:1-10` capability-sweep-shaped before/after confirmation (see addendum)
> **Decision:** `repair-fallback`'s own fresh `withWorkCapScope` cap is now sized from the solve's resolved `workBudget` (`scaledStageWorkBudget` in `budget-units.ts`) instead of re-deriving it from `timeBudgetMs` a second time via `legacyMsToWork`. Same pattern and same behavior-preservation profile as [`dedup-near-tie-retry`'s own migration](2026-08-28-dedup-near-tie-retry-work-dose-migration.md) (queue #2 step 3's first site): rigorously behavior-preserving for live interactive play and the plain-default `solveLevel()` call shape; a genuine, deliberate dose correction for the offline capability-sweep/confirmation-workflow call shape.
> **Remaining gate:** none. The `pos:1-10` population matched exactly on every field (solved set, per-level `nodesExpanded`, and every stage's `workSpent` including `repair-fallback`'s own) — a stronger empirical result than the first migration's own confirmation, but one that (see addendum) did not actually exercise the work-cap dimension this migration changed, since `repair-fallback`'s node ceiling binds first on this population either way. The formula-level argument, not this run, is what establishes the fix.

## Motivation

Second site from [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) item #2 step 3's nine-site inventory, following the same "one additive tier at a time... prove parity" discipline the first migration ([`dedup-near-tie-retry`](2026-08-28-dedup-near-tie-retry-work-dose-migration.md)) established. This report assumes that report's context and states only what is specific to `repair-fallback`.

## What changed

`modules/solver/orchestration.ts`'s repair-fallback loop previously computed:

```js
const repairFallbackTotalBudget = Math.floor(timeBudgetMs * repairBudgetFraction);
const repairFallbackWorkBudget = legacyMsToWork(repairFallbackTotalBudget, MIN_ATTEMPT_WORK);
```

and used `repairFallbackWorkBudget` to install a fresh, additive `prep._workCap` via `withWorkCapScope(prep, prep._workMeter.units + repairFallbackWorkBudget, ...)` — the 2026-08-20 fix (documented in a still-passing regression test) that stops this loop from silently inheriting a stale, already-exhausted cap left over from the main loop's own per-attempt budget-share division. It now computes:

```js
const repairFallbackWorkBudget = scaledStageWorkBudget(workBudget, repairBudgetFraction, MIN_ATTEMPT_WORK);
```

`repairFallbackTotalBudget` (ms) is **kept**: it still sizes `repairBudget`, the per-gate wall-deadline slice passed as `runAttempt`'s ms parameter inside the fallback loop — a genuine latency-safety bound, subordinate to `prep._workCap` for actual allocation (the same "deadline truncates, work cap sizes" relationship the first migration's report establishes for `dedup-near-tie-retry`'s `totalBudgetMs`).

`REPAIR_EXTRA_BUDGET_FRACTION` is the integer `6.0` (unchanged by this migration), so for any call that does not supply an explicit `baseWorkBudget`/`workBudget`, `scaledStageWorkBudget(workBudget, 6.0, MIN)` and the old `legacyMsToWork(floor(timeBudgetMs*6.0), MIN)` are algebraically identical — the same linearity argument as the first migration, and it carries the identical caveat: **not** identical when a caller supplies an explicit `workBudget` disproportionate to a huge non-binding `timeBudgetMs` (the offline capability-sweep call shape).

## A pre-existing test pinned the old bug's exact number — found and fixed

`modules/solver/orchestration.test.ts`'s `'the ordinary repair fallback loop gets fresh work room, not a stale cap left by the main loop (regression, fixed 2026-08-20)'` solves `makeRepairGatedInfeasibleLevel()` with `timeBudgetMs: 5000, workBudget: 100_000` (a legacy-alias explicit override) and asserted `repairAllocatedWorkCeiling > 1_000_000` with a comment stating the expected magnitude was "~100.5M" — i.e. `REPAIR_EXTRA_BUDGET_FRACTION (6.0) * timeBudgetMs (5000) * LEGACY_MS_TO_WORK_RATE (3350)`, entirely ignoring the test's own explicit `workBudget: 100_000`. This is precisely the bug this migration closes: the test's own call shape (explicit `workBudget` wildly disagreeing with what `timeBudgetMs` implies) is exactly the stratum where the old and new formulas diverge, so this test failed immediately after the code change (`600,000` vs. the old `> 1_000_000` threshold, since `6 * 100,000 = 600,000 < 1,000,000`).

This is not a weakened assertion. The test's real intent — confirming `repair-fallback` gets a **fresh** cap, not a **stale**, already-mostly-spent one inherited from the main loop's last per-attempt slice — still holds and is still checked: `600,000` remains three orders of magnitude larger than any plausible single main-loop per-attempt slice of `workBudget=100,000` (bounded by `workBudget` itself, so at most `100,000`, typically far less once divided across many configs). The fix changes the threshold to an exact-value pin (`600,000`) with a comment explaining both the 2026-08-20 fix this test targets and the 2026-08-28 migration that changed the expected magnitude, so a future reader does not need to re-derive either number.

**This is the value of doing one site at a time with real regression coverage**: a batch conversion across several sites would likely have hit several such pre-existing numeric pins simultaneously, making it much harder to distinguish "this test's assumption was about the old bug's own magnitude" from "this migration broke something." Finding and fixing exactly one, with a clear explanation, is the intended shape of this work.

## What was actually verified

1. **Live interactive production: unaffected, by construction.** Both real callers pass `disableExtraBudgetPasses: true`, which forces `repairBudgetFraction` to `0` before this code ever runs (unchanged by this migration).

2. **Plain-default call shape: proven byte-identical.** Full 160-level published corpus: `node scripts/run-bundled.mjs scripts/solver-bench.mjs --check` reports **68,562,085 nodes**, solved 160/160, identical to both the pre-migration baseline and to the state after the first (`dedup-near-tie-retry`) migration.

3. **New targeted unit tests** (`modules/solver/orchestration.test.ts`), mirroring the first migration's pair exactly: `'repair-fallback work dose no longer resizes with a non-binding deadline change'` and `'repair-fallback now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs'`. Both use `makeRepairGatedInfeasibleLevel()` with `STRATEGY_REPAIR_FALLBACK_NODE_RESERVE: true` (needed so the fallback loop actually gets a turn instead of being starved by the main loop's own share of the shared node budget — see the pre-existing reserve tests immediately above them) and the existing `repairFallbackReserveDispatch()` stub.

4. **Full test suite**: all 1274 vitest tests pass (1272 before this session + the 2 new dedup tests + these 2 new repair-fallback tests, minus the one corrected pin), all `test:node` scripts, all `check:validators`, `tsc`, and lint.

## What this does not establish

Same disclaimers as the first migration's report: no claim about any of the remaining 7 sites' own behavior-preservation profile; no claim that `repair-fallback`'s new capability-sweep-shape numbers are "better," only more honest; no recommendation on `--strict-total-work-budget` adoption for the confirmation workflows.

## Addendum: pos:1-10 confirmation-scale population

The same `pos:1-10` population and protocol as the first migration's own addendum (before = commit `79147e0`, the state immediately after `dedup-near-tie-retry`'s migration landed, in a separate worktree; after = this migration's own commit).

**Result: exact match on every field, not just the solved set.** All 10 levels matched precisely on `ok`, `status`, `winningStageId`, **and `nodesExpanded`** (e.g. `R00046` 44,750,022 both before and after; `R00088` 44,000,004 both before and after) — **0 diffs across the entire population**. This is a stronger result than the first migration's own addendum, which matched on solved-set/winning-stage but showed small non-deterministic ppm-level jitter in unrelated stages' `workSpent`; here every stage's `totalWorkSpent` matched exactly too, `repair-fallback` itself included: **1,022,368 both before and after**, unchanged to the unit.

**Why no dose change was even visible here, unlike `dedup-near-tie-retry`'s clear ~2.5x drop:** `repair-fallback`'s real limiting factor on this population is its NODE ceiling (`repairFallbackNodeCeiling`, purely `nodeBudget`-derived and untouched by this migration), not its work cap — the loop's own `repairFallbackNodeCeiling` check breaks it out well before either the old (effectively unbounded) or new (`6 * 670,000 = 4,020,000`) work cap is ever approached on these 10 levels. So this population demonstrates **no observable behavior change at all**, a stronger empirical result than "zero solved-set change despite a real dose shift" (dedup-near-tie-retry's case) — but it also means this specific population does not exercise the work-cap dimension this migration actually changed. The formula-level argument in "What changed" above (not this empirical run) is what establishes the fix is real and matters at some scale/population where `repair-fallback`'s node ceiling is generous relative to a workBudget small enough for the new, smaller cap to bind — this run simply was not that population.

## Reproduction

```bash
# Live-play / default-shape regression gate:
node scripts/run-bundled.mjs scripts/solver-bench.mjs --check

# Targeted unit tests:
SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/orchestration.test.ts -t "repair-fallback"

# Capability-sweep-shape confirmation (before/after; requires checking out the pre-migration commit
# for the "before" run):
node scripts/run-bundled.mjs scripts/additive-tier-participation-audit.mjs \
  --corpus=data/stress/stress-levels-random.json --levels=pos:1-10 --node-budget=500000 \
  --out=reports/stress/repair-fallback-migration-audit.json --summary-out=reports/stress/repair-fallback-migration-audit-summary.md
```
