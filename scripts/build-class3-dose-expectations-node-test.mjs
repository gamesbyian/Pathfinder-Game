import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'class3-expectations-'));
try {
    const atlas = path.join(temp, 'atlas.json');
    fs.writeFileSync(atlas, JSON.stringify({
        residualClassificationSchemaVersion: 4,
        baseline: 'baseline.json',
        lifecycle: 'lifecycle.json',
        census: 'census.json',
        currentResidualLevels: 531,
        rows: [
            { id: 'R00002', primaryClass: 4, t1Wins: [{ class: 4, identity: 'skip' }] },
            { id: 'R00001', primaryClass: 3, t1Wins: [
                { class: 3, identity: 'repair|score=repair|guidance=standard', nodes: 200, gate: 'g2', familyReached: true, familyStarved: false, dispatched: true },
                { class: 2, identity: 'other', nodes: 10 },
            ] },
            { id: 'R00003', primaryClass: 3, t1Wins: [
                { class: 3, identity: 'beam|score=x', nodes: 100, gate: null, familyReached: true, familyStarved: false, dispatched: true },
                { class: 3, identity: 'beam|score=x', nodes: 100, gate: null, familyReached: true, familyStarved: false, dispatched: true },
            ] },
        ],
    }));
    const result = JSON.parse(execFileSync('node', [
        'scripts/build-class3-dose-expectations.mjs',
        '--atlas=' + atlas,
    ], { cwd: process.cwd(), encoding: 'utf8' }));

    assert.equal(result.kind, 'pathfinder-class3-dose-expectations');
    assert.equal(result.expectedParentCount, 2);
    assert.deepEqual(result.unitTopology, {
        observationUnit: 'compact-failure-response-attempt',
        opportunityUnit: 'parent-exact-rescuer',
        assignmentUnit: null,
        dependenceClusterUnit: 'parent',
        analysisUnit: 'parent',
        generalizationUnit: 'current-class3-parent-under-compatible-shared-production-protocol',
    });
    assert.deepEqual(result.parents.map(row => row.parentId), ['R00001', 'R00003']);
    assert.equal(result.parents[0].rescuers.length, 1);
    assert.equal(result.parents[0].rescuers[0].actionKey, 'repair|score=repair|guidance=standard');
    assert.equal(result.parents[0].rescuers[0].isolatedNodesExpanded, 200);
    assert.equal(result.parents[1].rescuers.length, 1, 'duplicate rescuer identities collapse');
    assert.equal(result.sourceBoundary.currentResidualLevels, 531);
    assert.equal(result.sourceBoundary.residualClassificationSchemaVersion, 4);

    console.log('class3 dose expectation-map builder tests passed');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
