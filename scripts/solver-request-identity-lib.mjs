import { createHash } from 'node:crypto';
import { stableStringify } from '../modules/canonical-json.mjs';

export const SOLVER_REQUEST_IDENTITY_PREFIX = 'sha256:';
export const SOLVER_REQUEST_PROJECTION_KIND = 'pathfinder-solver-request-projection';

/**
 * Node-side digest owner for an already-canonical solver-request projection.
 *
 * This module deliberately does NOT construct the projection. The canonical builder lives with the
 * solver runtime; plain-Node research consumers can still validate/hash a stored projection without
 * copying its default-resolution logic into scripts/.
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
