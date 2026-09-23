import { failureResponseIdentityView } from './solver-failure-response-lib.mjs';

/**
 * Strict offline join between run-linked hint discovery-process evidence and compact failure
 * response documents.
 *
 * The default comparison requires parent + protocol + immutable solver ref. Runs may differ because
 * longitudinal/comparative use is the point. No exact-level history from this join is legal runtime
 * steering.
 */

function key(populationIdentity, parentId, protocolHash, solverRef) {
    if (!populationIdentity || parentId == null || !protocolHash || !solverRef) return null;
    return JSON.stringify([
        String(populationIdentity), String(parentId), String(protocolHash), String(solverRef),
    ]);
}

function failurePopulationIdentity(document) {
    return document?.populationIntegrity?.populationIdentityHash
        ?? document?.populationIdentityHash
        ?? null;
}

function ambiguousScopedParentIds(document) {
    const canonical = document?.populationIntegrity?.canonicalExpectedIds;
    if (!Array.isArray(canonical)) return new Set();
    const counts = new Map();
    for (const encoded of canonical) {
        try {
            const tuple = JSON.parse(encoded);
            if (!Array.isArray(tuple) || tuple.length !== 2) continue;
            const parentId = String(tuple[1]);
            counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
        } catch {
            // Legacy/unscoped identity encoding cannot prove cross-scope ambiguity.
        }
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id));
}

function failureProtocol(document, row) {
    return row?.protocolHash ?? document?.protocolHash ?? null;
}

function failureSolverRef(document, row) {
    return row?.solverRef ?? document?.solverRef ?? null;
}

export function joinHintDiscoveryAndFailureProcesses(discoveryDocuments, failureDocuments) {
    const failuresByKey = new Map();
    let failureRecordsObserved = 0;
    let ambiguousFailureRecords = 0;
    let failureRecordsMissingComparabilityIdentity = 0;

    for (const document of failureDocuments ?? []) {
        const populationIdentity = failurePopulationIdentity(document);
        const ambiguousParents = ambiguousScopedParentIds(document);
        for (const row of document?.records ?? []) {
            failureRecordsObserved += 1;
            const identity = failureResponseIdentityView(row);
            const parentId = row?.parentId ?? row?.levelId ?? row?.identity;
            if (parentId != null && ambiguousParents.has(String(parentId))) {
                ambiguousFailureRecords += 1;
                continue;
            }
            const joinKey = key(populationIdentity, parentId,
                failureProtocol(document, row), failureSolverRef(document, row));
            if (!joinKey) {
                failureRecordsMissingComparabilityIdentity += 1;
                continue;
            }
            const list = failuresByKey.get(joinKey) ?? [];
            list.push({
                identity: row.identity ?? null,
                parentId: row.parentId ?? row.levelId ?? row.identity ?? null,
                runId: row.runId ?? null,
                outcome: row.outcome ?? 'unknown',
                configurationKey: identity.configurationKey ?? null,
                actionKey: identity.actionKey ?? null,
                stageId: row.stageId ?? null,
                participated: row.participated ?? null,
                reached: row.reached ?? null,
                workSpent: row.workSpent ?? null,
                nodesExpanded: row.nodesExpanded ?? null,
                solvedWithFailedAttempt: row.solvedWithFailedAttempt ?? null,
            });
            failuresByKey.set(joinKey, list);
        }
    }

    const rows = [];
    let discoveryRecordsObserved = 0;
    let discoveryRecordsWithoutComparableFailure = 0;
    let discoveryRecordsMissingPopulationIdentity = 0;
    let discoveryRecordsMissingComparabilityIdentity = 0;
    const matchedParents = new Set();

    for (const document of discoveryDocuments ?? []) {
        const run = document?.run ?? {};
        for (const discovery of document?.records ?? []) {
            discoveryRecordsObserved += 1;
            if (!run.populationIdentity) discoveryRecordsMissingPopulationIdentity += 1;
            const joinKey = key(run.populationIdentity, discovery?.parentId, run.protocolHash, run.solverRef);
            if (!joinKey) discoveryRecordsMissingComparabilityIdentity += 1;
            const failures = joinKey ? (failuresByKey.get(joinKey) ?? []) : [];
            if (!failures.length) {
                discoveryRecordsWithoutComparableFailure += 1;
                continue;
            }
            matchedParents.add(String(discovery.parentId));
            rows.push({
                parentId: discovery.parentId,
                solutionSignature: discovery.solutionSignature,
                discoveryEvidenceId: discovery.evidenceId ?? null,
                discoveryRunId: run.runId ?? null,
                populationIdentity: run.populationIdentity ?? null,
                protocolHash: run.protocolHash ?? null,
                solverRef: run.solverRef ?? null,
                winner: discovery?.process?.winner ?? null,
                precedingAttempts: discovery?.process?.precedingAttempts ?? null,
                precedingAttemptCount: discovery?.process?.precedingAttemptCount ?? null,
                comparableFailureRecords: failures,
            });
        }
    }

    return {
        schemaVersion: 1,
        kind: 'pathfinder-hint-failure-process-join',
        semantics: {
            join: 'exact population identity + parent identity + exact protocol/configuration hash + immutable solver ref',
            runs: 'run IDs may differ; repeated runs remain dependent observations within one parent',
            independentUnit: 'parent level unless the owning experiment declares a stronger grouping',
            productionBoundary: 'offline evidence only; exact historical parent/path outcomes may not steer cold production solving',
        },
        summary: {
            discoveryRecordsObserved,
            failureRecordsObserved,
            ambiguousFailureRecords,
            failureRecordsMissingComparabilityIdentity,
            joinedDiscoveryRecords: rows.length,
            discoveryRecordsWithoutComparableFailure,
            discoveryRecordsMissingPopulationIdentity,
            discoveryRecordsMissingComparabilityIdentity,
            independentMatchedParents: matchedParents.size,
        },
        rows,
    };
}
