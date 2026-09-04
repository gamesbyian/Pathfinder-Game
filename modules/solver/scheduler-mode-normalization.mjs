/**
 * Canonical solver scheduler-mode values and the single legacy-to-canonical normalizer for CLI
 * flag parsing. Plain JS (not `.ts`), mirroring stage-id-normalization.mjs's pattern, so both
 * plain-`node`- and bundler-invoked research tooling can share one mapping instead of
 * reimplementing it independently.
 *
 * This does not decide solveLevel()'s own runtime default when `schedulerMode` is entirely
 * omitted from SolveOpts (orchestration.ts resolves that itself); it only validates and
 * normalizes an explicit `--scheduler-mode` CLI value a caller already decided to pass through
 * (or a caller-supplied fallback string), so each script keeps its own omission policy.
 */

/** @type {Readonly<Record<string, 'production' | 'legacy-latency-portfolio-experiment' | 'static-portfolio'>>} */
const SCHEDULER_MODE_ALIASES = Object.freeze({
    legacy: 'production',
    production: 'production',
    'portfolio-experiment': 'legacy-latency-portfolio-experiment',
    'legacy-latency-portfolio-experiment': 'legacy-latency-portfolio-experiment',
    'static-portfolio': 'static-portfolio',
});

/**
 * @param {string} [rawSchedulerMode]
 * @returns {'production' | 'legacy-latency-portfolio-experiment' | 'static-portfolio'}
 */
export function normalizeSchedulerMode(rawSchedulerMode) {
    const canonical = rawSchedulerMode === undefined ? undefined : SCHEDULER_MODE_ALIASES[rawSchedulerMode];
    if (canonical === undefined) {
        throw new Error(`--scheduler-mode must be one of: production, legacy-latency-portfolio-experiment, static-portfolio (legacy aliases: legacy, portfolio-experiment); got ${JSON.stringify(rawSchedulerMode)}`);
    }
    return canonical;
}
