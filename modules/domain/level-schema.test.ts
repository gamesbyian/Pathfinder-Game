/** Unit tests for modules/domain/level-schema.js (validateRawLevel)
 *  and parseRawLevelDetailed from modules/domain/level-codec.js. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { validateRawLevel } from './level-schema.js';

(globalThis as any).window = globalThis;
const { parseRawLevelDetailed } = await import('./level-codec.js');


// Minimal valid raw level fixture.
const VALID = Object.freeze({
    grid:  { w: 9, h: 9 },
    gates: [{ x: 5, y: 1 }],
    goal:  { x: 5, y: 9 },
    reqLen: 10,
    reqInt: 0,
});

// ─── validateRawLevel: structural rejections ──────────────────────────────────

test('rejects null', () => {
    const { ok, errors } = validateRawLevel(null);
    assert.equal(ok, false);
    assert.ok(errors.length > 0);
});

test('rejects non-object (string)', () => {
    const { ok } = validateRawLevel('bad');
    assert.equal(ok, false);
});

test('rejects missing grid', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, grid: undefined });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('grid')));
});

test('rejects grid.w = 0', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, grid: { w: 0, h: 9 } });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('grid.w')));
});

test('rejects grid.h as float', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, grid: { w: 9, h: 1.5 } });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('grid.h')));
});

test('rejects a non-square grid', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, grid: { w: 15, h: 10 }, goal: { x: 5, y: 9 }, gates: [{ x: 5, y: 1 }] });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('square')));
});

test('rejects square grids beyond the solver packed-key envelope', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, grid: { w: 16, h: 16 } });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e === 'grid.w must not exceed 15'), errors.join('; '));
    assert.ok(errors.some(e => e === 'grid.h must not exceed 15'), errors.join('; '));
});

test('rejects missing goal', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, goal: undefined });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('goal')));
});

test('rejects goal with x=0 (not positive)', () => {
    const { ok } = validateRawLevel({ ...VALID, goal: { x: 0, y: 5 } });
    assert.equal(ok, false);
});

test('rejects goal out of grid bounds', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, goal: { x: 10, y: 1 } });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('goal') && e.includes('out of')));
});

test('rejects missing gates', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, gates: undefined });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('gates')));
});

test('rejects empty gates array', () => {
    const { ok } = validateRawLevel({ ...VALID, gates: [] });
    assert.equal(ok, false);
});

test('rejects gate out of bounds', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, gates: [{ x: 10, y: 1 }] });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('gates[0]') && e.includes('out of bounds')));
});

test('rejects reqLen = 0', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, reqLen: 0 });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('reqLen')));
});

test('rejects reqLen = negative', () => {
    const { ok } = validateRawLevel({ ...VALID, reqLen: -1 });
    assert.equal(ok, false);
});

test('rejects reqLen = float', () => {
    const { ok } = validateRawLevel({ ...VALID, reqLen: 5.5 });
    assert.equal(ok, false);
});

test('rejects reqInt = negative', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, reqInt: -1 });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('reqInt')));
});

// ─── validateRawLevel: accepts valid inputs ───────────────────────────────────

test('accepts minimal valid level', () => {
    const { ok, errors } = validateRawLevel(VALID);
    assert.equal(ok, true);
    assert.deepEqual(errors, []);
});

test('accepts reqInt = 0', () => {
    const { ok } = validateRawLevel({ ...VALID, reqInt: 0 });
    assert.equal(ok, true);
});

test('accepts reqInt = 5', () => {
    const { ok } = validateRawLevel({ ...VALID, reqInt: 5 });
    assert.equal(ok, true);
});

test('accepts optional blocks array', () => {
    const { ok } = validateRawLevel({ ...VALID, blocks: [{ x: 3, y: 3 }] });
    assert.equal(ok, true);
});

test('rejects block out of bounds', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, blocks: [{ x: 99, y: 1 }] });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('blocks[0]') && e.includes('out of bounds')));
});

test('accepts optional geese array', () => {
    const { ok } = validateRawLevel({ ...VALID, geese: [{ x: 2, y: 2 }] });
    assert.equal(ok, true);
});

test('accepts mustPass and mustCross', () => {
    const { ok } = validateRawLevel({
        ...VALID,
        mustPass:  [{ x: 3, y: 3 }],
        mustCross: [{ x: 5, y: 5 }],
    });
    assert.equal(ok, true);
});

test('accepts valid filter with axis=1', () => {
    const { ok } = validateRawLevel({ ...VALID, filters: [{ x: 4, y: 4, axis: 1 }] });
    assert.equal(ok, true);
});

test('accepts valid flippingFilter with axis=2', () => {
    const { ok } = validateRawLevel({ ...VALID, flippingFilters: [{ x: 4, y: 4, axis: 2 }] });
    assert.equal(ok, true);
});

test('rejects filter with axis=3', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, filters: [{ x: 4, y: 4, axis: 3 }] });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('axis')));
});

test('accepts valid portal pair', () => {
    const { ok } = validateRawLevel({
        ...VALID,
        portals: [{ x1: 2, y1: 2, x2: 7, y2: 7 }],
    });
    assert.equal(ok, true);
});

test('rejects portal endpoint out of bounds', () => {
    const { ok, errors } = validateRawLevel({
        ...VALID,
        portals: [{ x1: 2, y1: 2, x2: 99, y2: 7 }],
    });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('portals[0]') && e.includes('out of bounds')));
});

test('accepts optional designerName and description strings', () => {
    const { ok } = validateRawLevel({
        ...VALID,
        designerName: 'Alice',
        description: 'A tricky level',
    });
    assert.equal(ok, true);
});

test('rejects designerName as number', () => {
    const { ok } = validateRawLevel({ ...VALID, designerName: 42 });
    assert.equal(ok, false);
});

test('rejects hints as non-array', () => {
    const { ok } = validateRawLevel({ ...VALID, hints: 'bad' });
    assert.equal(ok, false);
});

// ─── parseRawLevelDetailed ────────────────────────────────────────────────────

test('parseRawLevelDetailed returns ok+level for valid raw', () => {
    const { ok, level, errors } = parseRawLevelDetailed(VALID, 0);
    assert.equal(ok, true);
    assert.ok(level !== null);
    assert.deepEqual(errors, []);
});

test('parseRawLevelDetailed level has correct goalKey', () => {
    const level = parseRawLevelDetailed(VALID, 0).level as any;
    // goal is (5,9) 1-indexed → (4,8) 0-indexed → PACK(4,8)
    const expected = (8 << 16) | 4;
    assert.equal(level.goalKey, expected);
});

test('parseRawLevelDetailed level has correct gateKeys length', () => {
    const level = parseRawLevelDetailed(VALID, 0).level as any;
    assert.equal(level.gateKeys.length, 1);
});

test('parseRawLevelDetailed level has correct grid', () => {
    const level = parseRawLevelDetailed(VALID, 0).level as any;
    assert.deepEqual(level.grid, { w: 9, h: 9 });
});

test('parseRawLevelDetailed level.id matches passed id', () => {
    const level = parseRawLevelDetailed(VALID, 42).level as any;
    assert.equal(level.id, 42);
});

test('parseRawLevelDetailed level has empty Sets/Maps for absent optional fields', () => {
    const level = parseRawLevelDetailed(VALID, 0).level as any;
    assert.equal(level.blockSet.size, 0);
    assert.equal(level.gooseSet.size, 0);
    assert.equal(level.falseGoalKeys.size, 0);
    assert.equal(level.portalMap.size, 0);
    assert.equal(level.filterMap.size, 0);
    assert.equal(level.flippingFilterMap.size, 0);
    assert.deepEqual(level.mustPassKeys, []);
    assert.deepEqual(level.mustCrossKeys, []);
});

test('parseRawLevelDetailed returns failure for missing goal', () => {
    const { ok, level, errors } = parseRawLevelDetailed({ ...VALID, goal: undefined });
    assert.equal(ok, false);
    assert.equal(level, null);
    assert.ok(errors.length > 0);
    assert.ok(errors.some(e => e.includes('goal')));
});

test('parseRawLevelDetailed returns failure for invalid reqLen', () => {
    const { ok, errors } = parseRawLevelDetailed({ ...VALID, reqLen: 0 });
    assert.equal(ok, false);
    assert.ok(errors.some(e => e.includes('reqLen')));
});

test('parseRawLevelDetailed populates blockSet from blocks array', () => {
    const raw = { ...VALID, blocks: [{ x: 3, y: 3 }, { x: 4, y: 4 }] };
    const level = parseRawLevelDetailed(raw, 0).level as any;
    assert.equal(level.blockSet.size, 2);
});

test('parseRawLevelDetailed populates portalMap from portals array', () => {
    const raw = { ...VALID, portals: [{ x1: 2, y1: 2, x2: 7, y2: 7 }] };
    const level = parseRawLevelDetailed(raw, 0).level as any;
    assert.equal(level.portalMap.size, 2); // both directions
});

// ─── Cross-object occupancy: one object per cell ──────────────────────────────
// Regression coverage for a real stress-corpus bug: a generated level's portal destination
// silently coincided with the goal cell, because nothing checked for cross-object overlap at
// the raw wire-format layer. See CLAUDE.md's "Cell occupancy is an absolute invariant" note.

test('accepts a level with no cross-object overlaps', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, blocks: [{ x: 3, y: 3 }], mustPass: [{ x: 4, y: 4 }] });
    assert.equal(ok, true, errors.join('; '));
});

test('rejects a portal destination coinciding with the goal', () => {
    const raw = { ...VALID, portals: [{ x1: 2, y1: 2, x2: VALID.goal.x, y2: VALID.goal.y }] };
    const { ok, errors } = validateRawLevel(raw);
    assert.equal(ok, false);
    assert.ok(errors.some(e => /overlaps existing goal/.test(e)), errors.join('; '));
});

test('rejects a block coinciding with a mustPass cell', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, blocks: [{ x: 3, y: 3 }], mustPass: [{ x: 3, y: 3 }] });
    assert.equal(ok, false);
    assert.ok(errors.some(e => /overlaps existing block/.test(e)), errors.join('; '));
});

// Regression for a real bug (2026-07-15): denormalizeLevel's wire output (buildWireLevelData,
// the real editor/submission export path) legitimately re-declares an impassable landmark's cell
// in `blocks` (and a mustPass/mustTurn landmark's cell in `mustPass`) alongside its own
// `landmarks` entry -- see level-codec-roundtrip.test.ts's "buildWireLevelData round-trip
// preserves landmark mechanics". validateRawLevel used to flag this as a conflict, meaning any
// level with a landmark that went through the real export path could never pass this check --
// undetected until a real player submitted one and levels:import-published tried to pull it in.
// modules/domain/level-validation.test.ts already covered the analogous case for the normalized
// (validateLevelDetailed) layer; this is the same coverage for the raw wire-format layer.
test('accepts a landmark whose own derived block/mustPass entry coincides with it', () => {
    const surround = validateRawLevel({ ...VALID, landmarks: [{ x: 5, y: 5, objectType: 'park', role: 'surround' }], blocks: [{ x: 5, y: 5 }] });
    assert.equal(surround.ok, true, surround.errors.join('; '));

    const adjacentTurn = validateRawLevel({ ...VALID, landmarks: [{ x: 5, y: 5, objectType: 'fountain', role: 'adjacentTurn' }], blocks: [{ x: 5, y: 5 }] });
    assert.equal(adjacentTurn.ok, true, adjacentTurn.errors.join('; '));

    const mustPass = validateRawLevel({ ...VALID, landmarks: [{ x: 5, y: 5, objectType: 'library', role: 'mustPass' }], mustPass: [{ x: 5, y: 5 }] });
    assert.equal(mustPass.ok, true, mustPass.errors.join('; '));

    const mustTurn = validateRawLevel({ ...VALID, landmarks: [{ x: 5, y: 5, objectType: 'library', role: 'mustTurnCw' }], mustPass: [{ x: 5, y: 5 }] });
    assert.equal(mustTurn.ok, true, mustTurn.errors.join('; '));
});

test('still rejects a block at a mustPass-role landmark cell (mismatched role, not the same object)', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, landmarks: [{ x: 5, y: 5, objectType: 'library', role: 'mustPass' }], blocks: [{ x: 5, y: 5 }] });
    assert.equal(ok, false);
    assert.ok(errors.some(e => /block at \(5,5\) overlaps existing landmark/.test(e)), errors.join('; '));
});

// Regression coverage for the (1<<n)-1 mechanic-cardinality gap documented in
// docs/mechanic-state-contracts.md's "Cardinality risk" section: solver/prep.ts's initial bitmask
// for must-pass/must-cross/surround/mustTurn/adjacentTurn is only correct for n <= 30 objects
// (1 << 31 is JS's int32 sign bit, not +2^31). mustPass/mustCross were already safe via a
// documented 4-object design maximum; these tests cover the previously-unguarded landmark roles.
function manyCoords(n: number): { x: number; y: number }[] {
    const coords: { x: number; y: number }[] = [];
    for (let y = 1; y <= 9 && coords.length < n; y++) {
        for (let x = 1; x <= 9 && coords.length < n; x++) {
            if ((x === 5 && y === 1) || (x === 5 && y === 9)) continue; // skip gate/goal
            coords.push({ x, y });
        }
    }
    return coords;
}

test('accepts exactly 30 mustPass cells (the bitmask boundary)', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, mustPass: manyCoords(30) });
    assert.equal(ok, true, errors.join('; '));
});

test('accepts 32 flipping filters but rejects a 33rd that would alias bit zero', () => {
    const flippingFilters = manyCoords(32).map(({ x, y }) => ({ x, y, axis: 1 }));
    const boundary = validateRawLevel({ ...VALID, grid: { w: 15, h: 15 }, flippingFilters });
    assert.equal(boundary.ok, true, boundary.errors.join('; '));

    const overflow = validateRawLevel({
        ...VALID,
        grid: { w: 15, h: 15 },
        flippingFilters: [...flippingFilters, { x: 9, y: 9, axis: 1 }],
    });
    assert.equal(overflow.ok, false);
    assert.ok(overflow.errors.some(e => /flippingFilters count \(33\) exceeds the maximum of 32/.test(e)), overflow.errors.join('; '));
});

test('rejects 31 mustPass cells (exceeds the bitmask bound)', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, mustPass: manyCoords(31) });
    assert.equal(ok, false);
    assert.ok(errors.some(e => /mustPass.*exceeds the maximum of 30/.test(e)), errors.join('; '));
});

test('rejects 31 mustCross cells (exceeds the bitmask bound)', () => {
    const { ok, errors } = validateRawLevel({ ...VALID, mustCross: manyCoords(31) });
    assert.equal(ok, false);
    assert.ok(errors.some(e => /mustCross.*exceeds the maximum of 30/.test(e)), errors.join('; '));
});

test('rejects 31 surround landmarks (exceeds the bitmask bound)', () => {
    const landmarks = manyCoords(31).map(c => ({ ...c, objectType: 'park', role: 'surround' }));
    const { ok, errors } = validateRawLevel({ ...VALID, landmarks });
    assert.equal(ok, false);
    assert.ok(errors.some(e => /surround landmarks.*exceeds the maximum of 30/.test(e)), errors.join('; '));
});

test('rejects 31 adjacentTurn landmarks (exceeds the bitmask bound)', () => {
    const landmarks = manyCoords(31).map(c => ({ ...c, objectType: 'fountain', role: 'adjacentTurn' }));
    const { ok, errors } = validateRawLevel({ ...VALID, landmarks });
    assert.equal(ok, false);
    assert.ok(errors.some(e => /adjacentTurn landmarks.*exceeds the maximum of 30/.test(e)), errors.join('; '));
});

test('counts mustTurn-role landmarks toward the mustPass bound too (they are also must-pass cells)', () => {
    const landmarks = manyCoords(31).map(c => ({ ...c, objectType: 'library', role: 'mustTurn', turn: 'either' }));
    const { ok, errors } = validateRawLevel({ ...VALID, landmarks });
    assert.equal(ok, false);
    assert.ok(errors.some(e => /mustPass.*exceeds the maximum of 30/.test(e)), errors.join('; '));
    assert.ok(errors.some(e => /mustTurn landmarks.*exceeds the maximum of 30/.test(e)), errors.join('; '));
});

test('does not double-count a mustTurn landmark\'s own re-declared cell in mustPass', () => {
    // buildWireLevelData's real wire output re-declares a mustTurn-role landmark's cell in
    // `mustPass` alongside its own `landmarks` entry (same cell, one conceptual object — see
    // the occupancy-check comments in level-schema.ts). Naively summing raw.mustPass.length with
    // the landmark role counts would double every one of these cells; distinct-cell counting
    // must see only 20 real mustPass-family cells here, well under the bound of 30.
    const coords = manyCoords(20);
    const landmarks = coords.map(c => ({ ...c, objectType: 'library', role: 'mustTurn', turn: 'either' }));
    const { ok, errors } = validateRawLevel({ ...VALID, mustPass: coords, landmarks });
    assert.equal(ok, true, errors.join('; '));
});

test('rejects two different portal pairs sharing a terminal', () => {
    const raw = { ...VALID, portals: [{ x1: 2, y1: 2, x2: 3, y2: 3 }, { x1: 3, y1: 3, x2: 4, y2: 4 }] };
    const { ok, errors } = validateRawLevel(raw);
    assert.equal(ok, false);
    assert.ok(errors.some(e => /overlaps existing portal/.test(e)), errors.join('; '));
});

test('rejects a portal whose own endpoints coincide', () => {
    const raw = { ...VALID, portals: [{ x1: 3, y1: 3, x2: 3, y2: 3 }] };
    const { ok, errors } = validateRawLevel(raw);
    assert.equal(ok, false);
    assert.ok(errors.some(e => /endpoints must not coincide/.test(e)), errors.join('; '));
});

// ─── Summary ──────────────────────────────────────────────────────────────────
