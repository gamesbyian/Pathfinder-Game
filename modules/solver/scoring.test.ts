/** Unit tests for Solver scoring and score sorting helpers. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK, KEY_SPACE } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import { POLICY_PROFILES, TEMPLATES } from './policy.js';
import { prepLevel } from './prep.js';
import { computeTemplateBonus, scoreAndSort, scoreMove } from './scoring.js';
import { createState } from './search-state.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState } from './types.js';


function makeLevel(overrides = {}) {
  return {
    grid: { w: 5, h: 5 },
    reqLen: 4,
    reqInt: 0,
    goalKey: PACK(4, 2),
    gateKeys: [PACK(0, 2)],
    blockSet: new Set(),
    gooseSet: new Set(),
    falseGoalKeys: new Set(),
    mustPassKeys: [],
    mustCrossKeys: [],
    filterMap: new Map(),
    flippingFilterMap: new Map(),
    portalMap: new Map(),
    ...overrides,
  } as unknown as NormalizedLevel;
}

function makeState(startKey: number, overrides = {}) {
  const visited = new Uint16Array(KEY_SPACE);
  visited[startKey] = 1;
  return {
    path: [startKey],
    visited,
    edgeUsage: new Uint8Array(KEY_SPACE),
    ints: 0,
    mustMask: 0,
    mustCrossMask: 0,
    crossCounts: new Uint8Array(0),
    mpVisitedMask: 0,
    portalJumps: 0,
    flipperUsedMask: 0,
    lastWasPortalJump: false,
    ...overrides,
  } as unknown as SolverSearchState;
}

test('computeTemplateBonus preserves perimeter direction bias', () => {
  const level = makeLevel();
  const pos = PACK(0, 0);
  const target = PACK(1, 0);
  assert.equal(computeTemplateBonus(target, pos, level, TEMPLATES.perimeterCW, 0.1), 26);
  assert.equal(computeTemplateBonus(target, pos, level, TEMPLATES.perimeterCCW, 0.1), 68);
});

test('computeTemplateBonus rewards early corner harvest targets', () => {
  const level = makeLevel();
  assert.equal(computeTemplateBonus(PACK(1, 1), PACK(2, 2), level, TEMPLATES.cornerHarvest, 0.2), 48);
  assert.equal(computeTemplateBonus(PACK(2, 2), PACK(1, 1), level, TEMPLATES.cornerHarvest, 0.2), -36);
  assert.equal(computeTemplateBonus(PACK(2, 2), PACK(1, 1), level, TEMPLATES.cornerHarvest, 0.7), 0);
});

test('scoreMove applies template bonus without depending on Solver globals', () => {
  const pos = PACK(0, 0);
  const target = PACK(1, 0);
  const level = makeLevel({ gateKeys: [pos], goalKey: PACK(4, 0) });
  const prep = prepLevel(level);
  const state = makeState(pos);
  const noTemplate = scoreMove(target, pos, state, level, prep, POLICY_PROFILES.default, 3, null);
  const withTemplate = scoreMove(target, pos, state, level, prep, POLICY_PROFILES.default, 3, TEMPLATES.perimeterCCW);
  assert.equal(withTemplate - noTemplate, computeTemplateBonus(target, pos, level, TEMPLATES.perimeterCCW, 0.25));
});

test('scoreMove rewards moving toward an unsatisfied must-turn cell, and stops once it is satisfied', () => {
  // 5x1 corridor: gate(1,1) .. mustTurn(3,1) .. goal(5,1). Approaching from (2,1) is 1 step
  // closer to the must-turn cell than staying at (1,1) — must-turn urgency should reward that,
  // exactly mirroring must-pass urgency's (dCur - dTarget) * 5 shape (both plain distance-to-cell).
  const K = (x: number, y: number) => PACK(x - 1, y - 1);
  const level = normalizeRawLevel({
    grid: { w: 5, h: 1 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 1 },
    reqLen: 4, reqInt: 0,
    blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
    filters: [], flippingFilters: [], portals: [],
    landmarks: [{ x: 3, y: 1, objectType: 'library', role: 'mustTurn', turn: 'either' }],
    hints: [],
  });
  const prep = prepLevel(level);
  const state = createState(K(1, 1), level, prep);
  assert.equal(state.mustTurnMask, 1, 'must-turn cell starts unsatisfied');

  const scoreUnsatisfied = scoreMove(K(2, 1), K(1, 1), state, level, prep, POLICY_PROFILES.default, 3, null);
  // Isolate the must-turn term: it's the only scoring term that reads state.mustTurnMask, so
  // clearing the mask (mask=0, as if already satisfied) while holding pos/target/everything
  // else fixed isolates its exact contribution. Expect wmt * gain * 2 (dCur=2, dTarget=1,
  // gain=1; POLICY_PROFILES.default doesn't set mustTurnUrgencyWeight, so wmt defaults to 1) —
  // same distance-to-cell shape as must-pass urgency, but its own weight field (not must-pass's
  // wmp): repair's profile zeroes it out independently (see policy.ts), which a shared weight
  // couldn't express without also zeroing must-pass urgency for repair.
  const satisfiedState = { ...state, mustTurnMask: 0 } as SolverSearchState;
  const scoreSatisfied = scoreMove(K(2, 1), K(1, 1), satisfiedState, level, prep, POLICY_PROFILES.default, 3, null);
  assert.equal(scoreUnsatisfied - scoreSatisfied, 1 * 1 * 2);

  // repair's profile opts out entirely: no contribution regardless of distance.
  const scoreRepairUnsatisfied = scoreMove(K(2, 1), K(1, 1), state, level, prep, POLICY_PROFILES.repair, 3, null);
  const scoreRepairSatisfied = scoreMove(K(2, 1), K(1, 1), satisfiedState, level, prep, POLICY_PROFILES.repair, 3, null);
  assert.equal(scoreRepairUnsatisfied, scoreRepairSatisfied);
});

test('scoreAndSort orders neighbors by extracted score function', () => {
  const pos = PACK(0, 2);
  const towardGoal = PACK(1, 2);
  const awayFromGoal = PACK(0, 1);
  const level = makeLevel({ gateKeys: [pos], goalKey: PACK(4, 2), reqLen: 6 });
  const prep = prepLevel(level);
  const state = makeState(pos);
  const neighbors = [awayFromGoal, towardGoal];
  scoreAndSort(neighbors, pos, state, level, prep, POLICY_PROFILES.default, null);
  assert.deepEqual(neighbors, [towardGoal, awayFromGoal]);
});
