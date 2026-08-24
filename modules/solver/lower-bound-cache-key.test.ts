/** Regression coverage for lower-bound memo-key cardinality. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { KEY_SPACE, PACK } from './encoding.js';
import { mustPassLowerBound } from './lower-bounds.js';
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
        reqLen: 100,
        reqInt: 0,
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
