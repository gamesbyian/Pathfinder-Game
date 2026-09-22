#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const harvesterSource = readFileSync(path.join(scriptsDir, 'harvest-isolated-report-hints.mjs'), 'utf8');
const root = path.resolve(scriptsDir, '..');
assert.match(harvesterSource, /capture\.recordHistorical\(/, 'persisted isolated reports must use the historical provenance ingress');
assert.doesNotMatch(harvesterSource, /capture\.record\(/, 'persisted isolated reports must not use the current-attempt provenance ingress');
const stagingDir = mkdtempSync(path.join(tmpdir(), 'pathfinder-harvest-isolated-'));

try {
    const result = spawnSync(
        process.execPath,
        [
            'scripts/run-bundled.mjs',
            'scripts/harvest-isolated-report-hints.mjs',
            '--',
            `--staging-dir=${stagingDir}`,
            '--source-run-id=regression-test',
            '--source-workflow=regression-test',
            '--source-sha=regression-test',
        ],
        {
            cwd: root,
            encoding: 'utf8',
        },
    );

    assert.equal(
        result.status,
        0,
        `isolated hint harvester must bundle and run against an empty staging directory\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
    assert.match(
        result.stdout,
        /Isolated evidence harvest: 0 report group\(s\), 0 solved row\(s\), 0 canonical hint\/provenance change\(s\), 0 pending row\(s\)\./,
    );
} finally {
    rmSync(stagingDir, { recursive: true, force: true });
}

console.log('harvest-isolated-report-hints bundle smoke test passed');
