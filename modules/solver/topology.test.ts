/**
 * Connectivity/volume prune behavior (hardening plan §1): each prune must FIRE on an
 * infeasible state and must NOT fire on a feasible one.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import { prepLevel } from './prep.js';
import { createState, applyMove } from './search-state.js';
import { isConnected, isConnectedForTrap } from './topology.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1); // 1-based wire coords

function makeLevel(overrides: any = {}) {
    const grid = overrides.grid || { w: 5, h: 3 };
    return normalizeRawLevel({
        grid, gates: [{ x: 1, y: 1 }], goal: { x: grid.w, y: grid.h },
        reqLen: overrides.reqLen ?? (grid.w - 1 + grid.h - 1), reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
        ...overrides,
    });
}

function stateAt(level: any, prep: any, walkKeys: number[]) {
    const state = createState(walkKeys[0], level, prep);
    for (let i = 1; i < walkKeys.length; i++) applyMove(walkKeys[i], state, level, prep, false);
    return state;
}

test('fires when the goal is walled off; passes when it is reachable', () => {
    const open = makeLevel();
    const openPrep = prepLevel(open);
    assert.equal(isConnected(K(1, 1), stateAt(open, openPrep, [K(1, 1)]), open, openPrep), true);

    // Vertical wall of blocks isolates the goal column.
    const walled = makeLevel({ blocks: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }], reqLen: 6 });
    const wPrep = prepLevel(walled);
    assert.equal(isConnected(K(1, 1), stateAt(walled, wPrep, [K(1, 1)]), walled, wPrep), false);
});

test('fires when an unvisited must-pass is unreachable; not once it has been visited', () => {
    // Must-pass sits in a corner pocket sealed by two blocks (goal stays reachable).
    const pocket = makeLevel({
        grid: { w: 5, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 1 },
        blocks: [{ x: 4, y: 3 }, { x: 5, y: 2 }],
        mustPass: [{ x: 5, y: 3 }],   // sealed behind the two blocks
        reqLen: 4,
    });
    const prep = prepLevel(pocket);
    const st = stateAt(pocket, prep, [K(1, 1)]);
    assert.equal(isConnected(K(1, 1), st, pocket, prep), false, 'unreachable must-pass must prune');

    // Same geometry but the must-pass already visited (mask satisfied): no prune.
    st.mpVisitedMask = 0b1;
    assert.equal(isConnected(K(1, 1), st, pocket, prep), true);
});

test('fires when a remaining must-cross is unreachable; not when its mask is cleared', () => {
    const pocket = makeLevel({
        grid: { w: 5, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 1 },
        blocks: [{ x: 4, y: 3 }, { x: 5, y: 2 }],
        mustCross: [{ x: 5, y: 3 }],
        reqLen: 4,
    });
    const prep = prepLevel(pocket);
    const st = stateAt(pocket, prep, [K(1, 1)]);
    assert.equal(isConnected(K(1, 1), st, pocket, prep), false);
    st.mustCrossMask = 0;
    assert.equal(isConnected(K(1, 1), st, pocket, prep), true);
});

test('volume prune: fires when too few fresh cells remain for the required length', () => {
    // 3x1 corridor, reqLen 6 — only 2 fresh cells remain from the gate: infeasible.
    const tiny = makeLevel({ grid: { w: 3, h: 1 }, goal: { x: 3, y: 1 }, reqLen: 6 });
    const prep = prepLevel(tiny);
    assert.equal(isConnected(K(1, 1), stateAt(tiny, prep, [K(1, 1)]), tiny, prep), false);

    const fits = makeLevel({ grid: { w: 3, h: 1 }, goal: { x: 3, y: 1 }, reqLen: 2 });
    const fPrep = prepLevel(fits);
    assert.equal(isConnected(K(1, 1), stateAt(fits, fPrep, [K(1, 1)]), fits, fPrep), true);
});

test('visited cells act as walls with no intersection budget, but stay traversable with budget', () => {
    // 3x3: walk down the middle column, splitting the grid. With reqInt 0 the two
    // halves disconnect (goal side unreachable from the left half); with reqInt 1 the
    // path may re-cross a visited cell, so connectivity survives.
    const mk = (reqInt: number) => makeLevel({
        grid: { w: 3, h: 3 }, gates: [{ x: 2, y: 1 }], goal: { x: 3, y: 3 },
        reqLen: 6, reqInt,
    });
    const walk = [K(2, 1), K(2, 2), K(2, 3)];

    const strict = mk(0);
    const sPrep = prepLevel(strict);
    const sState = stateAt(strict, sPrep, walk);
    // From (1,3) — left of the wall — the goal at (3,3) is sealed off.
    assert.equal(isConnected(K(1, 3), { ...sState, path: [...sState.path, K(1, 3)] } as any, strict, sPrep), false);

    const loose = mk(1);
    const lPrep = prepLevel(loose);
    const lState = stateAt(loose, lPrep, walk);
    assert.equal(isConnected(K(1, 3), { ...lState, path: [...lState.path, K(1, 3)] } as any, loose, lPrep), true);
});

test('portal edges carry reachability to the paired exit', () => {
    // Goal pocket sealed by blocks, but a portal tunnels into it.
    const l = makeLevel({
        grid: { w: 5, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 3 },
        blocks: [{ x: 4, y: 3 }, { x: 5, y: 2 }],
        portals: [{ x1: 2, y1: 1, x2: 5, y2: 3 }],
        reqLen: 1,
    });
    const prep = prepLevel(l);
    assert.equal(isConnected(K(1, 1), stateAt(l, prep, [K(1, 1)]), l, prep), true);

    const sealed = makeLevel({
        grid: { w: 5, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 3 },
        blocks: [{ x: 4, y: 3 }, { x: 5, y: 2 }],
        reqLen: 6,
    });
    const sPrep = prepLevel(sealed);
    assert.equal(isConnected(K(1, 1), stateAt(sealed, sPrep, [K(1, 1)]), sealed, sPrep), false);
});

test('isConnectedForTrap ignores the goal but still requires objectives to be reachable', () => {
    // Goal sealed off: trap connectivity passes (any endpoint allowed)…
    const goalSealed = makeLevel({
        grid: { w: 5, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 3 },
        blocks: [{ x: 4, y: 3 }, { x: 5, y: 2 }],
        reqLen: 4,
    });
    const gPrep = prepLevel(goalSealed);
    assert.equal(isConnectedForTrap(K(1, 1), stateAt(goalSealed, gPrep, [K(1, 1)]), goalSealed, gPrep), true);

    // …but an unreachable must-pass still prunes.
    const mpSealed = makeLevel({
        grid: { w: 5, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 1 },
        blocks: [{ x: 4, y: 3 }, { x: 5, y: 2 }],
        mustPass: [{ x: 5, y: 3 }],
        reqLen: 4,
    });
    const mPrep = prepLevel(mpSealed);
    assert.equal(isConnectedForTrap(K(1, 1), stateAt(mpSealed, mPrep, [K(1, 1)]), mpSealed, mPrep), false);
});
