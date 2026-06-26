#!/usr/bin/env node
/** Unit tests for extracted SolverV2 policy/template data. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createSolverV2, SOLVER_TESTING_API } from '../modules/SolverV2.js';
import { ATTEMPT_CONFIGS, POLICY_PROFILES, PROFILE_ORDER, TEMPLATES, TEMPLATE_CONFIG_KEYS } from '../modules/solver/policy.js';


test('policy profiles include every ordered profile and required weights', () => {
  assert.equal(PROFILE_ORDER.length, 12);
  assert.equal(PROFILE_ORDER.at(-1), 'default');
  const requiredWeights = [
    'goalAttractionWeight',
    'objectiveAttractionWeight',
    'finishCommitmentWeight',
    'perimeterBiasWeight',
    'mustPassUrgencyWeight',
    'mustCrossUrgencyWeight',
    'intersectionSetupWeight',
    'antiDitherWeight',
    'revisitPenaltyWeight',
  ];
  for (const profileName of PROFILE_ORDER) {
    assert.ok(POLICY_PROFILES[profileName], `missing profile ${profileName}`);
    for (const key of requiredWeights) assert.equal(typeof POLICY_PROFILES[profileName][key], 'number', `${profileName}.${key}`);
  }
});

test('template config key map covers all structural templates', () => {
  for (const template of Object.values(TEMPLATES)) {
    assert.equal(TEMPLATE_CONFIG_KEYS[template.id]?.startsWith('TEMPLATE_'), true, `missing template config key for ${template.id}`);
  }
});

test('base attempt configs preserve template sweep followed by profile fallbacks', () => {
  assert.equal(ATTEMPT_CONFIGS.length, 4 + PROFILE_ORDER.length);
  assert.deepEqual(ATTEMPT_CONFIGS.slice(0, 4).map(c => c.template?.id), [
    'cornerHarvest',
    'perimeterCW',
    'perimeterCCW',
    'sideCommitment',
  ]);
  assert.deepEqual(ATTEMPT_CONFIGS.slice(4).map(c => c.profileName), PROFILE_ORDER);
});

test('SolverV2 uses the extracted policy data for default attempt configs', () => {
  const solver = createSolverV2();
  const raw = {
    grid: { w: 15, h: 15 },
    gates: [{ x: 5, y: 5 }, { x: 10, y: 3 }],
    goal: { x: 13, y: 12 },
    reqLen: 80,
    reqInt: 3,
    blocks: [],
    mustPass: [{ x: 7, y: 7 }],
    mustCross: [],
    filters: [],
    flippingFilters: [],
    portals: [],
    geese: [],
    falseGoals: [],
  };
  const level = solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: 1 });
  assert.equal(SOLVER_TESTING_API.detectArchetype(level), 'default');
  const attempts = SOLVER_TESTING_API.getAttemptConfigs(level, {});
  assert.deepEqual(attempts.slice(0, 4).map(c => c.template?.id), ATTEMPT_CONFIGS.slice(0, 4).map(c => c.template?.id));
  assert.ok(attempts.some(c => c.profileName === 'default' && c.template === null));
});
