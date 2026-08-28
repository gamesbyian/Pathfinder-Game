# admissible-order-non-default-retry: third queue #2 step-3 additive-tier work-dose migration

> **Status:** concluded-positive
> **Last evidence:** 2026-08-28 — code migration, full 160-level `solver:bench --check` byte-identical, targeted unit tests, a full `pos:1-10` capability-sweep-shaped before/after confirmation (see addendum)
> **Decision:** `admissible-order-non-default-retry`'s own fresh `withWorkCapScope` cap is now sized from the solve's resolved `workBudget` (`scaledStageWorkBudget` in `budget-units.ts`) instead of re-deriving it from `timeBudgetMs` a second time via `legacyMsToWork`. Same pattern, same behavior-preservation profile, and same caveat as the first two migrations ([`dedup-near-tie-retry`](2026-08-28-dedup-near-tie-retry-work-dose-migration.md), [`repair-fallback`](2026-08-28-repair-fallback-work-dose-migration.md)).
> **Remaining gate:** none. See addendum.

## Motivation

Third site from [`docs/solver-optimization-current-queue.md`](../docs/solver-optimization-current-queue.md) item #2 step 3's nine-site inventory. This report assumes the first migration's context and states only what is specific to `admissible-order-non-default-retry`.

## What changed

Identical shape to `repair-fallback`'s own migration: `modules/solver/orchestration.ts`'s admissible-order-non-default-retry block previously computed `nonDefaultRetryWorkBudget = legacyMsToWork(nonDefaultRetryTotalBudget, MIN_ATTEMPT_WORK)` (a second, independent `timeBudgetMs`-derived conversion) and used it as a fresh, additive `prep._workCap` via `withWorkCapScope`. It now computes `nonDefaultRetryWorkBudget = scaledStageWorkBudget(workBudget, nonDefaultRetryBudgetFraction, MIN_ATTEMPT_WORK)`. `nonDefaultRetryTotalBudget` (ms) is kept, feeding only the per-gate wall-deadline slice (`retryBudget`) — latency safety, not work-sizing.

`ADMISSIBLE_ORDER_NON_DEFAULT_RETRY_BUDGET_FRACTION` is the integer `1.0`, so this is behavior-preserving for live play (also zeroed by `disableExtraBudgetPasses`) and the plain-default no-override call shape, with the same deliberate-dose-correction caveat for the offline capability-sweep call shape as the first two migrations.

## A note on why `admissible-order` itself (the tier immediately before this one) is explicitly NOT included here

While reading this tier's own call site to plan this migration, its own comment (`"prep._workCap is still a SINGLE mutable field those two functions last wrote before this tier runs (from the main loop, ordinarily) — nothing resets it fresh for a runAttempt-direct caller positioned this late"`) pointed at a sibling tier, plain `admissible-order` (the one immediately before this one in the ladder, NOT to be confused with this retry tier), as a candidate with the identical "stale inherited cap" shape. Investigating it directly found something materially different from every site migrated so far: `admissible-order` has **no fresh work-cap installation of any kind** — no `withWorkCapScope`, no `legacyMsToWork` conversion feeding a cap, nothing. It relies entirely on whatever `prep._workCap` an earlier tier's last attempt happened to leave behind, which an empirical probe found is sometimes `null` (fully work-uncapped, governed only by the ms wall deadline) and sometimes an arbitrary small leftover number unrelated to `ADMISSIBLE_ORDER_BUDGET_FRACTION`.

This is a different, larger, and more delicate question than a same-shape swap: fixing it would mean *adding* a deliberate allocation where none exists today (the same class of change as the 2026-08-20 `repair-fallback` fix, not a currency-only migration), which needs its own premise/evidence per the operating model rather than being folded into this mechanical "one site at a time, behavior-preserving" pass. It is written up and evaluated separately: [`2026-08-28-admissible-order-work-cap-gap-discovery.md`](2026-08-28-admissible-order-work-cap-gap-discovery.md).

## What was actually verified

1. **Live interactive production: unaffected, by construction.** Both real callers pass `disableExtraBudgetPasses: true`, zeroing `nonDefaultRetryBudgetFraction`.

2. **Plain-default call shape: proven byte-identical.** Full 160-level published corpus: `node scripts/run-bundled.mjs scripts/solver-bench.mjs --check` reports **68,562,085 nodes**, solved 160/160, identical to the pre-migration baseline and to the state after the first two migrations.

3. **New targeted unit tests** (`modules/solver/orchestration.test.ts`), mirroring the established pair exactly: `'admissible-order-non-default-retry work dose no longer resizes with a non-binding deadline change'` and `'admissible-order-non-default-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs'`. No pre-existing test pinned this tier's own numeric work-cap magnitude (unlike `repair-fallback`'s case), so no correction was needed here.

4. **Full test suite**: all 1276 vitest tests pass, all `test:node` scripts, `check:validators`, `tsc`, and lint.

## What this does not establish

Same disclaimers as the first two migrations: no claim about the remaining 6 sites' own behavior-preservation profile (`attraction-diversity`, `admissible-order` itself, `connectivity-axis-exhausted-retry`, `repair-elite-prefix-dfs-retry`, `mc-neighbor-budget-retry`, `goal-attraction-legacy-distance-retry`); no claim the new capability-sweep numbers are "better," only more honest; no recommendation on `--strict-total-work-budget` adoption.

## Addendum: pos:1-10 confirmation-scale population

Same `pos:1-10` population and protocol as the first two migrations' own addenda (before = commit `5b234cd`, the state immediately after `repair-fallback`'s migration landed, in a separate worktree; after = this migration's own commit).

**Result: exact match on every field, third time in a row.** All 10 levels matched precisely on `ok`, `status`, `winningStageId`, and `nodesExpanded` — **0 diffs**. Every stage's `totalWorkSpent` matched exactly too, `admissible-order-non-default-retry`'s own included: **1,730,816 both before and after**, unchanged to the unit. Same explanation as `repair-fallback`'s own addendum: this tier's node ceiling (`nonDefaultRetryNodeCeiling`, purely `nodeBudget`-derived and untouched by this migration) binds before either the old (near-infinite) or new (`670,000`-scaled) work cap is ever approached on this population, so the formula-level argument in "What changed" above — not this empirical run — is what establishes the fix; this run's value is confirming zero solved-set risk, not exercising the changed dimension.

## Reproduction

```bash
# Live-play / default-shape regression gate:
node scripts/run-bundled.mjs scripts/solver-bench.mjs --check

# Targeted unit tests:
SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/orchestration.test.ts -t "admissible-order-non-default-retry"

# Capability-sweep-shape confirmation (before/after; requires checking out the pre-migration commit
# for the "before" run):
node scripts/run-bundled.mjs scripts/additive-tier-participation-audit.mjs \
  --corpus=data/stress/stress-levels-random.json --levels=pos:1-10 --node-budget=500000 \
  --out=reports/stress/admissible-order-non-default-retry-migration-audit.json --summary-out=reports/stress/admissible-order-non-default-retry-migration-audit-summary.md
```
