#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    analyzeFailureResponseNovelty,
    auditFailurePhenotypesAtFrontier,
    failureResponseParentPhenotypes,
    failureResponseRecordPhenotypeSignature,
} from './failure-response-novelty-lib.mjs';

const row = {
    identity: 'A',
    parentId: 'P1',
    runId: 'run-1',
    protocolHash: 'proto-1',
    solverRef: 'solver-1',
    outcome: 'workLimited',
    actionKey: 'beam',
    stageId: 'beam-main',
    configurationKey: 'cfg',
    workSpent: 100,
    attempts: [{ actionKey: 'beam', stageId: 'beam-main', outcome: 'work-limited', workSpent: 100 }],
};
const samePhenotypeDifferentDoseAndRun = {
    ...row,
    runId: 'run-2',
    workSpent: 900,
    nodesExpanded: 999999,
    attempts: [{ actionKey: 'beam', stageId: 'beam-main', outcome: 'work-limited', workSpent: 900 }],
};
assert.equal(
    failureResponseRecordPhenotypeSignature(row),
    failureResponseRecordPhenotypeSignature(samePhenotypeDifferentDoseAndRun),
    'dose/run variation must not manufacture a new categorical failure phenotype',
);

const differentOutcome = { ...row, outcome: 'exhaustedNegative' };
assert.notEqual(failureResponseRecordPhenotypeSignature(row), failureResponseRecordPhenotypeSignature(differentOutcome));

const doc1 = { records: [
    row,
    { ...row, identity: 'B', parentId: 'P2' },
] };
const doc2 = { records: [
    samePhenotypeDifferentDoseAndRun,
    { ...differentOutcome, identity: 'C', parentId: 'P3' },
] };
const doc3 = { records: [
    { ...differentOutcome, identity: 'D', parentId: 'P4' },
] };

const p1 = failureResponseParentPhenotypes(doc1);
assert.equal(p1.size, 2);
assert.equal(new Set(p1.values()).size, 1, 'two parents may share one phenotype');

const novelty = analyzeFailureResponseNovelty([doc1, doc2, doc3], { labels: ['old', 'middle', 'late'] });
assert.equal(novelty.totalDistinctPhenotypes, 2);
assert.equal(novelty.steps[0].newPhenotypes, 1);
assert.equal(novelty.steps[1].newPhenotypes, 1);
assert.equal(novelty.steps[2].newPhenotypes, 0);
assert.equal(novelty.steps[2].cumulativePhenotypes, 2);

const frontier = auditFailurePhenotypesAtFrontier([doc1, doc2, doc3], 2, { labels: ['old', 'middle', 'late'] });
assert.equal(frontier.targetLabel, 'late');
assert.equal(frontier.alreadyVisiblePhenotypes, 1);
assert.equal(frontier.firstVisibleAtTargetPhenotypes, 0);
assert.equal(frontier.parentsWhosePhenotypeWasAlreadyVisible, 1);

console.log('failure-response-novelty-lib-node-test: ok');
