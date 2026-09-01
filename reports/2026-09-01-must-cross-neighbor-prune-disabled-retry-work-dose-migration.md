# Must-cross neighbor retry work-dose migration

> **Status:** active
> **Last evidence:** 2026-09-01 — site-specific work-dose change, CI ratchet, and ownership tests added; full CI and published-corpus regression pending.
> **Decision:** size `must-cross-neighbor-prune-disabled-retry`'s fresh work pool from canonical `workBudget` instead of the stage's wall-derived ms budget. Preserve its eligibility gate, staircase, node reserve/ceiling, and wall deadline.
> **Remaining gate:** targeted ownership tests, six-job PR CI, and full `solver:regression -- --check` must pass before this site can be concluded positive.

## Why this site

This is Workstream 2's fifth one-at-a-time additive work-dose migration. The site is a promoted, default-on whole-ladder retry with a shipped `MC_NEIGHBOR_BUDGET_RETRY_BUDGET_FRACTION = 1.0`.

Its own pre-existing implementation commentary already diagnoses the unit mismatch this migration targets. Under the deterministic capability protocol, `timeBudgetMs` is deliberately a huge non-binding 24-hour deadline. Converting that deadline-derived tier allocation back into work produced a roughly `2.9e11` work-unit pool, so work subdivision between configs effectively never bound. The first config could consume the shared node ceiling while later configs received no useful nodes. The tier's staircase was added to mitigate that config-starvation behavior.

That historical diagnosis is strong evidence that the old work pool was not expressing the research caller's declared work allocation.

## Change

Before:

```ts
const mcNeighborBudgetRetryTotalBudget = Math.floor(timeBudgetMs * mcNeighborBudgetRetryBudgetFraction);
// ...
workBudget: legacyMsToWork(mcNeighborBudgetRetryTotalBudget, MIN_ATTEMPT_WORK)
```

After:

```ts
const mcNeighborBudgetRetryTotalBudget = Math.floor(timeBudgetMs * mcNeighborBudgetRetryBudgetFraction);
// ...
workBudget: scaledStageWorkBudget(workBudget, mcNeighborBudgetRetryBudgetFraction, MIN_ATTEMPT_WORK)
```

The ms total is retained as the stage's wall-clock safety deadline. The staircase remains enabled. The must-cross eligibility gate, node reserve, node ceiling, retry ordering, and prune override are unchanged.

## Behavior-preservation boundaries

### Interactive play

`disableExtraBudgetPasses: true` zeroes this tier's budget fraction unless an explicit tier override is supplied. The normal interactive solver callers therefore do not reach the changed work-dose expression.

### Plain/default solve shape

Without an explicit `baseWorkBudget` or `workBudget`, `solveLevel()` resolves canonical work from the same centralized legacy time-to-work compatibility conversion. Because the tier fraction is exactly `1.0`, the old and new work-dose expressions are algebraically equal in that call shape.

### Explicit-work research callers

This stratum deliberately changes. A caller that supplies a real work budget alongside a huge non-binding wall deadline now receives a tier work pool proportional to the declared canonical work budget rather than the deadline. This is the intended budget-ownership correction.

Historical explicit-work artifacts that reach this tier therefore cross a work-dose semantic boundary at this migration and must not be treated as directly work-comparable without accounting for it.

## Targeted contract

The new tests pin two invariants:

1. keeping explicit work fixed while changing a non-binding wall deadline must leave the tier's `allocatedWorkCeiling` trajectory unchanged;
2. keeping the wall deadline fixed while increasing explicit `baseWorkBudget` must increase the tier's available work dose.

The budget-boundary ratchet now prevents `legacyMsToWork(mcNeighborBudgetRetryTotalBudget, ...)` from being reintroduced.

## What this does not claim

- no change to `PRUNE_MC_NEIGHBOR_BUDGET` policy;
- no change to the sound eligibility gate on initial must-cross presence;
- no change to the staircase fix;
- no change to node allocation or retry ordering;
- no claim that the historical staircase was unnecessary;
- no scheduler repricing recommendation;
- no batch migration of the three remaining work-dose sites;
- no fix for the structurally different plain admissible-order work-cap gap.

## Validation

Pending:

```bash
SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/orchestration.test.ts -t "must-cross-neighbor-prune-disabled-retry"
npm run solver:regression -- --check
npm run check:solver-budget-boundaries
```
