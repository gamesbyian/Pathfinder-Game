/**
 * Historical/persisted Attempt ingress normalization.
 *
 * Current solver Attempts are canonical. Retired field names belong here so current writers and
 * semantic helpers never need to dual-read them. This adapter deliberately does not invent a
 * stageId for pre-stageId evidence; callers that need historical tier inference can still classify
 * that evidence explicitly after normalization.
 */
import { normalizeAttemptIdentityKey } from './attempt-identity.mjs';
import { normalizeHistoricalSolverStageId } from './stage-id-normalization.mjs';

const FIELD_ALIASES = Object.freeze([
    ['profile', 'scoringProfileId'],
    ['template', 'orderingBiasId'],
    ['diverseBeam', 'mechanicBucketRetention'],
    ['repairProbe', 'earlyRepairSearch'],
    ['repairProbeShrinkRecovery', 'repairShrinkRecovery'],
    ['mainLoopLateReserve', 'mainSearchLateReserve'],
    ['attractionDiversity', 'goalAttractionDisabledRetry'],
    ['dedupNearTieRetry', 'coarseStateNearTieRetentionRetry'],
]);

export function normalizeHistoricalPersistedAttemptError(error) {
    if (!error || typeof error !== 'object') return error;
    const normalized = { ...error };
    if (normalized.scoringProfileId === undefined && normalized.profile !== undefined) {
        normalized.scoringProfileId = normalized.profile;
    }
    if (normalized.orderingBiasId === undefined && normalized.template !== undefined) {
        normalized.orderingBiasId = normalized.template;
    }
    if (normalized.configKey === undefined && normalized.config !== undefined) {
        normalized.configKey = normalized.config;
    }
    if (normalized.configKey != null) {
        try { normalized.configKey = normalizeAttemptIdentityKey(String(normalized.configKey)); } catch {}
    }
    delete normalized.profile;
    delete normalized.template;
    delete normalized.config;
    return normalized;
}

export function normalizeHistoricalPersistedAttempt(attempt) {
    if (!attempt || typeof attempt !== 'object') return attempt;
    const normalized = { ...attempt };
    for (const [retired, canonical] of FIELD_ALIASES) {
        if (normalized[canonical] === undefined && normalized[retired] !== undefined) {
            normalized[canonical] = normalized[retired];
        }
        delete normalized[retired];
    }
    if (normalized.configKey === undefined && normalized.config !== undefined) {
        normalized.configKey = normalized.config;
    }
    delete normalized.config;
    if (normalized.configKey != null) {
        normalized.configKey = normalizeAttemptIdentityKey(String(normalized.configKey));
    }
    if (normalized.stageId != null) {
        normalized.stageId = normalizeHistoricalSolverStageId(normalized.stageId);
    }
    if (normalized.error !== undefined) {
        normalized.error = normalizeHistoricalPersistedAttemptError(normalized.error);
    }
    return normalized;
}

export function normalizeHistoricalPersistedAttempts(attempts) {
    return Array.isArray(attempts) ? attempts.map(normalizeHistoricalPersistedAttempt) : [];
}
