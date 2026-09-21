/**
 * Canonical solver scheduler-mode parsing plus an explicitly historical alias decoder.
 *
 * Current CLI/API input must use canonical values. Historical artifacts/replay readers that
 * genuinely need pre-cleanup spellings must opt into normalizeHistoricalSchedulerMode().
 */

export const CANONICAL_SCHEDULER_MODES = Object.freeze([
    'production',
    'legacy-latency-portfolio-experiment',
    'static-portfolio',
]);

const HISTORICAL_SCHEDULER_MODE_ALIASES = Object.freeze({
    legacy: 'production',
    'portfolio-experiment': 'legacy-latency-portfolio-experiment',
});

/**
 * Parse one current scheduler-mode value. Retired spellings are rejected.
 * @param {string} [rawSchedulerMode]
 * @returns {'production' | 'legacy-latency-portfolio-experiment' | 'static-portfolio'}
 */
export function normalizeSchedulerMode(rawSchedulerMode) {
    if (!CANONICAL_SCHEDULER_MODES.includes(rawSchedulerMode)) {
        throw new Error(`--scheduler-mode must be one of: ${CANONICAL_SCHEDULER_MODES.join(', ')}; got ${JSON.stringify(rawSchedulerMode)}`);
    }
    return rawSchedulerMode;
}

/**
 * Decode a scheduler mode found in historical persisted input, then emit the canonical value.
 * New callers should not use this function for fresh CLI/API input.
 *
 * @param {string} rawSchedulerMode
 * @returns {'production' | 'legacy-latency-portfolio-experiment' | 'static-portfolio'}
 */
export function normalizeHistoricalSchedulerMode(rawSchedulerMode) {
    const historical = HISTORICAL_SCHEDULER_MODE_ALIASES[rawSchedulerMode];
    return normalizeSchedulerMode(historical ?? rawSchedulerMode);
}
