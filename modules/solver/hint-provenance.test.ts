/** Unit tests for hint provenance derivation — specifically that a repair solve's randomSeed is
 *  carried through, so a randomized find is reproducible (it was silently lost before: the sweep
 *  passes ctx.randomSeed: null, and the seed was never recorded on the attempt). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { deriveSolveAttemptInfo, provenanceFromSolveResult, hintsFromVarietyResult } from './hint-provenance.js';
import { repairPrimarySeed } from './repair-search.js';

test('hintsFromVarietyResult records the prefix-anchor seed on prefix-anchored finds only', () => {
  const result = {
    newlySaved: [[1, 2, 3], [4, 5, 6]],
    newlySavedMeta: [
      { nodesExpanded: 10, elapsedMs: 1, technique: 'prefix-anchored', anchorSeed: 'abc12', anchorDepth: 28 },
      { nodesExpanded: 20, elapsedMs: 2, technique: 'enumerate-targeted', anchorSeed: null, anchorDepth: null },
    ],
  };
  const [anchored, cold] = hintsFromVarietyResult(result, {});
  assert.equal(anchored.provenance[0].solver.technique, 'prefix-anchored');
  assert.equal(anchored.provenance[0].solver.forcing.anchorSeed, 'abc12');
  assert.equal(anchored.provenance[0].solver.forcing.anchorDepth, 28);
  // a cold enumeration find has no anchor concept -> forcing stays null
  assert.equal(cold.provenance[0].solver.forcing, null);
});

test('deriveSolveAttemptInfo carries the winning repair attempt randomSeed', () => {
  const attempts = [
    { profile: 'objectiveFirst', beamWidth: 5000, ok: false, elapsedMs: 10 },
    { profile: 'repair', repair: true, ok: true, elapsedMs: 42, randomSeed: 123456 },
  ];
  const info = deriveSolveAttemptInfo(attempts);
  assert.equal(info.technique, 'repair');
  assert.equal(info.randomSeed, 123456);
});

test('deriveSolveAttemptInfo leaves randomSeed null for a deterministic dfs/beam winner', () => {
  const info = deriveSolveAttemptInfo([{ profile: 'perimeterSweep', ok: true, elapsedMs: 5 }]);
  assert.equal(info.technique, 'dfs');
  assert.equal(info.randomSeed, null);
});

test('provenanceFromSolveResult prefers the winning attempt seed over ctx (repair solve is reproducible)', () => {
  const result = {
    status: 'success',
    attempts: [{ profile: 'repair', repair: true, ok: true, elapsedMs: 42, randomSeed: 987654 }],
  };
  // ctx.randomSeed is null (exactly what portfolio-solve-sweep passes) — the winning attempt's own
  // seed must still land in the provenance rather than being lost to the null.
  const entry = provenanceFromSolveResult(result, { randomSeed: null });
  assert.equal(entry.solver.technique, 'repair');
  assert.equal(entry.search.randomSeed, 987654);
});

test('provenanceFromSolveResult leaves randomSeed null for a deterministic winner', () => {
  const result = { status: 'success', attempts: [{ profile: 'perimeterSweep', template: 'perimeterCW', ok: true }] };
  const entry = provenanceFromSolveResult(result, { randomSeed: null });
  assert.equal(entry.solver.technique, 'dfs');
  assert.equal(entry.search.randomSeed, null);
});

test('repairPrimarySeed is a stable, uint32, pure function of (startKey, seedSalt)', () => {
  const a = repairPrimarySeed(0x1234, 0);
  assert.equal(a, repairPrimarySeed(0x1234, 0), 'deterministic for the same inputs');
  assert.ok(a >= 0 && a <= 0xFFFFFFFF && Number.isInteger(a), 'is a uint32');
  assert.notEqual(repairPrimarySeed(0x1234, 1), a, 'a different seedSalt changes the seed');
});
