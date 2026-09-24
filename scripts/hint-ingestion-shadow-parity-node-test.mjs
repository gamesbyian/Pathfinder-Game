#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildHintIngestionReceipt } from './hint-ingestion-receipt-lib.mjs';

const temp = mkdtempSync(path.join(tmpdir(), 'hint-shadow-parity-'));
try {
    const receiptPath = path.join(temp, 'receipt.json');
    const base = {
        producer: 'harvest-cpsat-discovery-reports',
        sourceRunId: 'run-1',
        sourceRunAttempt: '1',
        sourceWorkflow: 'cpsat',
        candidateObservations: 2,
        eligibleObservations: 2,
        refereeAcceptedObservations: 2,
        acceptedAlreadyRepresented: 2,
        semanticRecordChanges: 0,
        pathAdditions: 0,
        provenanceEventAdditions: 0,
        occurrenceAdditions: 2,
        quarantinedObservations: 0,
        quarantineReasons: {},
    };
    writeFileSync(receiptPath, JSON.stringify(buildHintIngestionReceipt(base)));

    const shadow = spawnSync(process.execPath, [
        'scripts/hint-ingestion-shadow-parity.mjs',
        `--receipt=${receiptPath}`,
        '--family=cpsat',
        '--phase=shadow',
    ], { encoding: 'utf8' });
    assert.equal(shadow.status, 0, shadow.stderr || shadow.stdout);

    const reharvest = spawnSync(process.execPath, [
        'scripts/hint-ingestion-shadow-parity.mjs',
        `--receipt=${receiptPath}`,
        '--family=cpsat',
        '--phase=reharvest',
    ], { encoding: 'utf8' });
    assert.notEqual(reharvest.status, 0, 'reharvest must reject a newly-added occurrence');

    writeFileSync(receiptPath, JSON.stringify(buildHintIngestionReceipt({
        ...base,
        producer: 'harvest-solver-diagnostics-reports',
        occurrenceAdditions: 1,
    })));
    const diagnostics = spawnSync(process.execPath, [
        'scripts/hint-ingestion-shadow-parity.mjs',
        `--receipt=${receiptPath}`,
        '--family=diagnostics',
        '--phase=shadow',
    ], { encoding: 'utf8' });
    assert.notEqual(diagnostics.status, 0, 'diagnostics shadow expects direct route to have already persisted the same occurrence');

    writeFileSync(receiptPath, JSON.stringify(buildHintIngestionReceipt({
        ...base,
        producer: 'harvest-portfolio-solve-sweep-reports',
        occurrenceAdditions: 0,
    })));
    const portfolio = spawnSync(process.execPath, [
        'scripts/hint-ingestion-shadow-parity.mjs',
        `--receipt=${receiptPath}`,
        '--family=portfolio',
        '--phase=shadow',
    ], { encoding: 'utf8' });
    assert.equal(portfolio.status, 0, portfolio.stderr || portfolio.stdout);

    writeFileSync(receiptPath, JSON.stringify(buildHintIngestionReceipt({
        ...base,
        producer: 'harvest-portfolio-solve-sweep-reports',
        occurrenceAdditions: 1,
    })));
    const portfolioMismatch = spawnSync(process.execPath, [
        'scripts/hint-ingestion-shadow-parity.mjs',
        `--receipt=${receiptPath}`,
        '--family=portfolio',
        '--phase=shadow',
    ], { encoding: 'utf8' });
    assert.notEqual(portfolioMismatch.status, 0,
        'portfolio shadow must reject a new occurrence when the direct route ran first');
} finally {
    rmSync(temp, { recursive: true, force: true });
}

console.log('hint-ingestion-shadow-parity-node-test: ok');
