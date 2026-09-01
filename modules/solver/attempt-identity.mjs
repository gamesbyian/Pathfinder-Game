import { normalizeSolverStageId, solverStageIdentityTerms } from './stage-id-normalization.mjs';

/**
 * Canonical solver attempt-identity parser/formatters shared by live AttemptConfig and persisted
 * Attempt consumers. New writers emit structured keys; historical compact keys remain accepted
 * input syntax so frozen evidence stays readable without rewriting it.
 *
 * Canonical grammar:
 *   dfs|score=<profile>|bias=<bias-or-none>
 *   beam|score=<profile>|bias=<bias-or-none>|width=<integer>|retention=<plain|mechanic-buckets>
 *   repair|score=repair|guidance=<standard|turn-biased|must-turn-biased>
 *   admissible-order|tieBreak=<profile-or-none>|lds=<on|off>
 *
 * @typedef {Object} AttemptIdentityFields
 * @property {string} scoringProfileId
 * @property {string | null} orderingBiasId
 * @property {number | null} [beamWidth]
 * @property {boolean} [mechanicBucketRetention]
 * @property {boolean} [repair]
 * @property {boolean} [repairMustTurnBiased]
 * @property {boolean} [repairTurnBiased]
 * @property {boolean} [admissibleOrder]
 * @property {boolean} [admissibleOrderNoTieBreak]
 * @property {boolean} [admissibleOrderLds]
 *
 * @typedef {AttemptIdentityFields & {stageId: string, seedSalt?: number}} AttemptActionIdentityFields
 */

const ID = '[A-Za-z0-9_-]+';
const canonicalDfs = new RegExp('^dfs\\|score=(' + ID + ')\\|bias=(' + ID + '|none)$');
const canonicalBeam = new RegExp('^beam\\|score=(' + ID + ')\\|bias=(' + ID + '|none)\\|width=([1-9]\\d*)\\|retention=(plain|mechanic-buckets)$');
const canonicalRepair = /^repair\|score=repair\|guidance=(standard|turn-biased|must-turn-biased)$/;
const canonicalAdmissible = new RegExp('^admissible-order\\|tieBreak=(' + ID + '|none)\\|lds=(on|off)$');
const legacyAdmissible = new RegExp('^ida:(' + ID + ')(\\(lds\\))?$');
const legacySearch = new RegExp('^(dfs|beam):(' + ID + ')(?:\\/(' + ID + '))?(?:@beam([1-9]\\d*))?(\\(diverse\\))?(:repair)?(\\(mustTurnBiased\\)|\\(turnBiased\\))?$');

/** @param {string} value */
const nullableBias = value => value === 'none' ? null : value;

/**
 * Syntax-only dual-read parser. Vocabulary existence is checked by the policy-aware adapter.
 * @param {string} key
 * @returns {AttemptIdentityFields}
 */
export function parseAttemptIdentityKey(key) {
    if (typeof key !== 'string' || key.length === 0) throw new Error('Attempt identity must be a non-empty string.');

    let m = canonicalDfs.exec(key);
    if (m) return { scoringProfileId: m[1], orderingBiasId: nullableBias(m[2]) };

    m = canonicalBeam.exec(key);
    if (m) return {
        scoringProfileId: m[1],
        orderingBiasId: nullableBias(m[2]),
        beamWidth: Number(m[3]),
        ...(m[4] === 'mechanic-buckets' ? { mechanicBucketRetention: true } : {}),
    };

    m = canonicalRepair.exec(key);
    if (m) return {
        scoringProfileId: 'repair',
        orderingBiasId: null,
        repair: true,
        ...(m[1] === 'must-turn-biased' ? { repairMustTurnBiased: true } : {}),
        ...(m[1] === 'turn-biased' ? { repairTurnBiased: true } : {}),
    };

    m = canonicalAdmissible.exec(key);
    if (m) {
        const noTieBreak = m[1] === 'none';
        return {
            scoringProfileId: noTieBreak ? 'none' : m[1],
            orderingBiasId: null,
            admissibleOrder: true,
            ...(noTieBreak ? { admissibleOrderNoTieBreak: true } : {}),
            ...(m[2] === 'on' ? { admissibleOrderLds: true } : {}),
        };
    }

    m = legacyAdmissible.exec(key);
    if (m) {
        const noTieBreak = m[1] === 'none';
        return {
            scoringProfileId: noTieBreak ? 'none' : m[1],
            orderingBiasId: null,
            admissibleOrder: true,
            ...(noTieBreak ? { admissibleOrderNoTieBreak: true } : {}),
            ...(m[2] ? { admissibleOrderLds: true } : {}),
        };
    }

    m = legacySearch.exec(key);
    if (m) {
        const [, mode, scoringProfileId, orderingBiasId, beamWidth, mechanicBuckets, repairMarker, biased] = m;
        if (mode === 'beam' && !beamWidth) throw new Error('"' + key + '" says beam but has no @beamN width.');
        if (mode === 'dfs' && beamWidth) throw new Error('"' + key + '" says dfs but has a @beamN width.');
        if (scoringProfileId !== 'repair' && (repairMarker || biased))
            throw new Error('"' + key + '" has a repair marker but scoring profile is not "repair".');
        if (!repairMarker && biased) throw new Error('"' + key + '" has a biased marker without ":repair".');
        if (repairMarker && mode !== 'dfs') throw new Error('"' + key + '" encodes repair under a non-DFS legacy mode.');
        return {
            scoringProfileId,
            orderingBiasId: orderingBiasId ?? null,
            ...(beamWidth ? { beamWidth: Number(beamWidth) } : {}),
            ...(mechanicBuckets ? { mechanicBucketRetention: true } : {}),
            ...(repairMarker ? { repair: true } : {}),
            ...(biased === '(mustTurnBiased)' ? { repairMustTurnBiased: true } : {}),
            ...(biased === '(turnBiased)' ? { repairTurnBiased: true } : {}),
        };
    }

    throw new Error('"' + key + '" is not a valid canonical or legacy attempt identity.');
}

/** @param {AttemptIdentityFields} fields @returns {string} */
export function formatAttemptIdentityKey(fields) {
    if (fields.admissibleOrder) {
        const tieBreak = fields.admissibleOrderNoTieBreak ? 'none' : fields.scoringProfileId;
        return 'admissible-order|tieBreak=' + tieBreak + '|lds=' + (fields.admissibleOrderLds ? 'on' : 'off');
    }

    if (fields.repair) {
        const guidance = fields.repairMustTurnBiased
            ? 'must-turn-biased'
            : fields.repairTurnBiased ? 'turn-biased' : 'standard';
        return 'repair|score=repair|guidance=' + guidance;
    }

    const bias = fields.orderingBiasId ?? 'none';
    if (fields.beamWidth) {
        if (!Number.isSafeInteger(fields.beamWidth) || fields.beamWidth <= 0)
            throw new Error('Beam attempt identity requires a positive integer width.');
        return 'beam|score=' + fields.scoringProfileId + '|bias=' + bias + '|width=' + fields.beamWidth
            + '|retention=' + (fields.mechanicBucketRetention ? 'mechanic-buckets' : 'plain');
    }
    return 'dfs|score=' + fields.scoringProfileId + '|bias=' + bias;
}

/** @param {string} key @returns {string} */
export function normalizeAttemptIdentityKey(key) {
    return formatAttemptIdentityKey(parseAttemptIdentityKey(key));
}
/** @param {AttemptIdentityFields} fields @returns {string} */
function formatLegacyAttemptIdentityKey(fields) {
    if (fields.admissibleOrder) {
        const tieBreak = fields.admissibleOrderNoTieBreak ? 'none' : fields.scoringProfileId;
        return 'ida:' + tieBreak + (fields.admissibleOrderLds ? '(lds)' : '');
    }
    if (fields.repair) {
        const biased = fields.repairMustTurnBiased
            ? '(mustTurnBiased)'
            : fields.repairTurnBiased ? '(turnBiased)' : '';
        return 'dfs:repair:repair' + biased;
    }
    const bias = fields.orderingBiasId ? '/' + fields.orderingBiasId : '';
    if (fields.beamWidth) {
        return 'beam:' + fields.scoringProfileId + bias + '@beam' + fields.beamWidth
            + (fields.mechanicBucketRetention ? '(diverse)' : '');
    }
    return 'dfs:' + fields.scoringProfileId + bias;
}

/**
 * Every persisted spelling known to denote the same attempt identity. Search/discovery tools use
 * this rather than duplicating the historical compact grammar.
 * @param {string} key
 * @returns {readonly string[]}
 */
export function attemptIdentityTerms(key) {
    const fields = parseAttemptIdentityKey(key);
    return Object.freeze([...new Set([
        formatAttemptIdentityKey(fields),
        formatLegacyAttemptIdentityKey(fields),
    ])]);
}

/**
 * Stable scheduler/research action identity. Budget envelope and gate remain separate dimensions.
 * Repair seed 0 is explicit so omitted-zero and nonzero seeds cannot collapse.
 * @param {AttemptActionIdentityFields} fields
 * @returns {string}
 */
export function formatAttemptActionKey(fields) {
    if (!fields.stageId) throw new Error('formatAttemptActionKey requires stageId');
    const configKey = formatAttemptIdentityKey(fields);
    const seed = fields.repair
        ? '|seedSalt=' + (Number.isFinite(fields.seedSalt) ? Number(fields.seedSalt) : 0)
        : '';
    return fields.stageId + '|' + configKey + seed;
}

/**
 * Normalize a persisted composite stage+attempt action key. Historical evidence commonly stores
 * values such as "repair-probe|dfs:repair:repair|seedSalt=0"; normalize both identity components
 * before grouping or joining so mixed-era evidence cannot split one logical action.
 * @param {string} key
 * @returns {string}
 */
export function normalizeAttemptActionKey(key) {
    if (typeof key !== 'string' || key.length === 0)
        throw new Error('Attempt action identity must be a non-empty string.');
    const separator = key.indexOf('|');
    if (separator <= 0) throw new Error('Attempt action identity must contain a stage and config identity.');
    const stageId = normalizeSolverStageId(key.slice(0, separator));
    let configKey = key.slice(separator + 1);
    let seedSalt;
    const seedMatch = /\|seedSalt=(-?\d+)$/.exec(configKey);
    if (seedMatch) {
        seedSalt = Number(seedMatch[1]);
        configKey = configKey.slice(0, seedMatch.index);
    }
    const fields = parseAttemptIdentityKey(configKey);
    if (seedMatch && !fields.repair)
        throw new Error('seedSalt is only valid on repair attempt action identities.');
    return formatAttemptActionKey({ ...fields, stageId, ...(seedSalt === undefined ? {} : { seedSalt }) });
}

/**
 * Every stage/config spelling known to denote the same persisted action identity. The cross-product
 * is intentional: historical evidence can contain a legacy stage with a canonical config, the
 * reverse, or both legacy components.
 * @param {string} key
 * @returns {readonly string[]}
 */
export function attemptActionIdentityTerms(key) {
    const canonical = normalizeAttemptActionKey(key);
    const separator = canonical.indexOf('|');
    const stageId = canonical.slice(0, separator);
    let configAndSeed = canonical.slice(separator + 1);
    let seed = '';
    const seedMatch = /\|seedSalt=-?\d+$/.exec(configAndSeed);
    if (seedMatch) {
        seed = seedMatch[0];
        configAndSeed = configAndSeed.slice(0, seedMatch.index);
    }
    return Object.freeze([...new Set(
        solverStageIdentityTerms(stageId).flatMap(stage =>
            attemptIdentityTerms(configAndSeed).map(config => stage + '|' + config + seed)),
    )]);
}
