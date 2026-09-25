#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
    projectRuntimeHintArtifact,
    projectRuntimeHintDirectory,
    reconcileRuntimeHintDirectory,
} from './runtime-hint-projection-lib.mjs';
import { decodeHintArtifact, hintPaths, makeProvenanceEntry, toHint } from '../modules/domain/hint-runtime.mjs';

const canonical = {
    schemaVersion: 3,
    hints: [
        toHint([1, 2, 3], [
            makeProvenanceEntry('dfs', {
                solverVersion: 'a'.repeat(40),
                solverRequestIdentity: 'sha256:' + '1'.repeat(64),
                occurrenceRunId: 'run-1',
            }),
        ]),
        toHint([4, 5, 6], []),
    ],
};
const raw = JSON.stringify(canonical);
const projected = projectRuntimeHintArtifact(raw);
assert.deepEqual(projected.hints, [[1, 2, 3], [4, 5, 6]]);
assert.match(projected.sourceContentSha256, /^[0-9a-f]{64}$/u);
assert.match(projected.sourceSemanticSha256, /^[0-9a-f]{64}$/u);
assert.deepEqual(hintPaths(decodeHintArtifact(projected)), projected.hints);
assert.equal(JSON.stringify(projected).includes('provenance'), false,
    'runtime projection must not ship canonical research provenance');

const temp = mkdtempSync(path.join(tmpdir(), 'pathfinder-runtime-hints-'));
try {
    const source = path.join(temp, 'source');
    const target = path.join(temp, 'target');
    mkdirSync(source, { recursive: true });
    writeFileSync(path.join(source, 'P00001.json'), JSON.stringify(canonical));
    writeFileSync(path.join(source, 'P00002.json'), JSON.stringify([[9, 8, 7]]));

    const manifest = projectRuntimeHintDirectory(source, target);
    assert.equal(manifest.kind, 'pathfinder-runtime-hint-projection-manifest');
    assert.equal(manifest.summary.files, 2);
    assert.equal(manifest.summary.hints, 3);
    assert.ok(manifest.summary.runtimeBytes < manifest.summary.sourceBytes,
        'fixture with provenance should shrink when projected to paths');

    const p1 = JSON.parse(readFileSync(path.join(target, 'P00001.json'), 'utf8'));
    assert.deepEqual(hintPaths(decodeHintArtifact(p1)), [[1, 2, 3], [4, 5, 6]]);
    assert.equal(Object.hasOwn(p1, 'sourceContentSha256'), true);
    assert.equal(Object.hasOwn(p1, 'sourceSemanticSha256'), true);

    const manifestOnDisk = JSON.parse(readFileSync(path.join(target, '_projection-manifest.json'), 'utf8'));
    assert.equal(manifestOnDisk.files.length, 2);
    assert.deepEqual(manifestOnDisk.files.map(row => row.file), ['P00001.json', 'P00002.json']);

    const p2Before = readFileSync(path.join(target, 'P00002.json'), 'utf8');
    const changedCanonical = {
        ...canonical,
        hints: [...canonical.hints, toHint([7, 7, 7], [])],
    };
    writeFileSync(path.join(source, 'P00001.json'), JSON.stringify(changedCanonical));
    const reconciled = reconcileRuntimeHintDirectory(source, target, {
        changedFiles: ['P00001.json'],
    });
    assert.equal(reconciled.summary.files, 2);
    assert.equal(reconciled.summary.hints, 4);
    assert.equal(readFileSync(path.join(target, 'P00002.json'), 'utf8'), p2Before,
        'unchanged projection must be reused byte-for-byte');

    rmSync(path.join(source, 'P00002.json'));
    const deleted = reconcileRuntimeHintDirectory(source, target, {
        deletedFiles: ['P00002.json'],
    });
    assert.equal(deleted.summary.files, 1);
    assert.equal(existsSync(path.join(target, 'P00002.json')), false,
        'deleted source artifact must remove its cached projection');
} finally {
    rmSync(temp, { recursive: true, force: true });
}

console.log('runtime-hint-projection-lib-node-test: ok');
