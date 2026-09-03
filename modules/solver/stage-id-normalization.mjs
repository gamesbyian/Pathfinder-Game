/**
 * Canonical solver stage IDs and the single dual-read legacy-to-canonical normalizer.
 *
 * Plain JS (not `.ts`) so research/tooling `.mjs` scripts that run directly under plain `node`
 * (no `tsx`/esbuild step) can import this without triggering Node's lack of native TypeScript
 * resolution. `modules/solver/stage-policy.ts` re-exports these symbols; this file is the single
 * source of truth for the ID list and the legacy alias map — do not duplicate either one.
 */

/** @type {readonly ['explicit-prime', 'early-repair-search', 'main-search', 'repair-fallback', 'goal-attraction-disabled-retry', 'repair-shrink-recovery', 'admissible-order-fallback', 'coarse-state-near-tie-retention-disabled-retry', 'admissible-order-alternate-tiebreak-retry', 'connectivity-axis-prune-disabled-retry', 'repair-elite-prefix-dfs-retry', 'must-cross-neighbor-prune-disabled-retry', 'late-repair-search', 'guidance-goal-distance-retry', 'late-repair-multiseed-retry', 'legacy-latency-portfolio-pass', 'legacy-latency-portfolio-fallback', 'static-portfolio']} */
export const SOLVER_STAGE_IDS = Object.freeze([
    'explicit-prime', 'early-repair-search', 'main-search', 'repair-fallback', 'goal-attraction-disabled-retry',
    'repair-shrink-recovery', 'admissible-order-fallback', 'coarse-state-near-tie-retention-disabled-retry',
    'admissible-order-alternate-tiebreak-retry', 'connectivity-axis-prune-disabled-retry',
    'repair-elite-prefix-dfs-retry', 'must-cross-neighbor-prune-disabled-retry', 'late-repair-search',
    'guidance-goal-distance-retry', 'late-repair-multiseed-retry',
    'legacy-latency-portfolio-pass', 'legacy-latency-portfolio-fallback',
    'static-portfolio',
]);

/** @type {Readonly<Record<string, typeof SOLVER_STAGE_IDS[number]>>} */
const LEGACY_SOLVER_STAGE_ID_MAP = Object.freeze({
    'prime': 'explicit-prime',
    'repair-probe': 'early-repair-search',
    'main-loop': 'main-search',
    'attraction-diversity': 'goal-attraction-disabled-retry',
    'repair-probe-shrink-recovery': 'repair-shrink-recovery',
    'admissible-order': 'admissible-order-fallback',
    'dedup-near-tie-retry': 'coarse-state-near-tie-retention-disabled-retry',
    'admissible-order-non-default-retry': 'admissible-order-alternate-tiebreak-retry',
    'connectivity-axis-exhausted-retry': 'connectivity-axis-prune-disabled-retry',
    'mc-neighbor-budget-retry': 'must-cross-neighbor-prune-disabled-retry',
    'repair-late-probe': 'late-repair-search',
    'goal-attraction-legacy-distance-retry': 'guidance-goal-distance-retry',
    'repair-late-probe-multi-seed-retry': 'late-repair-multiseed-retry',
    'portfolio-pass': 'legacy-latency-portfolio-pass',
    'portfolio-fallback': 'legacy-latency-portfolio-fallback',
});

/**
 * Accept a historical or canonical solver stage id and return the canonical form.
 * @param {string} id
 * @returns {typeof SOLVER_STAGE_IDS[number]}
 */
export function normalizeSolverStageId(id) {
    const normalized = LEGACY_SOLVER_STAGE_ID_MAP[id] ?? id;
    if (SOLVER_STAGE_IDS.includes(normalized)) return normalized;
    throw new Error(`Unknown solver stage: ${String(id)}`);
}


/**
 * Return every historical/current spelling that denotes the same stage identity.
 * Search/discovery tooling may use this to remain bilingual without copying the alias map.
 * @param {string} id
 * @returns {readonly string[]}
 */
export function solverStageIdentityTerms(id) {
    const canonical = normalizeSolverStageId(id);
    return Object.freeze([
        canonical,
        ...Object.entries(LEGACY_SOLVER_STAGE_ID_MAP)
            .filter(([, target]) => target === canonical)
            .map(([legacy]) => legacy),
    ]);
}
