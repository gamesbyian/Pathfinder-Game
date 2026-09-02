# Whole-ladder deadline-independence widening, and a ninth work-dose site it found

> **Status:** concluded-positive
> **Last evidence:** 2026-09-02 — two new whole-ladder tests, 4 targeted `late-repair-multiseed-retry` ownership/ceiling tests, full `modules/solver/orchestration.test.ts` (142 passed), the budget-boundary ratchet, `check:types`/`check:types:tests`, lint, and the full 160-level published-corpus `solver:regression -- --check` all passed; regression solved 160/160 with 68,562,085 nodes, identical to every prior migration's plain/default node total.
> **Decision:** widen the existing isolated-main-ladder deadline-independence regression (`modules/solver/orchestration.test.ts`'s `'a non-binding deadline cannot resize an explicit-work main-ladder trajectory'`) into two complementary whole-ladder tests covering every default-on additive retry tier simultaneously, per `docs/solver-budget-determinism.md`'s "Migration priority" step 5 / `solver-scheduling-policy.md`'s "Expand the invariant" step. Migrate the ninth work-dose site (`late-repair-multiseed-retry`'s own `roundWorkBudget`) that this widening found.
> **Remaining gate:** none for this step. The originally-scoped nine-name inventory plus the two independently-discovered sites (`late-repair-search`, `late-repair-multiseed-retry`) are now fully migrated; see `docs/solver-budget-determinism.md` for the current, corrected count.

## Why this step

`docs/solver-optimization-workstreams.md`'s Workstream 2 row and `docs/solver-budget-determinism.md`'s "Migration priority" list both name step 5/4 as "whole-solve deadline-independence regression once the legacy inventory reaches zero." Earlier the same day, the eighth named site (`late-repair-search`) closed the last known gap in the original nine-site-derived inventory (see `2026-09-02-late-repair-search-work-dose-migration.md`). The existing regression test proving the invariant — `'a non-binding deadline cannot resize an explicit-work main-ladder trajectory'` — carried its own comment flagging exactly this next step: "Additive legacy tiers still have separately-inventoried ms-shaped compatibility debt; when those are migrated, extend this invariant across the whole production ladder too." With the inventory now empty, that comment's precondition is met.

## What "whole ladder" means here, and why two fixtures

A single level cannot mechanically reach every default-on last-resort tier at once: `late-repair-search`'s own eligibility gate is `repairConfigsCount === 0` (`stage-budget.ts`) — the deliberate opposite polarity of `early-repair-search`/`repair-fallback`'s `needsRepairFallback` gate, since it exists specifically for the population ordinary repair never got a chance on. No level can satisfy both simultaneously, so the widened invariant needs two complementary fixtures split along exactly that inherent boundary:

1. `makeRepairGatedInfeasibleLevel()` (mustPassKeys + mustCrossKeys present, needs repair fallback): reaches `early-repair-search`, `repair-fallback`, the two mechanic-specific prune-disabled retries (`connectivity-axis-prune-disabled-retry`, `must-cross-neighbor-prune-disabled-retry` — each requires its own mechanic present), plus every general whole-ladder rerun tier (`goal-attraction-disabled-retry`, `admissible-order-fallback`, `admissible-order-alternate-tiebreak-retry`, `coarse-state-near-tie-retention-disabled-retry`, `guidance-goal-distance-retry`).
2. `makeGoalAttractionDisabledRetryGatedInfeasibleLevel()` (no mustPass/mustCross, no repair need): reaches `late-repair-search` and `late-repair-multiseed-retry` (once explicitly enabled — see below), plus the same general whole-ladder rerun tiers, which aren't gated on mustPass/mustCross presence.

Together, both runs prove all migrated sites' deadline-independence holds **simultaneously with every sibling tier**, not just in per-tier isolation — a strictly stronger claim than the eight (now nine) individual per-tier tests already in the suite, each of which suppresses every other tier while testing its own.

Both tests use `attemptSearchForTesting: exhaustingDispatch` (an O(1) stub that reports full node consumption without a real search) so the whole ladder — including `late-repair-multiseed-retry`'s 7-seed loop — runs in milliseconds.

## The ninth site this widening found

The first version of the repair-eligible-population test passed immediately (7 tiers, byte-identical trajectory across a 60s vs. 600s non-binding deadline). The repair-ineligible-population test initially **failed**: `late-repair-multiseed-retry`'s `allocatedWorkCeiling` was `201000000` at a 60s deadline and `2010000000` at a 600s deadline — an exact 10x swing matching the ratio of the two deadlines.

The cause: `orchestration.ts`'s multi-seed retry loop (`late-repair-multiseed-retry`, `STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY`) computed each seed round's fresh `prep._workCap` extension as:

```ts
const roundWorkBudget = legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK);
prep._workCap = Math.min(prep._workMeter.units + roundWorkBudget, prep._strictWorkCap ?? Infinity);
```

— a direct reconversion of the raw caller `timeBudgetMs`, the same debt pattern as every migrated sibling tier, just without a `*TotalBudget` intermediate variable. This line was previously **explicitly approved** in `scripts/check-solver-budget-boundaries.mjs`'s `approvedDirectMsToWorkSites` set, alongside `workBudget`'s own centralized resolution, as one of two "intentional compatibility boundaries." That approval was wrong: this empirical test proves the line controlled real search allocation, not just latency, exactly like the other eight sites before their own migrations. It had no dedicated test of any kind before this change — the gap was invisible until a test exercised this tier alongside its siblings under a varying deadline.

## Change

```ts
const roundWorkBudget = scaledStageWorkBudget(workBudget, 1, MIN_ATTEMPT_WORK);
```

`timeBudgetMs` remains used in the same loop solely for each round's per-gate `retryBudget` time-slicing, unchanged. The ratchet's `approvedDirectMsToWorkSites` set now contains only the one genuine remaining direct conversion (`workBudget`'s own resolution).

## Behavior-preservation boundaries

### Interactive play

`disableExtraBudgetPasses: true` zeroes `repairLateProbeNodeBudget`, making `repairLateProbeTierWillRun` (and therefore `repairLateProbeMultiSeedRetryTierWillRun`, which requires it) false. Both real interactive callers use this option.

### Plain/default solve shape

Without an explicit `baseWorkBudget`/`workBudget`, `workBudget` already equals the legacy ms-to-work compatibility conversion of `timeBudgetMs`. Since the new expression's fraction is exactly `1`, it is algebraically identical to the old `legacyMsToWork(timeBudgetMs, MIN_ATTEMPT_WORK)` in this call shape. The full published-corpus regression confirms this in the integrated ladder: 160/160 solved, 68,562,085 nodes — the same total every prior migration in this series reported.

### Explicit-work research callers

The intentionally changed stratum, same as every sibling migration: a caller supplying a real work budget alongside a huge non-binding wall deadline now gets each seed round's fresh cap sized from that declared work budget instead of the deadline.

## Targeted regression contract

Four new tests (`modules/solver/orchestration.test.ts`), isolated via `disableExtraBudgetPasses: true` plus explicit `ablation: { STRATEGY_REPAIR_LATE_PROBE: true, STRATEGY_REPAIR_LATE_PROBE_MULTI_SEED_RETRY: true }` (both flags needed — a non-null `cfg` no longer defaults every unmentioned flag to its promoted-ON state) and `repairLateProbeNodeBudgetOverride: 100`:

1. `late-repair-multiseed-retry work dose no longer resizes with a non-binding deadline change`;
2. `late-repair-multiseed-retry now honors an explicit baseWorkBudget instead of silently re-deriving its pool from timeBudgetMs`;
3. `a non-binding deadline cannot resize an explicit-work trajectory across the WHOLE default-on production ladder (repair-eligible population)`;
4. `a non-binding deadline cannot resize an explicit-work trajectory across the WHOLE default-on production ladder (repair-ineligible population, covers late-repair-search)`.

Tests 3 and 4 each additionally assert a set of expected `stageId`s were actually reached, guarding against a future refactor silently short-circuiting the ladder before reaching the additive tiers without failing the test.

## What this does not change

- no eligibility, seed-salt set, or node-reserve arithmetic for `late-repair-multiseed-retry` or any sibling tier;
- no production scheduler repricing decision;
- no claim about the two structurally different remaining `approvedLegacyTimeDerivedAllocations` names (`admissible-order-fallback`, `goal-attraction-disabled-retry`) — unchanged, see `docs/solver-budget-determinism.md`.

## Validation

Completed on this branch:

- 4 new targeted tests: passed;
- full `modules/solver/orchestration.test.ts`: 142 passed, 1 skipped;
- `npm run check:solver-budget-boundaries`, `check:types`, `check:types:tests`, `check:lint`: passed;
- published-corpus regression: **160/160 solved, failed `[]`, 68,562,085 nodes**; `solver-bench --check PASS`;
- full `npm run ci`: passed.

Reproduction:

```bash
SOLVER_DEEP_TESTS=0 npx vitest run modules/solver/orchestration.test.ts -t "late-repair-multiseed-retry|WHOLE default-on production ladder"
npm run check:solver-budget-boundaries
npm run solver:regression -- --check
```
