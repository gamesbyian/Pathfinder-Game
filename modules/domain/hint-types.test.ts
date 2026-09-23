/** Unit tests for hint provenance merge/dedup — duplicate recording of the same discovery event
 *  must not accumulate, while genuinely distinct rediscoveries are kept. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { makeProvenanceEntry, upgradeProvenanceEntry, dedupeProvenanceEntries, mergeHints, reconcileHints, setLevelHintRecords, toHint, decodeHintArtifact } from './hint-types.js';

test('dedupeProvenanceEntries collapses recording-only differences and keeps evidence-bearing ones', () => {
  const e = makeProvenanceEntry('prefix-anchored', { foundAt: '2026-07-16T05:53:45.609Z', hintGuided: true, usedExistingHints: true });
  const timestampOnly = { ...e, foundAt: '2026-07-16T05:53:45.610Z' };
  const evidenceBearing = { ...e, search: { ...e.search, nodesExpanded: (e.search.nodesExpanded ?? 0) + 1 } };
  const out = dedupeProvenanceEntries([e, { ...e }, timestampOnly, evidenceBearing]);
  assert.equal(out.length, 2, 'timestamp-only re-recordings collapse; a different deterministic search result stays');
  assert.equal(out[0].foundAt, e.foundAt, 'the first recording is retained');
  assert.equal(out[1].search.nodesExpanded, evidenceBearing.search.nodesExpanded);
});

test('setLevelHintRecords makes canonical records authoritative and derives bare paths', () => {
  const level: { hints?: number[][]; hintRecords?: any[] } = { hints: [[9, 9]] };
  const records = [toHint([1, 2, 3]), toHint([4, 5, 6])];
  assert.equal(setLevelHintRecords(level, records), records);
  assert.equal(level.hintRecords, records);
  assert.deepEqual(level.hints, [[1, 2, 3], [4, 5, 6]]);
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

test('upgradeProvenanceEntry preserves historical absence of capability booleans instead of laundering it to false', () => {
  // Regression test for docs/hint-evidence-execution-identity-storage-consolidation-plan.md section
  // 13.1.B: a legacy nested entry that never tracked usedExistingHints/hintGuided/isolatedTechnique
  // must stay genuinely absent (Object.hasOwn === false) through upgrade, not become a modern
  // false that later callers (hasExplicitCapabilityContext / hasOwnBoolean) would misread as an
  // explicit observation. levelRevision/techniqueCensusCell keep their `null` default since null is
  // their real canonical "no value", not a laundered boolean.
  const upgraded = upgradeProvenanceEntry({
    solver: { id: 'pathfinder-solver', version: 'abc', technique: 'beam', beamWidth: 2000, gateKey: 12, forcing: null, attemptIndex: 3 },
    search: { nodesExpanded: 10, elapsedMs: 1, budgetMs: 2, workSpent: null, workBudget: null, cumulativeNodesExpanded: 10, cumulativeElapsedMs: 1, cumulativeBudgetMs: 2, termination: 'solved', randomSeed: null, seedSalt: null },
    context: {},
    foundAt: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(Object.hasOwn(upgraded.context, 'usedExistingHints'), false);
  assert.equal(Object.hasOwn(upgraded.context, 'hintGuided'), false);
  assert.equal(Object.hasOwn(upgraded.context, 'isolatedTechnique'), false);
  assert.equal(upgraded.context.levelRevision, null);

  const explicit = upgradeProvenanceEntry({
    solver: { id: 'pathfinder-solver', version: 'abc', technique: 'beam', beamWidth: 2000, gateKey: 12, forcing: null, attemptIndex: 3 },
    search: { nodesExpanded: 10, elapsedMs: 1, budgetMs: 2, workSpent: null, workBudget: null, cumulativeNodesExpanded: 10, cumulativeElapsedMs: 1, cumulativeBudgetMs: 2, termination: 'solved', randomSeed: null, seedSalt: null },
    context: { usedExistingHints: false, hintGuided: true, isolatedTechnique: false },
    foundAt: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(explicit.context.usedExistingHints, false, 'an already-explicit false is passed through unchanged, not stripped');
  assert.equal(explicit.context.hintGuided, true);
});

// ── decodeHintArtifact: shared browser/Node hint-artifact decode boundary ──────────────────────

test('decodeHintArtifact handles a bare path array (oldest legacy shape)', () => {
  assert.deepEqual(decodeHintArtifact([[1, 2, 3]]), [{ path: [1, 2, 3], provenance: [] }]);
});

test('decodeHintArtifact handles {hints: paths[]} with no provenance', () => {
  assert.deepEqual(decodeHintArtifact({ hints: [[1, 2, 3]] }), [{ path: [1, 2, 3], provenance: [] }]);
});

test('decodeHintArtifact reconstructs provenance from the transitional {hints, hintMetadata} sibling-array shape', () => {
  // This is the exact shape modules/data-asset-loaders.ts (browser) used to silently drop
  // provenance for before this shared decoder existed — see hint-runtime.mjs's decodeHintArtifact
  // doc comment and docs/hint-evidence-execution-identity-storage-consolidation-plan.md section 2.5.
  const decoded = decodeHintArtifact({
    hints: [[1, 2, 3]],
    hintMetadata: [{ technique: 'beam', nodesExpanded: 10 }],
  });
  assert.equal(decoded.length, 1);
  assert.deepEqual(decoded[0].path, [1, 2, 3]);
  assert.equal(decoded[0].provenance.length, 1, 'provenance must survive, not be dropped');
  assert.equal(decoded[0].provenance[0].solver.technique, 'beam');
});

test('decodeHintArtifact handles canonical {schemaVersion, hints: Hint[]}', () => {
  const canonical = { schemaVersion: 3, hints: [toHint([1, 2, 3], [makeProvenanceEntry('beam')])] };
  const decoded = decodeHintArtifact(canonical);
  assert.equal(decoded.length, 1);
  assert.equal(decoded[0].provenance[0].solver.technique, 'beam');
});

test('decodeHintArtifact throws a clear error on an unrecognized shape instead of silently returning no hints', () => {
  assert.throws(() => decodeHintArtifact({ levels: [] }), /hint artifact must contain/);
  assert.throws(() => decodeHintArtifact(null), /hint artifact must contain/);
});

// ── Bounded execution/run binding and occurrence lineage (plan section 4/W) ────────────────────

test('makeProvenanceEntry omits `execution` entirely when no execution option is passed', () => {
  const entry = makeProvenanceEntry('dfs', {});
  assert.equal(Object.hasOwn(entry, 'execution'), false);
});

test('makeProvenanceEntry builds a full execution block from any one execution option, defaulting the rest to null', () => {
  const entry = makeProvenanceEntry('dfs', { solverRequestIdentity: 'sha256:' + 'a'.repeat(64) });
  assert.ok(entry.execution);
  assert.equal(entry.execution!.solverRequestIdentity, 'sha256:' + 'a'.repeat(64));
  assert.equal(entry.execution!.protocolHash, null);
  assert.equal(entry.execution!.reproducibilityMode, null);
  assert.equal(entry.execution!.arm, null);
  assert.equal(entry.execution!.schemaVersion, 1);
});

test('makeProvenanceEntry omits `occurrences` entirely when no occurrenceRunId is passed', () => {
  const entry = makeProvenanceEntry('dfs', {});
  assert.equal(Object.hasOwn(entry, 'occurrences'), false);
});

test('makeProvenanceEntry records one occurrence defaulting observedAt to this entry\'s own foundAt', () => {
  const entry = makeProvenanceEntry('dfs', { foundAt: '2026-09-23T00:00:00.000Z', occurrenceRunId: 'run-1', occurrenceRunAttempt: 2 });
  assert.equal(entry.occurrences?.length, 1);
  assert.equal(entry.occurrences![0].runId, 'run-1');
  assert.equal(entry.occurrences![0].runAttempt, '2');
  assert.equal(entry.occurrences![0].observedAt, '2026-09-23T00:00:00.000Z');
  assert.equal(entry.occurrences![0].sourceRuns, null);
});

test('makeProvenanceEntry accepts an explicit occurrenceObservedAt distinct from foundAt', () => {
  const entry = makeProvenanceEntry('dfs', {
    foundAt: '2026-09-23T00:00:00.000Z', occurrenceRunId: 'run-1', occurrenceObservedAt: '2026-09-24T00:00:00.000Z',
  });
  assert.equal(entry.occurrences![0].observedAt, '2026-09-24T00:00:00.000Z');
});

test('provenanceEventIdentity treats different execution identity as a genuinely different semantic event', () => {
  const a = makeProvenanceEntry('dfs', { foundAt: '2026-09-23T00:00:00.000Z', solverRequestIdentity: 'sha256:' + 'a'.repeat(64) });
  const b = makeProvenanceEntry('dfs', { foundAt: '2026-09-23T00:00:00.000Z', solverRequestIdentity: 'sha256:' + 'b'.repeat(64) });
  const merged = dedupeProvenanceEntries([a, b]);
  assert.equal(merged.length, 2, 'a different solver-request identity is real evidence of a different execution, not a duplicate recording');
});

test('provenanceEventIdentity ignores occurrence lineage: two entries differing only in occurrenceRunId collapse to one', () => {
  const a = makeProvenanceEntry('dfs', { foundAt: '2026-09-23T00:00:00.000Z', occurrenceRunId: 'run-1' });
  const b = makeProvenanceEntry('dfs', { foundAt: '2026-09-23T00:00:00.000Z', occurrenceRunId: 'run-2' });
  const merged = dedupeProvenanceEntries([a, b]);
  assert.equal(merged.length, 1, 'a physical run id must never make an otherwise-identical rediscovery look like a new semantic event');
});

test('dedupeProvenanceEntries merges occurrence lineage from a rediscovery instead of dropping it', () => {
  const a = makeProvenanceEntry('dfs', { foundAt: '2026-09-23T00:00:00.000Z', occurrenceRunId: 'run-1' });
  const b = makeProvenanceEntry('dfs', { foundAt: '2026-09-24T00:00:00.000Z', occurrenceRunId: 'run-2', occurrenceObservedAt: '2026-09-24T00:00:00.000Z' });
  const merged = dedupeProvenanceEntries([a, b]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].foundAt, a.foundAt, 'the first-recorded entry\'s own fields (including foundAt) are kept unchanged');
  assert.deepEqual(
    merged[0].occurrences?.map(o => o.runId).sort(),
    ['run-1', 'run-2'],
    'both independent acquisitions must be preserved as occurrence lineage, not one overwriting the other',
  );
});

test('dedupeProvenanceEntries re-harvesting the exact same occurrence is idempotent', () => {
  const a = makeProvenanceEntry('dfs', { foundAt: '2026-09-23T00:00:00.000Z', occurrenceRunId: 'run-1', occurrenceRunAttempt: 1 });
  const bSameRun = makeProvenanceEntry('dfs', { foundAt: '2026-09-23T00:00:00.000Z', occurrenceRunId: 'run-1', occurrenceRunAttempt: 1, occurrenceObservedAt: '2026-09-30T00:00:00.000Z' });
  const merged = dedupeProvenanceEntries([a, bSameRun]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].occurrences?.length, 1, 'the same runId+runAttempt must not accumulate a second occurrence record');
  assert.equal(merged[0].occurrences![0].observedAt, a.occurrences![0].observedAt,
    'the first-seen occurrence record for a given key wins; re-harvest must not overwrite it');
});

test('mergeHints preserves occurrence lineage across a path rediscovered from a different run', () => {
  const a = makeProvenanceEntry('dfs', { foundAt: '2026-09-23T00:00:00.000Z', occurrenceRunId: 'run-1' });
  const b = makeProvenanceEntry('dfs', { foundAt: '2026-09-23T00:00:00.000Z', occurrenceRunId: 'run-2' });
  const merged = mergeHints([toHint([1, 2, 3], [a])], [toHint([1, 2, 3], [b])]);
  assert.equal(merged[0].provenance.length, 1);
  assert.deepEqual(merged[0].provenance[0].occurrences?.map(o => o.runId).sort(), ['run-1', 'run-2']);
});

test('upgradeProvenanceEntry does not fabricate execution or occurrences for a historical entry that never had them', () => {
  const upgraded = upgradeProvenanceEntry({
    solver: { id: 'pathfinder-solver', version: 'abc', technique: 'beam', beamWidth: 2000, gateKey: 12, forcing: null, attemptIndex: 3 },
    search: { nodesExpanded: 10, elapsedMs: 1, budgetMs: 2, workSpent: null, workBudget: null, cumulativeNodesExpanded: 10, cumulativeElapsedMs: 1, cumulativeBudgetMs: 2, termination: 'solved', randomSeed: null, seedSalt: null },
    context: { usedExistingHints: false, hintGuided: true, isolatedTechnique: false },
    foundAt: '2026-01-01T00:00:00.000Z',
  });
  assert.equal(Object.hasOwn(upgraded, 'execution'), false);
  assert.equal(Object.hasOwn(upgraded, 'occurrences'), false);
});

test('upgradeProvenanceEntry preserves an already-canonical entry\'s execution/occurrences unchanged', () => {
  const original = makeProvenanceEntry('dfs', {
    foundAt: '2026-09-23T00:00:00.000Z', solverRequestIdentity: 'sha256:' + 'a'.repeat(64), occurrenceRunId: 'run-1',
  });
  const upgraded = upgradeProvenanceEntry(original);
  assert.deepEqual(upgraded.execution, original.execution);
  assert.deepEqual(upgraded.occurrences, original.occurrences);
});
