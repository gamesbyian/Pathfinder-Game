/**
 * Solver budget-unit compatibility helpers.
 *
 * Canonical solver allocation is denominated in work units. Milliseconds are not a search
 * currency. LEGACY_MS_TO_WORK_RATE exists only so old ms-shaped APIs/CLIs can be normalized once
 * at a boundary without measuring live host speed. New decision-bearing tooling should pass work
 * explicitly instead of depending on this calibration.
 */
export const LEGACY_MS_TO_WORK_RATE = 3350;

/** Convert a legacy ms-shaped quantity into deterministic work using the committed calibration.
 * This is a compatibility conversion, not a throughput estimate and never reads the clock. */
export function legacyMsToWork(ms: number, minimumWork = 0): number {
    const finiteMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;
    return Math.max(minimumWork, Math.floor(finiteMs * LEGACY_MS_TO_WORK_RATE));
}

/** Size an additive stage's own fresh work pool from the solve's already-resolved `workBudget`
 * (explicit `baseWorkBudget`/`workBudget`, or `legacyMsToWork(timeBudgetMs, ...)` when neither was
 * supplied) rather than re-deriving it from `timeBudgetMs` a second time. This is the replacement
 * for the historical `legacyMsToWork(Math.floor(timeBudgetMs * fraction), minimumWork)` pattern:
 * for the common case (no explicit work override, integer stage fraction) it reproduces the exact
 * same number, because `legacyMsToWork` is linear in its input and `workBudget` already equals
 * `legacyMsToWork(timeBudgetMs, minimumWork)` in that case. It stops reproducing that number only
 * when a caller supplies an explicit `baseWorkBudget`/`workBudget` that disagrees with what
 * `timeBudgetMs` would otherwise imply — exactly the case where the old pattern silently ignored
 * the caller's real work allocation and re-derived a different one from the (possibly non-binding,
 * latency-only) deadline instead. See `docs/solver-budget-determinism.md`'s additive-tier debt
 * inventory. */
export function scaledStageWorkBudget(workBudget: number, fraction: number, minimumWork = 0): number {
    const finiteWorkBudget = Number.isFinite(workBudget) ? Math.max(0, workBudget) : 0;
    const finiteFraction = Number.isFinite(fraction) ? Math.max(0, fraction) : 0;
    return Math.max(minimumWork, Math.floor(finiteWorkBudget * finiteFraction));
}
