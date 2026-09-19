/**
 * Strict offline join between run-linked hint discovery-process evidence and compact failure
 * response documents.
 *
 * The default comparison requires parent + protocol + immutable solver ref. Runs may differ because
 * longitudinal/comparative use is the point. No exact-level history from this join is legal runtime
 * steering.
 */

function key(parentId, protocolHash, solverRef) {
    if (parentId == null || !protocolHash || !solverRef) return null;
    return JSON.stringify([String(parentId), String(protocolHash), String(solverRef)]);
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

    for (const document of failureDocuments ?? []) {
        for (const row of document?.records ?? []) {
            failureRecordsObserved += 1;
            const joinKey = key(row?.parentId ?? row?.levelId ?? row?.identity,
                failureProtocol(document, row), failureSolverRef(document, row));
            if (!joinKey) continue;
            const list = failuresByKey.get(joinKey) ?? [];
            list.push({
                identity: row.identity ?? null,
                parentId: row.parentId ?? row.levelId ?? row.identity ?? null,
                runId: row.runId ?? null,
                outcome: row.outcome ?? 'unknown',
                actionKey: row.actionKey ?? null,
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
    const matchedParents = new Set();

    for (const document of discoveryDocuments ?? []) {
        const run = document?.run ?? {};
        for (const discovery of document?.records ?? []) {
            discoveryRecordsObserved += 1;
            const joinKey = key(discovery?.parentId, run.protocolHash, run.solverRef);
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
            join: 'parent identity + exact protocol/configuration hash + immutable solver ref',
            runs: 'run IDs may differ; repeated runs remain dependent observations within one parent',
            independentUnit: 'parent level unless the owning experiment declares a stronger grouping',
            productionBoundary: 'offline evidence only; exact historical parent/path outcomes may not steer cold production solving',
        },
        summary: {
            discoveryRecordsObserved,
            failureRecordsObserved,
            joinedDiscoveryRecords: rows.length,
            discoveryRecordsWithoutComparableFailure,
            independentMatchedParents: matchedParents.size,
        },
        rows,
    };
}
