/** Unit tests for Solver scoring and score sorting helpers. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { AXIS_H, AXIS_V, PACK, KEY_SPACE } from './encoding.js';
import { getDistanceFromArray } from './distance.js';
import { normalizeRawLevel } from './normalization.js';
import { POLICY_PROFILES, TEMPLATES } from './policy.js';
import { prepLevel } from './prep.js';
import { MAX_POOLED_OBJECTIVES, __buildFreshCurUrgencyContextForTests, buildCurUrgencyContext, computeTemplateBonus, scoreAndSort, scoreMove } from './scoring.js';
import { createState, applyMove } from './search-state.js';
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

test('scoreMove must-turn exit guidance is gated by its own SCORE_MUST_TURN_EXIT_GUIDANCE flag, independent of SCORE_MUST_TURN_URGENCY', () => {
  // 5x3 grid: gate(1,2) .. mustTurn(3,2) .. goal(5,2). Standing AT the must-turn cell itself
  // (pos = the cell, matching scoreMove's DFS pre-apply convention: state.path's tip is pos,
  // target is the not-yet-applied candidate) — this is the only place the exit-guidance term
  // (as opposed to the distance-urgency term tested above) ever fires.
  const K = (x: number, y: number) => PACK(x - 1, y - 1);
  const level = normalizeRawLevel({
    grid: { w: 5, h: 3 }, gates: [{ x: 1, y: 2 }], goal: { x: 5, y: 2 },
    reqLen: 10, reqInt: 0,
    blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
    filters: [], flippingFilters: [], portals: [],
    landmarks: [{ x: 3, y: 2, objectType: 'library', role: 'mustTurn', turn: 'either' }],
    hints: [],
  });
  const prep = prepLevel(level);
  const state = createState(K(1, 2), level, prep);
  applyMove(K(2, 2), state, level, prep, false);
  applyMove(K(3, 2), state, level, prep, false);
  assert.equal(state.mustTurnMask, 1, 'must-turn cell starts unsatisfied');

  // Entry was horizontal (from (2,2)); this target exits vertically, satisfying 'either'.
  // Isolate the exit-guidance bonus the same way as the must-cross urgency test above: same
  // target, same state, only the flag differs — every other scoring term (goal attraction,
  // perimeter bias, ...) is identical between the two calls since neither pos nor target changes.
  const turningTarget = K(3, 1);

  // Every other SCORE_* flag must be spelled out explicitly: `(!cfg || cfg.X)` reads false for
  // any flag left unset once cfg is non-null, so an under-specified cfg silently disables every
  // OTHER term too (a real trap — see the must-cross urgency test above for the same note).
  const allScoreFlagsOn = {
    SCORE_GOAL_ATTRACTION: true, SCORE_FINISH_COMMITMENT: true, SCORE_OBJECTIVE_ATTRACTION: true,
    SCORE_MUST_PASS_URGENCY: true, SCORE_MUST_CROSS_URGENCY: true, SCORE_MC_APPROACH_GUIDANCE: true,
    SCORE_FLIPPER_URGENCY: true, SCORE_INTERSECTION_SETUP: true, SCORE_PERIMETER_BIAS: true,
    SCORE_PHASE_SCALING: true, SCORE_ANTI_DITHER: true, SCORE_REVISIT_PENALTY: true,
    SCORE_TEMPLATE_BONUS: true, SCORE_SURROUND_URGENCY: true, SCORE_ADJ_TURN_URGENCY: true,
    SCORE_MUST_TURN_URGENCY: true, SCORE_MUST_TURN_EXIT_GUIDANCE: true, SCORE_PORTAL_PARITY_GUIDANCE: true,
  };

  const scoreWithGuidance = scoreMove(turningTarget, K(3, 2), state, level, prep, POLICY_PROFILES.default, 5, null);
  prep._cfg = { ...allScoreFlagsOn, SCORE_MUST_TURN_EXIT_GUIDANCE: false };
  const scoreWithoutGuidance = scoreMove(turningTarget, K(3, 2), state, level, prep, POLICY_PROFILES.default, 5, null);
  prep._cfg = null;
  // wmte defaults to 1 (default profile doesn't set mustTurnExitGuidanceWeight); bonus is wmte*40.
  assert.equal(scoreWithGuidance - scoreWithoutGuidance, 1 * 40, 'disabling SCORE_MUST_TURN_EXIT_GUIDANCE alone removes exactly the wmte*40 bonus even though SCORE_MUST_TURN_URGENCY stays enabled');
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

test('buildCurUrgencyContext.mpCur matches the distance scoreMove computes inline for pos', () => {
  const pos = PACK(0, 2);
  const mp = PACK(3, 2);
  const level = makeLevel({ gateKeys: [pos], goalKey: PACK(4, 2), reqLen: 6, mustPassKeys: [mp] });
  const prep = prepLevel(level);
  const ctx = buildCurUrgencyContext(pos, makeState(pos), level, prep);
  // mpCur is a pooled capacity-sized buffer, so assert the populated slot, not `.length` —
  // see CurUrgencyContext's "NOTE ON ARRAY LENGTHS".
  assert.equal(ctx.mpCur[0], 3, 'pos is 3 steps from the must-pass cell');
});

test('scoreMove returns an identical score with and without a precomputed curCtx (must-pass urgency)', () => {
  const pos = PACK(0, 2);
  const target = PACK(1, 2);
  const mp = PACK(3, 2);
  const level = makeLevel({ gateKeys: [pos], goalKey: PACK(4, 2), reqLen: 6, mustPassKeys: [mp] });
  const prep = prepLevel(level);
  const state = makeState(pos, { mustMask: 1 });
  const withoutCtx = scoreMove(target, pos, state, level, prep, POLICY_PROFILES.default, 5, null);
  const ctx = buildCurUrgencyContext(pos, state, level, prep);
  const withCtx = scoreMove(target, pos, state, level, prep, POLICY_PROFILES.default, 5, null, ctx);
  assert.equal(withCtx, withoutCtx);
});

test('scoreAndSort still orders neighbors correctly using its internally-built curCtx', () => {
  const pos = PACK(0, 2);
  const mp = PACK(3, 2);
  const towardMp = PACK(1, 2);
  const awayFromMp = PACK(0, 1);
  const level = makeLevel({ gateKeys: [pos], goalKey: PACK(4, 4), reqLen: 8, mustPassKeys: [mp] });
  const prep = prepLevel(level);
  const state = makeState(pos, { mustMask: 1 });
  const neighbors = [awayFromMp, towardMp];
  scoreAndSort(neighbors, pos, state, level, prep, POLICY_PROFILES.objectiveFirst, null);
  assert.deepEqual(neighbors, [towardMp, awayFromMp]);
});

test('buildCurUrgencyContext selects the must-cross approach axis from ENTRY state, regardless of any later candidate', () => {
  // 5x5 grid, must-cross cell at (2,2), entered via V-axis (path came from (2,1) moving down).
  // The pending 2nd visit needs the PERPENDICULAR (H) axis approach zone: (1,2)/(3,2) — a fixed
  // fact once we've arrived, independent of which exit candidate is later scored. This is the
  // fix for the axis-timing bug documented in CurUrgencyContext's doc comment: the ORIGINAL
  // per-candidate code re-read edgeUsage[mcKey] AFTER a candidate's own tentative exit move had
  // already been applied, so a candidate exiting via H (setting a NEW bit on top of the entry's V
  // bit) would wrongly flip the axis selection for itself. buildCurUrgencyContext reads
  // edgeUsage[mcKey] once, from the pre-loop entry state, so it can only ever see AXIS_V here.
  const mcKey = PACK(2, 2);
  const level = makeLevel({ gateKeys: [PACK(2, 0)], goalKey: PACK(4, 4), reqLen: 8, mustCrossKeys: [mcKey] });
  const prep = prepLevel(level);
  const edgeUsage = new Uint8Array(KEY_SPACE);
  edgeUsage[mcKey] = AXIS_V;
  const state = makeState(mcKey, { mustCrossMask: 1, crossCounts: new Uint8Array([1]), edgeUsage });

  const ctx = buildCurUrgencyContext(mcKey, state, level, prep);
  assert.equal(ctx.mcIsApproach![0], 1, 'approach-guidance branch applies (crossCounts=1)');
  assert.equal(ctx.mcTargetArr![0], prep.mcApproachDistMaps![0].h,
    'entry via V means the pending 2nd visit needs the H-axis approach zone');
  assert.equal(ctx.mcCur![0], getDistanceFromArray(prep.mcApproachDistMaps![0].h, mcKey, prep.gridW));
});

test('scoreMove must-cross urgency: curCtx keeps the same axis for every sibling; the no-curCtx fallback can flip per candidate (the original bug, preserved only for callers that opt out)', () => {
  const mcKey = PACK(2, 2);
  const exitH = PACK(3, 2); // this candidate's OWN exit axis is H
  const exitV = PACK(2, 3); // this candidate's OWN exit axis is V
  const level = makeLevel({ gateKeys: [PACK(2, 0)], goalKey: PACK(4, 4), reqLen: 8, mustCrossKeys: [mcKey] });
  const prep = prepLevel(level);

  // Entry-only state (before either candidate is applied) — what a real batch caller has.
  const entryEdgeUsage = new Uint8Array(KEY_SPACE);
  entryEdgeUsage[mcKey] = AXIS_V;
  const entryState = makeState(mcKey, { mustCrossMask: 1, crossCounts: new Uint8Array([1]), edgeUsage: entryEdgeUsage });
  const ctx = buildCurUrgencyContext(mcKey, entryState, level, prep);

  const hMap = prep.mcApproachDistMaps![0].h;
  const dCurFixed = getDistanceFromArray(hMap, mcKey, prep.gridW);

  // Isolate the must-cross term by toggling ONLY SCORE_MUST_CROSS_URGENCY — every other SCORE_*
  // flag must stay explicitly true, since `(!cfg || cfg.X)` reads false for any flag left unset
  // once cfg is non-null (a real trap: an ablation config isn't "one flag off, everything else
  // default" unless every other flag is spelled out).
  const allOtherScoreFlagsOn = {
    SCORE_GOAL_ATTRACTION: true, SCORE_FINISH_COMMITMENT: true, SCORE_OBJECTIVE_ATTRACTION: true,
    SCORE_MUST_PASS_URGENCY: true, SCORE_MC_APPROACH_GUIDANCE: true, SCORE_FLIPPER_URGENCY: true,
    SCORE_INTERSECTION_SETUP: true, SCORE_PERIMETER_BIAS: true, SCORE_PHASE_SCALING: true,
    SCORE_ANTI_DITHER: true, SCORE_REVISIT_PENALTY: true, SCORE_TEMPLATE_BONUS: true,
    SCORE_SURROUND_URGENCY: true, SCORE_ADJ_TURN_URGENCY: true, SCORE_MUST_TURN_URGENCY: true,
    SCORE_PORTAL_PARITY_GUIDANCE: true,
  };

  // With curCtx: both candidates score against the SAME dCur (entry-axis-based), so the isolated
  // must-cross contribution for each is wmc * (dCurFixed - dTarget) * 15, using the SAME hMap.
  for (const [target, label] of [[exitH, 'H-exit'], [exitV, 'V-exit']] as const) {
    const full = scoreMove(target, mcKey, entryState, level, prep, POLICY_PROFILES.default, 6, null, ctx);
    prep._cfg = { ...allOtherScoreFlagsOn, SCORE_MUST_CROSS_URGENCY: false };
    const withoutTerm = scoreMove(target, mcKey, entryState, level, prep, POLICY_PROFILES.default, 6, null, ctx);
    prep._cfg = null;
    const isolated = full - withoutTerm;
    const expected = 1 * (dCurFixed - getDistanceFromArray(hMap, target, prep.gridW)) * 15;
    assert.ok(Math.abs(isolated - expected) < 1e-9, `${label}: must-cross term should use the entry-axis (H-approach) map (got ${isolated}, expected ${expected})`);
  }

  // Contrast: the no-curCtx fallback DOES flip axis per candidate (simulating post-apply state,
  // i.e. state as it would appear inside beam/repair's loop after tentatively applying each
  // candidate) — demonstrating this is exactly the bug curCtx fixes, not a hypothetical one.
  const postApplyH = new Uint8Array(KEY_SPACE);
  postApplyH[mcKey] = AXIS_V | AXIS_H; // entry V + this candidate's own H exit
  const postApplyHState = makeState(exitH, { mustCrossMask: 1, crossCounts: new Uint8Array([1]), edgeUsage: postApplyH });
  const vMap = prep.mcApproachDistMaps![0].v;
  const dCurWrong = getDistanceFromArray(vMap, mcKey, prep.gridW); // wrongly reads .v because usedH now reads true
  const fullNoCtx = scoreMove(PACK(4, 2), mcKey, postApplyHState, level, prep, POLICY_PROFILES.default, 6, null);
  prep._cfg = { ...allOtherScoreFlagsOn, SCORE_MUST_CROSS_URGENCY: false };
  const withoutTermNoCtx = scoreMove(PACK(4, 2), mcKey, postApplyHState, level, prep, POLICY_PROFILES.default, 6, null);
  prep._cfg = null;
  const isolatedNoCtx = fullNoCtx - withoutTermNoCtx;
  const expectedWrong = 1 * (dCurWrong - getDistanceFromArray(vMap, PACK(4, 2), prep.gridW)) * 15;
  // The point: this reads from vMap (wrong — entry was V, so the pending 2nd visit needs the H
  // zone), not hMap like the curCtx-driven computation above — exactly the axis-timing bug.
  assert.notEqual(vMap, hMap, 'sanity: distinct approach-map arrays, so array identity actually distinguishes the two branches');
  assert.ok(Math.abs(isolatedNoCtx - expectedWrong) < 1e-9, 'no-curCtx fallback reproduces the original (axis-flipped) behavior, reading vMap instead of hMap');
});

test('buildCurUrgencyContext(includeMcAxisFix=false) still populates mpCur but nulls out must-cross fields', () => {
  const mcKey = PACK(2, 2);
  const mp = PACK(3, 3);
  const level = makeLevel({ gateKeys: [PACK(2, 0)], goalKey: PACK(4, 4), reqLen: 8, mustPassKeys: [mp], mustCrossKeys: [mcKey] });
  const prep = prepLevel(level);
  const edgeUsage = new Uint8Array(KEY_SPACE);
  edgeUsage[mcKey] = AXIS_V;
  const state = makeState(mcKey, { mustCrossMask: 1, crossCounts: new Uint8Array([1]), edgeUsage });

  const ctx = buildCurUrgencyContext(mcKey, state, level, prep, false);
  assert.equal(ctx.mpCur[0], getDistanceFromArray(prep.mpDistArrs[0], mcKey, prep.gridW),
    'must-pass hoist is unaffected by opting out of the must-cross fix');
  assert.equal(ctx.mcCur, null);
  assert.equal(ctx.mcTargetArr, null);
  assert.equal(ctx.mcIsApproach, null);

  // scoreMove must fall through to the original per-candidate computation when mcCur is null,
  // exactly as if curCtx had been omitted entirely for the must-cross term.
  const withScopedCtx = scoreMove(PACK(3, 2), mcKey, state, level, prep, POLICY_PROFILES.default, 6, null, ctx);
  const withNoCtx = scoreMove(PACK(3, 2), mcKey, state, level, prep, POLICY_PROFILES.default, 6, null);
  assert.equal(withScopedCtx, withNoCtx, 'must-cross scoring identical to the no-curCtx fallback when mcCur is null');
});

test('pooled urgency buffers fully overwrite large, zero, small, shifted, then original calls', () => {
  const objectiveSets = [
    Array.from({ length: 12 }, (_, i) => PACK(i % 5, (i / 5) | 0)),
    [],
    [PACK(4, 4), PACK(3, 1)],
    [PACK(1, 4), PACK(4, 0), PACK(2, 3)],
  ];
  const snapshot = (keys: number[], pos = PACK(0, 2)) => {
    const level = makeLevel({ mustPassKeys: keys, goalKey: PACK(4, 2) });
    const prep = prepLevel(level);
    const state = makeState(pos, { mustMask: (1 << keys.length) - 1 });
    const pooled = buildCurUrgencyContext(pos, state, level, prep, true, POLICY_PROFILES.default);
    const fresh = __buildFreshCurUrgencyContextForTests(pos, state, level, prep, true, POLICY_PROFILES.default);
    const target = PACK(1, 2);
    assert.equal(
      scoreMove(target, pos, state, level, prep, POLICY_PROFILES.default, 3, null, pooled),
      scoreMove(target, pos, state, level, prep, POLICY_PROFILES.default, 3, null, fresh),
      'pooled scoring must match an allocation-fresh context',
    );
    return Array.from(pooled.mpCur.slice(0, keys.length));
  };
  const expected = objectiveSets.map(keys => snapshot(keys));
  for (const i of [0, 1, 2, 3, 0, 2, 1, 0]) {
    assert.deepEqual(snapshot(objectiveSets[i]), expected[i], `sequence entry ${i}`);
  }
});

test('urgency pooling accepts its boundary and allocates fresh storage above it', () => {
  const at = Array.from({ length: MAX_POOLED_OBJECTIVES }, (_, i) => PACK(i % 5, (i / 5) % 5 | 0));
  const over = [...at, PACK(4, 4)];
  const atLevel = makeLevel({ mustPassKeys: at });
  const overLevel = makeLevel({ mustPassKeys: over });
  const pooled = buildCurUrgencyContext(PACK(0, 2), makeState(PACK(0, 2)), atLevel, prepLevel(atLevel));
  assert.equal(pooled.mpCur.length, MAX_POOLED_OBJECTIVES);
  const fresh = buildCurUrgencyContext(PACK(0, 2), makeState(PACK(0, 2)), overLevel, prepLevel(overLevel));
  assert.equal(fresh.mpCur.length, MAX_POOLED_OBJECTIVES + 1, 'overflow gets exact allocation, not truncated pool');
  assert.notEqual(fresh.mpCur, pooled.mpCur);
});
