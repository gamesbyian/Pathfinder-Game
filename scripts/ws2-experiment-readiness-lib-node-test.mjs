import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeClass2Economics, analyzeClass4Canary, CLASS2_TARGET_STAGE, CLASS4_FRESHNESS_IDS, CLASS4_SENTINEL_ID, CLASS4_TARGET_STAGE, materializeClass2Cohort, stableHash } from './ws2-experiment-readiness-lib.mjs';
const clone = value => JSON.parse(JSON.stringify(value));
const lifecycle = (id, work = 10, nodes = 10) => ({ [id]: { reached: true, mechanicallyEligible: true, actualWork: work, actualNodes: nodes } });
const ids = [...CLASS4_FRESHNESS_IDS, CLASS4_SENTINEL_ID, 'NP1', 'NP2'];
const control4 = ids.map(id => ({ id, ok: id === CLASS4_SENTINEL_ID, refereeValid: id === CLASS4_SENTINEL_ID, solutionHash: id === CLASS4_SENTINEL_ID ? 'stable' : null, winningStage: id === CLASS4_SENTINEL_ID ? 'main-search' : null, earlierStageWorkHash: `before-${id}`, stageLifecycle: CLASS4_FRESHNESS_IDS.includes(id) ? lifecycle(CLASS4_TARGET_STAGE) : {}, attempts: CLASS4_FRESHNESS_IDS.includes(id) ? [{ stageId: CLASS4_TARGET_STAGE, allocatedBudgetMs: 10, allocatedNodeCeiling: 20, allocatedWorkCeiling: 30 }] : [] }));
const populationHash4 = stableHash([...ids].sort());
const controlIdentity = { configurationHash: 'control', populationHash: populationHash4, resolvedSha: 'a'.repeat(40), schedulerMode: 'production', experimentId: 'c4', researchQuestion: 'q', preflight: 'p', treatmentFlag: false, globalPortalCoarseStateMerge: false, effectiveConfig: { STRATEGY_PORTAL_COARSE_STATE_MERGE: false, STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY: true, STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT: false } };
const treatmentIdentity = { configurationHash: 'treatment', populationHash: populationHash4, resolvedSha: 'a'.repeat(40), schedulerMode: 'production', experimentId: 'c4', researchQuestion: 'q', preflight: 'p', treatmentFlag: true, globalPortalCoarseStateMerge: false, effectiveConfig: { STRATEGY_PORTAL_COARSE_STATE_MERGE: false, STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY: true, STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_TREATMENT: true } };
const treatment4 = clone(control4);
Object.assign(treatment4[0], { ok: true, refereeValid: true, winningStage: CLASS4_TARGET_STAGE });
assert.equal(analyzeClass4Canary({ controlRows: control4, treatmentRows: treatment4, nonPortalControlIds: ['NP1', 'NP2'], controlIdentity, treatmentIdentity }).decision, 'advance-to-113');
const zero = treatment4.map(row => ({ ...row, ok: row.id === CLASS4_SENTINEL_ID, refereeValid: row.id === CLASS4_SENTINEL_ID, winningStage: row.id === CLASS4_SENTINEL_ID ? 'main-search' : null }));
assert.equal(analyzeClass4Canary({ controlRows: control4, treatmentRows: zero, nonPortalControlIds: ['NP1', 'NP2'], controlIdentity, treatmentIdentity }).decision, 'stop-zero-of-eight');
assert.equal(analyzeClass4Canary({ controlRows: control4, treatmentRows: treatment4.slice(1), nonPortalControlIds: ['NP1', 'NP2'], controlIdentity, treatmentIdentity }).decision, 'invalid-execution');
for (const mutate of [
  rows => { rows.find(r => r.id === CLASS4_SENTINEL_ID).solutionHash = 'changed'; },
  rows => { rows.find(r => r.id === 'NP1').stageLifecycle = lifecycle(CLASS4_TARGET_STAGE); },
  rows => { rows[0].earlierStageWorkHash = 'changed'; }, rows => { rows[0].deadlineTruncated = true; },
  rows => { rows[0].refereeValid = false; },
]) { const rows = clone(treatment4); mutate(rows); assert.equal(analyzeClass4Canary({ controlRows: control4, treatmentRows: rows, nonPortalControlIds: ['NP1', 'NP2'], controlIdentity, treatmentIdentity }).decision, 'stop'); }

const provenance = { seed: 'seed-1', selectionVersion: 'v1', corpusHash: 'corpus', baseSha: 'abc', controlConfig: { flag: false }, treatmentConfig: { flag: true }, controlConfigHash: 'control', treatmentConfigHash: 'treatment', envelope: { nodes: 50e6, work: 67e6 }, stageOrder: ['late-repair-search', CLASS2_TARGET_STAGE], schedulerMode: 'production', workerConfig: { kind: 'worker_threads', ordering: 'input' }, workerCount: 4 };
const candidates = Array.from({ length: 65 }, (_, i) => ({ id: `G${String(i).padStart(2, '0')}`, class2ControlEligibility: { hasMustTurn: true, childStructuralEligible: true, childInsertionPointReached: true, ordinaryLateRepairParticipated: true }, ok: false, stageLifecycle: lifecycle('late-repair-search') })).concat(Array.from({ length: 5 }, (_, i) => ({ id: `C${i}`, class2ControlEligibility: { hasMustTurn: true, childStructuralEligible: true, childInsertionPointReached: true, ordinaryLateRepairParticipated: true }, ok: true, refereeValid: true, attempts: [{ stageId: 'guidance-goal-distance-retry', ok: true }], stageLifecycle: lifecycle('late-repair-search') })));
const manifest = materializeClass2Cohort(candidates, provenance);
assert.deepEqual(manifest.counts, { gain: 55, collateral: 5, total: 60 });
assert.equal(manifest.populationHash, stableHash(manifest.entries));
assert.equal(manifest.schedulerMode, 'production');
assert.deepEqual(manifest.workerConfig, provenance.workerConfig);
assert.equal(manifest.workerCount, 4);
assert.notEqual(manifest.freezeIdentityHash, materializeClass2Cohort(candidates, { ...provenance, workerCount: 2 }).freezeIdentityHash);
assert.notEqual(manifest.freezeIdentityHash, materializeClass2Cohort(candidates, { ...provenance, schedulerMode: 'alternate' }).freezeIdentityHash);
assert.notEqual(manifest.freezeIdentityHash, materializeClass2Cohort(candidates, { ...provenance, workerConfig: { kind: 'sequential' } }).freezeIdentityHash);
const doseCollateral = { ...candidates.at(-1), id: 'R03049' };
const withDose = materializeClass2Cohort([...candidates, doseCollateral], provenance);
assert.deepEqual(withDose.entries.find(entry => entry.id === 'R03049'), { id: 'R03049', stratum: 'collateral' });
assert.throws(() => materializeClass2Cohort([{ ...candidates[0], stageLifecycle: {} }, ...candidates.slice(1)], provenance), /participation evidence missing/);
assert.throws(() => materializeClass2Cohort(candidates.slice(0, 20), provenance), /insufficient eligible gain/);
const arm = (treatment, gain = true) => manifest.entries.map((entry, i) => {
  const collateral = entry.stratum === 'collateral';
  const targetWin = treatment && gain && i === 0;
  const downstreamStage = 'guidance-goal-distance-retry';
  const downstreamWork = treatment ? 80 : 100;
  return { id: entry.id, configHash: treatment ? 'treatment' : 'control',
    ok: targetWin || collateral, refereeValid: targetWin || collateral,
    winningStage: targetWin ? CLASS2_TARGET_STAGE : collateral ? downstreamStage : null,
    workSpent: treatment ? 110 : 100, totalMs: treatment ? 120 : 100, wallMeasurementIdentity: 'host-a',
    stageLifecycle: { ...(treatment ? lifecycle(CLASS2_TARGET_STAGE) : {}),
      ...(collateral ? lifecycle(downstreamStage, downstreamWork, 10) : {}) } };
});
const control2 = arm(false), treatment2 = arm(true);
const advanced = analyzeClass2Economics({ manifest, controlRows: control2, treatmentRows: treatment2 });
assert.equal(advanced.decision, 'advance');
assert.equal(advanced.wallEconomics.wallDeltaMs, 1200);
assert.equal(advanced.wallEconomics.primaryMeasure, 'workSpent');
assert.equal(advanced.downstreamPartiallyReduced.length, 5);
assert.deepEqual(advanced.downstreamWorkSummary, { rows: 5, controlWork: 500, treatmentWork: 400, workDelta: -100, reductionFraction: 0.2 });
assert.equal(analyzeClass2Economics({ manifest, controlRows: control2, treatmentRows: arm(true, false) }).decision, 'stop-zero-gain');
const lossControl = clone(control2), lossTreatment = clone(treatment2); Object.assign(lossControl[1], { ok: true, refereeValid: true, winningStage: 'guidance-goal-distance-retry' });
assert.equal(analyzeClass2Economics({ manifest, controlRows: lossControl, treatmentRows: lossTreatment }).decision, 'stop');
const sparse = clone(treatment2); for (let i = 0; i < 20; i++) sparse[i].stageLifecycle = {};
assert.equal(analyzeClass2Economics({ manifest, controlRows: control2, treatmentRows: sparse }).decision, 'stop');
const badWall = clone(treatment2); delete badWall[0].totalMs;
const badWallResult = analyzeClass2Economics({ manifest, controlRows: control2, treatmentRows: badWall });
assert.equal(badWallResult.decision, 'stop'); assert.deepEqual(badWallResult.wallEconomics.unusableWallMeasurements, [manifest.entries[0].id]);
const mismatchedWall = clone(treatment2); mismatchedWall[0].wallMeasurementIdentity = 'host-b';
assert.deepEqual(analyzeClass2Economics({ manifest, controlRows: control2, treatmentRows: mismatchedWall }).wallEconomics.asymmetricWallMeasurements, [manifest.entries[0].id]);
const starved = clone(treatment2); const collateralIndex = manifest.entries.findIndex(entry => entry.stratum === 'collateral');
starved[collateralIndex].ok = false; starved[collateralIndex].refereeValid = false; starved[collateralIndex].stageLifecycle['guidance-goal-distance-retry'].actualWork = 0;
assert.deepEqual(analyzeClass2Economics({ manifest, controlRows: control2, treatmentRows: starved }).downstreamStarved, [manifest.entries[collateralIndex].id]);
assert.equal(analyzeClass2Economics({ manifest: { ...manifest, populationHash: 'bad' }, controlRows: control2, treatmentRows: treatment2 }).decision, 'invalid-execution');
assert.throws(() => materializeClass2Cohort(candidates, { ...provenance, schedulerMode: undefined }), /missing freeze provenance: schedulerMode/);
assert.throws(() => materializeClass2Cohort(candidates, { ...provenance, workerConfig: undefined }), /missing freeze provenance: workerConfig/);
assert.throws(() => materializeClass2Cohort(candidates, { ...provenance, workerCount: undefined }), /missing freeze provenance: workerCount/);
assert.throws(() => materializeClass2Cohort(candidates, { ...provenance, schedulerMode: '' }), /non-empty string/);
assert.throws(() => materializeClass2Cohort(candidates, { ...provenance, workerConfig: {} }), /non-empty object/);
assert.throws(() => materializeClass2Cohort(candidates, { ...provenance, workerCount: 0 }), /positive integer/);
const dir = mkdtempSync(join(tmpdir(), 'ws2-readiness-'));
const cliInput = join(dir, 'canary.json'); writeFileSync(cliInput, JSON.stringify({ controlRows: control4, treatmentRows: treatment4, nonPortalControlIds: ['NP1', 'NP2'], controlIdentity, treatmentIdentity }));
assert.match(execFileSync(process.execPath, ['scripts/ws2-experiment-readiness.mjs', 'class4-canary', cliInput], { encoding: 'utf8' }), /advance-to-113/);
console.log('WS2 Class-2/Class-4 readiness tests passed');
