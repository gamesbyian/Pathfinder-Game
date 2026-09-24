#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { makeProvenanceEntry, toHint, decodeHintArtifact } from '../modules/domain/hint-runtime.mjs';
import { measureV4ArtifactText, migrateHintStores } from './hint-artifact-v4-migration.mjs';
import { stableStringify } from '../modules/canonical-json.mjs';

const records = [
    toHint([1,2,3], [
        makeProvenanceEntry('beam', {
            solverVersion:'a'.repeat(40), scoringProfileId:'perimeterSweep', beamWidth:2000,
            levelRevision:'v1:test', foundAt:'2026-09-23T00:00:00.000Z',
        }),
        makeProvenanceEntry('beam', {
            solverVersion:'a'.repeat(40), scoringProfileId:'perimeterSweep', beamWidth:2000,
            levelRevision:'v1:test', foundAt:'2026-09-24T00:00:00.000Z',
        }),
    ]),
    toHint([4,5,6], []),
];
const v3 = JSON.stringify({ schemaVersion:3, hints:records }) + '\n';
const measured = measureV4ArtifactText(v3);
assert.equal(measured.encoded.schemaVersion, 4);
assert.equal(stableStringify(decodeHintArtifact(JSON.parse(measured.targetText))), stableStringify(records));
assert.ok(measured.targetBytes > 0);

const temp = mkdtempSync(path.join(tmpdir(), 'hint-v4-migration-'));
try {
    const dir = path.join(temp, 'data', 'hints');
    mkdirSync(dir, { recursive:true });
    const file = path.join(dir, 'P00001.json');
    writeFileSync(file, v3);
    const dry = migrateHintStores(temp, { dirs:['data/hints'] });
    assert.equal(dry.files, 1);
    assert.equal(dry.changedFiles, 1);
    assert.equal(JSON.parse(readFileSync(file,'utf8')).schemaVersion, 3, 'dry run must not mutate');
    const applied = migrateHintStores(temp, { apply:true, dirs:['data/hints'] });
    assert.equal(applied.semanticRoundTrip, 'pass');
    assert.equal(JSON.parse(readFileSync(file,'utf8')).schemaVersion, 4);
    const second = migrateHintStores(temp, { dirs:['data/hints'] });
    assert.equal(second.changedFiles, 0, 'v4 migration must be idempotent');
} finally {
    rmSync(temp, { recursive:true, force:true });
}
console.log('hint-artifact-v4-migration-node-test: ok');
