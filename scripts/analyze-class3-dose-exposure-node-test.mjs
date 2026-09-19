import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'class3-dose-'));
try {
    const doc = path.join(temp, 'failure.json');
    const expectations = path.join(temp, 'expectations.json');
    fs.writeFileSync(doc, JSON.stringify({
        schemaVersion: 1,
        kind: 'pathfinder-compact-failure-response',
        records: [
            { identity: 'A', parentId: 'A', outcome: 'exhaustedNegative', protocolHash: 'p1', solverRef: 's1', attempts: [] },
            { identity: 'B', parentId: 'B', outcome: 'nodeLimited', protocolHash: 'p1', solverRef: 's1', attempts: [
                { actionKey: 'beam-a', stageId: 'main', outcome: 'node-limited', workSpent: 11, nodesExpanded: 100, nodeCeiling: 100 },
            ] },
            { identity: 'C', parentId: 'C', outcome: 'exhaustedNegative', protocolHash: 'p1', solverRef: 's1', attempts: [
                { actionKey: 'repair-a', stageId: 'late', outcome: 'failed', workSpent: 12, nodesExpanded: 80 },
            ] },
            { identity: 'D', parentId: 'D', outcome: 'solved', protocolHash: 'p1', solverRef: 's1', attempts: [
                { actionKey: 'admissible-a', stageId: 'late', outcome: 'solved', workSpent: 13, nodesExpanded: 70 },
            ] },
            { identity: 'E', parentId: 'E', outcome: 'unknown', protocolHash: 'p1', solverRef: 's1', attempts: [
                { actionKey: 'beam-b', stageId: 'main', outcome: 'unknown', workSpent: null, nodesExpanded: null },
            ] },
        ],
        summary: { observed: 5 },
        protocolHash: 'p1',
        solverRef: 's1',
        populationIntegrity: null,
        sourceFiles: [],
        missingSourceFiles: [],
        invalidSourceFiles: [],
    }));
    fs.writeFileSync(expectations, JSON.stringify({
        schemaVersion: 1,
        kind: 'pathfinder-class3-dose-expectations',
        parents: [
            { parentId: 'A', rescuers: [{ actionKey: 'beam-a', stageId: 'main' }] },
            { parentId: 'B', rescuers: [{ actionKey: 'beam-a', stageId: 'main' }] },
            { parentId: 'C', rescuers: [{ actionKey: 'repair-a', stageId: 'late' }] },
            { parentId: 'D', rescuers: [{ actionKey: 'admissible-a', stageId: 'late' }] },
            { parentId: 'E', rescuers: [{ actionKey: 'beam-b', stageId: 'main' }] },
            { parentId: 'F', rescuers: [{ actionKey: 'repair-b' }] },
        ],
    }));

    const result = JSON.parse(execFileSync('node', [
        'scripts/analyze-class3-dose-exposure.mjs',
        '--in=' + doc,
        '--expectations=' + expectations,
    ], { cwd: process.cwd(), encoding: 'utf8' }));

    assert.equal(result.expectedParents, 6);
    assert.equal(result.observedExpectedParents, 5);
    assert.deepEqual(result.missingParents, ['F']);
    assert.equal(result.protocolHash, 'p1');
    assert.equal(result.solverRef, 's1');
    assert.equal(result.rescuerDispositions['exact-not-participated'], 2);
    assert.equal(result.rescuerDispositions['exact-participated-censored'], 1);
    assert.equal(result.rescuerDispositions['exact-participated-exhausted-negative'], 1);
    assert.equal(result.rescuerDispositions['exact-participated-solved'], 1);
    assert.equal(result.rescuerDispositions['exact-participated-dose-unknown'], 1);
    assert.equal(result.parentDispositions['exposure-gap'], 1);
    assert.equal(result.parentDispositions['censored-dose'], 1);
    assert.equal(result.parentDispositions['exposed-and-negative'], 1);
    assert.equal(result.parentDispositions['refreshed-current-solve'], 1);
    assert.equal(result.parentDispositions['dose-or-outcome-unknown'], 1);
    assert.equal(result.parentDispositions['missing-parent'], 1);
    assert.equal(result.byAction['beam-a'].parents, 2);
    assert.equal(result.byAction['beam-a'].attempts, 1);
    assert.equal(result.byAction['beam-a'].workSpent.median, 11);
    assert.equal(result.byAction['repair-a'].nodesExpanded.median, 80);

    console.log('class3 dose exposure reducer tests passed');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
