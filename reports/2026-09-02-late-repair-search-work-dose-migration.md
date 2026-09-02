# Late-repair-search (repair late-probe) work-dose migration

> **Status:** concluded-positive
> **Last evidence:** 2026-09-02 — targeted ownership tests, full `modules/solver/orchestration.test.ts` suite (140 passed), the budget-boundary ratchet, and the full 160-level published-corpus `solver:regression -- --check` all passed; regression solved 160/160 with 68,562,085 nodes, identical to the established current plain/default node total.
> **Decision:** migrate the `late-repair-search` (repair late-probe) tier's fresh `withWorkCapScope` work pool from a `legacyMsToWork` conversion of its own `timeBudgetMs`-equal total to `scaledStageWorkBudget(workBudget, 1, MIN_ATTEMPT_WORK)`. Keep its ms total solely as the tier's per-gate time-slicing input.
> **Remaining gate:** none for this site.

## Why this site, and why it was undetected debt

This is the eighth queue #2 step-3 work-dose migration, but the first found **outside** the original nine-site CI-ratchet inventory (`scripts/check-solver-budget-boundaries.mjs`'s `approvedLegacyTimeDerivedAllocations` set). That set's "new wall-derived allocation site" scan works by regex-matching lines containing `timeBudgetMs \*` (a multiplication). This tier's own total is:

```ts
const repairLateProbeTotalBudget = timeBudgetMs;
```

— a bare assignment with an implicit `* 1`, not a literal multiplication — so it never matched that scan and was never one of the nine tracked names, even though it carried the exact same `legacyMsToWork(<totalBudget-shaped ms value>, MIN_ATTEMPT_WORK)` fresh-pool pattern as every one of the seven now-migrated sites. It was found by direct source inspection (`grep -n legacyMsToWork modules/solver/orchestration.ts`) while confirming the full current inventory for the `guidance-goal-distance-retry` and `repair-elite-prefix-dfs-retry` migrations earlier the same day.

Before this change:

```ts
const repairLateProbeWorkBudget = legacyMsToWork(repairLateProbeTotalBudget, MIN_ATTEMPT_WORK);
await withWorkCapScope(prep, prep._workMeter.units + repairLateProbeWorkBudget, async () => { ... });
```

The tier's own comment already documents this as a FRESH, ADDITIVE `prep._workCap` override — "same 'extend, don't share the depleted pool' philosophy as `repairElitePrefixDfsRetry`'s own override" — confirming it is the same class of site as the seven already migrated, not a structurally distinct case like the plain `admissible-order-fallback` gap or the `goal-attraction-disabled-retry` outer-pool-sharing tier.

## Change

```ts
const repairLateProbeWorkBudget = scaledStageWorkBudget(workBudget, 1, MIN_ATTEMPT_WORK);
```

`repairLateProbeTotalBudget` (`= timeBudgetMs`) is unchanged and still feeds the per-gate `retryBudget = floor((repairLateProbeTotalBudget - elapsed) / gatesLeft)` time-slicing loop, exactly as before. It no longer sizes the `withWorkCapScope` extension.

The literal fraction argument is `1` (not a named fraction constant): this tier has never had a `*_BUDGET_FRACTION` constant of its own — its ms total was always the caller's full `timeBudgetMs`, unscaled — so `scaledStageWorkBudget(workBudget, 1, MIN_ATTEMPT_WORK)` is the correct analogue of the seven prior migrations' `scaledStageWorkBudget(workBudget, someFraction, MIN_ATTEMPT_WORK)`, where `someFraction` here is always exactly `1`.

## Behavior-preservation boundaries

### Interactive play

`disableExtraBudgetPasses: true` zeroes `repairLateProbeNodeBudget` (via `opts.repairLateProbeNodeBudgetOverride ?? (opts.disableExtraBudgetPasses ? 0 : undefined)`), making `repairLateProbeTierWillRun` false. Both real interactive solver callers use this option, so they never reach the changed work-dose expression.

### Plain/default solve shape

Without an explicit `baseWorkBudget`/`workBudget`, `workBudget` itself already equals `legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK)` (the solve's own centralized compatibility conversion — see its resolution earlier in `solveLevel`). Since `repairLateProbeTotalBudget === timeBudgetMs` and the new expression's fraction is exactly `1`, `scaledStageWorkBudget(workBudget, 1, MIN_ATTEMPT_WORK)` is algebraically equal to the old `legacyMsToWork(repairLateProbeTotalBudget, MIN_ATTEMPT_WORK)` in this call shape. The full published-corpus regression confirms this in the integrated ladder: 160/160 solved, 68,562,085 nodes — the same total every prior migration reported.

### Explicit-work research callers

This is the intentionally changed stratum. A caller that supplies a real work budget alongside a huge, non-binding wall deadline (the deterministic capability protocol's own convention — see `REPAIR_LATE_PROBE_NODE_BUDGET`'s own comment: "nodeBudget is the real constraint here, not time") now receives a tier work pool proportional to the declared canonical work budget instead of the deadline. Historical explicit-work research artifacts that reached this tier are not automatically work-comparable across this migration.

## Targeted regression contract

Two new tests (`modules/solver/orchestration.test.ts`), isolated via `disableExtraBudgetPasses: true` plus an explicit `repairLateProbeNodeBudgetOverride: 100` (matching the existing "explicit tier overrides still win" test's own value):

1. `late-repair-search work dose no longer resizes with a non-binding deadline change`;
2. `late-repair-search now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs`.

## Ratchet update

`repairLateProbeTotalBudget` is now added to `scripts/check-solver-budget-boundaries.mjs`'s `migratedWorkDoseSites` regression guard (alongside the seven previously tracked names), so a future `legacyMsToWork(repairLateProbeTotalBudget, ...)` reintroduction fails CI. The script's own comment now documents that this list's completeness is not guaranteed by the regex scan alone — a future site with a similarly bare (non-multiplied) ms total could slip past the same way — and recommends a direct `grep` when auditing for new debt.

## What this does not change

- no change to `REPAIR_LATE_PROBE_NODE_BUDGET`, the flat node-cap sizing philosophy, or the tier's own node-ceiling/entry-nodes tracking;
- no change to retry placement, gate ordering, or the multi-seed retry tier stacked after it;
- no production scheduler repricing decision;
- no claim about `guidance-goal-distance-retry` or `repair-elite-prefix-dfs-retry` (migrated separately the same day; see their own reports);
- does not audit the rest of the codebase for further undetected `legacyMsToWork` debt beyond `modules/solver/orchestration.ts`'s own three remaining call sites (the two permanent, approved compatibility conversions at `workBudget`'s own resolution and `roundWorkBudget`, plus this now-migrated one — see the ratchet's own comment).

## Validation

Completed on this branch:

- targeted ownership tests: 2 passed;
- full `modules/solver/orchestration.test.ts`: 140 passed, 1 skipped (after all three same-day migrations);
- `npm run check:solver-budget-boundaries`: passed;
- published-corpus regression: **160/160 solved, failed `[]`, 68,562,085 nodes**; `solver-bench --check PASS`;
- full `npm run ci`: passed.

Reproduction:

```bash
SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/orchestration.test.ts -t "late-repair-search work dose|late-repair-search now honors"
npm run check:solver-budget-boundaries
npm run solver:regression -- --check
```
