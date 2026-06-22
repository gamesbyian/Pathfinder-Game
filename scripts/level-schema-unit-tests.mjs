#!/usr/bin/env node
/** Unit tests for modules/domain/level-schema.js (validateRawLevel)
 *  and parseRawLevelDetailed from modules/domain/level-codec.js. */
import assert from 'node:assert/strict';
import { test, run } from './test-lib/harness.mjs';
import { validateRawLevel } from '../modules/domain/level-schema.js';

globalThis.window = globalThis;
const { parseRawLevelDetailed } = await import('../modules/domain/level-codec.js');


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
    const { level } = parseRawLevelDetailed(VALID, 0);
    // goal is (5,9) 1-indexed → (4,8) 0-indexed → PACK(4,8)
    const expected = (8 << 16) | 4;
    assert.equal(level.goalKey, expected);
});

test('parseRawLevelDetailed level has correct gateKeys length', () => {
    const { level } = parseRawLevelDetailed(VALID, 0);
    assert.equal(level.gateKeys.length, 1);
});

test('parseRawLevelDetailed level has correct grid', () => {
    const { level } = parseRawLevelDetailed(VALID, 0);
    assert.deepEqual(level.grid, { w: 9, h: 9 });
});

test('parseRawLevelDetailed level.id matches passed id', () => {
    const { level } = parseRawLevelDetailed(VALID, 42);
    assert.equal(level.id, 42);
});

test('parseRawLevelDetailed level has empty Sets/Maps for absent optional fields', () => {
    const { level } = parseRawLevelDetailed(VALID, 0);
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
    const { level } = parseRawLevelDetailed(raw, 0);
    assert.equal(level.blockSet.size, 2);
});

test('parseRawLevelDetailed populates portalMap from portals array', () => {
    const raw = { ...VALID, portals: [{ x1: 2, y1: 2, x2: 7, y2: 7 }] };
    const { level } = parseRawLevelDetailed(raw, 0);
    assert.equal(level.portalMap.size, 2); // both directions
});

// ─── Summary ──────────────────────────────────────────────────────────────────

await run('Level schema / parseRawLevelDetailed');
