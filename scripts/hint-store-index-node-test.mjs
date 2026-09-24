#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { encodeHintArtifact, makeProvenanceEntry, toHint } from '../modules/domain/hint-runtime.mjs';
import { buildHintStoreIndex, verifyHintStoreIndex } from './hint-store-index.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'hint-store-index-'));
try {
    mkdirSync(path.join(root, 'data', 'hints'), { recursive: true });
    mkdirSync(path.join(root, 'data', 'stress', 'hints'), { recursive: true });
    mkdirSync(path.join(root, 'data', 'stress', 'hints-random'), { recursive: true });
    const records = [toHint([1, 2, 3], [makeProvenanceEntry('beam', {
        solverVersion: 'a'.repeat(40),
        scoringProfileId: 'default',
        workBudget: 1000,
        levelRevision: 'v2:test',
        solverRequestIdentity: 'sha256:' + '1'.repeat(64),
        protocolHash: 'sha256:' + '2'.repeat(64),
        occurrenceRunId: 'run-1',
        occurrenceRunAttempt: '1',
    })])];
    const file = path.join(root, 'data', 'hints', 'P00001.json');
    writeFileSync(file, JSON.stringify(encodeHintArtifact(records)) + '\n');

    const index = buildHintStoreIndex(root);
    assert.equal(index.kind, 'pathfinder-hint-store-index');
    assert.equal(index.rows.length, 1);
    assert.equal(index.totals.hints, 1);
    assert.equal(index.totals.provenanceEvents, 1);
    assert.equal(index.rows[0].artifactPath, 'data/hints/P00001.json');
    assert.match(index.rows[0].contentSha256, /^sha256:[0-9a-f]{64}$/u);
    assert.match(index.rows[0].semanticSha256, /^sha256:[0-9a-f]{64}$/u);
    assert.match(index.sourceSetSha256, /^sha256:[0-9a-f]{64}$/u);
    assert.equal(verifyHintStoreIndex(index, root).fresh, true);

    writeFileSync(file, JSON.stringify(encodeHintArtifact([...records, toHint([3, 4, 5], [])])) + '\n');
    const stale = verifyHintStoreIndex(index, root);
    assert.equal(stale.fresh, false);
    assert.notEqual(stale.expectedSourceSetSha256, stale.actualSourceSetSha256);
} finally {
    rmSync(root, { recursive: true, force: true });
}
console.log('hint-store-index-node-test: ok');
