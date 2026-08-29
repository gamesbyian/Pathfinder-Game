/**
 * Policy-aware AttemptConfig parser. Syntax and legacy compatibility belong to the shared
 * attempt-identity module; this adapter validates vocabulary and materializes the actual
 * structural-bias object used by solver execution.
 */
import {
    formatAttemptIdentityKey,
    normalizeAttemptIdentityKey,
    parseAttemptIdentityKey,
} from '../modules/solver/attempt-identity.mjs';

/** Dependency injection keeps this plain .mjs usable from bundled and TS-source contexts. */
export function makeAttemptConfigKeyParser({ STRUCTURAL_ORDERING_BIASES, SCORING_PROFILES, attemptConfigKey }) {
    return function parseAttemptConfigKey(key) {
        const fields = parseAttemptIdentityKey(key);
        if (!fields.admissibleOrder && !SCORING_PROFILES[fields.scoringProfileId])
            throw new Error('"' + key + '" references unknown profile "' + fields.scoringProfileId + '". Run with --list-profiles for the vocabulary.');
        if (fields.admissibleOrder && !fields.admissibleOrderNoTieBreak && !SCORING_PROFILES[fields.scoringProfileId])
            throw new Error('"' + key + '" references unknown admissible-order tie-break profile "' + fields.scoringProfileId + '". Run with --list-profiles or use tieBreak=none.');
        if (fields.orderingBiasId && !STRUCTURAL_ORDERING_BIASES[fields.orderingBiasId])
            throw new Error('"' + key + '" references unknown structural bias "' + fields.orderingBiasId + '".');

        const config = {
            scoringProfileId: fields.scoringProfileId,
            orderingBias: fields.orderingBiasId ? STRUCTURAL_ORDERING_BIASES[fields.orderingBiasId] : null,
            ...(fields.beamWidth ? { beamWidth: fields.beamWidth } : {}),
            ...(fields.mechanicBucketRetention ? { mechanicBucketRetention: true } : {}),
            ...(fields.repair ? { repair: true } : {}),
            ...(fields.repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
            ...(fields.repairTurnBiased ? { repairTurnBiased: true } : {}),
            ...(fields.admissibleOrder ? { admissibleOrder: true } : {}),
            ...(fields.admissibleOrderNoTieBreak ? { admissibleOrderNoTieBreak: true } : {}),
            ...(fields.admissibleOrderLds ? { admissibleOrderLds: true } : {}),
        };

        const canonical = normalizeAttemptIdentityKey(key);
        const roundTrip = attemptConfigKey(config);
        if (roundTrip !== canonical || formatAttemptIdentityKey(fields) !== canonical)
            throw new Error('"' + key + '" parsed to a config that canonicalizes as "' + roundTrip
                + '" instead of "' + canonical + '" — parser/format mismatch.');
        return config;
    };
}
