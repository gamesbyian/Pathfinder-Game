/**
 * PLAY-referee matrix for validateCandidatePath (hardening plan §1).
 *
 * For each constraint kind the suite asserts BOTH that a satisfying path is accepted AND
 * that representative near-miss paths are rejected — deleting any single rejection clause
 * in the referee should fail at least one test here.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './cell-key.js';
import { buildWireLevelData, parseRawLevel } from './level-codec.js';
import { validateCandidatePath } from './path-validator.js';

// 1-based wire coords → 0-based packed key
const K = (x: number, y: number) => PACK(x - 1, y - 1);
const keys = (...pairs: [number, number][]) => pairs.map(([x, y]) => K(x, y));

function level(overrides: any = {}) {
    const grid = overrides.grid || { w: 5, h: 5 };
    const l = parseRawLevel({
        grid,
        gates: [{ x: 1, y: 1 }],
        goal: { x: grid.w, y: grid.h },
        reqLen: 8,
        reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
        ...overrides,
    });
    assert.ok(l, 'fixture level must parse');
    return l!;
}

// ── Basic shape and coordinate formats ────────────────────────────────────────

test('accepts a straight corridor solution in packed-key, [x,y], and {x,y} formats', () => {
    const l = level({ grid: { w: 5, h: 1 }, reqLen: 4 });
    const asKeys = keys([1, 1], [2, 1], [3, 1], [4, 1], [5, 1]);
    assert.equal(validateCandidatePath(l, asKeys).ok, true);
    const asPairs = [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1]];
    assert.equal(validateCandidatePath(l, asPairs as any).ok, true);
    // 0-based {x,y} objects (in-bounds coordinates are taken as already normalized)
    const asObjects = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }];
    const res = validateCandidatePath(l, asObjects as any);
    assert.equal(res.ok, true);
});

test('{x,y} objects resolve as literal 0-indexed coordinates all the way to the last row/column', () => {
    // 8x8 grid: the last valid 0-indexed coordinate is (7,7). {x,y} objects are always taken
    // as already 0-indexed (no 1-indexed guessing), so this must hold right up to the boundary.
    const l = level({ grid: { w: 8, h: 8 }, gates: [{ x: 1, y: 1 }], goal: { x: 8, y: 8 }, reqLen: 14, reqInt: 0 });
    const path: any[] = [];
    for (let i = 0; i <= 7; i++) path.push({ x: 0, y: i });
    for (let i = 1; i <= 7; i++) path.push({ x: i, y: 7 });
    assert.equal(validateCandidatePath(l, path).ok, true);
});

test('rejects paths that are too short, malformed, or start off-gate', () => {
    const l = level({ grid: { w: 5, h: 1 }, reqLen: 4 });
    assert.match((validateCandidatePath(l, []) as any).reason, /at least 2 nodes/);
    assert.match((validateCandidatePath(l, [K(1, 1)]) as any).reason, /at least 2 nodes/);
    assert.match((validateCandidatePath(l, ['bogus', null] as any) as any).reason, /Invalid path coordinate/);
    assert.match((validateCandidatePath(l, keys([2, 1], [3, 1], [4, 1], [5, 1])) as any).reason, /start on a gate/);
});

test('rejects diagonal and multi-cell steps, and paths ending off-goal', () => {
    const l = level({ reqLen: 8 });
    assert.match((validateCandidatePath(l, keys([1, 1], [2, 2])) as any).reason, /Invalid move/);
    assert.match((validateCandidatePath(l, keys([1, 1], [3, 1])) as any).reason, /Invalid move/);
    const wander = keys([1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [4, 3], [4, 4]);
    assert.match((validateCandidatePath(l, wander) as any).reason, /end on the goal/);
});

test('enforces exact length and exact intersections', () => {
    // 5x5, gate (1,1) → goal (5,5): manhattan distance 8
    const l = level({ reqLen: 8, reqInt: 0 });
    const straight = keys([1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]);
    assert.equal(validateCandidatePath(l, straight).ok, true);

    const tenLong = level({ reqLen: 10, reqInt: 0 });
    assert.match((validateCandidatePath(tenLong, straight) as any).reason, /length 8 does not match required 10/);

    const oneInt = level({ reqLen: 8, reqInt: 1 });
    assert.match((validateCandidatePath(oneInt, straight) as any).reason, /Intersections 0 do not match required 1/);

    // A crossing path: revisiting a cell counts one intersection
    const crossing = level({ reqLen: 12, reqInt: 1 });
    const cross = keys(
        [1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [2, 3], [2, 2], // approach and loop start
        [3, 2],                                                 // re-enter (3,2) → intersection
        [4, 2], [4, 3], [4, 4], [5, 4], [5, 5],
    );
    const res = validateCandidatePath(crossing, cross);
    assert.equal(res.ok, true, (res as any).reason);
    const zeroInt = level({ reqLen: 12, reqInt: 0 });
    assert.match((validateCandidatePath(zeroInt, cross) as any).reason, /Intersections 1 do not match required 0/);
});

test('rejects re-entering a gate and reusing a traversed edge', () => {
    const l = level({ grid: { w: 3, h: 3 }, gates: [{ x: 2, y: 2 }], goal: { x: 3, y: 3 }, reqLen: 6, reqInt: 0 });
    // Leaves the gate then steps back onto it
    const gateReenter = keys([2, 2], [2, 1], [2, 2]);
    assert.match((validateCandidatePath(l, gateReenter) as any).reason, /Invalid move/);

    // Edge reuse: traverse (1,1)→(2,1) then immediately back (2,1)→(1,1)
    const l2 = level({ grid: { w: 3, h: 1 }, reqLen: 4, reqInt: 1 });
    const backtrack = keys([1, 1], [2, 1], [1, 1]);
    assert.match((validateCandidatePath(l2, backtrack) as any).reason, /Invalid move/);
});

// ── Hazards & blocks ─────────────────────────────────────────────────────────

test('rejects entering blocks and geese, and continuing after a false goal (PLAY referee)', () => {
    const blocked = level({ blocks: [{ x: 2, y: 1 }] });
    assert.match((validateCandidatePath(blocked, keys([1, 1], [2, 1])) as any).reason, /Invalid move/);

    const goosed = level({ geese: [{ x: 2, y: 1 }] });
    assert.match((validateCandidatePath(goosed, keys([1, 1], [2, 1])) as any).reason, /Invalid move/);

    // Entering a false goal detonates the trap: the path is locked there, so any further
    // step is invalid, and a path parked on it does not end on the true goal.
    const trapped = level({ falseGoals: [{ x: 2, y: 1 }] });
    assert.match((validateCandidatePath(trapped, keys([1, 1], [2, 1], [3, 1])) as any).reason, /Invalid move at step 3/);
    assert.match((validateCandidatePath(trapped, keys([1, 1], [2, 1])) as any).reason, /end on the goal/);
});

// ── Must-pass / must-cross ───────────────────────────────────────────────────

test('must-pass: accepted when visited, rejected when skipped', () => {
    const l = level({ mustPass: [{ x: 5, y: 1 }], reqLen: 8, reqInt: 0 });
    const through = keys([1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]);
    assert.equal(validateCandidatePath(l, through).ok, true);
    // The PLAY rules gate goal entry on unmet must-pass, so the near-miss is rejected
    // at the final step (defense-in-depth: the referee's own must-pass clause backstops
    // contexts that don't gate the goal).
    const around = keys([1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [5, 4], [5, 5]);
    const r = validateCandidatePath(l, around);
    assert.equal(r.ok, false);
    assert.match((r as any).reason, /Invalid move at step 9|Must-pass cell not visited/);
});

test('must-cross: requires two visits, one is rejected', () => {
    const mc = { x: 3, y: 2 };
    const l = level({ mustCross: [mc], reqLen: 12, reqInt: 1 });
    // Crosses (3,2) horizontally then vertically
    const crossing = keys(
        [1, 1], [2, 1], [2, 2], [3, 2], [4, 2], [4, 1], [3, 1],
        [3, 2], // second, crossing visit
        [3, 3], [3, 4], [4, 4], [5, 4], [5, 5],
    );
    const res = validateCandidatePath(l, crossing);
    assert.equal(res.ok, true, (res as any).reason);

    const singleVisit = level({ mustCross: [mc], reqLen: 8, reqInt: 0 });
    const once = keys([1, 1], [2, 1], [2, 2], [3, 2], [4, 2], [5, 2], [5, 3], [5, 4], [5, 5]);
    const r1 = validateCandidatePath(singleVisit, once);
    assert.equal(r1.ok, false);
    assert.match((r1 as any).reason, /Invalid move at step 9|Must-cross cell visited fewer than twice/);
});

test('must-cross lock: turning on the first pass consumes both axes and is rejected', () => {
    const l = level({ mustCross: [{ x: 3, y: 2 }], reqLen: 12, reqInt: 1 });
    // Turn AT the must-cross cell on first entry (step 5: enters via H from (2,2), turns to exit
    // via V toward (3,1)). Rejected right at the turn itself (isValidMove's must-cross-lock check,
    // added 2026-08-06 — see domain.test.ts's regression tests) — previously this path was only
    // caught later, at the now-impossible second entry attempt (step 8), via ordinary edge-reuse;
    // the turn itself was silently permitted.
    const turnOnFirst = keys(
        [1, 1], [2, 1], [2, 2], [3, 2], [3, 1], [4, 1], [4, 2],
        [3, 2], // second entry along H axis — blocked by the H+V lock from the turn
        [3, 3], [3, 4], [4, 4], [5, 4], [5, 5],
    );
    assert.match((validateCandidatePath(l, turnOnFirst) as any).reason, /Invalid move at step 5/);
});

// ── Filters ──────────────────────────────────────────────────────────────────

test('regular filter: entry along the declared axis only; turning on it is rejected', () => {
    const l = level({ filters: [{ x: 3, y: 1, axis: 1 }], reqLen: 8, reqInt: 0 });
    const horizontal = keys([1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]);
    assert.equal(validateCandidatePath(l, horizontal).ok, true);

    const vertical = level({ filters: [{ x: 3, y: 3, axis: 1 }], reqLen: 8, reqInt: 0 });
    const enterVertically = keys([1, 1], [2, 1], [3, 1], [3, 2], [3, 3]);
    assert.match((validateCandidatePath(vertical, enterVertically) as any).reason, /Invalid move/);
});

test('flipping filter: axis flips after each use; wrong-axis entry and turning are rejected', () => {
    // Flipping filter at (3,1), declared H. First crossing must be horizontal.
    const l = level({ flippingFilters: [{ x: 3, y: 1, axis: 1 }], reqLen: 8, reqInt: 0 });
    const firstCrossH = keys([1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5]);
    assert.equal(validateCandidatePath(l, firstCrossH).ok, true);

    // Crossing a declared-H filter vertically (straight through) is rejected on exit.
    const wrongAxis = level({ flippingFilters: [{ x: 3, y: 3, axis: 1 }], reqLen: 8, reqInt: 0 });
    const crossV = keys([1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [3, 4]);
    assert.match((validateCandidatePath(wrongAxis, crossV) as any).reason, /Invalid move/);

    // Flip parity is global: after crossing flipper A (declared H, crossed H), a later
    // flipper B (also declared H) must be crossed on the FLIPPED axis (V).
    const two = () => level({
        flippingFilters: [{ x: 3, y: 1, axis: 1 }, { x: 3, y: 3, axis: 1 }],
        reqLen: 10, reqInt: 0,
    });
    const bCrossedV = keys([1, 1], [2, 1], [3, 1], [4, 1], [4, 2], [3, 2], [3, 3], [3, 4], [4, 4], [5, 4], [5, 5]);
    const resV = validateCandidatePath(two(), bCrossedV);
    assert.equal(resV.ok, true, (resV as any).reason);
    // Rejected at the step ENTERING B (step 7), not one step later: entry-axis on a flipping
    // filter's first-ever crossing is now checked directly (see move-rules.ts's
    // isValidMove regression fix), rather than being caught incidentally by the exit-side
    // check on the following step.
    const bCrossedH = keys([1, 1], [2, 1], [3, 1], [4, 1], [4, 2], [4, 3], [3, 3], [2, 3]);
    assert.match((validateCandidatePath(two(), bCrossedH) as any).reason, /Invalid move at step 7/);

    // Turning ON a flipping filter is never allowed
    const noTurn = level({ flippingFilters: [{ x: 2, y: 1, axis: 1 }], reqLen: 8, reqInt: 0 });
    const turnOnIt = keys([1, 1], [2, 1], [2, 2], [3, 2], [4, 2], [5, 2], [5, 3], [5, 4], [5, 5]);
    assert.match((validateCandidatePath(noTurn, turnOnIt) as any).reason, /Invalid turn on flipping filter/);
});

// ── Portals ──────────────────────────────────────────────────────────────────

test('portal: forced jump at zero cost is accepted and counted correctly', () => {
    // Portal (2,1)→(4,1); counted length excludes the jump.
    const l = level({ grid: { w: 5, h: 1 }, portals: [{ x1: 2, y1: 1, x2: 4, y2: 1 }], reqLen: 2, reqInt: 0 });
    const jump = keys([1, 1], [2, 1], [4, 1], [5, 1]);
    const res = validateCandidatePath(l, jump);
    assert.equal(res.ok, true, (res as any).reason);
});

test('portal: stepping anywhere but the paired exit from a portal cell is rejected', () => {
    const l = level({ portals: [{ x1: 2, y1: 1, x2: 4, y2: 3 }], reqLen: 6, reqInt: 0 });
    const ignoreJump = keys([1, 1], [2, 1], [3, 1]);
    assert.match((validateCandidatePath(l, ignoreJump) as any).reason, /Invalid move/);
});

// ── Landmarks ────────────────────────────────────────────────────────────────

test('surround: the landmark cell is impassable and all reachable 8-neighbors must be visited', () => {
    const mkSurround = (extra: any = {}) => level({
        grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 3 }], goal: { x: 3, y: 3 },
        landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }],
        reqLen: 6, reqInt: 0,
        ...extra,
    });

    // Entering the surround cell itself is an invalid move.
    const entersLandmark = keys([1, 3], [1, 2], [2, 2]);
    assert.match((validateCandidatePath(mkSurround(), entersLandmark) as any).reason, /Invalid move/);

    // The C-shaped walk (1,3)→(1,2)→(1,1)→(2,1)→(3,1)→(3,2)→(3,3) covers 7 of the 8
    // neighbors of (2,2); the missed (2,3) fails the surround clause.
    const missesOne = mkSurround({ reqLen: 6 });
    const cShape = keys([1, 3], [1, 2], [1, 1], [2, 1], [3, 1], [3, 2], [3, 3]);
    // The PLAY rules gate goal entry on the unmet surround neighbor, so the near-miss is
    // rejected at the final step (the referee's own surround clause backstops other contexts).
    const r = validateCandidatePath(missesOne, cShape);
    assert.equal(r.ok, false);
    assert.match((r as any).reason, /Invalid move at step 7|Surround constraint not satisfied/);

    // Blocking (2,3) removes it from the required neighbor set → the same walk is accepted.
    const blockedNeighbor = mkSurround({ blocks: [{ x: 2, y: 3 }] });
    const r2 = validateCandidatePath(blockedNeighbor, cShape);
    assert.equal(r2.ok, true, (r2 as any).reason);

    // A goose at (2,3) is just as impassable as a block, so it must be excluded from the
    // required neighbor set the same way — otherwise the referee demands a visit to a cell
    // no legal path can ever reach.
    const goosedNeighbor = mkSurround({ geese: [{ x: 2, y: 3 }] });
    const r3 = validateCandidatePath(goosedNeighbor, cShape);
    assert.equal(r3.ok, true, (r3 as any).reason);
});

test('must-turn: requires a turn of the required direction at the cell', () => {
    const mk = (turnRole: string, turn?: string) => level({
        grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 3, y: 3 },
        landmarks: [{ x: 3, y: 1, objectType: 'library', role: turnRole, ...(turn ? { turn } : {}) }],
        reqLen: 4, reqInt: 0,
    });
    // Path (1,1)→(2,1)→(3,1)→(3,2)→(3,3): at (3,1) heading east then south = CW turn
    const cwTurn = keys([1, 1], [2, 1], [3, 1], [3, 2], [3, 3]);
    assert.equal(validateCandidatePath(mk('mustTurn', 'either'), cwTurn).ok, true);
    assert.equal(validateCandidatePath(mk('mustTurnCw'), cwTurn).ok, true);
    const ccwRes = validateCandidatePath(mk('mustTurnCcw'), cwTurn);
    assert.equal(ccwRes.ok, false);
    assert.match((ccwRes as any).reason, /need ccw turn, got cw/);

    // No turn at the cell at all
    const straightLevel = level({
        grid: { w: 5, h: 1 }, goal: { x: 5, y: 1 },
        landmarks: [{ x: 3, y: 1, objectType: 'library', role: 'mustTurn', turn: 'either' }],
        reqLen: 4, reqInt: 0,
    });
    const straight = keys([1, 1], [2, 1], [3, 1], [4, 1], [5, 1]);
    assert.match((validateCandidatePath(straightLevel, straight) as any).reason, /no turn at required cell/);
});

test('adjacent-turn: requires a matching turn next to the landmark', () => {
    const mk = (turn: string) => level({
        grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 3, y: 3 },
        landmarks: [{ x: 2, y: 2, objectType: 'fountain', role: 'adjacentTurn', turn }],
        reqLen: 4, reqInt: 0,
    });
    const cwAt31 = keys([1, 1], [2, 1], [3, 1], [3, 2], [3, 3]);
    assert.equal(validateCandidatePath(mk('either'), cwAt31).ok, true);
    assert.equal(validateCandidatePath(mk('cw'), cwAt31).ok, true);
    const needCcw = validateCandidatePath(mk('ccw'), cwAt31);
    assert.equal(needCcw.ok, false);
    assert.match((needCcw as any).reason, /Adjacent-turn constraint not satisfied/);
});


test('serialize-then-parse preserves must-turn validation semantics', () => {
    const original = level({
        grid: { w: 5, h: 3 }, gates: [{ x: 1, y: 2 }], goal: { x: 5, y: 3 }, reqLen: 5,
        landmarks: [{ x: 3, y: 2, objectType: 'library', role: 'mustTurn', turn: 'cw' }],
    });
    const reparsed = parseRawLevel(buildWireLevelData(original))!;
    assert.match((validateCandidatePath(reparsed, keys([1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [5, 3])) as any).reason, /Must-turn/);
    const turning = validateCandidatePath(reparsed, keys([1, 2], [2, 2], [3, 2], [3, 3], [4, 3], [5, 3]));
    assert.equal(turning.ok, true, (turning as any).reason);
});

test('serialize-then-parse preserves surround and adjacent-turn validation semantics', () => {
    const surround = parseRawLevel(buildWireLevelData(level({
        grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 3 }], goal: { x: 3, y: 3 }, reqLen: 6,
        landmarks: [{ x: 2, y: 2, objectType: 'park', role: 'surround' }],
    })))!;
    assert.deepEqual(surround.surroundKeys, [K(2, 2)]);
    const surroundMiss = validateCandidatePath(surround, keys([1, 3], [1, 2], [1, 1], [2, 1], [3, 1], [3, 2], [3, 3]));
    assert.equal(surroundMiss.ok, false);
    assert.match((surroundMiss as any).reason, /Invalid move|Surround landmark/);

    const adjacentTurn = parseRawLevel(buildWireLevelData(level({
        grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 3, y: 3 }, reqLen: 4,
        landmarks: [{ x: 2, y: 2, objectType: 'fountain', role: 'adjacentTurn', turn: 'cw' }],
    })))!;
    assert.match((validateCandidatePath(adjacentTurn, keys([1, 1], [1, 2], [1, 3], [2, 3], [3, 3])) as any).reason, /Adjacent-turn/);
    const turning = validateCandidatePath(adjacentTurn, keys([1, 1], [2, 1], [3, 1], [3, 2], [3, 3]));
    assert.equal(turning.ok, true, (turning as any).reason);
});
