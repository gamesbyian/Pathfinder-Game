/** Unit tests for hint provenance derivation — specifically that a repair solve's randomSeed is
 *  carried through, so a randomized find is reproducible (it was silently lost before: the sweep
 *  passes ctx.randomSeed: null, and the seed was never recorded on the attempt). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { deriveSolveAttemptInfo, provenanceFromSolveResult, hintsFromVarietyResult } from './hint-provenance.js';
import { MAXIMALLY_POPULATED_SOLVER_ATTEMPT } from './testing-fixtures.js';

const PERSISTENT_ATTEMPT_FIELDS = new Set([
  'profile', 'template', 'beamWidth', 'diverseBeam', 'gateKey', 'elapsedMs', 'nodesExpanded',
  'allocatedBudgetMs', 'randomSeed', 'seedSalt', 'repairMustTurnBiased', 'repairTurnBiased',
  'attractionDiversity',
]);
const TRANSIENT_FIELDS_WITH_DISTINCT_PROVENANCE_MEANING = new Set(['workSpent']);
const INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS = new Set([
  'stageId', 'ok', 'outcome', 'error', 'passNumber', 'configKey', 'restart', 'schedulerPhase', 'repair',
  'timedOut', 'bestBadness', 'finalBadness', 'allocatedWorkCeiling', 'allocatedNodeCeiling',
  'workSpent', 'admissibleOrder', 'admissibleOrderNoTieBreak', 'admissibleOrderLds',
  'mainLoopLateReserve', 'repairProbe', 'repairProbeShrinkRecovery',
  // Consulted by orchestration.ts's classifyAttemptTier to derive the single retryTier field
  // (below), not copied onto provenance 1:1 under their own attempt-field names.
  'dedupNearTieRetry', 'admissibleOrderNonDefaultRetry', 'connectivityAxisExhaustedRetry',
  'mcNeighborBudgetRetry', 'repairElitePrefixDfsRetry', 'repairLateProbe',
]);

test('maximal Attempt has an explicit, complete provenance projection contract', () => {
  const successfulAttempt = { ...MAXIMALLY_POPULATED_SOLVER_ATTEMPT, ok: true, outcome: 'success' as const };
  assert.equal(PERSISTENT_ATTEMPT_FIELDS.size + INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS.size, Object.keys(successfulAttempt).length,
    'field expectations must have neither stale entries nor omissions');
  for (const field of Object.keys(successfulAttempt)) {
    const memberships = Number(PERSISTENT_ATTEMPT_FIELDS.has(field)) + Number(INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS.has(field));
    assert.equal(memberships, 1, `${field} must belong to exactly one provenance set`);
  }

  const info = deriveSolveAttemptInfo([successfulAttempt]);
  const entry = provenanceFromSolveResult({
    status: 'success', attempts: [successfulAttempt], nodesExpanded: 9000, totalMs: 654,
  });
  const destinations: Record<string, unknown> = {
    profile: entry.solver.profile,
    template: entry.solver.template,
    beamWidth: entry.solver.beamWidth,
    diverseBeam: entry.solver.diverseBeam,
    gateKey: entry.solver.gateKey,
    elapsedMs: entry.search.elapsedMs,
    nodesExpanded: entry.search.nodesExpanded,
    allocatedBudgetMs: entry.search.budgetMs,
    randomSeed: entry.search.randomSeed,
    seedSalt: entry.search.seedSalt,
    repairMustTurnBiased: entry.solver.forcing?.repairMustTurnBiased,
    repairTurnBiased: entry.solver.forcing?.repairTurnBiased,
    attractionDiversity: info.attractionDiversity,
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
  // Every retry-tier flag is true on this fixture, so classifyAttemptTier's precedence chain
  // (orchestration.ts) resolves to its most-specific category, 'late-repair-search' — proving the
  // derived retryTier field (not a raw copied attempt field, hence not in either Set above) is
  // actually wired through to provenance.
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

// Regression coverage for the repair-variant provenance gap (2026-07-23): every repair winner's
// `technique` string collapsed to the same flat 'repair', with no way to tell from the hint corpus
// whether the plain or a biased variant (repairMustTurnBiasedAttempt / repairTurnBiasedAttempt,
// modules/solver/attempts.ts) actually won — found while investigating whether
// repairMustTurnBiasedAttempt's risk-gated last-in-ladder placement is overly conservative.
test('deriveSolveAttemptInfo distinguishes plain repair from must-turn-biased repair', () => {
  const plain = deriveSolveAttemptInfo([{ profile: 'repair', repair: true, ok: true }]);
  assert.equal(plain.repairMustTurnBiased, false, 'plain repair is false, not null — the winner WAS a repair attempt');
  assert.equal(plain.repairTurnBiased, false);

  const biased = deriveSolveAttemptInfo([{ profile: 'repair', repair: true, repairMustTurnBiased: true, ok: true }]);
  assert.equal(biased.repairMustTurnBiased, true);
  assert.equal(biased.repairTurnBiased, false);

  const turnBiased = deriveSolveAttemptInfo([{ profile: 'repair', repair: true, repairTurnBiased: true, ok: true }]);
  assert.equal(turnBiased.repairMustTurnBiased, false);
  assert.equal(turnBiased.repairTurnBiased, true);
});

test('deriveSolveAttemptInfo leaves repairMustTurnBiased/repairTurnBiased null for a non-repair winner', () => {
  const info = deriveSolveAttemptInfo([{ profile: 'perimeterSweep', beamWidth: 2000, ok: true }]);
  assert.equal(info.technique, 'beam');
  assert.equal(info.repairMustTurnBiased, null, 'dfs/beam have no such concept — null, not false');
  assert.equal(info.repairTurnBiased, null);
});

test('provenanceFromSolveResult records the biased-repair distinction in forcing', () => {
  const result = {
    status: 'success',
    attempts: [{ profile: 'repair', repair: true, repairMustTurnBiased: true, ok: true, elapsedMs: 4400 }],
  };
  const entry = provenanceFromSolveResult(result);
  assert.equal(entry.solver.technique, 'repair');
  assert.ok(entry.solver.forcing, 'a repair winner must carry forcing metadata for the variant distinction');
  assert.equal(entry.solver.forcing.repairMustTurnBiased, true);
  assert.equal(entry.solver.forcing.repairTurnBiased, false);
});

test('provenanceFromSolveResult leaves forcing null for a non-repair winner (no variant concept to record)', () => {
  const result = { status: 'success', attempts: [{ profile: 'objectiveFirst', ok: true }] };
  const entry = provenanceFromSolveResult(result);
  assert.equal(entry.solver.forcing, null);
});

// Regression coverage for the broader provenance-gap sweep (2026-07-23): beamWidth/diverseBeam/
// gateKey/seedSalt/attractionDiversity were all previously invisible in the hint corpus, the same
// class of gap as the repair-bias fix above — "which internal solver config actually won" data that
// only existed in raw solver Attempt objects, never in the permanent provenance record.
test('deriveSolveAttemptInfo captures beamWidth/diverseBeam/gateKey for a beam winner', () => {
  const info = deriveSolveAttemptInfo([{ profile: 'perimeterSweep', beamWidth: 2000, diverseBeam: true, gateKey: 655370, ok: true }]);
  assert.equal(info.technique, 'beam');
  assert.equal(info.beamWidth, 2000);
  assert.equal(info.diverseBeam, true);
  assert.equal(info.gateKey, 655370);
});

test('deriveSolveAttemptInfo leaves diverseBeam null (not false) for a dfs winner — no beam concept at all', () => {
  const info = deriveSolveAttemptInfo([{ profile: 'perimeterSweep', ok: true, gateKey: 12 }]);
  assert.equal(info.technique, 'dfs');
  assert.equal(info.beamWidth, null);
  assert.equal(info.diverseBeam, null, 'dfs has no beam-diversity concept — null, not false');
  assert.equal(info.gateKey, 12, 'gateKey is tracked regardless of technique');
});

test('deriveSolveAttemptInfo labels an admissible-order-fallback winner distinctly, not folded into dfs', () => {
  const info = deriveSolveAttemptInfo([{ profile: 'mustCrossFirst', admissibleOrder: true, ok: true, elapsedMs: 7 }]);
  assert.equal(info.technique, 'admissible-order-fallback', 'previously fell through to "dfs" -- an admissibleOrder winner has no beamWidth/repair flag, so the technique ternary needs its own check for this field or it silently mislabels');
  assert.equal(info.profile, 'mustCrossFirst', 'profile carries the tie-break profile for this technique');
  assert.equal(info.beamWidth, null);
  assert.equal(info.diverseBeam, null);
});

test('deriveSolveAttemptInfo records seedSalt as explicit 0 for a repair winner at the default salt (not null)', () => {
  const atDefault = deriveSolveAttemptInfo([{ profile: 'repair', repair: true, ok: true }]);
  assert.equal(atDefault.seedSalt, 0, 'repair at the default salt is explicit 0 -- distinct from "not a repair attempt"');

  const atNonzero = deriveSolveAttemptInfo([{ profile: 'repair', repair: true, seedSalt: 3, ok: true }]);
  assert.equal(atNonzero.seedSalt, 3);

  const nonRepair = deriveSolveAttemptInfo([{ profile: 'perimeterSweep', ok: true }]);
  assert.equal(nonRepair.seedSalt, null, 'only a non-repair winner gets null');
});

test('deriveSolveAttemptInfo flags attractionDiversity independently of technique', () => {
  const beamAd = deriveSolveAttemptInfo([{ profile: 'perimeterSweep', beamWidth: 2000, attractionDiversity: true, ok: true }]);
  assert.equal(beamAd.technique, 'beam');
  assert.equal(beamAd.attractionDiversity, true);

  const repairAd = deriveSolveAttemptInfo([{ profile: 'repair', repair: true, attractionDiversity: true, ok: true }]);
  assert.equal(repairAd.technique, 'repair');
  assert.equal(repairAd.attractionDiversity, true);

  const normal = deriveSolveAttemptInfo([{ profile: 'perimeterSweep', ok: true }]);
  assert.equal(normal.attractionDiversity, false);
});

test('provenanceFromSolveResult records beamWidth/diverseBeam/gateKey/seedSalt on the entry', () => {
  const result = {
    status: 'success',
    attempts: [{ profile: 'perimeterSweep', beamWidth: 2000, diverseBeam: true, gateKey: 589833, ok: true }],
  };
  const entry = provenanceFromSolveResult(result);
  assert.equal(entry.solver.beamWidth, 2000);
  assert.equal(entry.solver.diverseBeam, true);
  assert.equal(entry.solver.gateKey, 589833);
});

test('provenanceFromSolveResult maps an goal-attraction-disabled-retry winner onto forcing.disabledFeatures', () => {
  const result = {
    status: 'success',
    attempts: [{ profile: 'perimeterSweep', beamWidth: 2000, attractionDiversity: true, ok: true }],
  };
  const entry = provenanceFromSolveResult(result);
  assert.ok(entry.solver.forcing, 'an AD-pass winner must carry forcing metadata');
  assert.deepEqual(entry.solver.forcing.disabledFeatures, ['SCORE_GOAL_ATTRACTION']);
});

// Regression coverage for the Priority 0 retry-tier attribution gap
// (docs/solver-optimization-current-queue.md): before retryTier, a find from any of these
// force-enabled last-resort passes carried the exact same provenance shape as an ordinary
// main-ladder/repair-fallback win, with no way to tell them apart from the stored hint alone.
test('deriveSolveAttemptInfo records which force-enabled retry tier won, distinct from an ordinary win', () => {
  const dedupRetry = deriveSolveAttemptInfo([{ profile: 'objectiveFirst', beamWidth: 5000, dedupNearTieRetry: true, ok: true }]);
  assert.equal(dedupRetry.retryTier, 'coarse-state-near-tie-retention-disabled-retry');

  const admissibleRetry = deriveSolveAttemptInfo([{ profile: 'none', admissibleOrder: true, admissibleOrderNonDefaultRetry: true, ok: true }]);
  assert.equal(admissibleRetry.retryTier, 'admissible-order-alternate-tiebreak-retry');

  // An ORDINARY admissible-order-fallback win (no retry flag) is not a retry tier at all.
  const ordinaryAdmissible = deriveSolveAttemptInfo([{ profile: 'default', admissibleOrder: true, ok: true }]);
  assert.equal(ordinaryAdmissible.retryTier, null);

  // Attraction-diversity already has its own dedicated forcing field (disabledFeatures) and is
  // deliberately NOT double-recorded as a retryTier.
  const attractionDiversity = deriveSolveAttemptInfo([{ profile: 'perimeterSweep', beamWidth: 2000, attractionDiversity: true, ok: true }]);
  assert.equal(attractionDiversity.retryTier, null);

  // An ordinary main-ladder/repair-fallback win has no retry tier either.
  const ordinaryRepair = deriveSolveAttemptInfo([{ profile: 'repair', repair: true, ok: true }]);
  assert.equal(ordinaryRepair.retryTier, null);
  const ordinaryMain = deriveSolveAttemptInfo([{ profile: 'perimeterSweep', ok: true }]);
  assert.equal(ordinaryMain.retryTier, null);
});

test('provenanceFromSolveResult records retryTier in forcing, and leaves forcing null when there is none', () => {
  const retryResult = {
    status: 'success',
    attempts: [{ profile: 'perimeterSweep', beamWidth: 5000, connectivityAxisExhaustedRetry: true, ok: true }],
  };
  const retryEntry = provenanceFromSolveResult(retryResult);
  assert.ok(retryEntry.solver.forcing, 'a retry-tier winner must carry forcing metadata');
  assert.equal(retryEntry.solver.forcing.retryTier, 'connectivity-axis-prune-disabled-retry');

  const ordinaryResult = { status: 'success', attempts: [{ profile: 'perimeterSweep', beamWidth: 5000, ok: true }] };
  const ordinaryEntry = provenanceFromSolveResult(ordinaryResult);
  assert.equal(ordinaryEntry.solver.forcing, null, 'an ordinary main-ladder winner has no forcing at all');
});

// Regression coverage for the OTHER half of Priority 0: an isolated single-technique run (e.g.
// technique-census tooling, scripts/combine-technique-census-shards.mjs) must be marked as such,
// or a persisted find is later misread as ordinary production-solver capability evidence — the
// contamination that finding traced (e.g. R02900).
test('provenanceFromSolveResult marks isolatedTechnique from ctx, defaulting to false', () => {
  const result = { status: 'success', attempts: [{ profile: 'repair', repair: true, ok: true }] };
  const isolated = provenanceFromSolveResult(result, { isolatedTechnique: true });
  assert.equal(isolated.context.isolatedTechnique, true);

  const production = provenanceFromSolveResult(result);
  assert.equal(production.context.isolatedTechnique, false, 'omitted ctx.isolatedTechnique defaults to false, never undefined');
});

test('repairPrimarySeed is a stable, uint32, pure function of (startKey, seedSalt)', () => {
  const a = repairPrimarySeed(0x1234, 0);
  assert.equal(a, repairPrimarySeed(0x1234, 0), 'deterministic for the same inputs');
  assert.ok(a >= 0 && a <= 0xFFFFFFFF && Number.isInteger(a), 'is a uint32');
  assert.notEqual(repairPrimarySeed(0x1234, 1), a, 'a different seedSalt changes the seed');
});
