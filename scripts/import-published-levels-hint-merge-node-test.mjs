#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mergeNewHints } from './import-published-levels.mjs';
import { makeProvenanceEntry, toHint } from '../modules/domain/hint-runtime.mjs';

const path = [1, 2, 3];
const first = makeProvenanceEntry('beam', {
    solverVersion: 'a'.repeat(40),
    foundAt: '2026-09-01T00:00:00.000Z',
    levelRevision: 'v2:test',
});
const second = makeProvenanceEntry('beam', {
    solverVersion: 'b'.repeat(40),
    foundAt: '2026-09-02T00:00:00.000Z',
    levelRevision: 'v2:test',
});
const target = { hints: [path], hintRecords: [toHint(path, [first])] };
const incoming = { hints: [toHint(path, [second])], hintRecords: [toHint(path, [second])] };

const merged = mergeNewHints(target, incoming);
assert.equal(merged.pathsAdded, 0, 'same-path provenance enrichment is not a new path');
assert.equal(merged.semanticChanged, true, 'same-path provenance enrichment must still persist');
assert.equal(target.hintRecords.length, 1);
assert.equal(target.hintRecords[0].provenance.length, 2);

const repeated = mergeNewHints(target, incoming);
assert.equal(repeated.pathsAdded, 0);
assert.equal(repeated.semanticChanged, false, 're-importing the same semantic event must be idempotent');
assert.equal(target.hintRecords[0].provenance.length, 2);

console.log('import-published-levels-hint-merge-node-test: ok');
