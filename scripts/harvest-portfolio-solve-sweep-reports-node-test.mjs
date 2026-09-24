#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const temp = mkdtempSync(path.join(tmpdir(), 'pathfinder-portfolio-central-harvest-'));
const receiptPath = path.join(temp, 'receipt.json');
try {
    const run = spawnSync(process.execPath, [
        'scripts/run-bundled.mjs',
        'scripts/harvest-portfolio-solve-sweep-reports.mjs',
        '--',
        `--staging-dir=${temp}`,
        '--source-run-id=fixture-run',
        '--source-run-attempt=3',
        '--source-workflow=Solver history-aware production replay baseline (corpus-1 + corpus-2)',
        `--ingestion-receipt-out=${receiptPath}`,
    ], { cwd: ROOT, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr || run.stdout);
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
    assert.equal(receipt.kind, 'pathfinder-hint-ingestion-receipt');
    assert.equal(receipt.source.producer, 'harvest-portfolio-solve-sweep-reports');
    assert.equal(receipt.source.runId, 'fixture-run');
    assert.equal(receipt.source.runAttempt, '3');
    assert.equal(receipt.funnel.candidateObservations, 0);
    assert.equal(receipt.additions.paths, 0);
    assert.equal(receipt.additions.provenanceEvents, 0);
    assert.equal(receipt.additions.occurrences, 0);
    assert.match(run.stdout, /Portfolio evidence harvest: 0 report\(s\)/);
} finally {
    rmSync(temp, { recursive: true, force: true });
}
console.log('harvest-portfolio-solve-sweep-reports-node-test: ok');
