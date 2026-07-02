/** Unit tests for the coordinate-key machinery in modules/domain/level-codec.ts:
 *  remapLevelKeys / forEachLevelKey / getLevelBounds. The remap tests pin the fix for
 *  landmark fields (surroundKeys/adjacentTurnKeys/landmarkMeta/mustPassTurnDirs) that a
 *  shift/resize once silently left behind. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK, UNPACK } from './cell-key.js';
import { parseRawLevel, remapLevelKeys, forEachLevelKey, getLevelBounds } from './level-codec.js';

// A level exercising every landmark role plus portals/filters, in 1-based wire format.
function makeLandmarkLevel() {
    const l = parseRawLevel({
        grid:  { w: 12, h: 12 },
        gates: [{ x: 1, y: 1 }],
        goal:  { x: 12, y: 12 },
        reqLen: 20,
        reqInt: 0,
        blocks:    [{ x: 4, y: 2 }],
        mustPass:  [{ x: 2, y: 5 }],
        mustCross: [{ x: 6, y: 6 }],
        filters:   [{ x: 3, y: 3, axis: 1 }],
        portals:   [{ x1: 8, y1: 8, x2: 10, y2: 2 }],
        landmarks: [
            { x: 3, y: 4, objectType: 'park',    role: 'surround' },
            { x: 5, y: 5, objectType: 'library', role: 'mustTurnLeft' },
            { x: 7, y: 7, objectType: 'fountain', role: 'adjacentTurn', turn: 'right' },
            { x: 9, y: 9, objectType: 'statue',  role: 'decorative' },
        ],
    });
    assert.ok(l, 'fixture level must parse');
    return l;
}

const allKeys = (l: any) => { const ks: number[] = []; forEachLevelKey(l, k => ks.push(k)); return ks; };

// ─── remapLevelKeys: landmark fields move (regression for the silent-drop bug) ──────────

test('remapLevelKeys shifts landmark tracking fields, not just blockSet', () => {
    const l = makeLandmarkLevel();
    const before = {
        surround: l.surroundKeys.slice(),
        adjTurn:  l.adjacentTurnKeys.slice(),
        meta:     new Set(l.landmarkMeta.keys()),
        mustTurn: new Set(l.mustPassTurnDirs.keys()),
    };
    const dx = 1, dy = 2;
    const shift = (k: number) => { const p = UNPACK(k); return PACK(p.x + dx, p.y + dy); };
    remapLevelKeys(l, shift);

    // Every landmark field moved by exactly (dx, dy) — none left at its original key.
    assert.deepEqual(l.surroundKeys, before.surround.map(shift));
    assert.deepEqual(l.adjacentTurnKeys, before.adjTurn.map(shift));
    assert.deepEqual(new Set(l.landmarkMeta.keys()), new Set([...before.meta].map(shift)));
    assert.deepEqual(new Set(l.mustPassTurnDirs.keys()), new Set([...before.mustTurn].map(shift)));

    // adjacentTurnDirs is parallel to adjacentTurnKeys and must stay aligned/order-preserved.
    assert.deepEqual(l.adjacentTurnDirs, ['right']);
    // Turn direction value survives the key move.
    const [mustTurnKey] = [...before.mustTurn];
    assert.equal(l.mustPassTurnDirs.get(shift(mustTurnKey)), 'left');
});

test('remapLevelKeys keeps landmarkMeta keys consistent with the mechanical fields', () => {
    const l = makeLandmarkLevel();
    remapLevelKeys(l, (k: number) => { const p = UNPACK(k); return PACK(p.x + 3, p.y + 1); });
    const mechanical = new Set<number>([
        ...l.blockSet, ...l.mustPassKeys, ...l.surroundKeys, ...l.adjacentTurnKeys,
    ]);
    for (const k of l.landmarkMeta.keys())
        assert.ok(mechanical.has(k), `landmark meta key ${k} orphaned from mechanical fields`);
});

test('remapLevelKeys round-trips (shift then inverse restores every key)', () => {
    const l = makeLandmarkLevel();
    const snapshot = JSON.stringify(allKeys(l).sort((a, b) => a - b));
    const fwd = (k: number) => { const p = UNPACK(k); return PACK(p.x + 2, p.y + 4); };
    const inv = (k: number) => { const p = UNPACK(k); return PACK(p.x - 2, p.y - 4); };
    remapLevelKeys(l, fwd);
    remapLevelKeys(l, inv);
    assert.equal(JSON.stringify(allKeys(l).sort((a, b) => a - b)), snapshot);
});

test('remapLevelKeys remaps both portal endpoints and passes filter axes through axisMap', () => {
    const l = makeLandmarkLevel();
    const shift = (k: number) => { const p = UNPACK(k); return PACK(p.x + 1, p.y + 1); };
    remapLevelKeys(l, shift, { axisMap: (a: number) => (a === 1 ? 2 : 1) });
    // Portal is bidirectional: both stored keys and their dests moved.
    for (const [k, v] of l.portalMap) {
        const p = UNPACK(k);
        assert.ok(p.x >= 1 && p.y >= 1);
        assert.ok(l.portalMap.has(v.dest), 'portal dest must remain a live portal key');
    }
    // Filter axis flipped 1→2 via axisMap.
    assert.equal([...l.filterMap.values()][0], 2);
});

test('remapLevelKeys leaves the -1 absent-goal sentinel untouched', () => {
    const l = makeLandmarkLevel();
    l.goalKey = -1;
    remapLevelKeys(l, (k: number) => { const p = UNPACK(k); return PACK(p.x + 5, p.y + 5); });
    assert.equal(l.goalKey, -1);
});

// ─── getLevelBounds ─────────────────────────────────────────────────────────────────

test('getLevelBounds spans the extreme placed cells (0-based)', () => {
    const l = makeLandmarkLevel();
    // gate (0,0) is the min corner; goal (11,11) the max corner.
    assert.deepEqual(getLevelBounds(l), { minX: 0, minY: 0, maxX: 11, maxY: 11 });
});

test('getLevelBounds returns null for an empty level', () => {
    assert.equal(getLevelBounds({ goalKey: -1, gateKeys: [] }), null);
});
