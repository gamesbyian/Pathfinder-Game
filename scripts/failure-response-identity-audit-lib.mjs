import { failureResponseIdentityView } from './solver-failure-response-lib.mjs';

/**
 * Integrity audit for compact failure-response identity granularity.
 *
 * This intentionally does not redefine the persisted schema. It asks the same kind of question that
 * proved useful for hint provenance: does one supposedly comparable semantic observation key map to
 * multiple incompatible payloads? A collision is a schema/producer investigation lead, not proof of
 * corruption; some producers may intentionally emit repeated observations.
 */

function stable(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
}

function documentProtocol(document, row) {
    return row?.protocolHash ?? document?.protocolHash ?? null;
}

function documentSolver(document, row) {
    return row?.solverRef ?? document?.solverRef ?? null;
}

export function failureResponseObservationKey(document, row) {
    const identity = failureResponseIdentityView(row);
    return stable({
        protocolHash: documentProtocol(document, row),
        solverRef: documentSolver(document, row),
        runId: row?.runId ?? null,
        identity: row?.identity ?? null,
        parentId: row?.parentId ?? null,
        cellId: row?.cellId ?? null,
        actionKey: identity.actionKey ?? null,
        stageId: row?.stageId ?? null,
        configurationKey: identity.configurationKey ?? null,
    });
}

function rowPayloadFingerprint(row) {
    return stable({
        outcome: row?.outcome ?? null,
        participated: row?.participated ?? null,
        reached: row?.reached ?? null,
        exhausted: row?.exhausted ?? null,
        nodeCapped: row?.nodeCapped ?? null,
        workCapped: row?.workCapped ?? null,
        nodeCeiling: row?.nodeCeiling ?? null,
        nodesExpanded: row?.nodesExpanded ?? null,
        workCeiling: row?.workCeiling ?? null,
        workSpent: row?.workSpent ?? null,
        bestBadness: row?.bestBadness ?? null,
        finalBadness: row?.finalBadness ?? null,
        deadlineTruncated: row?.deadlineTruncated ?? null,
        refereeInvalid: row?.refereeInvalid ?? null,
        solvedWithFailedAttempt: row?.solvedWithFailedAttempt ?? null,
        attempts: row?.attempts ?? null,
    });
}

export function auditFailureResponseIdentity(documents) {
    const groups = new Map();
    let records = 0;

    for (const [documentIndex, document] of (documents ?? []).entries()) {
        for (const [recordIndex, row] of (document?.records ?? []).entries()) {
            records += 1;
            const key = failureResponseObservationKey(document, row);
            const payload = rowPayloadFingerprint(row);
            const group = groups.get(key) ?? { key, observations: [], payloads: new Set() };
            group.payloads.add(payload);
            if (group.observations.length < 12) {
                group.observations.push({
                    documentIndex,
                    recordIndex,
                    identity: row?.identity ?? null,
                    parentId: row?.parentId ?? null,
                    runId: row?.runId ?? null,
                    outcome: row?.outcome ?? null,
                });
            }
            groups.set(key, group);
        }
    }

    const repeated = [...groups.values()].filter(group => group.observations.length > 1 || group.payloads.size > 1);
    const conflicting = repeated.filter(group => group.payloads.size > 1);
    const exactRepeats = repeated.filter(group => group.payloads.size === 1);

    return {
        records,
        semanticKeys: groups.size,
        repeatedKeys: repeated.length,
        exactRepeatKeys: exactRepeats.length,
        conflictingKeys: conflicting.length,
        collisions: conflicting.map(group => ({
            key: group.key,
            distinctPayloads: group.payloads.size,
            observations: group.observations,
            observationPreviewTruncated: group.observations.length >= 12,
        })),
    };
}
