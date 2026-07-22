/** Unit tests for Solver attempt-order selection. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SOLVER_TESTING_API } from '../Solver.js';
import { applyAttemptConfigOptions, getAttemptConfigs, getConfiguredAttemptConfigs } from './attempts.js';
import { PACK } from './encoding.js';
import { ATTEMPT_CONFIGS, PROFILE_ORDER } from './policy.js';
import { defaultConfig } from '../../scripts/ablation-config.mjs';
import type { NormalizedLevel } from '../domain/types.js';


function makeLevel(overrides = {}) {
  return {
    grid: { w: 10, h: 10 },
    reqLen: 50,
    reqInt: 2,
    gateKeys: [PACK(0, 0)],
    blockSet: new Set(),
    gooseSet: new Set(),
    falseGoalKeys: new Set(),
    mustPassKeys: [],
    mustCrossKeys: [],
    portalMap: new Map(),
    ...overrides,
  } as unknown as NormalizedLevel;
}

test('repairTurnBiased attempt is default-off, appended only under STRATEGY_REPAIR_TURN_BIAS', () => {
  // Must-turn repair-fallback level (mustCross≥2 & mustPass≥3 → needsRepairFallback; mustPassTurnDirs
  // non-empty → mustTurn>0), so the ordinary + must-turn-biased repair attempts are present.
  const level = makeLevel({
    reqLen: 40, reqInt: 2,
    mustPassKeys: [PACK(1, 1), PACK(2, 2), PACK(3, 3)],
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
    mustPassTurnDirs: new Map([[PACK(1, 1), 'either']]),
  });
  const off = getAttemptConfigs(level, null);
  assert.equal(off.some(c => c.repairMustTurnBiased), true, 'sanity: this is a must-turn repair level');
  assert.equal(off.some(c => c.repairTurnBiased), false, 'not added with null cfg (production default)');
  const on = getAttemptConfigs(level, defaultConfig());
  assert.equal(on.some(c => c.repairTurnBiased), true, 'added under a config with the flag set');
  // And it comes after both other repair attempts (purely additive, runs last).
  const repairs = on.filter(c => c.repair);
  assert.equal(repairs[repairs.length - 1].repairTurnBiased, true, 'appended after the ordinary + must-turn-biased repair attempts');
});

test('default attempt order keeps template sweep before profile fallbacks', () => {
  const attempts = getAttemptConfigs(makeLevel({ reqLen: 40, reqInt: 2, mustPassKeys: [PACK(1, 1)] }));
  assert.deepEqual(attempts.slice(0, 4).map(c => c.template?.id), ATTEMPT_CONFIGS.slice(0, 4).map(c => c.template?.id));
  assert.deepEqual(attempts.slice(4).map(c => c.profileName), PROFILE_ORDER);
});

test('default no-must-pass levels prefer perimeterCCW before perimeterCW', () => {
  const attempts = getAttemptConfigs(makeLevel({ reqLen: 40, reqInt: 2, mustPassKeys: [] }));
  assert.deepEqual(attempts.slice(0, 4).map(c => c.template?.id), [
    'cornerHarvest',
    'perimeterCCW',
    'perimeterCW',
    'sideCommitment',
  ]);
});

test('near-closure attempts prioritize closure rescue profiles before templates', () => {
  const attempts = getAttemptConfigs(makeLevel({ reqLen: 10, reqInt: 1 }));
  assert.deepEqual(attempts.slice(0, 4).map(c => c.profileName), [
    'nearClosureRescue',
    'harvestThenFinish',
    'finishFirst',
    'perimeterSweep',
  ]);
  assert.equal(attempts.slice(0, 4).every(c => c.template === null), true);
  assert.equal(attempts.some(c => c.template?.id === 'cornerHarvest'), true);
});

test('high-intersection dense levels lead with beam configs', () => {
  const attempts = getAttemptConfigs(makeLevel({ reqLen: 60, reqInt: 7 }));
  assert.deepEqual(attempts.slice(0, 2).map(c => [c.profileName, c.beamWidth]), [
    ['intersectionHarvest', 5000],
    ['objectiveFirst', 5000],
  ]);
});


test('STRATEGY_ARCHETYPE_ROUTING disabled forces the catch-all rule regardless of features', () => {
  const level = makeLevel({ reqLen: 60, reqInt: 7 });
  const routed = getAttemptConfigs(level);
  assert.deepEqual(routed.slice(0, 2).map(c => [c.profileName, c.beamWidth]), [
    ['intersectionHarvest', 5000],
    ['objectiveFirst', 5000],
  ]);

  const forcedDefault = getAttemptConfigs(level, { STRATEGY_ARCHETYPE_ROUTING: false });
  assert.deepEqual(forcedDefault.slice(0, 4).map(c => c.template?.id), [
    'cornerHarvest', 'perimeterCW', 'perimeterCCW', 'sideCommitment',
  ]);
  assert.notDeepEqual(forcedDefault.map(c => c.profileName), routed.map(c => c.profileName));

  // Passing no ablation config at all (the production call shape) must stay byte-identical
  // to the pre-existing routed behavior.
  assert.deepEqual(getAttemptConfigs(level, null), routed);
});

test('applyAttemptConfigOptions filters disabled templates and profiles', () => {
  const base = getAttemptConfigs(makeLevel({ reqLen: 40, reqInt: 2, mustPassKeys: [PACK(1, 1)] }));
  const filtered = applyAttemptConfigOptions(base, {
    TEMPLATE_CORNER_HARVEST: false,
    PROFILE_default: false,
  });
  assert.equal(filtered.some(c => c.template?.id === 'cornerHarvest'), false);
  assert.equal(filtered.some(c => c.profileName === 'default'), false);
  assert.equal(filtered.length < base.length, true);
});

test('applyAttemptConfigOptions supports reverse, random, and profile-grouped ordering', () => {
  const base = getAttemptConfigs(makeLevel({ reqLen: 40, reqInt: 2, mustPassKeys: [PACK(1, 1)] }));
  assert.deepEqual(applyAttemptConfigOptions(base, { ATTEMPT_ORDER: 'reverse' }), [...base].reverse());

  const randomA = applyAttemptConfigOptions(base, { ATTEMPT_ORDER: 'random', _randomSeed: 123 });
  const randomB = applyAttemptConfigOptions(base, { ATTEMPT_ORDER: 'random', _randomSeed: 123 });
  assert.deepEqual(randomA, randomB, 'same seed should produce stable order');
  assert.notDeepEqual(randomA.map(c => [c.profileName, c.template?.id ?? null]), base.map(c => [c.profileName, c.template?.id ?? null]));

  const grouped = applyAttemptConfigOptions([
    { profileName: 'a', template: { id: 't' } },
    { profileName: 'b', template: null, beamWidth: 2000 },
    { profileName: 'c', template: null },
  ], { ATTEMPT_ORDER: 'profile-grouped' });
  assert.deepEqual(grouped.map(c => c.profileName), ['c', 'a', 'b']);
});

test('getConfiguredAttemptConfigs combines base ordering with ablation options', () => {
  const level = makeLevel({ reqLen: 40, reqInt: 2, mustPassKeys: [PACK(1, 1)] });
  const configured = getConfiguredAttemptConfigs(level, { TEMPLATE_CORNER_HARVEST: false, ATTEMPT_ORDER: 'reverse' });
  assert.equal(configured.some(c => c.template?.id === 'cornerHarvest'), false);
  assert.deepEqual(configured, [...applyAttemptConfigOptions(getAttemptConfigs(level), { TEMPLATE_CORNER_HARVEST: false })].reverse());
});

test('SOLVER_TESTING_API exposes the extracted attempt-order helper', () => {
  const level = makeLevel({ reqLen: 10, reqInt: 1 });
  assert.equal(SOLVER_TESTING_API.getAttemptConfigs, getAttemptConfigs);
  assert.deepEqual(SOLVER_TESTING_API.getAttemptConfigs(level), getAttemptConfigs(level));
});

test('must-cross-threaded medium-high-int levels get floored diverse wide beams', () => {
  // reqInt 5 at density ~0.55 → high-intersection-burden, below the very-high-reqInt and
  // near-Hamiltonian branches. With ≥2 must-cross cells the plain 2000-wide beams collapse
  // to one structural mode and DFS never recovers (stress-corpus finding: the diverse
  // bucketed WIDE beam solves these in seconds while the shipped ladder times out).
  const level = makeLevel({ reqLen: 55, reqInt: 5, mustCrossKeys: [PACK(4, 4), PACK(6, 6)] });
  const attempts = getAttemptConfigs(level);
  const diverse = attempts.filter(c => c.diverseBeam);
  assert.equal(diverse.length >= 2, true, 'expected diverse beam attempts');
  assert.equal(diverse.some(c => c.profileName === 'intersectionHarvest' && (c.minBudgetFraction ?? 0) > 0), true,
    'diverse intersectionHarvest beam needs a budget floor to survive ladder fragmentation');
  const perimeterIdx = attempts.findIndex(c => c.beamWidth && c.template?.id === 'perimeterCW');
  const diverseIdx = attempts.findIndex(c => c.diverseBeam);
  assert.equal(perimeterIdx >= 0 && perimeterIdx < diverseIdx, true,
    'proven perimeter beam winners still lead; diverse beams follow');
});

test('medium-high-int levels without must-cross keep the plain beam ladder', () => {
  const level = makeLevel({ reqLen: 55, reqInt: 5, mustCrossKeys: [] });
  const attempts = getAttemptConfigs(level);
  assert.equal(attempts.some(c => c.diverseBeam), false);
});

test('very-high-reqInt levels with must-cross threading also get the diverse beams', () => {
  const level = makeLevel({ reqLen: 60, reqInt: 8, mustCrossKeys: [PACK(4, 4), PACK(6, 6)] });
  const attempts = getAttemptConfigs(level);
  assert.equal(attempts.some(c => c.diverseBeam && c.profileName === 'intersectionHarvest'), true);
});

test('STRATEGY_REPAIR_FALLBACK / STRATEGY_REPAIR_MUSTTURN_BIAS filter the repair attempts', () => {
  // mustCross ≥ 2 + mustPass ≥ 3 matches the repair gate; mustPassTurnDirs makes the level a
  // must-turn level, so the biased second attempt is appended too.
  const level = makeLevel({
    reqLen: 60, reqInt: 4,
    mustPassKeys: [PACK(1, 1), PACK(2, 2), PACK(3, 3)],
    mustCrossKeys: [PACK(4, 4), PACK(5, 5)],
    mustPassTurnDirs: new Map([[PACK(1, 1), 'cw']]),
  });
  const base = getAttemptConfigs(level);
  assert.equal(base.filter(c => c.repair).length, 2, 'repair gate matched: ordinary + biased attempts');
  assert.equal(base.filter(c => c.repairMustTurnBiased).length, 1);

  const noRepair = applyAttemptConfigOptions(base, { STRATEGY_REPAIR_FALLBACK: false });
  assert.equal(noRepair.some(c => c.repair), false, 'fallback flag removes both repair attempts');
  assert.equal(noRepair.length, base.length - 2);

  const noBias = applyAttemptConfigOptions(base, { STRATEGY_REPAIR_MUSTTURN_BIAS: false });
  assert.equal(noBias.filter(c => c.repair).length, 1, 'bias flag removes only the biased attempt');
  assert.equal(noBias.some(c => c.repairMustTurnBiased), false);
});
