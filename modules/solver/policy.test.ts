/** Unit tests for extracted Solver policy/template data. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createSolver, SOLVER_TESTING_API } from '../Solver.js';
import { ATTEMPT_CONFIGS, POLICY_PROFILES, PROFILE_ORDER, TEMPLATES, TEMPLATE_CONFIG_KEYS } from './policy.js';


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
    for (const key of requiredWeights) assert.equal(typeof (POLICY_PROFILES[profileName] as any)[key], 'number', `${profileName}.${key}`);
  }
});

test('template config key map covers all structural templates', () => {
  for (const template of Object.values(TEMPLATES)) {
    assert.equal(TEMPLATE_CONFIG_KEYS[template.id!]?.startsWith('TEMPLATE_'), true, `missing template config key for ${template.id}`);
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

test('Solver uses the extracted policy data for default attempt configs', () => {
  const solver = createSolver();
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
  const attempts = SOLVER_TESTING_API.getAttemptConfigs(level);
  assert.deepEqual(attempts.slice(0, 4).map(c => c.template?.id), ATTEMPT_CONFIGS.slice(0, 4).map(c => c.template?.id));
  assert.ok(attempts.some(c => c.profileName === 'default' && c.template === null));
  // Beam-routing-gap fix (technique census, run 32240161854): the catch-all rule now offers beam
  // search too, trailing last (within the main loop's protected late-reserve window). A follow-up
  // pass added perimeterSweep CW/CCW STANDARD beams after the original WIDE pair, same position.
  const nonAdmissibleOrder = attempts.filter(c => !c.admissibleOrder);
  assert.deepEqual(nonAdmissibleOrder.slice(-4).map(c => [c.profileName, c.beamWidth]), [
    ['objectiveFirst', 5000],
    ['intersectionHarvest', 5000],
    ['perimeterSweep', 2000],
    ['perimeterSweep', 2000],
  ]);
});
