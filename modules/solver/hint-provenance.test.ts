/** Unit tests for hint provenance derivation — specifically that a repair solve's randomSeed is
 *  carried through, so a randomized find is reproducible (it was silently lost before: the sweep
 *  passes ctx.randomSeed: null, and the seed was never recorded on the attempt). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { deriveHistoricalSolveAttemptInfo, deriveSolveAttemptInfo, provenanceFromHistoricalSolveResult, provenanceFromSolveResult, hintsFromVarietyResult } from './hint-provenance.js';
import { MAXIMALLY_POPULATED_SOLVER_ATTEMPT } from './testing-fixtures.js';
import { withSolverStage } from './stage-policy.js';

const currentAttempt = <T extends Record<string, unknown>>(attempt: T, stageId: Parameters<typeof withSolverStage>[1] = 'main-search') =>
  withSolverStage(attempt, stageId);

const PERSISTENT_ATTEMPT_FIELDS = new Set([
  'scoringProfileId', 'orderingBiasId', 'beamWidth', 'mechanicBucketRetention', 'gateKey', 'elapsedMs', 'nodesExpanded',
  'allocatedBudgetMs', 'randomSeed', 'seedSalt', 'repairMustTurnBiased', 'repairTurnBiased',
]);
const TRANSIENT_FIELDS_WITH_DISTINCT_PROVENANCE_MEANING = new Set(['workSpent']);
const INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS = new Set([
  'stageId', 'ok', 'outcome', 'error', 'passNumber', 'configKey', 'restart', 'schedulerPhase', 'repair',
  'timedOut', 'bestBadness', 'finalBadness', 'allocatedWorkCeiling', 'allocatedNodeCeiling',
  'workSpent', 'admissibleOrder', 'admissibleOrderNoTieBreak', 'admissibleOrderLds',
  'mainSearchLateReserve', 'earlyRepairSearch', 'repairShrinkRecovery', 'goalAttractionDisabledRetry',
  // Consulted by orchestration.ts's classifyAttemptTier to derive the single retryTier field
  // (below), not copied onto provenance 1:1 under their own attempt-field names.
  'coarseStateNearTieRetentionRetry', 'admissibleOrderNonDefaultRetry', 'connectivityAxisExhaustedRetry',
  'mcNeighborBudgetRetry', 'repairElitePrefixDfsRetry', 'repairLateProbe', 'resumableResidualTranche',
]);

test('maximal Attempt has an explicit, complete provenance projection contract', () => {
  const successfulAttempt = { ...MAXIMALLY_POPULATED_SOLVER_ATTEMPT, ok: true, outcome: 'success' as const };
  assert.equal(PERSISTENT_ATTEMPT_FIELDS.size + INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS.size, Object.keys(successfulAttempt).length,
    'field expectations must have neither stale entries nor omissions');
  for (const field of Object.keys(successfulAttempt)) {
    const memberships = Number(PERSISTENT_ATTEMPT_FIELDS.has(field)) + Number(INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS.has(field));
    assert.equal(memberships, 1, `${field} must belong to exactly one provenance set`);
  }

  const entry = provenanceFromSolveResult({
    status: 'success', attempts: [successfulAttempt], nodesExpanded: 9000, totalMs: 654,
  });
  const destinations: Record<string, unknown> = {
    scoringProfileId: entry.solver.scoringProfileId,
    orderingBiasId: entry.solver.orderingBiasId,
    beamWidth: entry.solver.beamWidth,
    mechanicBucketRetention: entry.solver.mechanicBucketRetention,
    gateKey: entry.solver.gateKey,
    elapsedMs: entry.search.elapsedMs,
    nodesExpanded: entry.search.nodesExpanded,
    allocatedBudgetMs: entry.search.budgetMs,
    randomSeed: entry.search.randomSeed,
    seedSalt: entry.search.seedSalt,
    repairMustTurnBiased: entry.solver.forcing?.repairMustTurnBiased,
    repairTurnBiased: entry.solver.forcing?.repairTurnBiased,
  };
  for (const field of PERSISTENT_ATTEMPT_FIELDS) {
    assert.deepEqual(destinations[field], successfulAttempt[field as keyof typeof successfulAttempt], `${field} changed in provenance`);
  }

  // None of the raw scheduler/failure/dispatch bookkeeping is copied as an own provenance field.
  // (repair/admissibleOrder are intentionally represented only by the normalized technique.)
  for (const field of INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS) {
    assert.equal(Object.hasOwn(entry, field), false, `${field} leaked into provenance`);
    assert.equal(Object.hasOwn(entry.solver, field), false, `${field} leaked into solver provenance`);
    if (!TRANSIENT_FIELDS_WITH_DISTINCT_PROVENANCE_MEANING.has(field)) {
      assert.equal(Object.hasOwn(entry.search, field), false, `${field} leaked into search provenance`);
    }
  }
  assert.equal(entry.search.workSpent, null, 'attempt workSpent is not whole-solve provenance workSpent');
  assert.equal(entry.solver.technique, 'repair');
  // Current classification is stageId-only. The fixture's canonical stageId is late-repair-search
  // even though every legacy boolean is deliberately populated for projection coverage.
  assert.equal(entry.solver.forcing?.retryTier, 'late-repair-search');
});
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
  const anchoredForcing = anchored.provenance[0].solver.forcing;
  assert.ok(anchoredForcing, 'a prefix-anchored find must carry forcing metadata');
  assert.equal(anchoredForcing.anchorSeed, 'abc12');
  assert.equal(anchoredForcing.anchorDepth, 28);
  // a cold enumeration find has no anchor concept -> forcing stays null
  assert.equal(cold.provenance[0].solver.forcing, null);
});

test('deriveSolveAttemptInfo carries the winning repair attempt randomSeed', () => {
  const attempts = [
    currentAttempt({ scoringProfileId: 'objectiveFirst', orderingBiasId: null, beamWidth: 5000, ok: false, elapsedMs: 10 }),
    currentAttempt({ scoringProfileId: 'repair', orderingBiasId: null, repair: true, ok: true, elapsedMs: 42, randomSeed: 123456 }, 'repair-fallback'),
  ];
  const info = deriveSolveAttemptInfo(attempts);
  assert.equal(info.technique, 'repair');
  assert.equal(info.randomSeed, 123456);
});

test('deriveSolveAttemptInfo leaves randomSeed null for a deterministic dfs/beam winner', () => {
  const info = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, ok: true, elapsedMs: 5 })]);
  assert.equal(info.technique, 'dfs');
  assert.equal(info.randomSeed, null);
});

test('provenanceFromSolveResult prefers the winning attempt seed over ctx (repair solve is reproducible)', () => {
  const result = {
    status: 'success',
    attempts: [currentAttempt({ scoringProfileId: 'repair', orderingBiasId: null, repair: true, ok: true, elapsedMs: 42, randomSeed: 987654 }, 'repair-fallback')],
  };
  // ctx.randomSeed is null (exactly what portfolio-solve-sweep passes) — the winning attempt's own
  // seed must still land in the provenance rather than being lost to the null.
  const entry = provenanceFromSolveResult(result, { randomSeed: null });
  assert.equal(entry.solver.technique, 'repair');
  assert.equal(entry.search.randomSeed, 987654);
});

test('historical persisted Attempt aliases normalize before provenance construction', () => {
  const entry = provenanceFromHistoricalSolveResult({
    status: 'success',
    attempts: [{ profile: 'objectiveFirst', template: 'perimeterCW', beamWidth: 2000, diverseBeam: true, ok: true }],
  });
  assert.equal(entry.solver.scoringProfileId, 'objectiveFirst');
  assert.equal(entry.solver.orderingBiasId, 'perimeterCW');
  assert.equal(entry.solver.mechanicBucketRetention, true);
});

test('provenanceFromSolveResult leaves randomSeed null for a deterministic winner', () => {
  const result = { status: 'success', attempts: [currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: 'perimeterCW', ok: true })] };
  const entry = provenanceFromSolveResult(result, { randomSeed: null });
  assert.equal(entry.solver.technique, 'dfs');
  assert.equal(entry.search.randomSeed, null);
});

// Regression coverage for the repair-variant provenance gap (2026-07-23): every repair winner's
// `technique` string collapsed to the same flat 'repair', with no way to tell from the hint corpus
// whether the plain or a biased variant (repairMustTurnBiasedAttempt / repairTurnBiasedAttempt,
// modules/solver/attempts.ts) actually won — found while investigating whether
// repairMustTurnBiasedAttempt's risk-gated last-in-ladder placement is overly conservative.
test('deriveSolveAttemptInfo distinguishes plain repair from must-turn-biased repair', () => {
  const plain = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'repair', orderingBiasId: null, repair: true, ok: true }, 'repair-fallback')]);
  assert.equal(plain.repairMustTurnBiased, false, 'plain repair is false, not null — the winner WAS a repair attempt');
  assert.equal(plain.repairTurnBiased, false);

  const biased = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'repair', orderingBiasId: null, repair: true, repairMustTurnBiased: true, ok: true }, 'repair-fallback')]);
  assert.equal(biased.repairMustTurnBiased, true);
  assert.equal(biased.repairTurnBiased, false);

  const turnBiased = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'repair', orderingBiasId: null, repair: true, repairTurnBiased: true, ok: true }, 'repair-fallback')]);
  assert.equal(turnBiased.repairMustTurnBiased, false);
  assert.equal(turnBiased.repairTurnBiased, true);
});

test('deriveSolveAttemptInfo leaves repairMustTurnBiased/repairTurnBiased null for a non-repair winner', () => {
  const info = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, beamWidth: 2000, ok: true })]);
  assert.equal(info.technique, 'beam');
  assert.equal(info.repairMustTurnBiased, null, 'dfs/beam have no such concept — null, not false');
  assert.equal(info.repairTurnBiased, null);
});

test('provenanceFromSolveResult records the biased-repair distinction in forcing', () => {
  const result = {
    status: 'success',
    attempts: [currentAttempt({ scoringProfileId: 'repair', orderingBiasId: null, repair: true, repairMustTurnBiased: true, ok: true, elapsedMs: 4400 }, 'repair-fallback')],
  };
  const entry = provenanceFromSolveResult(result);
  assert.equal(entry.solver.technique, 'repair');
  assert.ok(entry.solver.forcing, 'a repair winner must carry forcing metadata for the variant distinction');
  assert.equal(entry.solver.forcing.repairMustTurnBiased, true);
  assert.equal(entry.solver.forcing.repairTurnBiased, false);
});

test('provenanceFromSolveResult leaves forcing null for a non-repair winner (no variant concept to record)', () => {
  const result = { status: 'success', attempts: [currentAttempt({ scoringProfileId: 'objectiveFirst', orderingBiasId: null, ok: true })] };
  const entry = provenanceFromSolveResult(result);
  assert.equal(entry.solver.forcing, null);
});

// Regression coverage for the broader provenance-gap sweep (2026-07-23): beamWidth/mechanicBucketRetention/
// gateKey/seedSalt/goalAttractionDisabledRetry were all previously invisible in the hint corpus, the same
// class of gap as the repair-bias fix above — "which internal solver config actually won" data that
// only existed in raw solver Attempt objects, never in the permanent provenance record.
test('deriveSolveAttemptInfo captures beamWidth/mechanicBucketRetention/gateKey for a beam winner', () => {
  const info = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, beamWidth: 2000, mechanicBucketRetention: true, gateKey: 655370, ok: true })]);
  assert.equal(info.technique, 'beam');
  assert.equal(info.beamWidth, 2000);
  assert.equal(info.mechanicBucketRetention, true);
  assert.equal(info.gateKey, 655370);
});

test('deriveSolveAttemptInfo leaves mechanicBucketRetention null (not false) for a dfs winner — no beam concept at all', () => {
  const info = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, ok: true, gateKey: 12 })]);
  assert.equal(info.technique, 'dfs');
  assert.equal(info.beamWidth, null);
  assert.equal(info.mechanicBucketRetention, null, 'dfs has no beam-diversity concept — null, not false');
  assert.equal(info.gateKey, 12, 'gateKey is tracked regardless of technique');
});

test('deriveSolveAttemptInfo labels an admissible-order-fallback winner distinctly, not folded into dfs', () => {
  const info = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'mustCrossFirst', orderingBiasId: null, admissibleOrder: true, ok: true, elapsedMs: 7 }, 'admissible-order-fallback')]);
  assert.equal(info.technique, 'admissible-order-fallback', 'previously fell through to "dfs" -- an admissibleOrder winner has no beamWidth/repair flag, so the technique ternary needs its own check for this field or it silently mislabels');
  assert.equal(info.scoringProfileId, 'mustCrossFirst', 'scoringProfileId carries the tie-break profile for this technique');
  assert.equal(info.beamWidth, null);
  assert.equal(info.mechanicBucketRetention, null);
});

test('deriveSolveAttemptInfo records seedSalt as explicit 0 for a repair winner at the default salt (not null)', () => {
  const atDefault = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'repair', orderingBiasId: null, repair: true, ok: true }, 'repair-fallback')]);
  assert.equal(atDefault.seedSalt, 0, 'repair at the default salt is explicit 0 -- distinct from "not a repair attempt"');

  const atNonzero = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'repair', orderingBiasId: null, repair: true, seedSalt: 3, ok: true }, 'repair-fallback')]);
  assert.equal(atNonzero.seedSalt, 3);

  const nonRepair = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, ok: true })]);
  assert.equal(nonRepair.seedSalt, null, 'only a non-repair winner gets null');
});

test('current and historical goal-attraction retry identity use separate provenance ingress paths', () => {
  const canonical = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, beamWidth: 2000, ok: true }, 'goal-attraction-disabled-retry')]);
  assert.equal(canonical.technique, 'beam');
  assert.equal(canonical.goalAttractionDisabledRetry, true);

  const historical = deriveHistoricalSolveAttemptInfo([{ profile: 'repair', repair: true, goalAttractionDisabledRetry: true, ok: true }]);
  assert.equal(historical.technique, 'repair');
  assert.equal(historical.goalAttractionDisabledRetry, true);

  const normal = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, ok: true })]);
  assert.equal(normal.goalAttractionDisabledRetry, false);
});

test('provenanceFromSolveResult records beamWidth/mechanicBucketRetention/gateKey/seedSalt on the entry', () => {
  const result = {
    status: 'success',
    attempts: [currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, beamWidth: 2000, mechanicBucketRetention: true, gateKey: 589833, ok: true })],
  };
  const entry = provenanceFromSolveResult(result);
  assert.equal(entry.solver.beamWidth, 2000);
  assert.equal(entry.solver.mechanicBucketRetention, true);
  assert.equal(entry.solver.gateKey, 589833);
});

test('provenanceFromSolveResult maps the current single-written goal-attraction stage onto forcing.disabledFeatures', () => {
  const winner = withSolverStage({ scoringProfileId: 'perimeterSweep', beamWidth: 2000, ok: true }, 'goal-attraction-disabled-retry');
  assert.equal('goalAttractionDisabledRetry' in winner, false, 'current stage writer must not emit the legacy boolean');
  const entry = provenanceFromSolveResult({ status: 'success', attempts: [winner] });
  assert.ok(entry.solver.forcing, 'a goal-attraction-disabled-retry winner must carry forcing metadata');
  assert.deepEqual(entry.solver.forcing.disabledFeatures, ['SCORE_GOAL_ATTRACTION']);
});

// Regression coverage for the Priority 0 retry-tier attribution gap
// (docs/solver-optimization-workstreams.md): before retryTier, a find from any of these
// force-enabled last-resort passes carried the exact same provenance shape as an ordinary
// main-ladder/repair-fallback win, with no way to tell them apart from the stored hint alone.
test('current retry tiers are stage-derived while historical booleans normalize only at historical ingress', () => {
  const canonicalRetry = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'objectiveFirst', orderingBiasId: null, beamWidth: 5000, ok: true }, 'coarse-state-near-tie-retention-disabled-retry')]);
  assert.equal(canonicalRetry.retryTier, 'coarse-state-near-tie-retention-disabled-retry');

  const legacyRetry = deriveHistoricalSolveAttemptInfo([{ profile: 'objectiveFirst', beamWidth: 5000, dedupNearTieRetry: true, ok: true }]);
  assert.equal(legacyRetry.retryTier, 'coarse-state-near-tie-retention-disabled-retry', 'historical attempt field remains readable only through historical ingress');

  const admissibleRetry = deriveHistoricalSolveAttemptInfo([{ profile: 'none', admissibleOrder: true, admissibleOrderNonDefaultRetry: true, ok: true }]);
  assert.equal(admissibleRetry.retryTier, 'admissible-order-alternate-tiebreak-retry');

  const ordinaryAdmissible = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'default', orderingBiasId: null, admissibleOrder: true, ok: true }, 'admissible-order-fallback')]);
  assert.equal(ordinaryAdmissible.retryTier, null);

  const goalAttractionDisabledRetry = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, beamWidth: 2000, ok: true }, 'goal-attraction-disabled-retry')]);
  assert.equal(goalAttractionDisabledRetry.retryTier, null);

  const ordinaryRepair = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'repair', orderingBiasId: null, repair: true, ok: true }, 'repair-fallback')]);
  assert.equal(ordinaryRepair.retryTier, null);
  const ordinaryMain = deriveSolveAttemptInfo([currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, ok: true })]);
  assert.equal(ordinaryMain.retryTier, null);
});

test('provenanceFromSolveResult records retryTier in forcing, and leaves forcing null when there is none', () => {
  const retryResult = {
    status: 'success',
    attempts: [currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, beamWidth: 5000, ok: true }, 'connectivity-axis-prune-disabled-retry')],
  };
  const retryEntry = provenanceFromSolveResult(retryResult);
  assert.ok(retryEntry.solver.forcing, 'a retry-tier winner must carry forcing metadata');
  assert.equal(retryEntry.solver.forcing.retryTier, 'connectivity-axis-prune-disabled-retry');

  const ordinaryResult = { status: 'success', attempts: [currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, beamWidth: 5000, ok: true })] };
  const ordinaryEntry = provenanceFromSolveResult(ordinaryResult);
  assert.equal(ordinaryEntry.solver.forcing, null, 'an ordinary main-ladder winner has no forcing at all');
});

// Regression coverage for the OTHER half of Priority 0: an isolated single-technique run (e.g.
// technique-census tooling, scripts/combine-technique-census-shards.mjs) must be marked as such,
// or a persisted find is later misread as ordinary production-solver capability evidence — the
// contamination that finding traced (e.g. R02900).
test('provenanceFromSolveResult marks isolatedTechnique from ctx, defaulting to false', () => {
  const result = { status: 'success', attempts: [currentAttempt({ scoringProfileId: 'repair', orderingBiasId: null, repair: true, ok: true }, 'repair-fallback')] };
  const isolated = provenanceFromSolveResult(result, { isolatedTechnique: true });
  assert.equal(isolated.context.isolatedTechnique, true);

  const production = provenanceFromSolveResult(result);
  assert.equal(production.context.isolatedTechnique, false, 'omitted ctx.isolatedTechnique defaults to false, never undefined');
});

// Phase 3 bounded execution/occurrence lineage (docs/hint-evidence-execution-identity-storage-
// consolidation-plan.md section 4/W): ProvenanceContext's new fields must reach entry.execution/
// entry.occurrences, and an omitted field must stay genuinely absent rather than becoming a
// fabricated null/placeholder.
const ORDINARY_RESULT = { status: 'success' as const, attempts: [currentAttempt({ scoringProfileId: 'perimeterSweep', orderingBiasId: null, beamWidth: 5000, ok: true })] };

test('provenanceFromSolveResult omits execution/occurrences when ctx supplies neither', () => {
  const entry = provenanceFromSolveResult(ORDINARY_RESULT);
  assert.equal(Object.hasOwn(entry, 'execution'), false);
  assert.equal(Object.hasOwn(entry, 'occurrences'), false);
});

test('provenanceFromSolveResult forwards solverRequestIdentity/protocolHash/reproducibilityMode/executionArm into entry.execution', () => {
  const entry = provenanceFromSolveResult(ORDINARY_RESULT, {
    solverRequestIdentity: 'sha256:abc', protocolHash: 'sha256:def', reproducibilityMode: 'deterministic-work', executionArm: 'control',
  });
  assert.deepEqual(entry.execution, {
    schemaVersion: 1, solverRequestIdentity: 'sha256:abc', protocolHash: 'sha256:def', reproducibilityMode: 'deterministic-work', arm: 'control',
  });
});

test('provenanceFromSolveResult builds a partial execution capsule from a single ctx field, others explicit null', () => {
  const entry = provenanceFromSolveResult(ORDINARY_RESULT, { solverRequestIdentity: 'sha256:abc' });
  assert.deepEqual(entry.execution, {
    schemaVersion: 1, solverRequestIdentity: 'sha256:abc', protocolHash: null, reproducibilityMode: null, arm: null,
  });
});

test('provenanceFromSolveResult forwards occurrenceRunId/occurrenceRunAttempt into entry.occurrences', () => {
  const entry = provenanceFromSolveResult(ORDINARY_RESULT, { occurrenceRunId: '123456', occurrenceRunAttempt: '2' });
  assert.equal(entry.occurrences?.length, 1);
  assert.equal(entry.occurrences?.[0].runId, '123456');
  assert.equal(entry.occurrences?.[0].runAttempt, '2');
  assert.equal(entry.occurrences?.[0].observedAt, entry.foundAt, 'observedAt defaults to this entry\'s own foundAt');
});

test('provenanceFromSolveResult never fabricates an occurrence when occurrenceRunId is not supplied', () => {
  const entry = provenanceFromSolveResult(ORDINARY_RESULT, { occurrenceContractRef: 'manifest.json#experimentContract' });
  assert.equal(Object.hasOwn(entry, 'occurrences'), false, 'a contractRef alone must not synthesize a run id');
});

test('repairPrimarySeed is a stable, uint32, pure function of (startKey, seedSalt)', () => {
  const a = repairPrimarySeed(0x1234, 0);
  assert.equal(a, repairPrimarySeed(0x1234, 0), 'deterministic for the same inputs');
  assert.ok(a >= 0 && a <= 0xFFFFFFFF && Number.isInteger(a), 'is a uint32');
  assert.notEqual(repairPrimarySeed(0x1234, 1), a, 'a different seedSalt changes the seed');
});
