/**
 * Unit tests for scripts/level-data-io.mjs's id-vs-position hint-storage join key — specifically
 * the Definition of Done item from docs/archive/level-id-unification-plan.md: a level carrying a
 * persistent `id` must be freely reorderable in its corpus's levels.json without its hint file
 * (or any other level's) becoming misattributed.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { readLevelsWithHints, writeLevelsWithHints, hintKeyForLevel, hintFileName, hintsDirFor, parseLevelPositions, parseLevelSelector, selectLevelsBySpec, AmbiguousLevelSpecError } from './level-data-io.mjs';

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

test('hintsDirFor derives a sibling hints-<suffix>/ for any stress-levels-<suffix>.json, and plain hints/ for the bare name', () => {
    assert.equal(hintsDirFor('data/stress/stress-levels.json'), path.normalize('data/stress/hints'));
    assert.equal(hintsDirFor('data/stress/stress-levels-random.json'), path.normalize('data/stress/hints-random'));
    // A third (or later) sibling corpus must NOT collide with corpus 1's bare hints/ dir -- this is
    // exactly the bug a hardcoded `=== 'stress-levels-random'` check would have reintroduced.
    assert.equal(hintsDirFor('data/stress/stress-levels-envelope.json'), path.normalize('data/stress/hints-envelope'));
    assert.equal(hintsDirFor('data/levels.json'), path.normalize('data/hints'));
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

test('two processes reading the same corpus and each writing back only their own chunk do not clobber each other', () => {
    // Regression test for a real data-loss bug: a caller (e.g. hint-workbench.mjs sharded across
    // concurrent processes) calls readLevelsWithHints once, mutates only SOME levels' .hints/
    // .hintRecords, then calls writeLevelsWithHints once with the FULL array. Before the fix,
    // writeLevelsWithHints rewrote every level's hint file from its in-memory content regardless
    // of whether that level was actually touched -- so a second process's untouched, stale
    // start-of-run snapshot of a level the FIRST process already updated would silently revert it
    // when the second process's write ran later. Simulated here without real subprocesses: two
    // independent reads of the same on-disk state, each mutating a disjoint level, written back
    // in an order (second write last, touching nothing new for the first process's level) that
    // would have reverted the first process's write under the old behavior.
    withTempDir((dir) => {
        const levelsJsonPath = path.join(dir, 'levels.json');
        const a = { id: 'P00001', ...makeLevel(), hints: [[0, 1]] };
        const b = { id: 'P00002', ...makeLevel(), hints: [[2, 3]] };
        writeLevelsWithHints(levelsJsonPath, [a, b]);

        // "Process 1" reads the corpus and updates only level a.
        const process1Levels = readLevelsWithHints(levelsJsonPath);
        const process1A = process1Levels.find((l) => l.id === 'P00001');
        process1A.hints = [...process1A.hints, [4, 5]];
        process1A.hintRecords = [...process1A.hintRecords, { path: [4, 5], provenance: [] }];

        // "Process 2" reads the corpus (before process 1 writes) and updates only level b.
        const process2Levels = readLevelsWithHints(levelsJsonPath);
        const process2B = process2Levels.find((l) => l.id === 'P00002');
        process2B.hints = [...process2B.hints, [6, 7]];
        process2B.hintRecords = [...process2B.hintRecords, { path: [6, 7], provenance: [] }];

        // Process 1 writes its full in-memory snapshot (a updated, b untouched/stale) first...
        writeLevelsWithHints(levelsJsonPath, process1Levels);
        // ...then process 2 writes its full in-memory snapshot (b updated, a untouched/stale).
        // Before the fix, this second write would revert level a's file back to its stale
        // 2-hint content, discarding process 1's real update.
        writeLevelsWithHints(levelsJsonPath, process2Levels);

        const final = readLevelsWithHints(levelsJsonPath);
        const finalA = final.find((l) => l.id === 'P00001');
        const finalB = final.find((l) => l.id === 'P00002');
        assert.deepEqual(finalA.hints, [[0, 1], [4, 5]], "process 1's update to level a must survive process 2's later write");
        assert.deepEqual(finalB.hints, [[2, 3], [6, 7]], "process 2's own update to level b must be present");
    });
});

// ─── --levels spec parsing: pos:/id: prefix disambiguation ────────────────────────────────────
// A bare number used to mean "array position" in parseLevelPositions callers (solver:regression,
// solver:direct, ...) and "id-suffix lookup" in parseLevelSelector callers (hint-workbench.mjs,
// stress:measure-solver, ...) -- the exact same spec text silently meant something different depending
// on which tool you typed it into (CLAUDE.md's "--levels selector semantics differ by tool"
// gotcha). Both parsers now require an explicit pos:/id: prefix on any bare number/range instead.

test('parseLevelPositions (bounded): pos: prefix resolves positions; bare numbers/ranges throw', () => {
    assert.deepEqual(parseLevelPositions('pos:5', { maxLevel: 10 }), [5]);
    assert.deepEqual(parseLevelPositions('pos:1-3', { maxLevel: 10 }), [1, 2, 3]);
    assert.deepEqual(parseLevelPositions('pos:1,pos:3-4', { maxLevel: 10 }), [1, 3, 4]);
    assert.deepEqual(parseLevelPositions('all', { maxLevel: 3 }), [1, 2, 3]);
    assert.deepEqual(parseLevelPositions('', { maxLevel: 3 }), [1, 2, 3]);
    assert.throws(() => parseLevelPositions('5', { maxLevel: 10 }), AmbiguousLevelSpecError);
    assert.throws(() => parseLevelPositions('1-3', { maxLevel: 10 }), AmbiguousLevelSpecError);
});

test('parseLevelPositions (bounded): id: is rejected -- this parser has no id-resolution data', () => {
    assert.throws(() => parseLevelPositions('id:5', { maxLevel: 10 }), AmbiguousLevelSpecError);
});

test('parseLevelPositions (unbounded): same pos:-required contract, returns a Set', () => {
    assert.deepEqual(parseLevelPositions('pos:5'), new Set([5]));
    assert.deepEqual(parseLevelPositions('pos:1-3'), new Set([1, 2, 3]));
    assert.equal(parseLevelPositions(''), null);
    assert.equal(parseLevelPositions('all'), null);
    assert.throws(() => parseLevelPositions('5'), AmbiguousLevelSpecError);
});

function makeMixedIdLevels() {
    return [{ id: 'S00001' }, { id: 'S00002' }, { id: 'R00050' }];
}

test('parseLevelSelector: pos:/id: prefixes and full id strings resolve; bare numbers throw', () => {
    const levels = makeMixedIdLevels();
    assert.deepEqual(parseLevelSelector(levels, 'S00001'), new Set([1]), 'a full id string needs no prefix');
    assert.deepEqual(parseLevelSelector(levels, 'pos:2'), new Set([2]));
    assert.deepEqual(parseLevelSelector(levels, 'id:1'), new Set([1]), 'id:1 matches S00001, not R00001 (which does not exist)');
    assert.deepEqual(parseLevelSelector(levels, 'id:50'), new Set([3]), 'id:50 matches R00050');
    assert.deepEqual(parseLevelSelector(levels, 'pos:1-2'), new Set([1, 2]));
    assert.deepEqual(parseLevelSelector(levels, 'all'), new Set([1, 2, 3]));
    assert.throws(() => parseLevelSelector(levels, '1'), AmbiguousLevelSpecError);
    assert.throws(() => parseLevelSelector(levels, '1-2'), AmbiguousLevelSpecError);
});

test('parseLevelSelector: id: on a corpus with no id field falls back to position (explicit, not a silent default)', () => {
    const levels = [{}, {}, {}];
    assert.deepEqual(parseLevelSelector(levels, 'id:2'), new Set([2]));
});

test('selectLevelsBySpec: same pos:/id: resolution, returns the filtered levels array', () => {
    const levels = makeMixedIdLevels();
    assert.deepEqual(selectLevelsBySpec(levels, 'id:50'), [{ id: 'R00050' }]);
    assert.throws(() => selectLevelsBySpec(levels, '50'), AmbiguousLevelSpecError);
});
