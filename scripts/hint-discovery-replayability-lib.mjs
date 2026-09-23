import { formatAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';
import { normalizeHistoricalSolverStageId } from '../modules/solver/stage-id-normalization.mjs';

/**
 * Derived replayability classification for stored hint discovery provenance.
 *
 * A stored Hint path is itself replayable as a positive oracle. This module answers a different
 * question: how much of the discovery process can be reconstructed from one provenance event?
 *
 * Keep this derived rather than persisted. Historical entries do not gain information merely because
 * a newer schema knows more fields, and future callers may tighten the contract without rewriting the
 * hint store.
 */

export const HINT_DISCOVERY_REPLAY_BASES = Object.freeze([
    'configuration-reconstructable',
    'identity-only',
    'historical-unverified',
]);

const PATHFINDER_SOLVER_ID = 'pathfinder-solver';

function hasOwnBoolean(object, key) {
    return Object.hasOwn(object ?? {}, key) && typeof object?.[key] === 'boolean';
}

function nonEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function hasSearchEnvelope(entry) {
    const search = entry?.search ?? {};
    return Number.isFinite(search.workBudget)
        || Number.isFinite(search.budgetMs)
        || search.termination === 'exhaustive';
}

function randomizedTechnique(entry) {
    const technique = String(entry?.solver?.technique ?? '');
    if (technique === 'repair') return true;
    if (technique.includes('random') || technique.includes('enumerat') || technique.includes('prefix-anchored')) return true;
    return false;
}

function hasReplaySeedWhenNeeded(entry) {
    if (!randomizedTechnique(entry)) return true;
    return Number.isFinite(entry?.search?.randomSeed);
}

function hasExplicitCapabilityContext(entry) {
    const context = entry?.context ?? {};
    return hasOwnBoolean(context, 'usedExistingHints')
        && hasOwnBoolean(context, 'hintGuided')
        && hasOwnBoolean(context, 'isolatedTechnique');
}

/**
 * Classify one stored discovery event without claiming more reconstruction fidelity than its fields
 * support.
 *
 * configuration-reconstructable:
 *   Enough immutable/config/search-envelope context exists to rebuild the historical configuration
 *   intentionally. This is NOT a promise of byte-identical whole-run replay: provenance currently
 *   lacks the complete run/protocol envelope that search-loss capsules can carry.
 *
 * identity-only:
 *   The event is meaningfully attributable/versioned but one or more replay inputs are absent.
 *
 * historical-unverified:
 *   Core producer/revision/context information is absent or legacy-ambiguous.
 */
export function classifyHintDiscoveryReplayability(entry) {
    if (!entry || typeof entry !== 'object') {
        return { replayBasis: 'historical-unverified', reason: 'missing-provenance-event' };
    }

    const solver = entry.solver ?? {};
    const context = entry.context ?? {};

    if (!nonEmpty(solver.id) || !nonEmpty(solver.technique)) {
        return { replayBasis: 'historical-unverified', reason: 'missing-producer-or-technique' };
    }
    if (!nonEmpty(solver.version)) {
        return { replayBasis: 'historical-unverified', reason: 'missing-solver-version' };
    }
    if (!nonEmpty(context.levelRevision)) {
        return { replayBasis: 'historical-unverified', reason: 'missing-level-revision' };
    }
    if (solver.id === PATHFINDER_SOLVER_ID && !hasExplicitCapabilityContext(entry)) {
        return { replayBasis: 'historical-unverified', reason: 'legacy-context-ambiguity' };
    }

    if (solver.id !== PATHFINDER_SOLVER_ID) {
        return { replayBasis: 'identity-only', reason: 'non-pathfinder-producer-contract' };
    }
    if (!hasSearchEnvelope(entry)) {
        return { replayBasis: 'identity-only', reason: 'missing-search-envelope' };
    }
    if (!hasReplaySeedWhenNeeded(entry)) {
        return { replayBasis: 'identity-only', reason: 'missing-random-seed' };
    }

    return {
        replayBasis: 'configuration-reconstructable',
        reason: 'versioned-level-bound-config-with-search-envelope',
    };
}


function attemptConfigIdentityFromProvenance(entry) {
    const solver = entry?.solver ?? {};
    const technique = String(solver.technique ?? '');
    if (!nonEmpty(solver.scoringProfileId)) return null;
    try {
        if (technique === 'repair') {
            return formatAttemptIdentityKey({
                scoringProfileId: 'repair',
                orderingBiasId: null,
                repair: true,
                repairMustTurnBiased: entry?.solver?.forcing?.repairMustTurnBiased === true,
                repairTurnBiased: entry?.solver?.forcing?.repairTurnBiased === true,
            });
        }
        if (technique === 'admissible-order-fallback') {
            return formatAttemptIdentityKey({
                scoringProfileId: solver.scoringProfileId,
                orderingBiasId: null,
                admissibleOrder: true,
            });
        }
        if (technique === 'beam') {
            if (!Number.isSafeInteger(solver.beamWidth) || solver.beamWidth <= 0) return null;
            return formatAttemptIdentityKey({
                scoringProfileId: solver.scoringProfileId,
                orderingBiasId: solver.orderingBiasId ?? null,
                beamWidth: solver.beamWidth,
                mechanicBucketRetention: solver.mechanicBucketRetention === true,
            });
        }
        if (technique === 'dfs') {
            return formatAttemptIdentityKey({
                scoringProfileId: solver.scoringProfileId,
                orderingBiasId: solver.orderingBiasId ?? null,
            });
        }
    } catch {
        return null;
    }
    return null;
}

/**
 * Derived effective-input reconstructability for one Pathfinder provenance event.
 *
 * This does not mutate/upgrade historical evidence. It names exactly which dimensions are still
 * unavailable and returns an identity only when every required dimension is present. The caller may
 * supply solverRequestIdentity and solverStageId from an exact sibling-evidence/source-run join once
 * those layers are available; historical events do not acquire them by inference.
 */
export function effectiveSolverInputIdentityStatus(entry, {
    solverRequestIdentity = null,
    solverStageId = null,
} = {}) {
    const missingDimensions = [];
    if (!entry || typeof entry !== 'object') {
        return {
            reconstructable: false,
            identity: null,
            missingDimensions: ['provenanceEvent'],
        };
    }

    const solver = entry.solver ?? {};
    const search = entry.search ?? {};
    const context = entry.context ?? {};
    const attemptConfigIdentity = attemptConfigIdentityFromProvenance(entry);

    if (solver.id !== PATHFINDER_SOLVER_ID) {
        return {
            reconstructable: false,
            identity: null,
            missingDimensions: ['pathfinderSolverContract'],
        };
    }
    if (!nonEmpty(context.levelRevision)) missingDimensions.push('levelRevision');
    if (!nonEmpty(solver.version)) missingDimensions.push('solverVersion');
    if (!attemptConfigIdentity) missingDimensions.push('attemptConfigIdentity');
    let canonicalSolverStageId = null;
    if (!nonEmpty(solverStageId)) missingDimensions.push('solverStage');
    else {
        try { canonicalSolverStageId = normalizeHistoricalSolverStageId(solverStageId); }
        catch { missingDimensions.push('solverStage'); }
    }
    if (!Number.isFinite(solver.gateKey)) missingDimensions.push('gateKey');
    if (!nonEmpty(solverRequestIdentity)) missingDimensions.push('solverRequestIdentity');
    if (!hasSearchEnvelope(entry)) missingDimensions.push('resourceEnvelope');
    if (!hasReplaySeedWhenNeeded(entry)) missingDimensions.push('randomSeed');
    if (!hasExplicitCapabilityContext(entry)) missingDimensions.push('capabilityContext');

    if (missingDimensions.length > 0) {
        return {
            reconstructable: false,
            identity: null,
            missingDimensions,
        };
    }

    return {
        reconstructable: true,
        missingDimensions: [],
        identity: {
            schemaVersion: 1,
            levelRevision: context.levelRevision,
            solverVersion: solver.version,
            solverRequestIdentity,
            solverStageId: canonicalSolverStageId,
            attemptConfigIdentity,
            gateKey: solver.gateKey,
            forcing: solver.forcing ?? null,
            resourceEnvelope: {
                workBudget: Number.isFinite(search.workBudget) ? search.workBudget : null,
                budgetMs: Number.isFinite(search.budgetMs) ? search.budgetMs : null,
            },
            randomSeed: randomizedTechnique(entry) ? search.randomSeed : null,
            seedSalt: Number.isFinite(search.seedSalt) ? search.seedSalt : null,
        },
    };
}

export function summarizeHintDiscoveryReplayability(hints) {
    const counts = Object.fromEntries(HINT_DISCOVERY_REPLAY_BASES.map(key => [key, 0]));
    const reasons = {};
    let events = 0;
    for (const hint of hints ?? []) {
        for (const entry of hint?.provenance ?? []) {
            events += 1;
            const classification = classifyHintDiscoveryReplayability(entry);
            counts[classification.replayBasis] += 1;
            reasons[classification.reason] = (reasons[classification.reason] ?? 0) + 1;
        }
    }
    return {
        events,
        replayBasisCounts: counts,
        reasons: Object.fromEntries(Object.entries(reasons).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    };
}
