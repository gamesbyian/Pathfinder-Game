/**
 * Shared, cross-producer "compact failure-response" projection
 * (docs/solver-search-loss-evidence-implementation-plan.md Phase 3).
 *
 * This wraps solver-experiment-contract.mjs's existing classifyRow/buildPopulationIntegrity outcome
 * taxonomy rather than reinventing it, and adds the standard fields that taxonomy does not already
 * carry on its own: explicit referee-invalid visibility, canonical work/node accounting, best/final
 * badness participation, and solved-parent-with-failed-attempt visibility. It intentionally does not
 * synthesize false/zero for a field a row does not report, and it does not require full attempts[]
 * retention -- it works from whatever rows a producer already keeps (a technique-census cell, a
 * stress-refresh/benchmark level row, or any other row classifyRow already understands).
 */
import { buildPopulationIntegrity, classifyRow } from './solver-experiment-contract.mjs';

export const FAILURE_RESPONSE_SCHEMA_VERSION = 1;
export const FAILURE_RESPONSE_KIND = 'pathfinder-compact-failure-response';

function finite(value) {
    return Number.isFinite(value) ? value : null;
}

function rowIdentity(row) {
    return row?.id ?? row?.cellId ?? row?.levelId ?? row?.level ?? null;
}

function rowAttempts(row) {
    return Array.isArray(row?.attempts) ? row.attempts : [];
}

function rowHasRefereeInvalid(row) {
    if (row?.refereeValid === false) return true;
    return /referee[-_ ]?invalid/u.test(String(row?.status ?? ''));
}

/** Whether an eventually-solved parent contained at least one failed attempt on the way there. */
function solvedWithFailedAttempt(row) {
    if (row?.ok !== true) return false;
    return rowAttempts(row).some(attempt => attempt?.ok === false || attempt?.outcome === 'error');
}

/**
 * Projects one producer-native row into the standard compact field set. `null` means the row does
 * not report that field, never a fabricated 0/false.
 */
export function compactFailureResponseRow(row) {
    const techniqueKeys = Array.isArray(row?.techniqueKeys) ? row.techniqueKeys.join('+') : null;
    return {
        identity: rowIdentity(row) != null ? String(rowIdentity(row)) : null,
        actionKey: row?.winningConfig ?? row?.actionKey ?? techniqueKeys ?? null,
        outcome: classifyRow(row),
        refereeInvalid: rowHasRefereeInvalid(row),
        nodeCeiling: finite(row?.nodeBudget) ?? finite(row?.allocatedNodeCeiling),
        nodesExpanded: finite(row?.nodesExpanded),
        workCeiling: finite(row?.workBudget) ?? finite(row?.allocatedWorkCeiling),
        workSpent: finite(row?.workSpent),
        bestBadness: finite(row?.bestBadness),
        finalBadness: finite(row?.finalBadness),
        deadlineTruncated: row?.deadlineTruncated === true || row?.timedOut === true ? true
            : (row?.deadlineTruncated === false ? false : null),
        error: row?.error ?? null,
        solvedWithFailedAttempt: row?.ok === true ? solvedWithFailedAttempt(row) : null,
        attemptCount: Number.isSafeInteger(row?.attemptCount) ? row.attemptCount
            : (rowAttempts(row).length || null),
    };
}

/**
 * Aggregate compact failure-response summary over an already-collected row array (e.g. a combined
 * technique-census cell list or a combined stress-refresh levels[] array).
 *
 * Pass the caller's own already-computed `populationIntegrity` (from buildPopulationIntegrity) when
 * one exists, so this never disagrees with the coverage view already published alongside it. Without
 * one, a population is self-derived from the observed rows and `coverageComplete`/
 * `decisionValidComplete` are reported as `null` (unknown), never a false "complete" -- an
 * externally-unverified row set proves nothing about whether every intended attempt is present.
 */
export function summarizeFailureResponse(rows, { populationIntegrity = null } = {}) {
    const list = Array.isArray(rows) ? rows : [];
    let integrity = populationIntegrity;
    let selfDerivedPopulation = false;
    if (!integrity) {
        const identities = list.map(rowIdentity).filter(id => id != null).map(String);
        integrity = { ...buildPopulationIntegrity(identities, list), coverageComplete: null, decisionValidComplete: null };
        selfDerivedPopulation = true;
    }

    let refereeInvalid = 0;
    let solvedParentsWithFailedAttempts = 0;
    let totalWorkSpent = 0;
    let rowsWithWork = 0;
    let totalNodesExpanded = 0;
    let rowsWithNodes = 0;
    let rowsWithBestBadness = 0;
    let rowsWithFinalBadness = 0;
    for (const row of list) {
        if (rowHasRefereeInvalid(row)) refereeInvalid += 1;
        if (solvedWithFailedAttempt(row)) solvedParentsWithFailedAttempts += 1;
        if (Number.isFinite(row?.workSpent)) { totalWorkSpent += row.workSpent; rowsWithWork += 1; }
        if (Number.isFinite(row?.nodesExpanded)) { totalNodesExpanded += row.nodesExpanded; rowsWithNodes += 1; }
        if (Number.isFinite(row?.bestBadness)) rowsWithBestBadness += 1;
        if (Number.isFinite(row?.finalBadness)) rowsWithFinalBadness += 1;
    }

    return {
        schemaVersion: FAILURE_RESPONSE_SCHEMA_VERSION,
        kind: FAILURE_RESPONSE_KIND,
        observed: list.length,
        selfDerivedPopulation,
        coverageComplete: integrity.coverageComplete ?? null,
        outcomes: integrity.outcomes,
        refereeInvalid,
        solvedParentsWithFailedAttempts,
        work: { totalWorkSpent, rowsWithWork },
        nodes: { totalNodesExpanded, rowsWithNodes },
        badness: { rowsWithBestBadness, rowsWithFinalBadness },
    };
}
