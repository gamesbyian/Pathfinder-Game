/** Boundary coverage for the 32-bit flipperUsedMask contract. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { AXIS_H, AXIS_NONE, PACK, popcount } from './encoding.js';
import { prepLevel } from './prep.js';
import { applyMove, createState, isMoveDynamicallyValid, undoMove } from './search-state.js';
import type { NormalizedLevel } from '../domain/types.js';

function levelWithThirtyTwoFlippers(): { level: NormalizedLevel; target: number; start: number } {
    const start = PACK(0, 0);
    const target = PACK(1, 0); // inserted LAST, therefore flipper index 31
    const entries: [number, 1 | 2][] = [];
    for (let y = 1; y < 15 && entries.length < 31; y++) {
        for (let x = 0; x < 15 && entries.length < 31; x++) entries.push([PACK(x, y), AXIS_H]);
    }
    entries.push([target, AXIS_H]);
    const level = {
        grid: { w: 15, h: 15 }, reqLen: 20, reqInt: 0,
        goalKey: PACK(14, 14), gateKeys: [start],
        blockSet: new Set(), gooseSet: new Set(), falseGoalKeys: new Set(),
        mustPassKeys: [], mustCrossKeys: [], surroundKeys: [], adjacentTurnKeys: [],
        adjacentTurnDirs: [], mustPassTurnDirs: new Map(), filterMap: new Map(),
        flippingFilterMap: new Map(entries), portalMap: new Map(),
    } as unknown as NormalizedLevel;
    return { level, target, start };
}

test('the 32nd flipper uses bit 31 without signed-int confusion', () => {
    const { level, target, start } = levelWithThirtyTwoFlippers();
    const prep = prepLevel(level);
    assert.equal(prep.flipperIndexMap[target] - 1, 31, 'fixture must exercise the sign bit');

    const state = createState(start, level, prep);
    const bit31 = 1 << 31;
    assert.equal(bit31, -2147483648, 'JS bit 31 is intentionally a signed int32 value');
    assert.equal(popcount(bit31), 1);

    // A previously-used 32nd flipper must be rejected even though its mask value is negative.
    state.flipperUsedMask = bit31;
    assert.equal(
        isMoveDynamicallyValid(start, target, state, level, prep, AXIS_NONE, AXIS_H),
        false,
        'sign-bit flipper must be recognized as already used',
    );

    // The normal apply/undo path must also preserve the exact sign-bit state.
    state.flipperUsedMask = 0;
    const undo = applyMove(target, state, level, prep, false);
    assert.equal(state.flipperUsedMask, bit31);
    undoMove(undo, state);
    assert.equal(state.flipperUsedMask, 0);
});
