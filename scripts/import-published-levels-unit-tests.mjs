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
import { levelFingerprint, mergeNewHints, normalizeLevel, makeLevelIdMinter, hasProvenance, ensureProvenance } from './import-published-levels.mjs';

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
// appended as a duplicate instead of merging its new hints. The shared domain levelFingerprint
// (v2) canonicalizes by mechanics and considers them the same.
test('levelFingerprint matches a landmark-only level against its canonical form with the derived block', () => {
  const landmarkOnly = rawLevel({ landmarks: [{ x: 3, y: 3, objectType: 'park', role: 'surround' }] });
  const canonicalForm = rawLevel({
    blocks: [{ x: 3, y: 3 }],
    landmarks: [{ x: 3, y: 3, objectType: 'park', role: 'surround' }],
  });
  assert.equal(levelFingerprint(landmarkOnly), levelFingerprint(canonicalForm));
});

test('levelFingerprint matches a must-turn landmark-only level against its canonical form with the derived must-pass', () => {
  const landmarkOnly = rawLevel({ landmarks: [{ x: 2, y: 2, objectType: 'library', role: 'mustTurn', turn: 'ccw' }] });
  const canonicalForm = rawLevel({
    mustPass: [{ x: 2, y: 2 }],
    landmarks: [{ x: 2, y: 2, objectType: 'library', role: 'mustTurnCcw' }],
  });
  assert.equal(levelFingerprint(landmarkOnly), levelFingerprint(canonicalForm));
});

test('levelFingerprint still distinguishes a plain block from a landmark at the same cell', () => {
  const plainBlock = rawLevel({ blocks: [{ x: 3, y: 3 }] });
  const landmarkBlock = rawLevel({
    blocks: [{ x: 3, y: 3 }],
    landmarks: [{ x: 3, y: 3, objectType: 'park', role: 'surround' }],
  });
  assert.notEqual(levelFingerprint(plainBlock), levelFingerprint(landmarkBlock));
});

test('levelFingerprint ignores hints/designerName/description/difficulty', () => {
  const a = rawLevel({ hints: [[1, 2, 3]], designerName: 'Alice', description: 'x', difficulty: 5 });
  const b = rawLevel({ hints: [[4, 5]], designerName: 'Bob', description: 'y', difficulty: 1 });
  assert.equal(levelFingerprint(a), levelFingerprint(b));
});

test('levelFingerprint differs for a genuinely different structural level', () => {
  const a = rawLevel({ reqLen: 8 });
  const b = rawLevel({ reqLen: 9 });
  assert.notEqual(levelFingerprint(a), levelFingerprint(b));
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

// Regression: a real Firestore published_levels submission was found (2026-07-15) storing hints
// as JSON-stringified canonical Hint objects ({path, provenance}) rather than bare paths -- the
// dual-field provenance pattern postdates this script's original decodeHints, which assumed
// JSON.parse(hint) always yielded a bare number[] and crashed downstream in hintPathSignature
// ("path.join is not a function") once it hit a real submission using the newer shape.
test('normalizeLevel keeps bare paths in .hints AND preserves provenance in .hintRecords', () => {
  const n = normalizeLevel({ hints: [JSON.stringify({ path: [1, 2, 3], provenance: [{ solver: { id: 'x', technique: 'y' } }] })] });
  assert.deepEqual(n.hints, [[1, 2, 3]]);
  // Regression: the import used to strip provenance here (hintPaths flattening) so every imported
  // player hint landed with empty provenance. It must now survive into .hintRecords.
  assert.equal(n.hintRecords.length, 1);
  assert.deepEqual(n.hintRecords[0].path, [1, 2, 3]);
  assert.equal(n.hintRecords[0].provenance[0].solver.technique, 'y');
});

test('normalizeLevel handles a mix of bare-path and {path, provenance} hints in the same level', () => {
  const n = normalizeLevel({
    hints: [
      JSON.stringify([1, 2, 3]),
      JSON.stringify({ path: [4, 5, 6], provenance: [] }),
      [7, 8, 9],
    ],
  });
  assert.deepEqual(n.hints, [[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
});

// --- mergeNewHints ---

test('mergeNewHints appends only hints not already present, deduped by path signature', () => {
  const target = { hints: [[1, 2], [3, 4]] };
  const added = mergeNewHints(target, { hints: [[3, 4], [5, 6]] });
  assert.equal(added, 1);
  assert.deepEqual(target.hints, [[1, 2], [3, 4], [5, 6]]);
});

test('mergeNewHints is uncapped for scripts — a level past 1000 hints still gains new unique paths', () => {
  const target = { hints: Array.from({ length: 1000 }, (_, i) => [i]) };
  const added = mergeNewHints(target, { hints: [[9999]] });
  // The 1000-hint cap was a UI-latency guard, not a data limit — scripts only dedup, never truncate.
  assert.equal(added, 1);
  assert.equal(target.hints.length, 1001);
});

test('mergeNewHints initializes a missing hints array on the target', () => {
  const target = {};
  const added = mergeNewHints(target, { hints: [[1, 2]] });
  assert.equal(added, 1);
  assert.deepEqual(target.hints, [[1, 2]]);
});

test('mergeNewHints threads a new hint\'s provenance into target.hintRecords', () => {
  const target = { hints: [[1, 2]], hintRecords: [{ path: [1, 2], provenance: [] }] };
  const incoming = { hints: [[3, 4]], hintRecords: [{ path: [3, 4], provenance: [{ solver: { id: 'p', technique: 'manual-path' } }] }] };
  const added = mergeNewHints(target, incoming);
  assert.equal(added, 1);
  assert.deepEqual(target.hints, [[1, 2], [3, 4]]);
  assert.equal(target.hintRecords.length, 2);
  assert.equal(target.hintRecords[1].provenance[0].solver.technique, 'manual-path');
});

// --- makeLevelIdMinter ---

test('makeLevelIdMinter starts at P00001 when no level has an id yet', () => {
  const mint = makeLevelIdMinter([{}, {}]);
  assert.equal(mint(), 'P00001');
  assert.equal(mint(), 'P00002');
});

test('makeLevelIdMinter resumes after the highest existing numeric suffix, never reusing one', () => {
  const mint = makeLevelIdMinter([{ id: 'P00001' }, { id: 'P00156' }, { id: 'P00042' }]);
  assert.equal(mint(), 'P00157');
  assert.equal(mint(), 'P00158');
});

test('makeLevelIdMinter ignores non-string/malformed ids when finding the starting point', () => {
  const mint = makeLevelIdMinter([{ id: 'P00005' }, { id: 123 }, { id: null }, {}]);
  assert.equal(mint(), 'P00006');
});

// --- hasProvenance / ensureProvenance ---

test('hasProvenance is false for missing, null, or empty-history provenance', () => {
  assert.equal(hasProvenance({}), false);
  assert.equal(hasProvenance({ provenance: null }), false);
  assert.equal(hasProvenance({ provenance: { history: [] } }), false);
  assert.equal(hasProvenance({ provenance: { history: [{ actor: 'human' }] } }), true);
});

test('ensureProvenance leaves a level with real provenance untouched', () => {
  const withReal = { id: 'P00099', provenance: { history: [{ actor: 'human', action: 'submitted' }], origin: 'human', confidence: 'certain' } };
  assert.equal(ensureProvenance(withReal), withReal);
});

// Regression: a real Firestore published_levels doc was found (2026-07-15) with no provenance at
// all (predates the submission/review provenance-stamping feature), which check:level-provenance
// hard-fails on -- import-published-levels.mjs must stamp something rather than let a straggler
// old submission silently break CI on whatever future run happens to pull it in.
test('ensureProvenance stamps an unknown/unverified entry on a level with no provenance', () => {
  const bare = { id: 'P00100', grid: { w: 5, h: 5 } };
  const stamped = ensureProvenance(bare);
  assert.equal(hasProvenance(stamped), true);
  assert.equal(stamped.provenance.confidence, 'unverified');
  assert.equal(stamped.provenance.origin, 'unknown');
  assert.equal(stamped.provenance.history.length, 1);
  assert.equal(stamped.provenance.history[0].actor, 'unknown');
  assert.equal(stamped.provenance.history[0].action, 'imported-without-provenance');
  assert.equal(stamped.provenance.history[0].method, 'levels:import-published');
});
