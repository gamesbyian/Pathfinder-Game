/** Behavior tests for the 8 grid-variant orientation transforms (hardening plan §1). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { transformPoint, inverseTransformPoint, transformAxis } from './geometry.js';

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
