/** Bounded, production-inert decision-observation helpers for solver research. */

const REQUIRED = ['decisionId', 'parentId', 'stageId', 'candidateIds', 'orderedCandidateIds',
    'retainedCandidateIds', 'workSpentBefore', 'workSpentAfter'];

function finiteNonNegative(value) {
    return Number.isFinite(value) && value >= 0;
}

const cloneJsonRecord = value => JSON.parse(JSON.stringify(value));

export function validateDecisionObservation(record) {
    for (const field of REQUIRED) if (!(field in record)) throw new Error(`decision observation missing ${field}`);
    for (const field of ['decisionId', 'parentId', 'stageId']) {
        if (typeof record[field] !== 'string' || !record[field]) throw new Error(`${field} must be a non-empty string`);
    }
    for (const field of ['candidateIds', 'orderedCandidateIds', 'retainedCandidateIds']) {
        if (!Array.isArray(record[field]) || record[field].some(value => typeof value !== 'string')) {
            throw new Error(`${field} must be a string array`);
        }
    }
    const candidates = new Set(record.candidateIds);
    if (candidates.size !== record.candidateIds.length) throw new Error('candidateIds contains duplicates');
    if (record.orderedCandidateIds.length !== candidates.size ||
        record.orderedCandidateIds.some(id => !candidates.has(id)) ||
        new Set(record.orderedCandidateIds).size !== record.orderedCandidateIds.length) {
        throw new Error('orderedCandidateIds must be a permutation of candidateIds');
    }
    if (record.retainedCandidateIds.some(id => !candidates.has(id)) ||
        new Set(record.retainedCandidateIds).size !== record.retainedCandidateIds.length) {
        throw new Error('retainedCandidateIds must be a unique subset of candidateIds');
    }
    if (!finiteNonNegative(record.workSpentBefore) || !finiteNonNegative(record.workSpentAfter) ||
        record.workSpentAfter < record.workSpentBefore) {
        throw new Error('workSpentBefore/workSpentAfter must be finite non-negative and monotone');
    }
    if ('observerCost' in record && record.observerCost != null && !finiteNonNegative(record.observerCost)) {
        throw new Error('observerCost must be null or a finite non-negative number');
    }
    if ('annotation' in record && record.annotation != null) {
        if (typeof record.annotation !== 'object' || Array.isArray(record.annotation)) throw new Error('annotation must be an object or null');
        if (!['SUPPORTED', 'UNKNOWN', 'UNSUPPORTED'].includes(record.annotation.support ?? 'SUPPORTED')) {
            throw new Error('annotation.support must be SUPPORTED, UNKNOWN, or UNSUPPORTED');
        }
    }
    return record;
}

export function createDecisionObservationCollector(limit = 4096) {
    if (!Number.isSafeInteger(limit) || limit <= 0) throw new Error('decision observation limit must be a positive integer');
    const records = [];
    let observed = 0;
    return Object.freeze({
        observe(record) {
            observed++;
            validateDecisionObservation(record);
            if (records.length < limit) records.push(cloneJsonRecord(record));
        },
        snapshot() {
            return {
                schemaVersion: 1,
                observed,
                retained: records.length,
                truncated: observed > records.length,
                records: cloneJsonRecord(records),
            };
        },
    });
}

export function summarizeDecisionObservations(snapshot) {
    const records = snapshot?.records ?? [];
    const parents = new Set(records.map(row => row.parentId));
    let cutoffBearing = 0;
    let supportedAnnotations = 0;
    let annotationDisagreements = 0;
    let observerCost = 0;
    for (const row of records) {
        const retained = new Set(row.retainedCandidateIds);
        if (row.retainedCandidateIds.length < row.candidateIds.length) cutoffBearing++;
        if (row.annotation?.support === 'SUPPORTED') {
            supportedAnnotations++;
            const preferred = row.annotation.preferredCandidateIds;
            if (Array.isArray(preferred) && preferred.some(id => row.candidateIds.includes(id) && !retained.has(id))) {
                annotationDisagreements++;
            }
        }
        if (Number.isFinite(row.observerCost)) observerCost += row.observerCost;
    }
    return {
        observed: snapshot?.observed ?? records.length,
        retained: records.length,
        truncated: !!snapshot?.truncated,
        independentParentsObserved: parents.size,
        cutoffBearingDecisions: cutoffBearing,
        supportedAnnotations,
        annotationDisagreements,
        totalObserverCost: observerCost,
    };
}


const CULL_STAGES = new Set(['score-width-culled', 'mechanic-bucket-culled', 'ints-bucket-culled']);

function pathIdentity(path) {
    return JSON.stringify(path);
}

/**
 * Convert the solver's existing research-only beam cull record into the shared decision shape.
 * Returns null for non-cull beam stages or legacy records without rankedPool context.
 */
export function beamResearchRecordToDecisionObservation(record, { parentId, decisionOrdinal = 0 } = {}) {
    if (!CULL_STAGES.has(record?.stage)) return null;
    const rankedPool = record.details?.rankedPool;
    const culled = record.details?.culled;
    if (!Array.isArray(rankedPool) || !Array.isArray(culled)) return null;
    const candidateIds = rankedPool.map(row => pathIdentity(row.path));
    const culledIds = new Set(culled.map(row => pathIdentity(row.path)));
    const retainedCandidateIds = candidateIds.filter(id => !culledIds.has(id));
    return validateDecisionObservation({
        decisionId: `${record.stage}@${record.depth}#${decisionOrdinal}`,
        parentId: String(parentId ?? 'UNKNOWN'),
        stageId: record.stage,
        candidateIds,
        orderedCandidateIds: [...candidateIds],
        retainedCandidateIds,
        workSpentBefore: Number(record.work ?? 0),
        workSpentAfter: Number(record.work ?? 0),
        context: {
            depth: record.depth,
            beamWidth: record.details?.beamWidth ?? null,
            cutoffScore: record.details?.cutoffScore ?? null,
            firstCulledScore: record.details?.firstCulledScore ?? null,
            stableOrderAdmission: record.details?.stableOrderAdmission ?? null,
        },
    });
}
