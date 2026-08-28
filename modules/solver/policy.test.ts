/** Unit tests for extracted Solver policy/orderingBias data. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createSolver, SOLVER_TESTING_API } from '../solver.js';
import { ATTEMPT_CONFIGS, SCORING_PROFILES, SCORING_PROFILE_ORDER, STRUCTURAL_ORDERING_BIASES, ORDERING_BIAS_CONFIG_KEYS } from './policy.js';


test('policy profiles include every ordered profile and required weights', () => {
  assert.equal(SCORING_PROFILE_ORDER.length, 12);
  assert.equal(SCORING_PROFILE_ORDER.at(-1), 'default');
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
  for (const scoringProfileId of SCORING_PROFILE_ORDER) {
    assert.ok(SCORING_PROFILES[scoringProfileId], `missing profile ${scoringProfileId}`);
    for (const key of requiredWeights) assert.equal(typeof (SCORING_PROFILES[scoringProfileId] as any)[key], 'number', `${scoringProfileId}.${key}`);
  }
});

test('orderingBias config key map covers all structural templates', () => {
  for (const orderingBias of Object.values(STRUCTURAL_ORDERING_BIASES)) {
    assert.equal(ORDERING_BIAS_CONFIG_KEYS[orderingBias.id!]?.startsWith('TEMPLATE_'), true, `missing orderingBias config key for ${orderingBias.id}`);
  }
});

test('base attempt configs preserve orderingBias sweep followed by profile fallbacks', () => {
  assert.equal(ATTEMPT_CONFIGS.length, 4 + SCORING_PROFILE_ORDER.length);
  assert.deepEqual(ATTEMPT_CONFIGS.slice(0, 4).map(c => c.orderingBias?.id), [
    'cornerHarvest',
    'perimeterCW',
    'perimeterCCW',
    'sideCommitment',
  ]);
  assert.deepEqual(ATTEMPT_CONFIGS.slice(4).map(c => c.scoringProfileId), SCORING_PROFILE_ORDER);
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
  assert.equal(SOLVER_TESTING_API.classifyRoutingRegime(level), 'general');
  const attempts = SOLVER_TESTING_API.getAttemptConfigs(level);
  assert.deepEqual(attempts.slice(0, 4).map(c => c.orderingBias?.id), ATTEMPT_CONFIGS.slice(0, 4).map(c => c.orderingBias?.id));
  assert.ok(attempts.some(c => c.scoringProfileId === 'default' && c.orderingBias === null));
  // Beam-routing-gap fix (technique census, run 32240161854): the catch-all rule now offers beam
  // search too, trailing last (within the main loop's protected late-reserve window). A follow-up
  // pass added perimeterSweep CW/CCW STANDARD beams after the original WIDE pair, same position.
  const nonAdmissibleOrder = attempts.filter(c => !c.admissibleOrder);
  assert.deepEqual(nonAdmissibleOrder.slice(-4).map(c => [c.scoringProfileId, c.beamWidth]), [
    ['objectiveFirst', 5000],
    ['intersectionHarvest', 5000],
    ['perimeterSweep', 2000],
    ['perimeterSweep', 2000],
  ]);
});
