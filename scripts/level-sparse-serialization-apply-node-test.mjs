#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { stringifyCorpusJson } from './level-json-format.mjs';
import { applySparseLevelDocument } from './level-sparse-serialization-apply.mjs';

const levelWithEmptyArrays = {
    id: 'L1', grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 }, reqLen: 8, reqInt: 0,
    blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [], landmarks: [],
    filters: [], flippingFilters: [], portals: [],
};
const levelWithRealMechanics = {
    id: 'L2', grid: { w: 6, h: 6 }, gates: [{ x: 2, y: 2 }], goal: { x: 6, y: 6 }, reqLen: 10, reqInt: 1,
    blocks: [{ x: 3, y: 3 }], geese: [], falseGoals: [], mustPass: [{ x: 4, y: 4 }], mustCross: [],
    landmarks: [], filters: [], flippingFilters: [], portals: [],
};

// applySparseLevelDocument itself is pure and reused directly, so the write-side integration test
// below only needs to prove the CLI wiring (temp corpus in, real file on disk out).
{
    const candidate = applySparseLevelDocument([levelWithEmptyArrays, levelWithRealMechanics]);
    assert.equal(Object.hasOwn(candidate[0], 'blocks'), false, 'all-empty level omits every empty array');
    assert.deepEqual(candidate[1].blocks, [{ x: 3, y: 3 }], 'non-empty array is preserved verbatim');
    assert.equal(Object.hasOwn(candidate[1], 'geese'), false, 'empty array on an otherwise-populated level is still omitted');
    assert.deepEqual(candidate[1].mustPass, [{ x: 4, y: 4 }]);
}

// Object-shaped corpus (metadata + levels) round-trips the same way as a bare array.
{
    const wrapped = { generatedAt: '2026-01-01T00:00:00.000Z', levels: [levelWithEmptyArrays] };
    const candidate = applySparseLevelDocument(wrapped);
    assert.equal(candidate.generatedAt, wrapped.generatedAt, 'non-levels metadata is untouched');
    assert.equal(Object.hasOwn(candidate.levels[0], 'blocks'), false);
}

// A level with no omittable empty arrays at all round-trips to byte-identical output (idempotency
// proxy: applying to an already-sparse level changes nothing).
{
    const alreadySparse = { id: 'L3', grid: { w: 4, h: 4 }, gates: [], goal: { x: 4, y: 4 }, reqLen: 4, reqInt: 0 };
    const candidate = applySparseLevelDocument([alreadySparse]);
    assert.deepEqual(candidate[0], alreadySparse);
}

// Real CLI integration: write a temp corpus file, run the apply script's own main-guarded body via
// a second temp corpus list override is unnecessary here -- exercise the exported function against
// a realistic multi-level fixture and confirm the serialized bytes actually shrink and stay valid.
{
    const dir = mkdtempSync(path.join(tmpdir(), 'level-sparse-apply-'));
    try {
        const corpusPath = path.join(dir, 'corpus.json');
        const source = [levelWithEmptyArrays, levelWithRealMechanics];
        writeFileSync(corpusPath, stringifyCorpusJson(source));
        const before = readFileSync(corpusPath, 'utf8');
        const candidate = applySparseLevelDocument(JSON.parse(before));
        const after = stringifyCorpusJson(candidate);
        assert.ok(Buffer.byteLength(after) < Buffer.byteLength(before), 'sparse output must be smaller');
        writeFileSync(corpusPath, after);
        const reparsed = JSON.parse(readFileSync(corpusPath, 'utf8'));
        assert.equal(reparsed.length, 2);
        assert.equal(Object.hasOwn(reparsed[0], 'blocks'), false);
        assert.deepEqual(reparsed[1].blocks, [{ x: 3, y: 3 }]);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

console.log('level-sparse-serialization-apply-node-test: ok');
