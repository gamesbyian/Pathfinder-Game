# STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL: opt-in implementation

> **Status:** active
> **Last evidence:** 2026-09-02 — implemented as a new opt-in ablation flag (default OFF), unit-tested, full published-corpus `solver:regression --check` byte-identical (160/160, 68,562,085 nodes)
> **Decision:** implementation only. Not yet promoted or even confirmed at population scale — see [`the starvation-diagnosis report`](2026-09-02-goal-attraction-disabled-retry-work-pool-starvation.md) for the evidence motivating this, and `docs/solver-opt-in-experiment-ledger.md`'s new entry for current disposition ("awaiting population-scale before/after evidence").
> **Remaining gate:** a dedicated population-scale development A/B (this flag on vs. off, fixed work envelope) measuring real solve-set movement, not just participation. Not yet dispatched.

## What changed

`modules/solver/orchestration.ts`'s `goal-attraction-disabled-retry` pass previously always shared the OUTER `(workBudget, workStart)` pool with every earlier tier (main loop, repair fallback) — see [`the starvation-diagnosis report`](2026-09-02-goal-attraction-disabled-retry-work-pool-starvation.md) for direct per-level telemetry showing this starves 64% of otherwise-eligible attempts to zero real search, even when the tier's own node dimension is protected by its existing `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE` opt-in.

New opt-in flag `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_FRESH_WORK_POOL` (default OFF, registered in `OPT_IN_FEATURES`): when enabled, gives the pass a fresh `prep._workMeter.units` mark plus a work budget of `scaledStageWorkBudget(workBudget, diversityBudgetFraction, MIN_ATTEMPT_WORK)` instead of the shared pool — the identical "extend, don't share the depleted pool" shape `coarse-state-near-tie-retention-disabled-retry`'s own call site already uses (see that site's own comment for the precedent and its own R00180 measurement). `GOAL_ATTRACTION_DISABLED_RETRY_BUDGET_FRACTION` is the integer `1.0`, so when enabled this is a full-sized fresh pool (matching the pass's own "whole extra ladder rerun" self-conception), not a small slice.

This is a genuine allocation-shape change, not a currency swap — unlike the nine already-migrated ms-derived sites, this tier never had a fresh pool of any kind before, so it is gated behind its own opt-in per `docs/solver-budget-determinism.md`'s standing note that this "would be a genuine allocation-shape change requiring its own before/after evidence."

## Why opt-in rather than a direct fix

`repair-fallback`'s own 2026-08-20 fix (the direct precedent for "give a starved tier a fresh pool") landed without a dedicated opt-in flag. This change instead follows the more conservative `STRATEGY_*_NODE_RESERVE` convention (every sibling reserve mechanism in this same tier's neighborhood — `STRATEGY_REPAIR_FALLBACK_NODE_RESERVE`, `STRATEGY_GOAL_ATTRACTION_DISABLED_RETRY_NODE_RESERVE`, `STRATEGY_ADMISSIBLE_ORDER_PROFILE_NODE_RESERVE` — landed opt-in first, and two of the three closed negative/useless after real evidence). Given this tier's own closed node-reserve sibling already showed "negligible useful participation/solve movement" in isolation, and this report's own small-scale probe (in the starvation-diagnosis report) found 0/14 real-attempt levels won even with both dimensions fixed, promoting this directly without population-scale confirmation would repeat exactly the kind of premature promotion this codebase's standing discipline exists to prevent.

## Validation performed

- **Zero live-play risk:** both real interactive callers (`solver-controller.ts`, `review-controller.ts`) pass `disableExtraBudgetPasses: true`, which zeroes `diversityBudgetFraction` and skips this whole code block regardless of the flag — unaffected either way.
- **Default-off no-op on the standard regression surface:** full published-corpus `npm run solver:regression -- --check` is byte-identical before and after (160/160 solved, 68,562,085 nodes both times) — the flag defaults to `false` via the standard opt-in-Proxy semantics, and the corpus's own default call shape never sets it.
- **New unit test** (`modules/solver/orchestration.test.ts`, `'goal-attraction-disabled-retry fresh work pool gives the pass real room even after the shared pool is already spent'`): a synthetic mock dispatch that spends real work per attempt (mirroring the existing main-search-late-reserve WORK-starvation tests' own convention) directly demonstrates both arms — OFF: the shared pool, already spent past `workBudget` by main-search alone, gives the pass literally zero attempts (the exact `attemptCount: 0` signature the population telemetry found); ON: the pass gets a real dispatch with nonzero `workSpent` from its own fresh pool, regardless of what main-search already spent.
- **Full `orchestration.test.ts` suite:** 144/144 passing (143 pre-existing + 1 new), including the existing `OPT_IN_FEATURES` documentation-coverage check.
- **`npm run check:documentation-links`:** passes — the new flag has both a description in `ablation-config.ts` and a disposition row in `docs/solver-opt-in-experiment-ledger.md`.

## What this does not establish

No claim of a solve-count improvement. This report is implementation-only; the population-scale before/after A/B that would answer whether the fix helps is the explicit next gate, not run here.
