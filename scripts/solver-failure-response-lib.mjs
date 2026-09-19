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
    return Array.isArray(row?.compactAttempts) ? row.compactAttempts
        : (Array.isArray(row?.attempts) ? row.attempts : null);
}

function optionalBoolean(value) {
    return typeof value === 'boolean' ? value : null;
}

function attemptOutcome(attempt) {
    if (attempt?.ok === true || attempt?.outcome === 'solved' || attempt?.status === 'success') return 'solved';
    if (attempt?.outcome === 'timed-out' || attempt?.timedOut === true || attempt?.deadlineTruncated === true) return 'deadline-truncated';
    if (attempt?.outcome === 'error' || attempt?.status === 'error' || attempt?.error != null) return 'error';
    if (attempt?.outcome === 'node-budget-reached' || attempt?.status === 'node-budget-reached' || attempt?.nodeBudgetReached === true) return 'node-limited';
    if (attempt?.outcome === 'work-budget-reached' || attempt?.status === 'work-budget-reached' || attempt?.workBudgetReached === true) return 'work-limited';
    if (attempt?.outcome === 'exhausted' || attempt?.status === 'exhausted') return 'exhausted';
    if (attempt?.ok === false || attempt?.outcome === 'failed') return 'failed';
    return 'unknown';
}

/** Small attempt projection safe to retain automatically; it deliberately excludes paths/state. */
export function compactFailureAttempt(attempt) {
    const record = {
        stageId: attempt?.stageId ?? null,
        actionKey: attempt?.actionKey ?? attempt?.techniqueKey ?? null,
        configKey: attempt?.configKey ?? attempt?.configurationKey ?? null,
        gateKey: attempt?.gateKey ?? null,
        outcome: attemptOutcome(attempt),
        nodeCeiling: finite(attempt?.allocatedNodeCeiling) ?? finite(attempt?.nodeBudget),
        workCeiling: finite(attempt?.allocatedWorkCeiling) ?? finite(attempt?.workBudget),
        nodesExpanded: finite(attempt?.nodesExpanded),
        workSpent: finite(attempt?.workSpent),
        bestBadness: finite(attempt?.bestBadness),
        finalBadness: finite(attempt?.finalBadness),
        timedOut: optionalBoolean(attempt?.timedOut ?? (attempt?.outcome === 'timed-out' ? true : undefined)),
        deadlineTruncated: optionalBoolean(attempt?.deadlineTruncated),
    };
    // Stable mechanism flags already produced by solver attempts. Missing remains missing.
    for (const key of ['repair', 'repairProbe', 'admissibleOrder', 'beam', 'nodeBudgetReached', 'workBudgetReached']) {
        const value = optionalBoolean(attempt?.[key]);
        if (value !== null) record[key] = value;
    }
    return record;
}

function rowHasRefereeInvalid(row) {
    if (typeof row?.refereeValid === 'boolean') return !row.refereeValid;
    if (/referee[-_ ]?invalid/u.test(String(row?.status ?? ''))) return true;
    return null;
}

/** Whether an eventually-solved parent contained at least one failed attempt on the way there. */
function solvedWithFailedAttempt(row) {
    if (row?.ok !== true) return false;
    return (rowAttempts(row) ?? []).some(attempt => ['failed', 'error', 'deadline-truncated', 'node-limited', 'work-limited', 'exhausted'].includes(attemptOutcome(attempt)));
}

/**
 * Projects one producer-native row into the standard compact field set. `null` means the row does
 * not report that field, never a fabricated 0/false.
 */
export function compactFailureResponseRow(row) {
    const techniqueKeys = Array.isArray(row?.techniqueKeys) ? row.techniqueKeys.join('+') : null;
    const attempts = rowAttempts(row);
    const status = typeof row?.status === 'string' ? row.status : null;
    return {
        identity: rowIdentity(row) != null ? String(rowIdentity(row)) : null,
        parentId: row?.parentId ?? row?.levelId ?? row?.id ?? row?.level ?? null,
        cellId: row?.cellId ?? null,
        levelId: row?.levelId ?? row?.id ?? row?.level ?? null,
        producer: row?.producer ?? null,
        runId: row?.runId ?? null,
        protocolHash: row?.protocolHash ?? row?.protocol?.hash ?? null,
        solverRef: row?.solverRef ?? row?.solverCommit ?? row?.commitSha ?? null,
        configurationKey: row?.configurationKey ?? row?.configKey ?? null,
        actionKey: row?.winningConfig ?? row?.winningConfigKey ?? row?.actionKey ?? techniqueKeys ?? null,
        stageId: row?.stageId ?? row?.winningStage ?? null,
        outcome: classifyRow(row),
        refereeInvalid: rowHasRefereeInvalid(row),
        participated: typeof row?.participated === 'boolean' ? row.participated
            : (attempts ? attempts.length > 0 : null),
        reached: typeof row?.reached === 'boolean' ? row.reached : null,
        exhausted: status === 'exhausted' ? true : null,
        nodeCapped: status === 'node-budget-reached' || row?.nodeBudgetReached === true ? true : null,
        workCapped: status === 'work-budget-reached' || row?.workBudgetReached === true ? true : null,
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
            : (attempts ? attempts.length : null),
        attempts: attempts?.map(compactFailureAttempt) ?? null,
    };
}

export function createFailureResponseDocument(rows, { populationIntegrity = null, sourceFiles = [], missingSourceFiles = [], invalidSourceFiles = [] } = {}) {
    const records = (Array.isArray(rows) ? rows : []).map(compactFailureResponseRow);
    return {
        schemaVersion: FAILURE_RESPONSE_SCHEMA_VERSION,
        kind: FAILURE_RESPONSE_KIND,
        records,
        summary: summarizeFailureResponse(rows, { populationIntegrity }),
        populationIntegrity,
        sourceFiles,
        missingSourceFiles,
        invalidSourceFiles,
    };
}

export function validateFailureResponseDocument(document) {
    const issues = [];
    if (!document || typeof document !== 'object' || Array.isArray(document)) issues.push('document');
    else {
        if (document.schemaVersion !== FAILURE_RESPONSE_SCHEMA_VERSION) issues.push('schemaVersion');
        if (document.kind !== FAILURE_RESPONSE_KIND) issues.push('kind');
        if (!Array.isArray(document.records)) issues.push('records');
        else document.records.forEach((row, index) => {
            if (!row || typeof row !== 'object' || Array.isArray(row)) issues.push(`records[${index}]`);
            else {
                if (typeof row.identity !== 'string' || row.identity.length === 0) issues.push(`records[${index}].identity`);
                if (!['solved', 'exhaustedNegative', 'nodeLimited', 'workLimited', 'deadlineTruncated', 'harnessError', 'malformed', 'missing', 'unknown'].includes(row.outcome)) issues.push(`records[${index}].outcome`);
                if (!(row.attempts === null || Array.isArray(row.attempts))) issues.push(`records[${index}].attempts`);
                for (const [attemptIndex, attempt] of (row.attempts ?? []).entries()) {
                    if (!attempt || typeof attempt !== 'object' || !['solved', 'deadline-truncated', 'error', 'node-limited', 'work-limited', 'exhausted', 'failed', 'unknown'].includes(attempt.outcome)) {
                        issues.push(`records[${index}].attempts[${attemptIndex}]`);
                    }
                }
            }
        });
        if (!Array.isArray(document.sourceFiles)) issues.push('sourceFiles');
        if (!Array.isArray(document.missingSourceFiles)) issues.push('missingSourceFiles');
        if (!Array.isArray(document.invalidSourceFiles)) issues.push('invalidSourceFiles');
        if (!document.summary || typeof document.summary !== 'object') issues.push('summary');
        else if (document.summary.observed !== document.records?.length) issues.push('summary.observed');
    }
    if (issues.length) throw new Error(`invalid compact failure-response document: ${issues.join(', ')}`);
    return document;
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
        if (rowHasRefereeInvalid(row) === true) refereeInvalid += 1;
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
