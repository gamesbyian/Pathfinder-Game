import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK, UNPACK } from '../domain/cell-key.js';
import { parseRawLevel } from '../domain/level-codec.js';
import { applyEditorCoordTransform } from './editor-toolbar-controller.js';

function fixture() {
    const level = parseRawLevel({
        grid: { w: 6, h: 6 }, gates: [{ x: 1, y: 1 }], goal: { x: 6, y: 6 }, reqLen: 12, reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [], flippingFilters: [],
        filters: [{ x: 2, y: 3, axis: 1 }], portals: [{ x1: 2, y1: 2, x2: 5, y2: 4 }],
        landmarks: [{ x: 3, y: 4, objectType: 'library', role: 'mustTurn', turn: 'cw' }],
        hints: [[PACK(0, 0), PACK(1, 0)]],
    });
    assert.ok(level);
    return level;
}

function harness() {
    const state = {
        engineState: {
            editor: {
                pendingPortal: PACK(1, 1), isModified: false,
                triggerableFalseGoalCells: new Set([PACK(2, 2)]),
            },
            nav: { path: [PACK(0, 0), PACK(1, 0), PACK(1, 1)] },
        },
    } as any;
    const calls = { saved: 0, hintsCleared: 0, viewport: 0 };
    const deps = {
        state,
        editor: { saveEditorState: () => calls.saved++ },
        engine: {
            navigation: { remapNavKeys: (mapKey: (key: number) => number) => {
                state.engineState.nav.path = state.engineState.nav.path.map(mapKey);
            } },
            hints: { clearHintPaths: () => calls.hintsCleared++ },
        },
        ui: { updateViewport: () => calls.viewport++ },
    };
    return { state, calls, deps };
}

test('editor rotation and reflection preserve path, portal, axis, and directional-landmark semantics', () => {
    const level = fixture();
    const { state, calls, deps } = harness();
    const originalPath = state.engineState.nav.path.slice();
    const rotate = (x: number, y: number) => ({ x: level.grid.h - 1 - y, y: x });
    const rotateKey = (key: number) => { const p = UNPACK(key); const q = rotate(p.x, p.y); return PACK(q.x, q.y); };

    applyEditorCoordTransform(deps, level, rotate, 6, 6, (axis: number) => axis === 1 ? 2 : 1);
    assert.deepEqual(state.engineState.nav.path, originalPath.map(rotateKey), 'navigation path follows the level rotation');
    assert.equal([...level.filterMap.values()][0], 2, 'directional filter axis rotates');
    assert.ok(level.portalMap.has(rotateKey(PACK(1, 1))), 'portal source rotates');
    assert.equal(level.portalMap.get(rotateKey(PACK(1, 1)))?.dest, rotateKey(PACK(4, 3)), 'portal destination rotates with its source');
    assert.equal(state.engineState.editor.pendingPortal, rotateKey(PACK(1, 1)), 'pending portal endpoint follows the rotation');
    assert.equal([...level.mustPassTurnDirs.values()][0], 'cw', 'rotation preserves chirality');

    const beforeMirrorPath = state.engineState.nav.path.slice();
    const mirror = (x: number, y: number) => ({ x: level.grid.w - 1 - x, y });
    const mirrorKey = (key: number) => { const p = UNPACK(key); const q = mirror(p.x, p.y); return PACK(q.x, q.y); };
    applyEditorCoordTransform(deps, level, mirror, 6, 6, (axis: number) => axis, true);
    assert.deepEqual(state.engineState.nav.path, beforeMirrorPath.map(mirrorKey), 'navigation path follows the reflection');
    assert.equal(state.engineState.editor.pendingPortal, mirrorKey(rotateKey(PACK(1, 1))), 'pending portal endpoint follows the reflection');
    assert.equal([...level.mustPassTurnDirs.values()][0], 'ccw', 'reflection reverses landmark chirality');
    assert.deepEqual(level.hints, [], 'coordinate-changing editor operations clear stale hints');
    assert.equal(state.engineState.editor.isModified, true);
    assert.equal(state.engineState.editor.triggerableFalseGoalCells.size, 0);
    assert.deepEqual(calls, { saved: 2, hintsCleared: 2, viewport: 2 });
});
