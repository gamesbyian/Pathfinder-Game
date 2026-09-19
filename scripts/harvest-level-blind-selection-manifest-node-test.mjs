#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hint-harvest-selection-'));
try {
    const staging = path.join(temp, 'staging');
    const manifest = path.join(temp, 'selection.json');
    fs.mkdirSync(staging, { recursive: true });
    fs.writeFileSync(path.join(staging, 'report.json'), JSON.stringify({
        summary: {
            levelBlind: true,
            corpus: 'data/stress/stress-levels.json',
            commit: 'a'.repeat(40),
        },
        levels: [
            { id: 'S00001', ok: false, status: 'exhausted' },
            { id: 'S00002', ok: false, status: 'node-budget-reached' },
        ],
    }));

    execFileSync('node', [
        'scripts/run-bundled.mjs',
        'scripts/harvest-level-blind-report-hints.mjs',
        '--',
        '--staging-dir=' + staging,
        '--source-run-id=test-selection-run',
        '--source-workflow=test-selection-workflow',
        '--selection-manifest-out=' + manifest,
    ], { cwd: process.cwd(), encoding: 'utf8' });

    const result = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    assert.equal(result.kind, 'pathfinder-hint-harvest-selection-manifest');
    assert.equal(result.source.harvester, 'harvest-level-blind-report-hints');
    assert.equal(result.source.reportsSeen, 1);
    assert.equal(result.source.sourceRowsSeen, 2);
    assert.equal(result.selection.solvedCandidateRowsSeen, 0);
    assert.equal(result.selection.refereeAcceptedRows, 0);
    assert.equal(result.selection.persistedRecordChanges, 0);
    assert.equal(result.selection.quarantinedRows, 0);
    assert.equal(result.semantics.notAttemptedPopulation, true);

    console.log('harvest-level-blind-selection-manifest-node-test: ok');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
