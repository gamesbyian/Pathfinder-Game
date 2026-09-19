import assert from 'node:assert/strict';

import {
    compactFailureResponseRow,
    summarizeFailureResponse,
} from './solver-failure-response-lib.mjs';

// --- compactFailureResponseRow ---

const cellRow = {
    cellId: 'corpus2/000042/T1/beam', ok: false, status: 'node-budget-reached',
    nodesExpanded: 4200, nodeBudget: 50000000, workSpent: null, techniqueKeys: ['beam'],
};
const compactCell = compactFailureResponseRow(cellRow);
assert.equal(compactCell.identity, 'corpus2/000042/T1/beam');
assert.equal(compactCell.outcome, 'nodeLimited');
assert.equal(compactCell.actionKey, 'beam');
assert.equal(compactCell.nodeCeiling, 50000000);
assert.equal(compactCell.nodesExpanded, 4200);
assert.equal(compactCell.workSpent, null, 'a field the row does not report stays null, never a fabricated 0');
assert.equal(compactCell.refereeInvalid, null, 'absence of referee evidence stays unknown');

const refereeInvalidRow = { cellId: 'x', ok: false, status: 'referee-invalid' };
assert.equal(compactFailureResponseRow(refereeInvalidRow).refereeInvalid, true);
assert.equal(compactFailureResponseRow({ ...refereeInvalidRow, status: 'exhausted' }).refereeInvalid, null);

const solvedWithFailure = {
    id: 'R00001', ok: true, workSpent: 900,
    attempts: [{ ok: false, outcome: 'error' }, { ok: true, outcome: 'solved' }],
};
assert.equal(compactFailureResponseRow(solvedWithFailure).solvedWithFailedAttempt, true,
    'a failed attempt inside an eventually-solved parent must remain visible');
assert.equal(compactFailureResponseRow({ ...solvedWithFailure, attempts: [{ ok: true }] }).solvedWithFailedAttempt, false);
assert.equal(compactFailureResponseRow({ id: 'R00002', ok: false }).solvedWithFailedAttempt, null,
    'the field is only meaningful for a solved row; an unsolved row reports unknown, not false');

const badnessRow = { id: 'R00003', ok: false, status: 'exhausted', bestBadness: 3.5, finalBadness: 3.5 };
const compactBadness = compactFailureResponseRow(badnessRow);
assert.equal(compactBadness.bestBadness, 3.5);
assert.equal(compactBadness.finalBadness, 3.5);
assert.equal(compactBadness.outcome, 'exhaustedNegative');

// --- summarizeFailureResponse: solved and unsolved parents together ---

const mixedRows = [
    { id: 'A', ok: true, workSpent: 100, nodesExpanded: 10 },
    { id: 'B', ok: false, status: 'node-budget-reached', workSpent: 500, nodesExpanded: 999 },
    { id: 'C', ok: false, status: 'work-budget-reached', workSpent: 700 },
    { id: 'D', ok: false, status: 'deadline-truncated' },
    { id: 'E', ok: false, status: 'error', error: 'boom' },
    { id: 'F', ok: false, status: 'referee-invalid' },
    { id: 'G', ok: true, attempts: [{ ok: false, outcome: 'error' }, { ok: true }] },
];
const summary = summarizeFailureResponse(mixedRows);
assert.equal(summary.schemaVersion, 1);
assert.equal(summary.observed, 7);
assert.equal(summary.outcomes.solved, 2, 'solved and unsolved parents are both represented in one summary');
assert.equal(summary.outcomes.nodeLimited, 1);
assert.equal(summary.outcomes.workLimited, 1);
assert.equal(summary.outcomes.deadlineTruncated, 1);
assert.equal(summary.refereeInvalid, 1);
assert.equal(summary.solvedParentsWithFailedAttempts, 1, 'a failed attempt before a later winner is retained at the aggregate level too');
assert.equal(summary.work.totalWorkSpent, 1300);
assert.equal(summary.work.rowsWithWork, 3);
assert.equal(summary.nodes.totalNodesExpanded, 1009);
assert.equal(summary.selfDerivedPopulation, true);
assert.equal(summary.coverageComplete, null, 'a self-derived population never claims coverage is complete');

// --- reusing an externally supplied populationIntegrity ---

const externalIntegrity = {
    outcomes: { solved: 1, exhaustedNegative: 0, nodeLimited: 0, workLimited: 0, deadlineTruncated: 0, harnessError: 0, malformed: 0, missing: 0, unknown: 0 },
    coverageComplete: true,
    decisionValidComplete: true,
};
const externalSummary = summarizeFailureResponse([{ id: 'A', ok: true, workSpent: 5 }], { populationIntegrity: externalIntegrity });
assert.equal(externalSummary.selfDerivedPopulation, false);
assert.equal(externalSummary.coverageComplete, true, 'a caller-supplied, externally verified population integrity is trusted as-is');
assert.deepEqual(externalSummary.outcomes, externalIntegrity.outcomes);

// --- unsupported/missing fields remain unknown, never a synthesized zero ---

const emptyRow = { id: 'Z' };
const compactEmpty = compactFailureResponseRow(emptyRow);
for (const field of ['nodeCeiling', 'nodesExpanded', 'workCeiling', 'workSpent', 'bestBadness', 'finalBadness', 'deadlineTruncated', 'error']) {
    assert.equal(compactEmpty[field], null, `${field} must stay null when the row does not report it`);
}
assert.equal(compactEmpty.attemptCount, null, 'an absent attempt array stays unknown');
assert.equal(compactEmpty.attempts, null);
assert.equal(compactFailureResponseRow({ id: 'known-empty', attempts: [] }).attemptCount, 0, 'a present empty attempt array is a known zero');

const identityRow = compactFailureResponseRow({ cellId: 'cell-A', levelId: 'L1', protocolHash: 'proto-1', solverRef: 'abc123', attempts: [{ outcome: 'exhausted', configKey: 'dfs', gateKey: 7 }] });
assert.equal(identityRow.identity, 'cell-A');
assert.equal(identityRow.parentId, 'L1');
assert.equal(identityRow.cellId, 'cell-A');
assert.equal(identityRow.protocolHash, 'proto-1');
assert.equal(identityRow.solverRef, 'abc123');
assert.equal(identityRow.attempts[0].outcome, 'exhausted');

console.log('solver failure response lib tests passed');
