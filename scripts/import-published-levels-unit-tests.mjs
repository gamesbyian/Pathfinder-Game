#!/usr/bin/env node
/**
 * Unit tests for scripts/import-published-levels.mjs's pure helpers.
 *
 * Importing this module must NEVER trigger its main() (network fetch + data/levels.json
 * write) — main() is guarded behind an `import.meta.url === file://${process.argv[1]}`
 * check (see the bottom of the script), so importing it here is side-effect-free. Do not
 * remove that guard, and do not call main() or spawn the script's CLI from tests.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { fingerprint, mergeNewHints, normalizeLevel } from './import-published-levels.mjs';

const rawLevel = (overrides = {}) => ({
  grid: { w: 5, h: 5 },
  gates: [{ x: 1, y: 1 }],
  goal: { x: 5, y: 5 },
  reqLen: 8,
  reqInt: 0,
  blocks: [], mustPass: [], mustCross: [], falseGoals: [], geese: [],
  filters: [], flippingFilters: [], portals: [], landmarks: [],
  designerName: '', description: '', difficulty: null, hints: [],
  ...overrides,
});

// This is the regression the fix targets: the script used to fingerprint with its own
// private stableStringify comparison, which treated a landmark-only raw level and its
// canonical export (landmark + the landmark's own derived block/mustPass cell) as
// DIFFERENT levels — so re-importing an already-bundled landmark level would have been
// appended as a duplicate instead of merging its new hints. The shared domain fingerprint
// (v2) canonicalizes by mechanics and considers them the same.
test('fingerprint matches a landmark-only level against its canonical form with the derived block', () => {
  const landmarkOnly = rawLevel({ landmarks: [{ x: 3, y: 3, objectType: 'park', role: 'surround' }] });
  const canonicalForm = rawLevel({
    blocks: [{ x: 3, y: 3 }],
    landmarks: [{ x: 3, y: 3, objectType: 'park', role: 'surround' }],
  });
  assert.equal(fingerprint(landmarkOnly), fingerprint(canonicalForm));
});

test('fingerprint matches a must-turn landmark-only level against its canonical form with the derived must-pass', () => {
  const landmarkOnly = rawLevel({ landmarks: [{ x: 2, y: 2, objectType: 'library', role: 'mustTurn', turn: 'left' }] });
  const canonicalForm = rawLevel({
    mustPass: [{ x: 2, y: 2 }],
    landmarks: [{ x: 2, y: 2, objectType: 'library', role: 'mustTurnLeft' }],
  });
  assert.equal(fingerprint(landmarkOnly), fingerprint(canonicalForm));
});

test('fingerprint still distinguishes a plain block from a landmark at the same cell', () => {
  const plainBlock = rawLevel({ blocks: [{ x: 3, y: 3 }] });
  const landmarkBlock = rawLevel({
    blocks: [{ x: 3, y: 3 }],
    landmarks: [{ x: 3, y: 3, objectType: 'park', role: 'surround' }],
  });
  assert.notEqual(fingerprint(plainBlock), fingerprint(landmarkBlock));
});

test('fingerprint ignores hints/designerName/description/difficulty', () => {
  const a = rawLevel({ hints: [[1, 2, 3]], designerName: 'Alice', description: 'x', difficulty: 5 });
  const b = rawLevel({ hints: [[4, 5]], designerName: 'Bob', description: 'y', difficulty: 1 });
  assert.equal(fingerprint(a), fingerprint(b));
});

test('fingerprint differs for a genuinely different structural level', () => {
  const a = rawLevel({ reqLen: 8 });
  const b = rawLevel({ reqLen: 9 });
  assert.notEqual(fingerprint(a), fingerprint(b));
});

// --- normalizeLevel ---

test('normalizeLevel fills designerName/description/difficulty/hints defaults', () => {
  const n = normalizeLevel({ grid: { w: 5, h: 5 } });
  assert.equal(n.designerName, '');
  assert.equal(n.description, '');
  assert.equal(n.difficulty, null);
  assert.deepEqual(n.hints, []);
});

test('normalizeLevel decodes stringified hint paths', () => {
  const n = normalizeLevel({ hints: [JSON.stringify([1, 2, 3])] });
  assert.deepEqual(n.hints, [[1, 2, 3]]);
});

// --- mergeNewHints ---

test('mergeNewHints appends only hints not already present, deduped by path signature', () => {
  const target = { hints: [[1, 2], [3, 4]] };
  const added = mergeNewHints(target, { hints: [[3, 4], [5, 6]] });
  assert.equal(added, 1);
  assert.deepEqual(target.hints, [[1, 2], [3, 4], [5, 6]]);
});

test('mergeNewHints stops at the per-level cap without truncating existing hints', () => {
  const target = { hints: Array.from({ length: 1000 }, (_, i) => [i]) };
  const added = mergeNewHints(target, { hints: [[9999]] });
  assert.equal(added, 0);
  assert.equal(target.hints.length, 1000);
});

test('mergeNewHints initializes a missing hints array on the target', () => {
  const target = {};
  const added = mergeNewHints(target, { hints: [[1, 2]] });
  assert.equal(added, 1);
  assert.deepEqual(target.hints, [[1, 2]]);
});
