import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import { prepLevel } from './prep.js';
import { createNogoodCache } from './nogood-cache.js';
import { createState, applyMove } from './search-state.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1);

function baseState() {
    const level = normalizeRawLevel({
        grid: { w: 5, h: 5 }, gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 5 },
        reqLen: 8, reqInt: 0, blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
    });
    const prep = prepLevel(level);
    const ws = createState(K(1, 1), level, prep);
    applyMove(K(2, 1), ws, level, prep, false);
    applyMove(K(2, 2), ws, level, prep, false);
    return ws;
}

test('repair experience identity distinguishes remaining-length context', () => {
    const ws = baseState();
    const cache = createNogoodCache();
    cache.recordDead(ws);

    // Keep every stored mechanic field identical while changing only path consumption. This is a
    // synthetic identity fixture: exact-length feasibility reads path length, so the signature must
    // never collapse these two contexts even if a repair operator can construct equivalent arrays.
    const longer = { ...ws, path: [...ws.path, ws.path[1], ws.path[2]] };
    assert.equal(cache.has(longer as any), false);
});

test('repair experience identity distinguishes incoming-cell context', () => {
    const ws = baseState();
    const cache = createNogoodCache();
    cache.recordDead(ws);

    // Successor legality and cw/ccw landmark satisfaction use path[-2]. Preserve current position,
    // path length, mechanic masks, and edgeUsage while varying only that immediately previous key.
    const differentIncoming = { ...ws, path: [ws.path[0], K(1, 2), ws.path[2]] };
    assert.equal(cache.has(differentIncoming as any), false);
});
