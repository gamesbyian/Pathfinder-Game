#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    projectKnownSupportExtinctionDocument,
    projectKnownSupportExtinctionRow,
} from './known-support-extinction-lib.mjs';

const row = {
    runId: 'run-1',
    solverRef: 'a'.repeat(40),
    levelId: 'P1',
    producer: 'beam',
    scoringProfileId: 'default',
    beamWidth: 100,
    nodeBudget: 100000,
    solved: false,
    behaviorIdentical: true,
    survival: {
        solutionLabels: 3,
        stages: [
            { stage: 'incoming-frontier', depth: 4, workSpent: 100, supportedCandidates: 2, supportedPaths: 3, supportedFamilies: 2 },
            { stage: 'score-width-culled', depth: 4, workSpent: 110, supportedCandidates: 1, supportedPaths: 1, supportedFamilies: 1 },
            { stage: 'post-score-width', depth: 4, workSpent: 110, supportedCandidates: 1, supportedPaths: 1, supportedFamilies: 1 },
            { stage: 'incoming-frontier', depth: 5, workSpent: 150, supportedCandidates: 1, supportedPaths: 1, supportedFamilies: 1 },
            { stage: 'score-width-culled', depth: 5, workSpent: 160, supportedCandidates: 1, supportedPaths: 1, supportedFamilies: 1 },
            { stage: 'post-score-width', depth: 5, workSpent: 160, supportedCandidates: 0, supportedPaths: 0, supportedFamilies: 0 },
        ],
        finalSupportLoss: { stage: 'post-score-width', depth: 5, lossCause: 'score-width-culled' },
        workAfterFinalKnownSupport: 50,
        correctnessAlarms: [],
    },
};

const projected = projectKnownSupportExtinctionRow(row);
assert.equal(projected.parentId, 'P1');
assert.equal(projected.lastKnownSupport.supportedFamilies, 1);
assert.equal(projected.finalKnownSupportLoss.cause, 'score-width-culled');
assert.equal(projected.finalKnownSupportLoss.supportedPathsBefore, 1);
assert.equal(projected.finalKnownSupportLoss.supportedFamiliesBefore, 1);
assert.equal(projected.workAfterFinalKnownSupport, 50);

const document = projectKnownSupportExtinctionDocument({
    runId: 'run-1',
    solverRef: 'a'.repeat(40),
    levelsFile: 'levels.json',
    familyDefinitionVersion: 'v1',
    levels: [
        row,
        { ...row, levelId: 'P2', solved: true, survival: {
            ...row.survival,
            finalSupportLoss: null,
            stages: [
                { stage: 'incoming-frontier', depth: 4, workSpent: 100, supportedCandidates: 3, supportedPaths: 4, supportedFamilies: 3 },
                { stage: 'post-score-width', depth: 4, workSpent: 110, supportedCandidates: 2, supportedPaths: 3, supportedFamilies: 2 },
            ],
        } },
    ],
});
assert.equal(document.summary.parents, 2);
assert.equal(document.summary.solvedControls, 1);
assert.equal(document.summary.parentsWithFinalKnownSupportLoss, 1);
assert.equal(document.summary.parentsWithMultipleKnownFamiliesAtLastSupport, 1);
assert.match(document.semantics.caution, /does not prove/u);

console.log('known-support-extinction-lib-node-test: ok');
