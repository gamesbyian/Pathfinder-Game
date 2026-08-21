/** Unit tests for Solver mutable search-state and neighbor helpers. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { AXIS_H, AXIS_NONE, AXIS_V, PACK } from './encoding.js';
import { prepLevel } from './prep.js';
import { STATE_BUF_BEAM, applyMove, createState, getNeighbors, isMoveDynamicallyValid, undoMove } from './search-state.js';
import type { NormalizedLevel } from '../domain/types.js';


function makeLevel(overrides = {}) {
  return {
    grid: { w: 5, h: 5 },
    reqLen: 6,
    reqInt: 1,
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

test('createState applies start-cell must-pass, must-cross, and flipper effects', () => {
  const start = PACK(0, 2);
  const level = makeLevel({
    gateKeys: [start],
    mustPassKeys: [start, PACK(2, 2)],
    mustCrossKeys: [start],
    flippingFilterMap: new Map([[start, AXIS_H]]),
  });
  const prep = prepLevel(level);
  const state = createState(start, level, prep);
  assert.equal(state.path[0], start);
  assert.equal(state.visited[start], 1);
  assert.equal(state.mpVisitedMask & 1, 1);
  assert.equal(state.crossCounts[0], 1);
  assert.equal(state.mustCrossMask & 1, 1);
  assert.equal(state.flipperUsedMask & 1, 1);
});

test('applyMove and undoMove restore mutable search state exactly', () => {
  const start = PACK(0, 2);
  const mp = PACK(1, 2);
  const level = makeLevel({ gateKeys: [start], mustPassKeys: [mp] });
  const prep = prepLevel(level);
  const state = createState(start, level, prep);
  const before = {
    path: state.path.slice(),
    visitedStart: state.visited[start],
    visitedMp: state.visited[mp],
    edgeStart: state.edgeUsage[start],
    edgeMp: state.edgeUsage[mp],
    ints: state.ints,
    mpVisitedMask: state.mpVisitedMask,
    lastWasPortalJump: state.lastWasPortalJump,
  };
  const undo = applyMove(mp, state, level, prep, false);
  assert.equal(state.path.at(-1), mp);
  assert.equal(state.visited[mp], 1);
  assert.equal(state.edgeUsage[start] & AXIS_H, AXIS_H);
  assert.equal(state.edgeUsage[mp] & AXIS_H, AXIS_H);
  assert.equal(state.mpVisitedMask & 1, 1);

  undoMove(undo, state);
  assert.deepEqual(state.path, before.path);
  assert.equal(state.visited[start], before.visitedStart);
  assert.equal(state.visited[mp], before.visitedMp);
  assert.equal(state.edgeUsage[start], before.edgeStart);
  assert.equal(state.edgeUsage[mp], before.edgeMp);
  assert.equal(state.ints, before.ints);
  assert.equal(state.mpVisitedMask, before.mpVisitedMask);
  assert.equal(state.lastWasPortalJump, before.lastWasPortalJump);
});

test('getNeighbors forces portal destinations and prevents immediate portal chaining', () => {
  const start = PACK(0, 2);
  const portalA = PACK(1, 2);
  const portalB = PACK(4, 4);
  const level = makeLevel({
    gateKeys: [start],
    portalMap: new Map([
      [portalA, { dest: portalB, color: '#fff' }],
      [portalB, { dest: portalA, color: '#fff' }],
    ]),
  });
  const prep = prepLevel(level);
  const state = createState(start, level, prep);
  applyMove(portalA, state, level, prep, false);
  assert.deepEqual(getNeighbors(portalA, state, level, prep), [portalB]);
  applyMove(portalB, state, level, prep, true);
  assert.notDeepEqual(getNeighbors(portalB, state, level, prep), [portalA]);
});

test('getNeighbors honors prep._forcedPortalExitKey only at the forced portal destination', () => {
  const start = PACK(0, 2);
  const portalA = PACK(1, 2);
  const portalB = PACK(3, 2);
  const level = makeLevel({
    grid: { w: 5, h: 5 },
    gateKeys: [start],
    portalMap: new Map([
      [portalA, { dest: portalB, color: '#fff' }],
      [portalB, { dest: portalA, color: '#fff' }],
    ]),
  });
  const prep = prepLevel(level);
  prep._forcedPortalExitKey = { from: portalB, to: PACK(3, 1) };

  const state = createState(start, level, prep);
  applyMove(portalA, state, level, prep, false); // steps onto portal A
  applyMove(portalB, state, level, prep, true);  // forced jump A -> B
  const forced = getNeighbors(portalB, state, level, prep);
  assert.deepEqual(forced, [PACK(3, 1)], 'only the forced exit direction should survive');
});

test('getNeighbors ignores prep._forcedPortalExitKey when not arriving via a portal jump', () => {
  const start = PACK(0, 2);
  const portalA = PACK(1, 2);
  const level = makeLevel({
    grid: { w: 5, h: 5 },
    gateKeys: [start],
    portalMap: new Map(),
  });
  const prep = prepLevel(level);
  prep._forcedPortalExitKey = { from: start, to: PACK(0, 1) };

  const state = createState(start, level, prep);
  const neighbors = getNeighbors(start, state, level, prep);
  assert.ok(neighbors.includes(portalA), 'forcing should not apply when lastWasPortalJump is false');
});

test('isMoveDynamicallyValid blocks edge reuse and must-cross axis locks', () => {
  const start = PACK(0, 2);
  const mc = PACK(1, 2);
  const level = makeLevel({ gateKeys: [start], mustCrossKeys: [mc] });
  const prep = prepLevel(level);
  const state = createState(start, level, prep);
  applyMove(mc, state, level, prep, false);

  assert.equal(isMoveDynamicallyValid(mc, start, state, level, prep, AXIS_H, AXIS_H), false, 'used horizontal edge should be blocked');
  assert.equal(isMoveDynamicallyValid(mc, PACK(1, 3), state, level, prep, AXIS_H, AXIS_V), false, 'turning at one-cross must-cross should be blocked');
});

test('isMoveDynamicallyValid enforces flipping filter entry orientation', () => {
  const start = PACK(0, 2);
  const flipper = PACK(1, 2);
  const level = makeLevel({ gateKeys: [start], flippingFilterMap: new Map([[flipper, AXIS_H]]) });
  const prep = prepLevel(level);
  const state = createState(start, level, prep);
  assert.equal(isMoveDynamicallyValid(start, flipper, state, level, prep, AXIS_NONE, AXIS_H), true);
  assert.equal(isMoveDynamicallyValid(PACK(1, 1), flipper, state, level, prep, AXIS_NONE, AXIS_V), false);
});

test('createState resets every semantic field when a pooled slot is reused across levels', () => {
  // Since the state-buf pool moved from module-global to per-prep (2026-08-20, see
  // PrepLevel._stateBufs's own comment), largePrep/tinyPrep below each get their OWN buffer for
  // STATE_BUF_BEAM rather than sharing one -- the "does reuse correctly reset" property this test
  // checks is now exercised by the dirty -> again pair specifically (same prep, same slot, called
  // twice), not by the intervening tinyPrep calls. See the dedicated cross-prep isolation test
  // below for the property this test used to (incidentally) also cover.
  const large = makeLevel({ grid: { w: 5, h: 5 }, gateKeys: [PACK(0, 2)],
    mustPassKeys: [PACK(1, 2)], mustCrossKeys: [PACK(2, 2)] });
  const largePrep = prepLevel(large);
  const dirty = createState(PACK(0, 2), large, largePrep, STATE_BUF_BEAM);
  applyMove(PACK(1, 2), dirty, large, largePrep, false);
  applyMove(PACK(2, 2), dirty, large, largePrep, false);
  dirty.ints = 9; dirty.portalJumps = 4; dirty.lastWasPortalJump = true;
  dirty.flipperUsedMask = 7; dirty.mustTurnMask = 7; dirty.adjTurnMask = 7;

  const tinyStart = PACK(1, 1);
  const tiny = makeLevel({ grid: { w: 2, h: 2 }, gateKeys: [tinyStart], goalKey: PACK(0, 0), reqInt: 0 });
  const tinyPrep = prepLevel(tiny);
  const reset = createState(tinyStart, tiny, tinyPrep, STATE_BUF_BEAM);
  assert.deepEqual(reset.path, [tinyStart]);
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    const key = PACK(x, y);
    assert.equal(reset.visited[key], key === tinyStart ? 1 : 0, `visited ${x},${y}`);
    assert.equal(reset.edgeUsage[key], 0, `edgeUsage ${x},${y}`);
  }
  assert.equal(reset.ints, 0); assert.equal(reset.portalJumps, 0);
  assert.equal(reset.mpVisitedMask, 0); assert.equal(reset.mustCrossMask, 0);
  assert.equal(reset.flipperUsedMask, 0); assert.equal(reset.lastWasPortalJump, false);
  assert.equal(reset.mustTurnMask, 0); assert.equal(reset.adjTurnMask, 0);
  assert.equal(reset.crossCounts.length, 0);

  // Re-expand to the original dimensions: cells outside the intervening tiny grid must be
  // cleared now too, proving reset follows the current level rather than the previous one.
  const again = createState(PACK(0, 2), large, largePrep, STATE_BUF_BEAM);
  assert.equal(again.visited[PACK(1, 2)], 0);
  assert.equal(again.visited[PACK(2, 2)], 0);
  assert.equal(again.edgeUsage[PACK(1, 2)], 0);
  assert.equal(again.edgeUsage[PACK(2, 2)], 0);
});

test('two concurrent solves cannot corrupt each other\'s pooled search-state buffer (regression, fixed 2026-08-20)', () => {
  // Direct proof of the actual bug/fix, without needing real async interleaving: before the fix,
  // STATE_BUF_BEAM's `visited`/`edgeUsage` arrays were a SINGLE module-global pair shared by every
  // caller in the JS realm. Two concurrent solveLevel() calls both reaching for the same slot --
  // e.g. two overlapping beam attempts, one from each solve -- would have the SECOND call's
  // createState() clear out the buffer the FIRST call's still-live state object was still pointing
  // at (same underlying TypedArray, not a copy), silently corrupting the first solve's in-progress
  // search. Simulates the interleaving synchronously (no need for a real await race): create prepA's
  // state, apply some moves, THEN create prepB's state on the SAME slot, and confirm prepA's state
  // is completely unaffected.
  const levelA = makeLevel({ gateKeys: [PACK(0, 2)], mustPassKeys: [PACK(2, 2)] });
  const prepA = prepLevel(levelA);
  const stateA = createState(PACK(0, 2), levelA, prepA, STATE_BUF_BEAM);
  applyMove(PACK(1, 2), stateA, levelA, prepA, false);
  applyMove(PACK(2, 2), stateA, levelA, prepA, false);
  const visitedBeforeB = Array.from(stateA.visited.slice(0, 20));
  const edgeUsageBeforeB = Array.from(stateA.edgeUsage.slice(0, 20));

  // A DIFFERENT prep (a genuinely separate solveLevel() call would create one just like this),
  // same slot. Under the old module-global pool this would clear prepA's live buffer out from
  // under it.
  const levelB = makeLevel({ grid: { w: 5, h: 5 }, gateKeys: [PACK(4, 0)], goalKey: PACK(0, 4) });
  const prepB = prepLevel(levelB);
  const stateB = createState(PACK(4, 0), levelB, prepB, STATE_BUF_BEAM);
  applyMove(PACK(3, 0), stateB, levelB, prepB, false);

  assert.deepEqual(Array.from(stateA.visited.slice(0, 20)), visitedBeforeB,
    'prepB creating its own state must not touch prepA\'s live visited buffer');
  assert.deepEqual(Array.from(stateA.edgeUsage.slice(0, 20)), edgeUsageBeforeB,
    'prepB creating its own state must not touch prepA\'s live edgeUsage buffer');
  // stateA's own path/mask bookkeeping (not backed by the pooled buffers) is unaffected regardless,
  // but confirm it explicitly too -- the whole state object must stay coherent.
  assert.deepEqual(stateA.path, [PACK(0, 2), PACK(1, 2), PACK(2, 2)]);
  assert.equal(stateA.mpVisitedMask & 1, 1, 'prepA\'s own must-pass progress must survive prepB\'s createState call');

  // And prepB's own state must be correctly initialized (not corrupted by prepA's prior writes,
  // proving the isolation runs both directions).
  assert.equal(stateB.visited[PACK(2, 2)], 0, 'prepB must not see prepA\'s visited cells');
  assert.equal(stateB.path[0], PACK(4, 0));
});

test('two concurrent solves have independent work counters (regression, fixed 2026-08-20)', () => {
  // Before the fix, prep._workMeter did not exist -- every budget check read the single
  // module-global workMeter.units, so one solve's own `spent = units - workStart` delta could
  // include work a completely unrelated concurrent solve did in between. Confirms prepA/prepB each
  // start at their own 0 and only advance from their OWN applyMove/isConnected calls.
  const levelA = makeLevel({ gateKeys: [PACK(0, 2)] });
  const prepA = prepLevel(levelA);
  assert.equal(prepA._workMeter.units, 0, 'a fresh prep starts at its own zero');
  const stateA = createState(PACK(0, 2), levelA, prepA);
  applyMove(PACK(1, 2), stateA, levelA, prepA, false);
  const workAAfterOneMove = prepA._workMeter.units;
  assert.ok(workAAfterOneMove > 0, 'prepA must have accrued its own work');

  const levelB = makeLevel({ gateKeys: [PACK(0, 2)] });
  const prepB = prepLevel(levelB);
  assert.equal(prepB._workMeter.units, 0, 'prepB starts at its own zero too, unaffected by prepA\'s prior spend');
  const stateB = createState(PACK(0, 2), levelB, prepB);
  applyMove(PACK(1, 2), stateB, levelB, prepB, false);
  applyMove(PACK(2, 2), stateB, levelB, prepB, false);

  assert.equal(prepA._workMeter.units, workAAfterOneMove,
    'prepB\'s own work must not leak into prepA\'s counter');
  assert.ok(prepB._workMeter.units > workAAfterOneMove,
    'prepB did strictly more work (two moves vs one) and must report strictly more');
});
