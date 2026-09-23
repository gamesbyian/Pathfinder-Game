/**
 * Shared deterministic JSON-ish serialization for producing stable identity/digest inputs.
 *
 * Before this module existed, six call sites (five Node scripts plus
 * modules/domain/hint-runtime.mjs's provenanceEventIdentity()) each carried their own
 * byte-for-byte-identical copy of this exact algorithm: scripts/check-effective-config-agreement.mjs,
 * scripts/combine-solver-sweep-reports.mjs, scripts/hint-determinism-audit-lib.mjs,
 * scripts/level-blind-capability-sweep.mjs, scripts/portfolio-solve-sweep.mjs. That is precisely the
 * drift class docs/hint-evidence-execution-identity-storage-consolidation-plan.md section 3.2 warns
 * about ("reuse shared stable/canonical serialization instead of producer-local stableStringify()
 * implementations") ahead of introducing the canonical solver-request capsule digest, which needs one
 * unambiguous owner rather than a seventh copy.
 *
 * Plain .mjs (no .ts wrapper) so it loads identically under the browser bundle, `tsx`, and plain
 * `node` — this repo's producers use all three to reach this same algorithm today.
 *
 * @param {unknown} value
 * @returns {string | undefined}
 */
export function stableStringify(value) {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(v => stableStringify(v) ?? 'null').join(',')}]`;
    const obj = /** @type {Record<string, unknown>} */ (value);
    const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}
