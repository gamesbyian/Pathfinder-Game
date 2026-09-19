#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { hashConfiguration, hashPopulation } from './solver-experiment-contract.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hint-discovery-process-cli-'));
try {
    const levelsFile = path.join(temp, 'levels.json');
    const hintsDir = path.join(temp, 'hints');
    const reportFile = path.join(temp, 'report.json');
    const contractFile = path.join(temp, 'contract.json');
    fs.mkdirSync(hintsDir, { recursive: true });
    fs.writeFileSync(levelsFile, JSON.stringify([{ id: 'P1', grid: [[0]] }]));
    fs.writeFileSync(path.join(hintsDir, 'P1.json'), JSON.stringify({
        schemaVersion: 3,
        hints: [{ path: [1, 2, 3], provenance: [] }],
    }));
    fs.writeFileSync(reportFile, JSON.stringify({
        levels: [{
            id: 'P1',
            ok: true,
            status: 'success',
            solution: [1, 2, 3],
            workSpent: 900,
            nodesExpanded: 90,
            attempts: [
                { ok: false, outcome: 'exhausted', stageId: 'dfs', actionKey: 'dfs', workSpent: 200 },
                { ok: true, outcome: 'solved', stageId: 'repair', actionKey: 'repair', workSpent: 700 },
            ],
        }],
    }));

    const population = hashPopulation({
        kind: 'explicit-ids',
        identityBasis: 'stable-level-id',
        identities: ['P1'],
    });
    const contract = {
        experiment: {
            workflowFamily: 'test',
            producer: 'test',
            entrypoint: 'test',
            configurationHash: hashConfiguration({ work: 1000 }),
            resolvedSha: 'a'.repeat(40),
        },
        population: {
            kind: 'explicit-ids',
            identityBasis: 'stable-level-id',
            identityHash: population.identityHash,
            corpusIdentity: 'sha256:' + '1'.repeat(64),
            independentUnit: 'parentId',
        },
        execution: {
            levelBlind: true,
            historyAware: false,
            historicalInputs: [],
            reproducibilityExpected: true,
            producerFamily: 'test',
            schedulerMode: 'production',
        },
        limits: {
            cumulativeNodeCeiling: null,
            initialWorkAllocation: 1000,
            totalWorkCeiling: 1000,
            wallSafetyDeadlineMs: 10000,
            wallDeadlineBinding: false,
        },
        sideEffects: {
            hints: 'artifact-only',
            canonicalBaseline: 'none',
            telemetry: 'artifact-only',
            reports: 'artifact-only',
        },
    };
    fs.writeFileSync(contractFile, JSON.stringify(contract));

    const output = JSON.parse(execFileSync('node', [
        'scripts/hint-discovery-process.mjs',
        '--in=' + reportFile,
        '--levels=' + levelsFile,
        '--contract=' + contractFile,
        '--run-id=run-1',
        '--contract-ref=manifest.json#experimentContract',
    ], { cwd: process.cwd(), encoding: 'utf8' }));

    assert.equal(output.kind, 'pathfinder-hint-discovery-process-evidence');
    assert.equal(output.run.runId, 'run-1');
    assert.equal(output.run.protocolHash, contract.experiment.configurationHash);
    assert.equal(output.records.length, 1);
    assert.equal(output.records[0].parentId, 'P1');
    assert.equal(output.records[0].process.precedingAttemptCount, 1);
    assert.equal(output.records[0].process.winner.actionKey, 'repair');

    console.log('hint-discovery-process-cli-node-test: ok');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
