/** Behavior tests for the 8 grid-variant orientation transforms (hardening plan §1). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transformPoint, inverseTransformPoint, transformAxis, transformTurnDir, turnDirection } from './geometry.js';
import { PACK, UNPACK } from './cell-key.js';

const AXIS_H = 1, AXIS_V = 2;
const W = 7, H = 5;

test('inverseTransformPoint undoes transformPoint for every variant and cell', () => {
    for (let variant = 0; variant <= 7; variant++) {
        for (let x = 0; x < W; x++) {
            for (let y = 0; y < H; y++) {
                const { tx, ty } = transformPoint(x, y, variant, W, H);
                const back = inverseTransformPoint(tx, ty, variant, W, H);
                assert.deepEqual(back, { x, y }, `variant ${variant} cell (${x},${y})`);
            }
        }
    }
});

test('specific orientations land where expected', () => {
    assert.deepEqual(transformPoint(1, 2, 0, W, H), { tx: 1, ty: 2 }, 'identity');
    assert.deepEqual(transformPoint(1, 2, 1, W, H), { tx: H - 1 - 2, ty: 1 }, 'rotate 90°');
    assert.deepEqual(transformPoint(1, 2, 2, W, H), { tx: W - 2, ty: H - 3 }, 'rotate 180°');
    assert.deepEqual(transformPoint(1, 2, 4, W, H), { tx: W - 2, ty: 2 }, 'mirror X');
    assert.deepEqual(transformPoint(1, 2, 5, W, H), { tx: 1, ty: H - 3 }, 'mirror Y');
    assert.deepEqual(transformPoint(1, 2, 6, W, H), { tx: 2, ty: 1 }, 'transpose');
    // Out-of-range variant falls back to identity (both directions).
    assert.deepEqual(transformPoint(3, 4, 99, W, H), { tx: 3, ty: 4 });
    assert.deepEqual(inverseTransformPoint(3, 4, 99, W, H), { x: 3, y: 4 });
});

test('transformAxis swaps H/V exactly for the transposing variants', () => {
    const swapping = [1, 3, 6, 7];
    for (let variant = 0; variant <= 7; variant++) {
        const h = transformAxis(AXIS_H, variant);
        const v = transformAxis(AXIS_V, variant);
        if (swapping.includes(variant)) {
            assert.equal(h, AXIS_V, `variant ${variant} swaps H→V`);
            assert.equal(v, AXIS_H, `variant ${variant} swaps V→H`);
        } else {
            assert.equal(h, AXIS_H);
            assert.equal(v, AXIS_V);
        }
    }
    // Non-axis values pass through untouched even on swapping variants.
    assert.equal(transformAxis(0, 1), 0);
});

test('transformTurnDir flips cw/ccw exactly for the reflecting variants (4-7), never for rotations (0-3)', () => {
    const reflecting = [4, 5, 6, 7];
    for (let variant = 0; variant <= 7; variant++) {
        if (reflecting.includes(variant)) {
            assert.equal(transformTurnDir('cw', variant), 'ccw', `variant ${variant} reflects cw→ccw`);
            assert.equal(transformTurnDir('ccw', variant), 'cw', `variant ${variant} reflects ccw→cw`);
        } else {
            assert.equal(transformTurnDir('cw', variant), 'cw', `variant ${variant} preserves cw`);
            assert.equal(transformTurnDir('ccw', variant), 'ccw', `variant ${variant} preserves ccw`);
        }
        assert.equal(transformTurnDir('either', variant), 'either', `variant ${variant} leaves 'either' unchanged`);
    }
});

// turnDirection is the single implementation of the turn-detection cross product shared by
// runtime/path-state.ts, domain/path-validator.ts, and solver/search-state.ts (previously three
// independent copies of the same formula; scripts/validate-hint-paths.mjs and
// scripts/check-hint-validity.mjs both reach it indirectly via path-validator.ts's
// validateCandidatePath rather than reimplementing it).
test('turnDirection: cw for a clockwise bend (east then south)', () => {
    // (1,1) → (2,1) → (2,2): heading east, then turning south — clockwise on screen (y-down).
    assert.equal(turnDirection(PACK(1, 1), PACK(2, 1), PACK(2, 2)), 'cw');
});

test('turnDirection: ccw for a counter-clockwise bend (east then north)', () => {
    // (1,2) → (2,2) → (2,1): heading east, then turning north — counter-clockwise on screen.
    assert.equal(turnDirection(PACK(1, 2), PACK(2, 2), PACK(2, 1)), 'ccw');
});

test('turnDirection: null for a straight continuation and for an exact reversal', () => {
    // (1,1) → (2,1) → (3,1): straight east, no turn.
    assert.equal(turnDirection(PACK(1, 1), PACK(2, 1), PACK(3, 1)), null, 'straight-through is not a turn');
    // (1,1) → (2,1) → (1,1): reverses back the way it came — colinear, not a turn.
    assert.equal(turnDirection(PACK(1, 1), PACK(2, 1), PACK(1, 1)), null, 'exact reversal is not a turn');
});

test('turnDirection: reflecting a bend (mirroring x) flips cw/ccw, matching transformTurnDir', () => {
    const mirrorX = (k: number) => { const { x, y } = UNPACK(k); return PACK(10 - x, y); };
    const prev = PACK(1, 1), from = PACK(2, 1), target = PACK(2, 2);
    const dir = turnDirection(prev, from, target)!;
    const mirroredDir = turnDirection(mirrorX(prev), mirrorX(from), mirrorX(target))!;
    assert.equal(mirroredDir, transformTurnDir(dir, 4), 'mirroring the three points flips the same way variant 4 does');
});
