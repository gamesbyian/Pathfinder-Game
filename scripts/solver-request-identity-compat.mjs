import { createHash } from 'node:crypto';
import { stableStringify } from '../modules/canonical-json.mjs';
import {
    assertSolverRequestIdentity,
    solverRequestIdentityFromProjection,
} from './solver-request-identity-lib.mjs';

function legacyEffectiveConfigDigest(value) {
    return createHash('sha256').update(stableStringify(value)).digest('hex');
}

/**
 * Dual-read compatibility boundary for report-level solver request identity.
 *
 * New reports may carry:
 *   summary.solverRequestProjection
 *   summary.solverRequestIdentity
 *
 * Historical/current transitional reports may instead carry:
 *   summary.effectiveConfig
 *   summary.effectiveConfigDigest
 *
 * The legacy form is validated but never silently promoted to canonical request identity because
 * producer-local effectiveConfig shapes are not proven semantically equivalent to the canonical
 * projection. Callers can therefore distinguish "canonical identity available" from
 * "legacy config evidence only" without guessing.
 */
export function solverRequestIdentityAvailability(summary) {
    if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
        return { status: 'unavailable', reason: 'missing-summary' };
    }

    const projection = summary.solverRequestProjection;
    const recordedIdentity = summary.solverRequestIdentity;

    if (projection != null || recordedIdentity != null) {
        if (!projection || typeof projection !== 'object' || Array.isArray(projection)) {
            return { status: 'invalid-canonical', reason: 'solverRequestProjection-missing-or-invalid' };
        }
        try {
            const identity = recordedIdentity == null
                ? solverRequestIdentityFromProjection(projection)
                : assertSolverRequestIdentity(projection, recordedIdentity);
            return {
                status: 'canonical',
                solverRequestIdentity: identity,
                solverRequestProjection: projection,
            };
        } catch (error) {
            return { status: 'invalid-canonical', reason: error.message };
        }
    }

    if (summary.effectiveConfig != null || summary.effectiveConfigDigest != null) {
        if (!summary.effectiveConfig || typeof summary.effectiveConfig !== 'object' || Array.isArray(summary.effectiveConfig)) {
            return { status: 'invalid-legacy', reason: 'effectiveConfig-missing-or-invalid' };
        }
        if (typeof summary.effectiveConfigDigest !== 'string' || !summary.effectiveConfigDigest) {
            return { status: 'invalid-legacy', reason: 'effectiveConfigDigest-missing-or-invalid' };
        }
        const computed = legacyEffectiveConfigDigest(summary.effectiveConfig);
        if (computed !== summary.effectiveConfigDigest) {
            return { status: 'invalid-legacy', reason: 'effectiveConfigDigest-mismatch' };
        }
        return {
            status: 'legacy-only',
            reason: 'canonical-solver-request-identity-not-recorded',
            effectiveConfig: summary.effectiveConfig,
            effectiveConfigDigest: summary.effectiveConfigDigest,
        };
    }

    return { status: 'unavailable', reason: 'no-solver-request-identity-evidence' };
}

export function requireCanonicalSolverRequestIdentity(summary) {
    const availability = solverRequestIdentityAvailability(summary);
    if (availability.status !== 'canonical') {
        throw new Error(
            `canonical solver request identity unavailable: ${availability.status} (${availability.reason ?? 'unknown'})`,
        );
    }
    return availability;
}
