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

test('a used flipper stays a hard wall even with intersection budget (unlike an ordinary visited cell)', () => {
    // Single corridor (1,1)-(2,1)-flipper(3,1)-(4,1)-goal(5,1), with a must-pass branch
    // at (2,2) only reachable via (2,1). Row 2 is otherwise blocked off.
    const level = makeLevel({
        grid: { w: 5, h: 2 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 5, y: 1 },
        mustPass: [{ x: 2, y: 2 }],
        blocks: [{ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }],
        flippingFilters: [{ x: 3, y: 1, axis: 1 }], // AXIS_H — matches the corridor's horizontal moves
        reqLen: 6, reqInt: 1, // reqInt ≥ 1 → maxVisit=2 (an ordinary cell would stay traversable)
    });
    const prep = prepLevel(level);
    // Walk past the flipper without ever detouring to the must-pass branch.
    const state = stateAt(level, prep, [K(1, 1), K(2, 1), K(3, 1), K(4, 1)]);

    // The must-pass is still unvisited, and the only route back to it is through the
    // now-used flipper — genuinely unreachable, so this must fire even though the
    // intersection budget would let the flood fill cross an *ordinary* visited cell.
    assert.equal(isConnected(K(4, 1), state, level, prep), false);

    // Sanity: the same must-pass is reachable if the flipper hasn't been used yet.
    const freshState = stateAt(level, prep, [K(1, 1), K(2, 1)]);
    assert.equal(isConnected(K(2, 1), freshState, level, prep), true);
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

/**
 * Differential test against an independent reference implementation, over a randomized SEQUENCE
 * of calls on the same level.
 *
 * The sequence is the point, not incidental coverage. isConnected's bit-parallel flood fill
 * (topology.ts's _floodFillBits) keeps its reachable set in module-level per-row scratch and grows
 * the rows it touches lazily out from `pos`, so a row no call touches keeps whatever the PREVIOUS
 * call left in it. A single-call test cannot see that; two calls whose reachable regions differ in
 * vertical extent can. Exactly that bug shipped in the first version of the bit-parallel fill and
 * was caught by end-to-end nodesExpanded divergence rather than by any unit test — it made the
 * prune too permissive (a stale bit reads as "reachable", so a legitimate prune is skipped), which
 * never rejects a reachable solution but does change search order.
 */
function referenceIsConnected(pos: number, state: any, level: any, prep: any): boolean {
    // Deliberately naive: a plain Set-based BFS re-derived from the game rules, sharing no code
    // (and no scratch buffers) with topology.ts.
    const { w, h } = level.grid;
    const intNeeded = level.reqInt - state.ints;
    const maxVisit = intNeeded > 0 ? 2 : 0;
    const canEnter = (k: number) => {
        const fi = prep.flipperIndexMap[k];
        if (fi !== -1 && (state.flipperUsedMask & (1 << fi)) !== 0) return false;
        if (prep.reachBlockedArr[k] !== 0) return false;
        return state.visited[k] <= maxVisit || k === pos;
    };
    const seen = new Set<number>([pos]);
    const queue = [pos];
    let freshVolume = 1;
    while (queue.length > 0) {
        const k = queue.shift() as number;
        const x = k & 0xFFFF, y = (k >>> 16) & 0xFFFF;
        const nbrs: number[] = [];
        const portal = level.portalMap.get(k);
        if (portal && portal.dest >= 0) nbrs.push(portal.dest);
        if (x + 1 < w) nbrs.push(PACK(x + 1, y));
        if (x > 0) nbrs.push(PACK(x - 1, y));
        if (y + 1 < h) nbrs.push(PACK(x, y + 1));
        if (y > 0) nbrs.push(PACK(x, y - 1));
        for (const nk of nbrs) {
            if (seen.has(nk) || !canEnter(nk)) continue;
            seen.add(nk);
            if (state.visited[nk] === 0) freshVolume++;
            queue.push(nk);
        }
    }
    if (!seen.has(level.goalKey)) return false;
    for (let i = 0; i < level.mustPassKeys.length; i++) {
        if (!(state.mpVisitedMask & (1 << i)) && !seen.has(level.mustPassKeys[i])) return false;
    }
    for (let i = 0; i < level.mustCrossKeys.length; i++) {
        if ((state.mustCrossMask & (1 << i)) !== 0 && !seen.has(level.mustCrossKeys[i])) return false;
    }
    if (level.portalMap.size === 0) {
        const rSteps = level.reqLen - (state.path.length - 1 - state.portalJumps);
        if (freshVolume + intNeeded < rSteps) return false;
    }
    return true;
}

test('isConnected matches an independent BFS across a randomized sequence of states', () => {
    let seed = 20260730;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

    let checks = 0;
    for (let trial = 0; trial < 60; trial++) {
        const w = 5 + ((rnd() * 8) | 0), h = w;
        const blocks: { x: number; y: number }[] = [];
        const taken = new Set<string>(['1,1', `${w},${h}`]);
        for (let b = 0; b < ((rnd() * w * h) | 0) / 4; b++) {
            const x = 1 + ((rnd() * w) | 0), y = 1 + ((rnd() * h) | 0);
            if (taken.has(`${x},${y}`)) continue;
            taken.add(`${x},${y}`);
            blocks.push({ x, y });
        }
        const level = makeLevel({ grid: { w, h }, blocks, reqLen: 4 + ((rnd() * w * 2) | 0), reqInt: (rnd() * 3) | 0 });
        const prep = prepLevel(level);

        // Walk a random path, checking isConnected against the reference after every step. Cells
        // near the walk's tip are re-checked as the reachable region shrinks and shifts rows,
        // which is what exposes cross-call scratch reuse.
        const state = createState(K(1, 1), level, prep);
        for (let step = 0; step < 40; step++) {
            const pos = state.path[state.path.length - 1];
            assert.equal(
                isConnected(pos, state, level, prep),
                referenceIsConnected(pos, state, level, prep),
                `trial ${trial} step ${step}: isConnected disagreed with the reference BFS`,
            );
            checks++;
            const x = pos & 0xFFFF, y = (pos >>> 16) & 0xFFFF;
            const cands: number[] = [];
            if (x + 1 < w) cands.push(PACK(x + 1, y));
            if (x > 0) cands.push(PACK(x - 1, y));
            if (y + 1 < h) cands.push(PACK(x, y + 1));
            if (y > 0) cands.push(PACK(x, y - 1));
            const legal = cands.filter(k => prep.reachBlockedArr[k] === 0);
            if (legal.length === 0) break;
            applyMove(legal[(rnd() * legal.length) | 0], state, level, prep, false);
        }
    }
    assert.ok(checks > 1000, `expected a broad sample, only ran ${checks} comparisons`);
});
