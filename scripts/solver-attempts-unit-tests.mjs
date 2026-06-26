#!/usr/bin/env node
/** Unit tests for SolverV2 attempt-order selection. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { SOLVER_TESTING_API } from '../modules/SolverV2.js';
import { applyAttemptConfigOptions, getAttemptConfigs, getConfiguredAttemptConfigs } from '../modules/solver/attempts.js';
import { PACK } from '../modules/solver/encoding.js';
import { ATTEMPT_CONFIGS, PROFILE_ORDER } from '../modules/solver/policy.js';


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
  };
}

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
