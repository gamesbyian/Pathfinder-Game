# Guidance-goal-distance retry work-dose migration

> **Status:** concluded-positive
> **Last evidence:** 2026-09-02 — targeted ownership tests, full `modules/solver/orchestration.test.ts` suite (138 passed), the budget-boundary ratchet, and the full 160-level published-corpus `solver:regression -- --check` all passed; regression solved 160/160 with 68,562,085 nodes, identical to the established current plain/default node total.
> **Decision:** migrate `guidance-goal-distance-retry`'s fresh whole-ladder retry pool from a second wall-derived `legacyMsToWork` conversion to `scaledStageWorkBudget(workBudget, goalAttractionGuidanceDistanceRetryBudgetFraction, MIN_ATTEMPT_WORK)`. Keep its ms allocation solely as a latency-safety deadline.
> **Remaining gate:** none for this site.

## Why this site

Workstream 2's current budget-model sequence calls for one additive work-dose migration at a time. Five sites were already migrated (`coarse-state-near-tie-retention-disabled-retry`, `repair-fallback`, `admissible-order-alternate-tiebreak-retry`, `connectivity-axis-prune-disabled-retry`, `must-cross-neighbor-prune-disabled-retry`). `guidance-goal-distance-retry` is structurally identical to `connectivity-axis-prune-disabled-retry`: a `runWholeLadderRetryTier` call with a shipped `GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY_BUDGET_FRACTION` of exactly `1.0`.

Before this change, its work allocation was:

```ts
const goalAttractionGuidanceDistanceRetryTotalBudget = Math.floor(timeBudgetMs * goalAttractionGuidanceDistanceRetryBudgetFraction);
// ...
workBudget: legacyMsToWork(goalAttractionGuidanceDistanceRetryTotalBudget, MIN_ATTEMPT_WORK),
```

That independently converts a wall-deadline-shaped quantity back into canonical work even though `solveLevel()` has already resolved the caller's canonical `workBudget`.

## Change

The retry now uses:

```ts
workBudget: scaledStageWorkBudget(workBudget, goalAttractionGuidanceDistanceRetryBudgetFraction, MIN_ATTEMPT_WORK),
```

`goalAttractionGuidanceDistanceRetryTotalBudget` remains unchanged and still feeds `runWholeLadderRetryTier` as the stage's wall-clock safety deadline. It no longer sizes search allocation.

## Behavior-preservation boundaries

### Interactive play

Both real interactive solver callers use `disableExtraBudgetPasses: true`, which zeroes `goalAttractionGuidanceDistanceRetryBudgetFraction` and suppresses this tier entirely. The work-dose expression is unreachable in that live-play call shape.

### Plain/default solve shape

Without an explicit `baseWorkBudget`/`workBudget`, the solve's resolved work budget is the same centralized legacy compatibility conversion of `timeBudgetMs`. Because this tier's fraction is exactly `1.0`, the old and new work-dose expressions are algebraically equal. The full published-corpus regression confirms this in the integrated ladder: 160/160 solved, 68,562,085 nodes — the exact total the prior two migrations (`connectivity-axis-prune-disabled-retry`, `must-cross-neighbor-prune-disabled-retry`) also reported.

### Explicit-work research callers

This is the intentionally changed stratum. A caller that supplies a real work budget alongside a huge, non-binding wall deadline now receives a tier work pool proportional to the declared canonical work budget instead of the deadline. Historical research artifacts that reached this tier are not automatically work-comparable across this migration.

## Targeted regression contract

Two new tests mirror the established migration pattern (`modules/solver/orchestration.test.ts`):

1. `guidance-goal-distance-retry work dose no longer resizes with a non-binding deadline change`;
2. `guidance-goal-distance-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs`.

Unlike its five predecessors, this tier has no dedicated budget-fraction override (`opts.goalAttractionGuidanceDistanceRetryBudgetFractionOverride` does not exist — "first-landing scope" per its own comment in `stage-budget.ts`). Isolation in the new tests instead disables every other default-on last-resort tier via their own overrides/ablation flags and leaves this one at its default-ON fraction (`cfg=null`, `GOAL_ATTRACTION_GUIDANCE_DISTANCE_RETRY_BUDGET_FRACTION = 1.0`).

The CI ratchet (`scripts/check-solver-budget-boundaries.mjs`) now also records `goalAttractionGuidanceDistanceRetryTotalBudget` as a migrated work-dose site, preventing a future regression back to `legacyMsToWork(goalAttractionGuidanceDistanceRetryTotalBudget, ...)`.

## What this does not change

- no `SCORE_GOAL_ATTRACTION_GUIDANCE_DISTANCE` scoring policy or eligibility rule;
- no retry placement or action/config menu;
- no node reserve or cumulative node ceiling;
- no retry-stage wall deadline;
- no production scheduler repricing decision;
- no claim about `repair-elite-prefix-dfs-retry` or `late-repair-search` (migrated separately the same day; see their own reports);
- no attempt to fix the structurally different plain `admissible-order-fallback` work-cap gap, or the separately-documented `goal-attraction-disabled-retry` tier (which shares the OUTER depleting work pool by design and was never part of this `legacyMsToWork`-conversion inventory — see `docs/solver-budget-determinism.md`).

## Validation

Completed on this branch:

- targeted ownership tests: 2 passed;
- full `modules/solver/orchestration.test.ts`: 138 passed, 1 skipped;
- `npm run check:solver-budget-boundaries`: passed;
- published-corpus regression: **160/160 solved, failed `[]`, 68,562,085 nodes**; `solver-bench --check PASS`;
- full `npm run ci`: passed.

Reproduction:

```bash
npm run solver:regression -- --check
SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/orchestration.test.ts -t "guidance-goal-distance-retry"
npm run check:solver-budget-boundaries
```
