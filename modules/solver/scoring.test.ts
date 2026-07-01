/** Unit tests for SolverV2 scoring and score sorting helpers. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK, KEY_SPACE } from './encoding.js';
import { POLICY_PROFILES, TEMPLATES } from './policy.js';
import { prepLevel } from './prep.js';
import { computeTemplateBonus, scoreAndSort, scoreMoveV2 } from './scoring.js';
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

test('scoreMoveV2 applies template bonus without depending on SolverV2 globals', () => {
  const pos = PACK(0, 0);
  const target = PACK(1, 0);
  const level = makeLevel({ gateKeys: [pos], goalKey: PACK(4, 0) });
  const prep = prepLevel(level);
  const state = makeState(pos);
  const noTemplate = scoreMoveV2(target, pos, state, level, prep, POLICY_PROFILES.default, 3, null);
  const withTemplate = scoreMoveV2(target, pos, state, level, prep, POLICY_PROFILES.default, 3, TEMPLATES.perimeterCCW);
  assert.equal(withTemplate - noTemplate, computeTemplateBonus(target, pos, level, TEMPLATES.perimeterCCW, 0.25));
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
