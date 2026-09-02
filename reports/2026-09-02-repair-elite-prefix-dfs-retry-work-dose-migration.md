# Repair-elite-prefix-DFS retry work-dose migration

> **Status:** concluded-positive
> **Last evidence:** 2026-09-02 — targeted ownership tests, full `modules/solver/orchestration.test.ts` suite (138 passed), the budget-boundary ratchet, and the full 160-level published-corpus `solver:regression -- --check` all passed (this tier is opt-in/default-OFF, so the plain-default regression run never engages it; the regression confirms the migration introduced no side effect on the ordinary ladder, not this tier's own dose behavior — see the targeted tests for that).
> **Decision:** migrate `repair-elite-prefix-dfs-retry`'s fresh `withWorkCapScope` work pool from a second wall-derived `legacyMsToWork` conversion to `scaledStageWorkBudget(workBudget, repairElitePrefixDfsRetryBudgetFraction, MIN_ATTEMPT_WORK)`. Keep its ms allocation solely as a per-gate time-slicing/latency-safety deadline.
> **Remaining gate:** none for this site.

## Why this site

This is the seventh of the original nine-site CI inventory's work-dose migrations, and the second (after `repair-fallback` itself) to use the `withWorkCapScope` fresh-pool shape rather than `runWholeLadderRetryTier`. The tier is opt-in/default-OFF (`STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY`, a known double-edged mechanism — see `reports/2026-08-07-repair-elite-prefix-dfs.md`), so it is unreachable from any production/interactive caller regardless of this migration; its relevance is entirely to offline capability-sweep/confirmation/opt-in-experiment tooling, where the same `additive-tier-participation-audit` reasoning applies (2026-08-28).

Before this change:

```ts
const repairElitePrefixDfsRetryTotalBudget = Math.floor(timeBudgetMs * repairElitePrefixDfsRetryBudgetFraction);
const repairElitePrefixDfsRetryWorkBudget = legacyMsToWork(repairElitePrefixDfsRetryTotalBudget, MIN_ATTEMPT_WORK);
```

The shipped `REPAIR_ELITE_PREFIX_DFS_RETRY_BUDGET_FRACTION` is exactly `1.0`.

## Change

```ts
const repairElitePrefixDfsRetryWorkBudget = scaledStageWorkBudget(workBudget, repairElitePrefixDfsRetryBudgetFraction, MIN_ATTEMPT_WORK);
```

`repairElitePrefixDfsRetryTotalBudget` is unchanged and still feeds the per-gate `retryBudget` time-slicing loop as the stage's wall-clock safety deadline. It no longer sizes the `withWorkCapScope` extension.

## Behavior-preservation boundaries

### Interactive play

Both real interactive solver callers use `disableExtraBudgetPasses: true`, and the tier is opt-in/default-OFF (`cfg &&` check) regardless — production/interactive callers never reach this code path either way.

### Plain/default solve shape

Because the tier's fraction is exactly `1.0` and it never runs under `cfg=null`, the published-corpus regression (which never sets `STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY: true`) is unaffected by construction: 160/160 solved, 68,562,085 nodes — identical to every prior migration's plain-default total. This regression run does **not** exercise the changed work-dose expression itself; that is covered by the two targeted tests below, which explicitly enable the tier.

### Explicit-work research callers

This is the intentionally changed stratum. A caller that enables `STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY` and supplies a real work budget alongside a huge, non-binding wall deadline now receives a tier work pool proportional to the declared canonical work budget instead of the deadline.

## Targeted regression contract

Two new tests (`modules/solver/orchestration.test.ts`), isolated via `disableExtraBudgetPasses: true` plus an explicit `repairElitePrefixDfsRetryBudgetFractionOverride: 1` (the tier's own dedicated override still wins over the blanket suppression, per the existing "explicit tier overrides still win" test):

1. `repair-elite-prefix-dfs-retry work dose no longer resizes with a non-binding deadline change`;
2. `repair-elite-prefix-dfs-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs`.

The CI ratchet now also records `repairElitePrefixDfsRetryTotalBudget` as a migrated work-dose site.

## What this does not change

- no `STRATEGY_REPAIR_ELITE_PREFIX_DFS` mechanism, eligibility, or its known net-negative 20-level A/B disposition (still opt-in, still unpromoted);
- no retry placement, node reserve, or cumulative node ceiling;
- no retry-stage wall deadline;
- no production scheduler repricing decision;
- no claim about `guidance-goal-distance-retry` or `late-repair-search` (migrated separately the same day; see their own reports).

## Validation

Completed on this branch:

- targeted ownership tests: 2 passed (6 total in this tier's suite);
- full `modules/solver/orchestration.test.ts`: 138 passed, 1 skipped;
- `npm run check:solver-budget-boundaries`: passed;
- published-corpus regression: **160/160 solved, failed `[]`, 68,562,085 nodes** (tier inert by construction on this run);
- full `npm run ci`: passed.

Reproduction:

```bash
SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/orchestration.test.ts -t "repair-elite-prefix-dfs-retry"
npm run check:solver-budget-boundaries
npm run solver:regression -- --check
```
