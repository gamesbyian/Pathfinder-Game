#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    exactPathSignature,
    joinSolvedRowsToHintDiscoveryProcesses,
    solvedDiscoveryProcess,
} from './hint-discovery-process-lib.mjs';

const solved = {
    id: 'P1',
    ok: true,
    status: 'success',
    solution: [1, 2, 3, 4],
    workSpent: 500,
    nodesExpanded: 100,
    elapsedMs: 25,
    attempts: [
        { ok: false, outcome: 'work-budget-reached', stageId: 'dfs', actionKey: 'dfs', workSpent: 100 },
        { ok: false, outcome: 'exhausted', stageId: 'beam', actionKey: 'beam', workSpent: 150 },
        { ok: true, outcome: 'solved', stageId: 'repair', actionKey: 'repair', workSpent: 250 },
        { ok: false, outcome: 'failed', stageId: 'unused-after-winner', actionKey: 'unused-after-winner' },
    ],
};

assert.equal(exactPathSignature([1, 2, 3]), '1,2,3');
assert.equal(exactPathSignature([]), null);

const process = solvedDiscoveryProcess(solved);
assert.equal(process.winnerIndex, 2);
assert.equal(process.precedingAttemptCount, 2);
assert.equal(process.precedingAttempts.length, 2);
assert.equal(process.winner.stageId, 'repair');
assert.equal(process.precedingAttempts.some(a => a.stageId === 'unused-after-winner'), false,
    'attempts after the winner are not part of the discovery process');

const noWinnerAttempt = solvedDiscoveryProcess({
    id: 'P2', ok: true, status: 'success', solution: [5, 6], attempts: [],
});
assert.equal(noWinnerAttempt.processCompleteness, 'solution-without-attempt-winner');

const joined = joinSolvedRowsToHintDiscoveryProcesses([
    solved,
    { ...solved, id: 'P2', solution: [9, 10], attempts: [{ ok: true, outcome: 'solved', stageId: 'dfs' }] },
], {
    resolveHints(parentId) {
        if (parentId === 'P1') return [
            { path: [1, 2, 3, 4], provenance: [] },
            { path: [1, 2, 5, 4], provenance: [] },
        ];
        return [{ path: [9, 11], provenance: [] }];
    },
});
assert.equal(joined.summary.solvedRowsWithPath, 2);
assert.equal(joined.summary.exactHintMatchedRows, 1);
assert.equal(joined.summary.unmatchedSolvedRows, 1);
assert.equal(joined.summary.rowsWithPrecedingFailures, 1);
assert.deepEqual(joined.joined[0].matchingHintIndices, [1]);

console.log('hint-discovery-process-lib-node-test: ok');
