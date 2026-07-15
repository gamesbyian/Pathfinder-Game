/**
 * Unit tests for scripts/level-data-io.mjs's id-vs-position hint-storage join key — specifically
 * the Definition of Done item from docs/level-id-unification-plan.md: a level carrying a
 * persistent `id` must be freely reorderable in its corpus's levels.json without its hint file
 * (or any other level's) becoming misattributed.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { readLevelsWithHints, writeLevelsWithHints, hintKeyForLevel, hintFileName } from './level-data-io.mjs';

function makeLevel(overrides = {}) {
    return {
        grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 },
        reqLen: 8, reqInt: 0, blocks: [], mustPass: [], mustCross: [], falseGoals: [], geese: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [],
        designerName: '', description: '', difficulty: null,
        ...overrides,
    };
}

function withTempDir(fn) {
    const dir = mkdtempSync(path.join(tmpdir(), 'level-data-io-test-'));
    try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('hintKeyForLevel prefers a level\'s own id over its array position', () => {
    assert.equal(hintKeyForLevel({ id: 'P00042' }, 7), 'P00042');
    assert.equal(hintKeyForLevel({}, 7), 7);
    assert.equal(hintKeyForLevel(null, 7), 7);
});

test('hintFileName uses a string id verbatim, and zero-pads a bare position', () => {
    assert.equal(hintFileName('P00042'), 'P00042.json');
    assert.equal(hintFileName(7), '00007.json');
});

test('a level with an id keeps its hints after being reordered in the corpus array', () => {
    withTempDir((dir) => {
        const levelsJsonPath = path.join(dir, 'levels.json');
        const a = { id: 'P00001', ...makeLevel(), hints: [[0, 1]] };
        const b = { id: 'P00002', ...makeLevel(), hints: [[2, 3]] };

        writeLevelsWithHints(levelsJsonPath, [a, b]);

        // Reorder: b now comes first (position 1), a second (position 2) -- the exact scenario
        // the whole id-unification plan exists to make safe.
        const reordered = readLevelsWithHints(levelsJsonPath);
        const [readB, readA] = [reordered.find((l) => l.id === 'P00002'), reordered.find((l) => l.id === 'P00001')];
        writeLevelsWithHints(levelsJsonPath, [readB, readA]);

        const final = readLevelsWithHints(levelsJsonPath);
        const finalA = final.find((l) => l.id === 'P00001');
        const finalB = final.find((l) => l.id === 'P00002');
        assert.deepEqual(finalA.hints, [[0, 1]], 'level a keeps its own hints regardless of array position');
        assert.deepEqual(finalB.hints, [[2, 3]], 'level b keeps its own hints regardless of array position');
    });
});

test('a level with no id (an editor draft) falls back to position-keyed storage', () => {
    withTempDir((dir) => {
        const levelsJsonPath = path.join(dir, 'levels.json');
        const draft = { ...makeLevel(), hints: [[9, 9]] };
        writeLevelsWithHints(levelsJsonPath, [draft]);
        const reread = readLevelsWithHints(levelsJsonPath);
        assert.deepEqual(reread[0].hints, [[9, 9]]);
    });
});
