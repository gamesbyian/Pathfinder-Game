#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'failure-purpose-query-'));
try {
    const file = path.join(temp, 'failure-response.json');
    fs.writeFileSync(file, JSON.stringify({
        schemaVersion: 1,
        kind: 'pathfinder-compact-failure-response',
        records: [
            {
                identity: 'A1', parentId: 'A', runId: 'run-1', outcome: 'workLimited',
                actionKey: 'beam', stageId: 'main', protocolHash: 'proto', solverRef: 'solver',
                attempts: [],
            },
            {
                identity: 'A2', parentId: 'A', runId: 'run-2', outcome: 'exhaustedNegative',
                actionKey: 'beam', stageId: 'main', protocolHash: 'proto', solverRef: 'solver',
                attempts: [],
            },
            {
                identity: 'B1', parentId: 'B', runId: 'run-1', outcome: 'harnessError',
                actionKey: 'dfs', stageId: 'main', protocolHash: 'proto', solverRef: 'solver',
                attempts: [],
            },
        ],
        summary: { observed: 3 },
        populationIntegrity: { coverageComplete: true, decisionValidComplete: true },
        protocolHash: 'proto',
        solverRef: 'solver',
        sourceFiles: [],
        missingSourceFiles: [],
        invalidSourceFiles: [],
    }));

    const forensic = JSON.parse(execFileSync('node', [
        'scripts/failure-evidence-purpose-query.mjs',
        '--in=' + file,
        '--purpose=forensic',
    ], { cwd: process.cwd(), encoding: 'utf8' }));
    assert.equal(forensic.summary.recordsObserved, 3);
    assert.equal(forensic.summary.applicabilityCounts.admissible, 3);
    assert.equal(forensic.summary.independentAdmissibleSupportStrata, 2,
        'two repeated A rows remain one parent-level support stratum');

    const mechanism = JSON.parse(execFileSync('node', [
        'scripts/failure-evidence-purpose-query.mjs',
        '--in=' + file,
        '--purpose=mechanism-nomination',
        '--applicability=admissible',
    ], { cwd: process.cwd(), encoding: 'utf8' }));
    assert.equal(mechanism.rows.length, 2);
    assert.equal(mechanism.rows.some(row => row.parentId === 'B'), false,
        'harness failures are not mechanism-nomination evidence');

    const longitudinal = JSON.parse(execFileSync('node', [
        'scripts/failure-evidence-purpose-query.mjs',
        '--in=' + file,
        '--purpose=longitudinal-process',
        '--comparable-protocol=proto',
        '--comparable-solver-ref=solver',
    ], { cwd: process.cwd(), encoding: 'utf8' }));
    assert.equal(longitudinal.summary.applicabilityCounts.admissible, 3);

    const prevalence = JSON.parse(execFileSync('node', [
        'scripts/failure-evidence-purpose-query.mjs',
        '--in=' + file,
        '--purpose=population-prevalence',
        '--population-sampling-declared=true',
    ], { cwd: process.cwd(), encoding: 'utf8' }));
    assert.equal(prevalence.summary.applicabilityCounts.admissible, 3);

    console.log('failure-evidence-purpose-query-node-test: ok');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
