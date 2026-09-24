#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const temp = mkdtempSync(path.join(tmpdir(), 'pathfinder-merge-hints-receipt-'));
const receiptPath = path.join(temp, 'receipt.json');
try {
    const run = spawnSync(process.execPath, [
        'scripts/run-bundled.mjs',
        'scripts/merge-hint-artifacts.mjs',
        '--',
        `--staging-dir=${temp}`,
        '--source-run-id=fixture-run',
        '--source-run-attempt=2',
        '--source-workflow=fixture-workflow',
        `--ingestion-receipt-out=${receiptPath}`,
    ], {
        cwd: path.resolve(new URL('..', import.meta.url).pathname),
        encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    assert.equal(receipt.kind, 'pathfinder-hint-ingestion-receipt');
    assert.equal(receipt.source.producer, 'merge-hint-artifacts');
    assert.equal(receipt.source.runId, 'fixture-run');
    assert.equal(receipt.source.runAttempt, '2');
    assert.equal(receipt.funnel.candidateObservations, 0);
    assert.equal(receipt.funnel.refereeAcceptedObservations, 0);
    assert.equal(receipt.additions.semanticRecordChanges, 0);
    assert.equal(receipt.additions.paths, 0);
    assert.equal(receipt.additions.provenanceEvents, 0);
    assert.equal(receipt.additions.occurrences, 0);
    assert.equal(receipt.physical.filesChanged, 0);
    assert.match(run.stdout, /Wrote hint-ingestion receipt/);
} finally {
    rmSync(temp, { recursive: true, force: true });
}

console.log('merge-hint-artifacts-receipt-node-test: ok');
