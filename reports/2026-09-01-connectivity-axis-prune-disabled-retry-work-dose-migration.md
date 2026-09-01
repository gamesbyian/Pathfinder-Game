# Connectivity-axis retry work-dose migration

> **Status:** active
> **Last evidence:** 2026-09-01 — site-specific code/ratchet migration and targeted ownership tests added; full CI and published-corpus regression pending.
> **Decision:** migrate `connectivity-axis-prune-disabled-retry`'s fresh work pool from a second wall-derived `legacyMsToWork` conversion to `scaledStageWorkBudget(workBudget, connectivityRetryBudgetFraction, MIN_ATTEMPT_WORK)`. Keep its ms allocation solely as a latency-safety deadline.
> **Remaining gate:** require green full CI plus `solver:regression -- --check`; if either shows a plain/default solve-set or deterministic regression, do not merge this as a representation/ownership migration.

## Why this site

Workstream 2's current budget-model sequence calls for one additive work-dose migration at a time. Three sites were already migrated on 2026-08-28. The next candidate is `connectivity-axis-prune-disabled-retry`, a promoted whole-ladder retry that uses the same shared executor and fresh-pool shape as the first migration.

Before this change, its work allocation was:

```ts
const connectivityRetryTotalBudget = Math.floor(timeBudgetMs * connectivityRetryBudgetFraction);
// ...
workBudget: legacyMsToWork(connectivityRetryTotalBudget, MIN_ATTEMPT_WORK)
```

That independently converts a wall-deadline-shaped quantity back into canonical work even though `solveLevel()` has already resolved the caller's canonical `workBudget`.

The shipped `CONNECTIVITY_AXIS_EXHAUSTED_RETRY_BUDGET_FRACTION` is exactly `1.0`.

## Change

The retry now uses:

```ts
const connectivityRetryTotalBudget = Math.floor(timeBudgetMs * connectivityRetryBudgetFraction);
// ...
workBudget: scaledStageWorkBudget(workBudget, connectivityRetryBudgetFraction, MIN_ATTEMPT_WORK)
```

The `connectivityRetryTotalBudget` ms value remains unchanged and still feeds `runWholeLadderRetryTier` as the stage's wall-clock safety deadline. It no longer sizes search allocation.

This mirrors the established migrations for coarse-state-near-tie retention, repair fallback, and admissible-order alternate-tiebreak retry.

## Behavior-preservation boundaries

### Interactive play

Both real interactive solver callers use `disableExtraBudgetPasses: true`, which suppresses this promoted additive retry. The work-dose expression is therefore unreachable in that live-play call shape.

### Plain/default solve shape

When no explicit `baseWorkBudget` / `workBudget` is supplied, the solve's resolved work budget is the same centralized legacy compatibility conversion of `timeBudgetMs`. Because this tier's fraction is exactly 1.0, the old and new work-dose expressions are algebraically equal.

The full published-corpus regression is required to verify this in the integrated ladder rather than relying on algebra alone.

### Explicit-work research callers

This is the intentionally changed stratum. Capability/confirmation tooling can pass an explicit canonical work budget together with a deliberately huge, non-binding wall deadline. Under the old expression, this tier ignored that declared work allocation and reconstructed an enormous pool from the wall deadline. Under the new expression, the tier receives the caller's declared work-scaled dose.

That is a deliberate budget-ownership correction. Historical research artifacts that reached this tier are not automatically work-comparable across this migration.

## Targeted regression contract

Two tests mirror the established migration pair:

1. with the same explicit work budget, changing a non-binding wall deadline must not resize the tier's `allocatedWorkCeiling` trajectory;
2. with the same wall deadline, increasing explicit `baseWorkBudget` must increase the tier's available work dose.

The CI ratchet also records `connectivityRetryTotalBudget` as a migrated work-dose site, preventing a future regression back to `legacyMsToWork(connectivityRetryTotalBudget, ...)`.

## What this does not change

- no connectivity-prune policy or eligibility rule;
- no retry placement or action/config menu;
- no node reserve or cumulative node ceiling;
- no retry-stage wall deadline;
- no production scheduler repricing decision;
- no claim about the four remaining work-dose sites;
- no attempt to fix the structurally different plain `admissible-order-fallback` work-cap gap.

## Validation

Pending on this branch:

```bash
npm run solver:regression -- --check
SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/orchestration.test.ts -t "connectivity-axis-prune-disabled-retry"
npm run check:solver-budget-boundaries
```

Normal PR CI remains required as the broad integration gate.
