/** Unit tests for the pointer-down decision logic extracted from pointer-input-controller (§3). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from '../domain/cell-key.js';
import { decideEditorCellAction, shouldReversePencilPath, findNearestAxisGate } from './pointer-input-core.js';

test('decideEditorCellAction: occupant wins, then selected tool, then empty-click counting', () => {
    assert.deepEqual(
        decideEditorCellAction({ hasOccupant: true, hasSelectedTool: true, emptyClickCount: 5 }),
        { action: 'pickup' });
    assert.deepEqual(
        decideEditorCellAction({ hasOccupant: false, hasSelectedTool: true, emptyClickCount: 5 }),
        { action: 'place' });
    assert.deepEqual(
        decideEditorCellAction({ hasOccupant: false, hasSelectedTool: false, emptyClickCount: 0 }),
        { action: 'empty-click', nextEmptyClickCount: 1, showPencilHint: false });
    assert.deepEqual(
        decideEditorCellAction({ hasOccupant: false, hasSelectedTool: false, emptyClickCount: 1 }),
        { action: 'empty-click', nextEmptyClickCount: 2, showPencilHint: true },
        'second consecutive empty click hints at the pencil');
});

test('shouldReversePencilPath: tap on the first half of the path reverses; second half does not', () => {
    const path = [PACK(0, 0), PACK(1, 0), PACK(2, 0), PACK(3, 0)];
    assert.equal(shouldReversePencilPath(path, PACK(0, 0), { x: 0, y: 0 }), true, 'tail cell');
    assert.equal(shouldReversePencilPath(path, PACK(1, 0), { x: 1, y: 0 }), true, 'first half');
    assert.equal(shouldReversePencilPath(path, PACK(2, 0), { x: 2, y: 0 }), false, 'second half');
    assert.equal(shouldReversePencilPath(path, PACK(3, 0), { x: 3, y: 0 }), false, 'head cell');
});

test('shouldReversePencilPath: off-path tap reverses only when nearer the tail', () => {
    const path = [PACK(0, 0), PACK(1, 0), PACK(2, 0), PACK(3, 0)];
    assert.equal(shouldReversePencilPath(path, PACK(0, 2), { x: 0, y: 2 }), true, 'closer to tail (0,0)');
    assert.equal(shouldReversePencilPath(path, PACK(3, 2), { x: 3, y: 2 }), false, 'closer to head (3,0)');
    assert.equal(shouldReversePencilPath(path, PACK(2, 1), { x: 2, y: 1 }), false, 'nearer the head → keep direction');
    assert.equal(shouldReversePencilPath([], PACK(0, 0), { x: 0, y: 0 }), false, 'empty path never reverses');
});

test('findNearestAxisGate: tapped gate wins; otherwise nearest gate sharing the row/column', () => {
    const gates = [PACK(0, 0), PACK(4, 0), PACK(0, 4)];
    assert.equal(findNearestAxisGate(gates, PACK(4, 0), { x: 4, y: 0 }), PACK(4, 0), 'tap on a gate');
    assert.equal(findNearestAxisGate(gates, PACK(2, 0), { x: 2, y: 0 }), PACK(0, 0), 'equidistant tie → first listed gate wins');
    assert.equal(findNearestAxisGate(gates, PACK(3, 0), { x: 3, y: 0 }), PACK(4, 0), 'nearest along the row');
    assert.equal(findNearestAxisGate(gates, PACK(0, 3), { x: 0, y: 3 }), PACK(0, 4), 'nearest along the column');
    assert.equal(findNearestAxisGate(gates, PACK(2, 2), { x: 2, y: 2 }), null, 'no shared axis → no gate');
    assert.equal(findNearestAxisGate([], PACK(1, 1), { x: 1, y: 1 }), null, 'no gates at all');
});
