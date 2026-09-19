import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'failure-response-query-'));
try {
    const doc1 = path.join(temp, 'a.json');
    const doc2 = path.join(temp, 'b.json');
    fs.writeFileSync(doc1, JSON.stringify({
        schemaVersion: 1,
        kind: 'pathfinder-compact-failure-response',
        records: [
            {
                identity: 'A:beam', parentId: 'A', actionKey: 'beam', stageId: 'main',
                outcome: 'solved', participated: true, reached: true, workSpent: 10, nodesExpanded: 100, bestBadness: 4, finalBadness: 2,
                solvedWithFailedAttempt: true, runId: 'r1', protocolHash: null, solverRef: null,
                attempts: [{ outcome: 'failed', actionKey: 'repair', stageId: 'late' }, { outcome: 'solved', actionKey: 'beam', stageId: 'main' }],
            },
            {
                identity: 'B:beam', parentId: 'B', actionKey: 'beam', stageId: 'main',
                outcome: 'nodeLimited', participated: true, reached: true, workSpent: 20, nodesExpanded: 200, bestBadness: 7, finalBadness: 7,
                solvedWithFailedAttempt: null, runId: 'r1', protocolHash: 'p1',
                attempts: [{ outcome: 'node-limited', actionKey: 'beam', stageId: 'main' }],
            },
        ],
        summary: { observed: 2 },
        protocolHash: 'p1',
        solverRef: 'solver-a',
        populationIntegrity: null,
        sourceFiles: [],
        missingSourceFiles: [],
        invalidSourceFiles: [],
    }));
    fs.writeFileSync(doc2, JSON.stringify({
        schemaVersion: 1,
        kind: 'pathfinder-compact-failure-response',
        records: [
            {
                identity: 'B:repair', parentId: 'B', actionKey: 'repair', stageId: 'late',
                outcome: 'exhaustedNegative', participated: false, reached: false, workSpent: null,
                solvedWithFailedAttempt: null, runId: 'r2', protocolHash: null,
                attempts: [],
            },
        ],
        summary: { observed: 1 },
        populationIntegrity: null,
        sourceFiles: [],
        missingSourceFiles: [],
        invalidSourceFiles: [],
    }));

    const stdout = execFileSync('node', ['scripts/failure-response-query.mjs', '--in=' + doc1 + ',' + doc2], {
        cwd: process.cwd(), encoding: 'utf8',
    });
    const result = JSON.parse(stdout);
    assert.equal(result.summary.records, 3);
    assert.equal(result.summary.independentParents, 2, 'two rows for B remain one independent parent');
    assert.equal(result.summary.solvedParents, 1);
    assert.equal(result.summary.solvedControlsWithFailedAttempts, 1);
    assert.equal(result.summary.work.totalWorkSpent, 30);
    assert.equal(result.summary.work.stats.mean, 15);
    assert.equal(result.summary.nodes.stats.total, 300);
    assert.equal(result.summary.badness.best.mean, 5.5);
    assert.equal(result.summary.badness.finalMinusBest.mean, -1);
    assert.equal(result.summary.parentOutcomes.solved, 1);
    assert.equal(result.summary.parentOutcomes.nodeLimited, 1);
    assert.deepEqual(result.summary.protocolPartitions.p1, { parents: 1, solvedParents: 1, nonSolvedParents: 0 });
    assert.deepEqual(result.summary.protocolPartitions['unknown-or-mixed'], { parents: 1, solvedParents: 0, nonSolvedParents: 1 });
    assert.equal(result.summary.attempts.records, 3);
    assert.equal(result.summary.attempts.actions.beam, 2);
    assert.equal(result.summary.attempts.actions.repair, 1);
    assert.equal(result.summary.protocolComparability.parentsWithUnknownProtocol, 1);
    assert.equal(result.rows.find(row => row.parentId === 'A').protocolHash, 'p1');
    assert.equal(result.rows.find(row => row.parentId === 'A').solverRef, 'solver-a');
    assert.equal(result.summary.protocolComparability.parentsWithMultipleKnownProtocols, 0);
    assert.equal(result.summary.actions.beam, 2);
    assert.equal(result.summary.actions.repair, 1);

    const filtered = JSON.parse(execFileSync('node', [
        'scripts/failure-response-query.mjs', '--in=' + doc1 + ',' + doc2,
        '--action=beam', '--attempt-outcome=node-limited',
    ], { cwd: process.cwd(), encoding: 'utf8' }));
    assert.equal(filtered.summary.records, 1);
    assert.equal(filtered.rows[0].parentId, 'B');
    assert.equal(filtered.summary.independentParents, 1);

    const exactAction = JSON.parse(execFileSync('node', [
        'scripts/failure-response-query.mjs', '--in=' + doc1 + ',' + doc2,
        '--attempt-action=repair', '--attempt-stage=late',
    ], { cwd: process.cwd(), encoding: 'utf8' }));
    assert.equal(exactAction.summary.records, 1);
    assert.equal(exactAction.rows[0].parentId, 'A');

    console.log('failure response query tests passed');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
