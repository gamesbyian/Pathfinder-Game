/** Unit tests for repair-search's nogood cache (nogood-cache.ts). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import { prepLevel } from './prep.js';
import { createNogoodCache } from './nogood-cache.js';
import { createState, applyMove } from './search-state.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1);

function makeLevel(overrides: any = {}) {
    const grid = overrides.grid || { w: 5, h: 5 };
    return normalizeRawLevel({
        grid, gates: [{ x: 1, y: 1 }], goal: { x: grid.w, y: grid.h },
        reqLen: overrides.reqLen ?? (grid.w - 1 + grid.h - 1), reqInt: overrides.reqInt ?? 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
        ...overrides,
    });
}

test('a state is not found before it is recorded', () => {
    const level = makeLevel();
    const prep = prepLevel(level);
    const ws = createState(K(1, 1), level, prep);
    applyMove(K(2, 1), ws, level, prep, false);
    const cache = createNogoodCache();
    assert.equal(cache.has(ws), false);
    assert.equal(cache.size, 0);
});

test('a recorded state is found again by an identical state', () => {
    const level = makeLevel();
    const prep = prepLevel(level);
    const ws = createState(K(1, 1), level, prep);
    applyMove(K(2, 1), ws, level, prep, false);
    applyMove(K(2, 2), ws, level, prep, false);
    const cache = createNogoodCache();
    cache.recordDead(ws);
    assert.equal(cache.size, 1);

    // A second, independently-built state that reaches the identical fields.
    const ws2 = createState(K(1, 1), level, prep);
    applyMove(K(2, 1), ws2, level, prep, false);
    applyMove(K(2, 2), ws2, level, prep, false);
    assert.equal(cache.has(ws2), true);
});

test('a different position is not a match', () => {
    const level = makeLevel();
    const prep = prepLevel(level);
    const ws = createState(K(1, 1), level, prep);
    applyMove(K(2, 1), ws, level, prep, false);
    const cache = createNogoodCache();
    cache.recordDead(ws);

    const wsOther = createState(K(1, 1), level, prep);
    applyMove(K(1, 2), wsOther, level, prep, false);
    assert.equal(cache.has(wsOther), false);
});

test('states differing only in ints are NOT treated as the same state (regression: Stage 0 gap)', () => {
    // A cell that turns on its one-and-only visit and a cell visited straight-through twice can
    // reach the identical edgeUsage value but contribute different intersection counts — the exact
    // gap found while running the escape plan's Stage 0 premise check. Constructed directly here
    // (not via real gameplay) to isolate the signature's sensitivity to `ints` specifically.
    const level = makeLevel();
    const prep = prepLevel(level);
    const ws = createState(K(1, 1), level, prep);
    applyMove(K(2, 1), ws, level, prep, false);
    const cache = createNogoodCache();
    cache.recordDead(ws);

    const wsDifferentInts = { ...ws, ints: ws.ints + 1 };
    assert.equal(cache.has(wsDifferentInts as any), false);
});

test('visiting the same cell set via a different order produces the same signature', () => {
    const level = makeLevel();
    const prep = prepLevel(level);
    // Path A: right, right, down, down (an L shape reaching (3,3) via the top edge).
    const wsA = createState(K(1, 1), level, prep);
    applyMove(K(2, 1), wsA, level, prep, false);
    applyMove(K(3, 1), wsA, level, prep, false);
    applyMove(K(3, 2), wsA, level, prep, false);
    // A cache recorded from wsA should NOT spuriously match an unrelated different-position state.
    const cache = createNogoodCache();
    cache.recordDead(wsA);

    const wsB = createState(K(1, 1), level, prep);
    applyMove(K(1, 2), wsB, level, prep, false);
    assert.equal(cache.has(wsB), false);
});

test('capacity cap: dropping past capacity costs opportunity, never soundness', () => {
    const level = makeLevel();
    const prep = prepLevel(level);
    const ws1 = createState(K(1, 1), level, prep);
    applyMove(K(2, 1), ws1, level, prep, false);
    const ws2 = createState(K(1, 1), level, prep);
    applyMove(K(1, 2), ws2, level, prep, false);

    const cache = createNogoodCache(1);
    cache.recordDead(ws1);
    assert.equal(cache.size, 1);
    cache.recordDead(ws2); // past capacity — silently dropped, not an error
    assert.equal(cache.size, 1);
    assert.equal(cache.has(ws1), true);
    assert.equal(cache.has(ws2), false); // never recorded — a missed opportunity, not a false hit
});
