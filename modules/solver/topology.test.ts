/**
 * Connectivity/volume prune behavior (hardening plan §1): each prune must FIRE on an
 * infeasible state and must NOT fire on a feasible one.
 */
import assert from 'node:assert/strict';
import { denseIndex } from './distance.js';
import { test } from 'vitest';
import { PACK } from './encoding.js';
import { normalizeRawLevel } from './normalization.js';
import { prepLevel } from './prep.js';
import { createState, applyMove } from './search-state.js';
import { __setReachGenerationForTests, isConnected, isConnectedForTrap } from './topology.js';
import { evaluatePrunedMove } from './prune-gauntlet.js';
import type { PruneDiagnostics } from './prune-gauntlet.js';

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

function connectivityDiagnostic(next: number, state: any, level: any, prep: any) {
    const diagnostics: PruneDiagnostics = { reached: {}, rejected: {} };
    const verdict = evaluatePrunedMove(next, state.path.length - 1, state, level, prep,
        { PRUNE_CONNECTIVITY: true }, true, { diagnostics });
    return {
        verdict,
        reached: diagnostics.reached.PRUNE_CONNECTIVITY ?? 0,
        rejected: diagnostics.rejected.PRUNE_CONNECTIVITY ?? 0,
    };
}

test('fires when the goal is walled off; passes when it is reachable', () => {
    const open = makeLevel();
    const openPrep = prepLevel(open);
    const openState = stateAt(open, openPrep, [K(1, 1)]);
    assert.equal(isConnected(K(1, 1), openState, open, openPrep), true);
    assert.deepEqual(connectivityDiagnostic(K(1, 1), openState, open, openPrep),
        { verdict: 'pass', reached: 1, rejected: 0 }, 'feasible control reaches connectivity and survives');

    // Vertical wall of blocks isolates the goal column.
    const walled = makeLevel({ blocks: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }], reqLen: 6 });
    const wPrep = prepLevel(walled);
    const walledState = stateAt(walled, wPrep, [K(1, 1)]);
    assert.equal(isConnected(K(1, 1), walledState, walled, wPrep), false);
    assert.deepEqual(connectivityDiagnostic(K(1, 1), walledState, walled, wPrep),
        { verdict: 'reject', reached: 1, rejected: 1 }, 'connectivity is the isolated first firing rule');
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

test('reserved-intersection wall: visited cells wall off once every intersection is committed to a pending must-cross', () => {
    // 5x3, blocks at (3,1)/(3,3) so column 3 is a one-cell bridge at (3,2). Gate (1,1),
    // goal (1,3) — both on the LEFT of the bridge — and the single must-cross at (4,2) on
    // the right. reqInt 1 == must-cross count, so that one intersection is committed to
    // the must-cross's own second crossing and NOTHING else may ever be revisited.
    const level = makeLevel({
        grid: { w: 5, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 1, y: 3 },
        blocks: [{ x: 3, y: 1 }, { x: 3, y: 3 }],
        mustCross: [{ x: 4, y: 2 }],
        reqLen: 10, reqInt: 1,
    });
    const prep = prepLevel(level);
    // Cross the bridge to the right side, consuming (2,2) and (3,2) on the way.
    const state = stateAt(level, prep, [K(1, 1), K(2, 1), K(2, 2), K(3, 2)]);

    // Getting back to the goal means re-entering a visited cell, which costs the one
    // intersection the must-cross has already reserved — provably dead.
    assert.equal(isConnected(K(3, 2), state, level, prep), false);

    // Ablated, the fill falls back to the plain maxVisit=2 rule and cannot see it.
    prep._cfg = { PRUNE_MC_RESERVED_WALL: false };
    assert.equal(isConnected(K(3, 2), state, level, prep), true);
    prep._cfg = null;

    // A pending must-cross cell itself stays traversable — its own revisit is the one that IS
    // paid for. 3x3 with (1,3)/(3,3) blocked, so the goal at (2,3) hangs off the must-cross at
    // (2,2) and nothing else: the only route to the goal re-enters that already-visited must-cross
    // cell. Walling it would return false here.
    const hanging = makeLevel({
        grid: { w: 3, h: 3 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 2, y: 3 },
        blocks: [{ x: 1, y: 3 }, { x: 3, y: 3 }],
        mustCross: [{ x: 2, y: 2 }],
        reqLen: 6, reqInt: 1,
    });
    const hPrep = prepLevel(hanging);
    // Down the left column, then right along row 2 THROUGH the pending must-cross at (2,2): it was
    // entered horizontally, so its V axis is still free and the goal below it stays reachable. The
    // earlier version of this fixture walked (1,1)->(2,1)->(3,1) with the must-cross at (2,1), which
    // axis-aware connectivity correctly calls DEAD — the only move back is into (2,1) along H, whose
    // H bit is already spent. That assertion was encoding the old fill's over-approximation.
    const hState = stateAt(hanging, hPrep, [K(1, 1), K(1, 2), K(2, 2), K(3, 2)]);
    assert.equal(isConnected(K(3, 2), hState, hanging, hPrep), true);
});

test('a cell with both axes spent is a wall even at visit count 1, with intersection budget left', () => {
    // The case the visit-count test alone cannot see (PRUNE_CONNECTIVITY_AXIS_EXHAUSTED). A cell
    // entered horizontally and left vertically has edgeUsage 3 while visited is only 1, so
    // `visited <= maxVisit` still admits it — but it can never be entered again, because entering
    // along either axis needs that axis free.
    //
    // 3x3, reqInt 1 so maxVisit is 2 and the visit-count test is deliberately NOT the thing firing.
    // The walk turns through (2,2): in from (2,1) vertically, out to (1,2) horizontally, which
    // spends both of (2,2)'s axes. Blocks seal (1,1)/(1,3)/(3,3) so that from (1,2) the ONLY route
    // to the goal at (2,3) runs through (2,2) — with the rule the goal is unreachable, without it
    // (2,2) still reads as traversable at visit count 1.
    const level = makeLevel({
        grid: { w: 3, h: 3 }, gates: [{ x: 2, y: 1 }], goal: { x: 2, y: 3 },
        reqLen: 6, reqInt: 1,
        blocks: [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 3, y: 3 }],
    });
    const prep = prepLevel(level);
    const state = stateAt(level, prep, [K(2, 1), K(2, 2), K(1, 2)]);
    assert.equal(state.edgeUsage[K(2, 2)], 3, 'setup: (2,2) must have both axis bits spent');
    assert.equal(state.visited[K(2, 2)], 1, 'setup: ...at a visit count the maxVisit test still admits');
    assert.equal(isConnected(K(1, 2), state, level, prep), false);

    // Ablating the rule restores the old, looser behaviour on the same state — which is what makes
    // this a test of the rule rather than of the level's geometry.
    prep._cfg = { PRUNE_CONNECTIVITY_AXIS_EXHAUSTED: false } as any;
    assert.equal(isConnected(K(1, 2), state, level, prep), true);
    prep._cfg = null;
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
    assert.equal(referenceIsConnected(K(4, 1), state, level, prep), false,
        'independent reference must decode the +1-biased flipper index before testing used-mask bits');

    // Sanity: the same must-pass is reachable if the flipper hasn't been used yet.
    const freshState = stateAt(level, prep, [K(1, 1), K(2, 1)]);
    assert.equal(isConnected(K(2, 1), freshState, level, prep), true);
    assert.equal(referenceIsConnected(K(2, 1), freshState, level, prep), true);
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

test('BFS scratch generation rollover clears tags before reusing generation 1', () => {
    const level = makeLevel({
        grid: { w: 5, h: 3 },
        blocks: [{ x: 4, y: 3 }, { x: 5, y: 2 }],
        goal: { x: 5, y: 3 },
        reqLen: 2,
    });
    const prep = prepLevel(level);
    // Exercise the plain-BFS defensive fallback rather than the normal <=15-wide bitmap path.
    prep.reachPassableRows = null;

    // Simulate a tag left by the previous use of generation 1. On rollover, retaining this tag
    // would make the sealed goal appear reachable even though this flood fill never visits it.
    __setReachGenerationForTests(0xFFFFFFFF, level.goalKey);
    assert.equal(isConnected(K(1, 1), stateAt(level, prep, [K(1, 1)]), level, prep), false);
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
function referenceIsConnected(
    pos: number,
    state: any,
    level: any,
    prep: any,
    coverage?: { rejectedUsedFlipper: boolean },
): boolean {
    // Deliberately naive: a plain Set-based BFS re-derived from the game rules, sharing no code
    // (and no scratch buffers) with topology.ts.
    const { w, h } = level.grid;
    const intNeeded = level.reqInt - state.ints;
    const maxVisit = intNeeded > 0 ? 2 : 0;
    const canEnter = (k: number) => {
        const fi = prep.flipperIndexMap[denseIndex(k, prep.gridW)] - 1;
        if (fi !== -1 && (state.flipperUsedMask & (1 << fi)) !== 0) {
            if (coverage) coverage.rejectedUsedFlipper = true;
            return false;
        }
        if (prep.reachBlockedArr[denseIndex(k, prep.gridW)] !== 0) return false;
        // Both axis bits spent => the cell can never be entered again (entering along H needs H
        // free, along V needs V free -- move-rules.ts's invalid-edge-reuse-target). Re-derived here
        // from the rule, not copied from topology.ts: this reference shares no code with the
        // implementation, and the rule is a property of the GAME, so both must encode it
        // independently. Note it is not implied by the visit-count test -- a cell visited ONCE,
        // entered horizontally and left vertically, has edgeUsage 3 with visited 1.
        if (k !== pos && state.edgeUsage[k] === 3) return false;
        return state.visited[k] <= maxVisit || k === pos;
    };
    // Plain cell-level BFS, matching the relation the implementation actually decides. A tighter,
    // AXIS-AWARE reference lived here while the axis-aware fill was under test: it walks
    // (cell, entry-axis) states, requiring edgeUsage[n] & b === 0 to enter n along b and
    // edgeUsage[c] & b === 0 to turn at c. That fill was measured at -2 solves corpus-wide and
    // removed (reports/2026-08-01-budget-vs-algorithm.md), so the reference tracks it back down —
    // a reference stricter than the implementation reports every legitimate over-approximation as a
    // failure. Note the direction: the cell-level relation is a SUPERSET, so this reference stays
    // sound as a differential oracle either way; it is the equality assertion that needs them to
    // model the same relation.
    const seen = new Set<number>([pos]);
    const queue = [pos];
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
            queue.push(nk);
        }
    }
    let freshVolume = 1;
    for (const k of seen) if (k !== pos && state.visited[k] === 0) freshVolume++;
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
    let flipperTrials = 0;
    let callsWithUsedFlippers = 0;
    let comparisonsRejectingUsedFlippers = 0;
    let freshFlipperMoves = 0;
    let usedFlipperMoves = 0;
    for (let trial = 0; trial < 60; trial++) {
        const w = 5 + ((rnd() * 8) | 0), h = w;
        const blocks: { x: number; y: number }[] = [];
        const taken = new Set<string>(['1,1', `${w},${h}`]);
        const flippingFilters: { x: number; y: number; axis: number }[] = [];
        const forcedMoves: number[] = [];
        // Every third trial gets a horizontal flipper and a short prefix that first enters it,
        // leaves it, then enters it again. Reserve both prefix cells before placing blocks so the
        // generated feature never overlaps a gate, goal, or block. axis=1 is AXIS_H, matching the
        // initial entry and therefore representing a valid initial filter orientation.
        if (trial % 3 === 0) {
            taken.add('2,1');
            taken.add('3,1');
            flippingFilters.push({ x: 2, y: 1, axis: 1 });
            forcedMoves.push(K(2, 1), K(3, 1), K(2, 1));
            flipperTrials++;
        }
        for (let b = 0; b < ((rnd() * w * h) | 0) / 4; b++) {
            const x = 1 + ((rnd() * w) | 0), y = 1 + ((rnd() * h) | 0);
            if (taken.has(`${x},${y}`)) continue;
            taken.add(`${x},${y}`);
            blocks.push({ x, y });
        }
        const level = makeLevel({
            grid: { w, h }, blocks, flippingFilters,
            reqLen: 4 + ((rnd() * w * 2) | 0), reqInt: (rnd() * 3) | 0,
        });
        const prep = prepLevel(level);

        // Walk a random path, checking isConnected against the reference after every step. Cells
        // near the walk's tip are re-checked as the reachable region shrinks and shifts rows,
        // which is what exposes cross-call scratch reuse.
        const state = createState(K(1, 1), level, prep);
        for (let step = 0; step < 40; step++) {
            const pos = state.path[state.path.length - 1];
            const coverage = { rejectedUsedFlipper: false };
            const expected = referenceIsConnected(pos, state, level, prep, coverage);
            assert.equal(
                isConnected(pos, state, level, prep),
                expected,
                `trial ${trial} step ${step}: isConnected disagreed with the reference BFS`,
            );
            checks++;
            if (state.flipperUsedMask !== 0) callsWithUsedFlippers++;
            if (coverage.rejectedUsedFlipper) comparisonsRejectingUsedFlippers++;
            const x = pos & 0xFFFF, y = (pos >>> 16) & 0xFFFF;
            const cands: number[] = [];
            if (x + 1 < w) cands.push(PACK(x + 1, y));
            if (x > 0) cands.push(PACK(x - 1, y));
            if (y + 1 < h) cands.push(PACK(x, y + 1));
            if (y > 0) cands.push(PACK(x, y - 1));
            const legal = cands.filter(k => prep.reachBlockedArr[denseIndex(k, prep.gridW)] === 0);
            if (legal.length === 0) break;
            const target = forcedMoves[step] ?? legal[(rnd() * legal.length) | 0];
            const flipperIndex = prep.flipperIndexMap[denseIndex(target, prep.gridW)] - 1;
            if (flipperIndex !== -1) {
                if ((state.flipperUsedMask & (1 << flipperIndex)) !== 0) usedFlipperMoves++;
                else freshFlipperMoves++;
            }
            applyMove(target, state, level, prep, false);
        }
    }
    assert.ok(checks > 1000, `expected a broad sample, only ran ${checks} comparisons`);
    assert.ok(flipperTrials > 0, 'expected randomized trials containing flipping filters');
    assert.ok(callsWithUsedFlippers > 0, 'expected connectivity calls with used-flipper bits set');
    assert.ok(comparisonsRejectingUsedFlippers > 0,
        'expected reference comparisons to reject traversal through a used flipper');
    assert.ok(freshFlipperMoves > 0, 'expected generated moves through fresh flippers');
    assert.ok(usedFlipperMoves > 0, 'expected generated moves through already-used flippers');
});
