/**
 * Canonical solver routing-regime values and the single dual-read legacy-to-canonical normalizer.
 *
 * Plain JS (not `.ts`) so research/tooling `.mjs` scripts that run directly under plain `node`
 * (no `tsx`/esbuild step) can import this without triggering Node's lack of native TypeScript
 * resolution. `modules/solver/routing-regime.ts` re-exports these symbols; this file is the
 * single source of truth for the legacy alias map — do not duplicate it.
 */

/** @type {readonly ['general', 'sparse-low-intersection', 'intersection-heavy', 'must-cross-heavy', 'multi-portal']} */
export const ROUTING_REGIMES = Object.freeze([
    'general', 'sparse-low-intersection', 'intersection-heavy', 'must-cross-heavy', 'multi-portal',
]);

/** @type {Readonly<Record<string, typeof ROUTING_REGIMES[number]>>} */
const LEGACY_ROUTING_REGIME_ALIASES = Object.freeze({
    default: 'general',
    'near-closure': 'sparse-low-intersection',
    'high-intersection-burden': 'intersection-heavy',
    'must-cross-heavy': 'must-cross-heavy',
    'portal-heavy': 'multi-portal',
});

/**
 * Accept historical persisted routing labels and normalize them to the canonical vocabulary.
 * @param {string} value
 * @returns {typeof ROUTING_REGIMES[number]}
 */
export function normalizeRoutingRegime(value) {
    const normalized = LEGACY_ROUTING_REGIME_ALIASES[value] ?? value;
    if (!ROUTING_REGIMES.includes(normalized))
        throw new Error(`Unknown solver routing regime: ${value}`);
    return normalized;
}
