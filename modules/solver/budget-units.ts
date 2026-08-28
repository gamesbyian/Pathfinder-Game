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
