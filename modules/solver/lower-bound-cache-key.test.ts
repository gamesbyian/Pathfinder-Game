/** Regression coverage for lower-bound memo-key cardinality and cache-lifetime semantics. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { AXIS_H, AXIS_V, KEY_SPACE, PACK } from './encoding.js';
import { mustCrossLowerBound, mustPassLowerBound } from './lower-bounds.js';
import { prepLevel } from './prep.js';
import type { NormalizedLevel } from '../domain/types.js';
import type { SolverSearchState } from './types.js';

function makeState(mpVisitedMask: number): SolverSearchState {
    return {
        path: [PACK(0, 0)],
        visited: new Uint16Array(KEY_SPACE),
        edgeUsage: new Uint8Array(KEY_SPACE),
        ints: 0,
        mustMask: 0,
        mustCrossMask: 0,
        crossCounts: new Uint8Array(0),
        mpVisitedMask,
        portalJumps: 0,
        flipperUsedMask: 0,
        lastWasPortalJump: false,
        surroundMask: 0,
        surroundNeighborRemainingMasks: new Uint8Array(0),
        mustTurnMask: 0,
        adjTurnMask: 0,
    } as SolverSearchState;
}

function makeTwentyFiveObjectiveLevel(): NormalizedLevel {
    // Objective 24 is deliberately far to the east. The other 24 stay near the west side,
    // so marking only objective 24 visited materially changes the lower bound.
    const mustPassKeys: number[] = [];
    for (let y = 1; y <= 14; y++) mustPassKeys.push(PACK(1, y));
    for (let y = 1; y <= 10; y++) mustPassKeys.push(PACK(2, y));
    mustPassKeys.push(PACK(14, 7));

    return {
        grid: { w: 15, h: 15 },
        requiredLength: 100,
        requiredIntersections: 0,
        goalKey: PACK(0, 14),
        gateKeys: [PACK(0, 0)],
        blockSet: new Set(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys,
        mustCrossKeys: [],
        surroundKeys: [],
        adjacentTurnKeys: [],
        adjacentTurnDirs: [],
        mustPassTurnDirs: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        portalMap: new Map(),
    } as unknown as NormalizedLevel;
}

function makeMustCrossLevel(n: number): NormalizedLevel {
    const mustCrossKeys = Array.from({ length: n }, (_, i) => PACK(2 + i, 7));
    return {
        grid: { w: 15, h: 15 },
        requiredLength: 100,
        requiredIntersections: n,
        goalKey: PACK(14, 14),
        gateKeys: [PACK(0, 0)],
        blockSet: new Set(),
        gooseSet: new Set(),
        falseGoalKeys: new Set(),
        mustPassKeys: [],
        mustCrossKeys,
        surroundKeys: [],
        adjacentTurnKeys: [],
        adjacentTurnDirs: [],
        mustPassTurnDirs: new Map(),
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        portalMap: new Map(),
    } as unknown as NormalizedLevel;
}

function makeMustCrossState(level: NormalizedLevel, pendingMask: number, onceCrossedIndex: number | null = null, firstAxis = AXIS_H): SolverSearchState {
    const state = makeState(0);
    state.mustCrossMask = pendingMask;
    state.crossCounts = new Uint8Array(level.mustCrossKeys.length);
    if (onceCrossedIndex !== null) {
        state.crossCounts[onceCrossedIndex] = 1;
        state.edgeUsage[level.mustCrossKeys[onceCrossedIndex]] = firstAxis;
    }
    return state;
}

test('mustPassLowerBound memo key stays collision-free above 24 objective bits', () => {
    const level = makeTwentyFiveObjectiveLevel();
    const prep = prepLevel(level);

    // Under the old 2^24 position multiplier these two distinct states had the same cache key:
    //   PACK(0,0) * 2^24 + (1 << 24) === PACK(1,0) * 2^24 + 0.
    // The first call therefore poisoned the second call's exact memoized value.
    const first = mustPassLowerBound(PACK(0, 0), makeState(1 << 24), level, prep);
    const cachedSecond = mustPassLowerBound(PACK(1, 0), makeState(0), level, prep);

    // Fresh prep means an empty memo table, giving the independently computed value for state 2.
    const freshSecond = mustPassLowerBound(PACK(1, 0), makeState(0), level, prepLevel(level));

    assert.notEqual(first, freshSecond, 'fixture must distinguish the two colliding states');
    assert.equal(cachedSecond, freshSecond, 'memoization must not alias different (pos, visited-mask) states');
});

test('mustCrossLowerBound cache is semantically inert at the supported 8-cell boundary', () => {
    const level = makeMustCrossLevel(8);
    const targetIndex = 7;
    const targetMask = 1 << targetIndex;
    // MC[7] is at (9,7). Stand directly above it so a first H crossing (therefore a required V
    // second approach) is materially nearer than a first V crossing (required H approach).
    // The earlier (10,1) fixture made both approach distances equal and therefore could not
    // detect an omitted first-axis component in the memo key.
    const pos = PACK(9, 1);
    const prep = prepLevel(level);

    // Warm the shared per-prep table with the same pending cell but the opposite first-cross axis.
    // The two states deliberately have different legal approach geometry, so an omitted axis bit
    // in the cache identity would be observable rather than hidden by equal lower-bound values.
    const hState = makeMustCrossState(level, targetMask, targetIndex, AXIS_H);
    const vState = makeMustCrossState(level, targetMask, targetIndex, AXIS_V);
    const h = mustCrossLowerBound(pos, hState, level, prep);
    const warmedV = mustCrossLowerBound(pos, vState, level, prep);
    const freshV = mustCrossLowerBound(pos, vState, level, prepLevel(level));

    assert.notEqual(h, freshV, 'fixture must distinguish first-cross H from V');
    assert.equal(warmedV, freshV, 'warming the 8-cell cache must not change the value for another axis-state');
    assert.ok(prep._mcLowerBoundCache && prep._mcLowerBoundCache.size >= 2, '8-cell levels should exercise memoization');
});

test('mustCrossLowerBound bypasses memoization above its 8-cell cache-cardinality limit', () => {
    const level = makeMustCrossLevel(9);
    const prep = prepLevel(level);
    const mask = (1 << 9) - 1;
    const state = makeMustCrossState(level, mask);

    const value = mustCrossLowerBound(PACK(0, 0), state, level, prep);
    const fresh = mustCrossLowerBound(PACK(0, 0), state, level, prepLevel(level));

    assert.equal(value, fresh, '9-cell fallback must retain exact lower-bound semantics');
    assert.equal(prep._mcLowerBoundCache, undefined, '9+ must-cross cells must not enter the packed memo-key path');
});
