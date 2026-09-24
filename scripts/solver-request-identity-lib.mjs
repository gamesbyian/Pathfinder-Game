import { createHash } from 'node:crypto';
import { stableStringify } from '../modules/canonical-json.mjs';

export const SOLVER_REQUEST_IDENTITY_PREFIX = 'sha256:';
export const SOLVER_REQUEST_PROJECTION_KIND = 'pathfinder-solver-request-projection';

/**
 * Node-side digest owner for an already-canonical solver-request projection.
 *
 * This module deliberately does NOT construct the projection. The canonical builder
 * (modules/solver/solver-request-projection.ts) lives with the solver runtime; plain-Node research
 * consumers can still validate/hash a stored projection without copying its default-resolution logic
 * into scripts/.
 *
 * RESOLVED bridge architecture (docs/hint-evidence-execution-identity-storage-consolidation-plan.md
 * section 3.2; see reports/2026-09-23-hint-evidence-remaining-mechanical-migration-audit-001.md's
 * "TypeScript to plain-Node bridge audit" for the full survey this closes):
 *
 *   - a producer that already runs bundled (`scripts/run-bundled.mjs`) and holds the literal resolved
 *     SolveOpts at its invocation boundary imports buildCanonicalSolverRequestProjection() directly
 *     (level-blind-capability-sweep.mjs, portfolio-solve-sweep.mjs both do this);
 *   - a plain `node scripts/*.mjs` consumer (publishers, combiners, validators, hint-discovery/failure
 *     queries) only hashes/validates an ALREADY-EMITTED projection through this module and
 *     solver-request-identity-compat.mjs -- it must never reconstruct one;
 *   - a plain-`.mjs` projection BUILDER (as opposed to this digest/validator) was considered and
 *     declined: doing so safely would require moving the solver's entire default-resolution authority
 *     (stage-budget-core.ts, ablation-config.ts, orchestration-early-repair.ts, and friends) to plain
 *     JS, an extremely large, high-risk core-solver refactor with no current consumer that needs it --
 *     every producer that must construct a projection is already bundled/TS-capable. Revisit only if a
 *     real plain-Node producer needs to construct (not merely validate) a projection; until then this
 *     is not an open question to re-litigate.
 */
export function solverRequestIdentityFromProjection(projection) {
    if (!projection || typeof projection !== 'object' || Array.isArray(projection)) {
        throw new Error('solver request projection must be an object');
    }
    if (projection.kind !== SOLVER_REQUEST_PROJECTION_KIND) {
        throw new Error(`unsupported solver request projection kind: ${JSON.stringify(projection.kind)}`);
    }
    if (!Number.isInteger(projection.schemaVersion) || projection.schemaVersion < 1) {
        throw new Error('solver request projection requires a positive integer schemaVersion');
    }
    const canonical = stableStringify(projection);
    return `${SOLVER_REQUEST_IDENTITY_PREFIX}${createHash('sha256').update(canonical).digest('hex')}`;
}

export function assertSolverRequestIdentity(projection, recordedIdentity) {
    const computed = solverRequestIdentityFromProjection(projection);
    if (recordedIdentity !== computed) {
        throw new Error(
            `solver request identity mismatch: recorded ${JSON.stringify(recordedIdentity)}, computed ${computed}`,
        );
    }
    return computed;
}
