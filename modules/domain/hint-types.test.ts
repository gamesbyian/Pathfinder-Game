/** Unit tests for hint provenance merge/dedup — a byte-identical entry (the same discovery event
 *  recorded twice) must not accumulate, while genuinely distinct rediscoveries are kept. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { makeProvenanceEntry, upgradeProvenanceEntry, dedupeProvenanceEntries, mergeHints, reconcileHints, toHint } from './hint-types.js';

test('dedupeProvenanceEntries collapses byte-identical entries, keeps distinct ones', () => {
  const e = makeProvenanceEntry('prefix-anchored', { foundAt: '2026-07-16T05:53:45.609Z', hintGuided: true, usedExistingHints: true });
  const other = makeProvenanceEntry('prefix-anchored', { foundAt: '2026-07-16T05:53:45.610Z', hintGuided: true, usedExistingHints: true });
  const out = dedupeProvenanceEntries([e, { ...e }, other]);
  assert.equal(out.length, 2, 'two identical entries collapse to one; the distinct-foundAt one stays');
  assert.equal(out[0].foundAt, e.foundAt);
  assert.equal(out[1].foundAt, other.foundAt);
});

test('mergeHints does not accumulate a byte-identical provenance entry on the same path', () => {
  const e = makeProvenanceEntry('prefix-anchored', { foundAt: '2026-07-16T05:53:45.609Z', hintGuided: true });
  const existing = [toHint([1, 2, 3], [e])];
  const merged = mergeHints(existing, [toHint([1, 2, 3], [{ ...e }])]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].provenance.length, 1, 're-merging the same event must not bloat provenance');
});

test('mergeHints keeps two genuinely distinct provenance entries for one path', () => {
  const a = makeProvenanceEntry('dfs', { foundAt: '2026-07-16T05:53:45.609Z' });
  const b = makeProvenanceEntry('beam', { foundAt: '2026-07-16T05:53:46.000Z' });
  const merged = mergeHints([toHint([1, 2], [a])], [toHint([1, 2], [b])]);
  assert.equal(merged[0].provenance.length, 2, 'a different technique finding the same path is recorded');
});

test('reconcileHints dedupes byte-identical entries while pairing paths to records', () => {
  const e = makeProvenanceEntry('repair', { randomSeed: 42, foundAt: '2026-07-16T05:53:45.609Z' });
  const out = reconcileHints([[1, 2, 3]], [toHint([1, 2, 3], [e]), toHint([1, 2, 3], [{ ...e }])]);
  assert.equal(out.length, 1);
  assert.equal(out[0].provenance.length, 1);
});

// forcingFromOpts's repair-variant fields (2026-07-23): passing only forcingRepairMustTurnBiased/
// forcingRepairTurnBiased (no other forcing* option) must still trigger `hasForcing` — otherwise a
// repair winner's variant distinction would silently stay unrecorded whenever it's the ONLY forcing
// fact this technique has to report (the common case: repair winners never set gateKey/direction/
// portalDest/anchorSeed etc).
test('makeProvenanceEntry sets non-null forcing from repair-variant fields alone', () => {
  const entry = makeProvenanceEntry('repair', { forcingRepairMustTurnBiased: true, forcingRepairTurnBiased: false });
  assert.ok(entry.solver.forcing, 'repair-variant fields alone must trigger non-null forcing');
  assert.equal(entry.solver.forcing.repairMustTurnBiased, true);
  assert.equal(entry.solver.forcing.repairTurnBiased, false);
  // every other forcing field stays null — this technique has no other forcing concept
  assert.equal(entry.solver.forcing.gateKey, null);
  assert.equal(entry.solver.forcing.anchorSeed, null);
});

test('makeProvenanceEntry leaves forcing null when no forcing* option is passed at all', () => {
  const entry = makeProvenanceEntry('dfs', { scoringProfileId: 'perimeterSweep' });
  assert.equal(entry.solver.forcing, null);
});

test('makeProvenanceEntry populates canonical solver config fields, gateKey and seedSalt', () => {
  const entry = makeProvenanceEntry('beam', {
    scoringProfileId: 'perimeterSweep', orderingBiasId: 'perimeterCW', beamWidth: 2000, mechanicBucketRetention: true, gateKey: 655370, seedSalt: 3,
  });
  assert.equal(entry.solver.beamWidth, 2000);
  assert.equal(entry.solver.scoringProfileId, 'perimeterSweep');
  assert.equal(entry.solver.orderingBiasId, 'perimeterCW');
  assert.equal(entry.solver.mechanicBucketRetention, true);
  assert.equal(entry.solver.gateKey, 655370);
  assert.equal(entry.search.seedSalt, 3);
});

test('makeProvenanceEntry defaults canonical solver config fields/gateKey/seedSalt to null when omitted', () => {
  const entry = makeProvenanceEntry('dfs', {});
  assert.equal(entry.solver.beamWidth, null);
  assert.equal(entry.solver.scoringProfileId, null);
  assert.equal(entry.solver.orderingBiasId, null);
  assert.equal(entry.solver.mechanicBucketRetention, null);
  assert.equal(entry.solver.gateKey, null);
  assert.equal(entry.search.seedSalt, null);
});


test('upgradeProvenanceEntry dual-reads historical nested profile/template/diverseBeam and single-writes canonical fields', () => {
  const upgraded = upgradeProvenanceEntry({
    solver: {
      id: 'pathfinder-solver', version: 'abc', technique: 'beam',
      profile: 'perimeterSweep', template: 'perimeterCW', beamWidth: 2000,
      diverseBeam: true, gateKey: 12, forcing: null, attemptIndex: 3,
    },
    search: { nodesExpanded: 10, elapsedMs: 1, budgetMs: 2, workSpent: null, workBudget: null, cumulativeNodesExpanded: 10, cumulativeElapsedMs: 1, cumulativeBudgetMs: 2, termination: 'solved', randomSeed: null, seedSalt: null },
    context: { usedExistingHints: false, hintGuided: false, levelRevision: null, isolatedTechnique: false },
    foundAt: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(upgraded.solver.scoringProfileId, 'perimeterSweep');
  assert.equal(upgraded.solver.orderingBiasId, 'perimeterCW');
  assert.equal(upgraded.solver.mechanicBucketRetention, true);
  assert.equal(Object.hasOwn(upgraded.solver, 'profile'), false);
  assert.equal(Object.hasOwn(upgraded.solver, 'template'), false);
  assert.equal(Object.hasOwn(upgraded.solver, 'diverseBeam'), false);
});
