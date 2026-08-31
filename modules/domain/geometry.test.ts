/** Behavior tests for the 8 runtime orientation transforms (hardening plan §1). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transformPoint, inverseTransformPoint, transformAxis, transformTurnDir, turnDirection } from './geometry.js';
import { PACK, UNPACK } from './cell-key.js';

const AXIS_H = 1, AXIS_V = 2;
const W = 7, H = 5;

test('inverseTransformPoint undoes transformPoint for every orientation and cell', () => {
    for (let orientation = 0; orientation <= 7; orientation++) {
        for (let x = 0; x < W; x++) {
            for (let y = 0; y < H; y++) {
                const { tx, ty } = transformPoint(x, y, orientation, W, H);
                const back = inverseTransformPoint(tx, ty, orientation, W, H);
                assert.deepEqual(back, { x, y }, `orientation ${orientation} cell (${x},${y})`);
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
    // Out-of-range orientation falls back to identity (both directions).
    assert.deepEqual(transformPoint(3, 4, 99, W, H), { tx: 3, ty: 4 });
    assert.deepEqual(inverseTransformPoint(3, 4, 99, W, H), { x: 3, y: 4 });
});

test('transformAxis swaps H/V exactly for the transposing orientations', () => {
    const swapping = [1, 3, 6, 7];
    for (let orientation = 0; orientation <= 7; orientation++) {
        const h = transformAxis(AXIS_H, orientation);
        const v = transformAxis(AXIS_V, orientation);
        if (swapping.includes(orientation)) {
            assert.equal(h, AXIS_V, `orientation ${orientation} swaps H→V`);
            assert.equal(v, AXIS_H, `orientation ${orientation} swaps V→H`);
        } else {
            assert.equal(h, AXIS_H);
            assert.equal(v, AXIS_V);
        }
    }
    // Non-axis values pass through untouched even on swapping orientations.
    assert.equal(transformAxis(0, 1), 0);
});

test('transformTurnDir flips cw/ccw exactly for the reflecting orientations (4-7), never for rotations (0-3)', () => {
    const reflecting = [4, 5, 6, 7];
    for (let orientation = 0; orientation <= 7; orientation++) {
        if (reflecting.includes(orientation)) {
            assert.equal(transformTurnDir('cw', orientation), 'ccw', `orientation ${orientation} reflects cw→ccw`);
            assert.equal(transformTurnDir('ccw', orientation), 'cw', `orientation ${orientation} reflects ccw→cw`);
        } else {
            assert.equal(transformTurnDir('cw', orientation), 'cw', `orientation ${orientation} preserves cw`);
            assert.equal(transformTurnDir('ccw', orientation), 'ccw', `orientation ${orientation} preserves ccw`);
        }
        assert.equal(transformTurnDir('either', orientation), 'either', `orientation ${orientation} leaves 'either' unchanged`);
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
    assert.equal(mirroredDir, transformTurnDir(dir, 4), 'mirroring the three points flips the same way orientation 4 does');
});
