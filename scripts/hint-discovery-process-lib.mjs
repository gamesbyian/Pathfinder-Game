/**
 * Reconstruct the process surrounding a successful hint discovery from solver result rows that
 * retain both the exact winning solution path and the invocation's attempt sequence.
 *
 * This is a derived offline join. It does not mutate hint provenance and it refuses heuristic
 * matching: a row binds to a stored hint only when the complete solution path is exactly equal.
 */
import { compactFailureAttempt } from './solver-failure-response-lib.mjs';

function validPath(path) {
    return Array.isArray(path) && path.length > 0 && path.every(Number.isSafeInteger);
}

export function exactPathSignature(path) {
    if (!validPath(path)) return null;
    return path.join(',');
}

function solvedAttempt(attempt) {
    return attempt?.ok === true || attempt?.outcome === 'solved' || attempt?.status === 'success';
}

function rowParentId(row) {
    return row?.parentId ?? row?.levelId ?? row?.id ?? row?.level ?? null;
}

function winnerIndexOf(row) {
    const attempts = Array.isArray(row?.attempts) ? row.attempts : [];
    const index = attempts.findIndex(solvedAttempt);
    return index >= 0 ? index : null;
}

/**
 * Summarize one solved invocation as a discovery process. Attempts after the winner are excluded
 * because they did not participate in producing the winning path.
 */
export function solvedDiscoveryProcess(row) {
    if (!(row?.ok === true || row?.status === 'success')) return null;
    if (!validPath(row?.solution)) return null;

    const attempts = Array.isArray(row?.attempts) ? row.attempts : [];
    const winnerIndex = winnerIndexOf(row);
    if (winnerIndex === null) {
        return {
            parentId: rowParentId(row),
            solutionSignature: exactPathSignature(row.solution),
            winnerIndex: null,
            precedingAttemptCount: null,
            precedingAttempts: null,
            winner: null,
            cumulativeWorkSpent: Number.isFinite(row?.workSpent) ? row.workSpent : null,
            cumulativeNodesExpanded: Number.isFinite(row?.nodesExpanded) ? row.nodesExpanded : null,
            cumulativeElapsedMs: Number.isFinite(row?.elapsedMs ?? row?.totalMs) ? (row.elapsedMs ?? row.totalMs) : null,
            processCompleteness: 'solution-without-attempt-winner',
        };
    }

    const relevant = attempts.slice(0, winnerIndex + 1);
    return {
        parentId: rowParentId(row),
        solutionSignature: exactPathSignature(row.solution),
        winnerIndex,
        precedingAttemptCount: winnerIndex,
        precedingAttempts: relevant.slice(0, winnerIndex).map(compactFailureAttempt),
        winner: compactFailureAttempt(relevant[winnerIndex]),
        cumulativeWorkSpent: Number.isFinite(row?.workSpent) ? row.workSpent : null,
        cumulativeNodesExpanded: Number.isFinite(row?.nodesExpanded) ? row.nodesExpanded : null,
        cumulativeElapsedMs: Number.isFinite(row?.elapsedMs ?? row?.totalMs) ? (row.elapsedMs ?? row.totalMs) : null,
        processCompleteness: 'attempt-sequence-through-winner',
    };
}

/**
 * Join solved rows to stored hint records by exact complete path.
 *
 * resolveHints(parentId, row) must return canonical Hint[] for that parent.
 */
export function joinSolvedRowsToHintDiscoveryProcesses(rows, { resolveHints }) {
    if (typeof resolveHints !== 'function') throw new Error('resolveHints is required');

    const joined = [];
    const unmatched = [];
    let solvedRowsWithPath = 0;
    let solvedRowsWithoutWinnerAttempt = 0;
    let rowsWithPrecedingFailures = 0;

    for (const [rowIndex, row] of (rows ?? []).entries()) {
        const process = solvedDiscoveryProcess(row);
        if (!process) continue;
        solvedRowsWithPath += 1;
        if (process.winnerIndex === null) solvedRowsWithoutWinnerAttempt += 1;
        if ((process.precedingAttemptCount ?? 0) > 0) rowsWithPrecedingFailures += 1;

        const hints = resolveHints(process.parentId, row) ?? [];
        const matchingHintIndices = [];
        for (const [hintIndex, hint] of hints.entries()) {
            if (exactPathSignature(hint?.path) === process.solutionSignature) matchingHintIndices.push(hintIndex + 1);
        }

        const base = {
            rowIndex,
            parentId: process.parentId,
            solutionSignature: process.solutionSignature,
            matchingHintIndices,
            exactHintMatchCount: matchingHintIndices.length,
            process,
        };
        if (matchingHintIndices.length > 0) joined.push(base);
        else unmatched.push(base);
    }

    return {
        summary: {
            solvedRowsWithPath,
            exactHintMatchedRows: joined.length,
            unmatchedSolvedRows: unmatched.length,
            solvedRowsWithoutWinnerAttempt,
            rowsWithPrecedingFailures,
        },
        joined,
        unmatched,
    };
}
