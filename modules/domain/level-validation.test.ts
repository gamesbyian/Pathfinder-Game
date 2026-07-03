/**
 * Editor validation heuristics (hardening plan §1): each structural check flags its
 * specific defect and stays quiet on a clean level. (This function is a heuristic, not a
 * solver — the assertions here pin its documented editor-hint behavior.)
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { PACK } from './cell-key.js';
import { parseRawLevel } from './level-codec.js';
import { validateLevelDetailed } from './level-validation.js';

const K = (x: number, y: number) => PACK(x - 1, y - 1);

function level(overrides: any = {}) {
    const grid = overrides.grid || { w: 7, h: 7 };
    const l = parseRawLevel({
        grid, gates: [{ x: 1, y: 1 }], goal: { x: grid.w, y: grid.h },
        reqLen: 8, reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], portals: [], landmarks: [], hints: [],
        ...overrides,
    });
    assert.ok(l);
    return l!;
}

const reasonsOf = (l: any, opts?: any, pending: number | null = null) =>
    validateLevelDetailed(l, opts, pending).reasons.join(' | ');

test('a clean level validates ok; a missing level does not', () => {
    assert.deepEqual(validateLevelDetailed(level()), { ok: true, reasons: [] });
    assert.deepEqual(validateLevelDetailed(null), { ok: false, reasons: ['Level missing'] });
});

test('missing gates / goal / pending portal are flagged; allowGateLess suppresses the gate check', () => {
    const gateless = level();
    (gateless as any).gateKeys = [];
    assert.match(reasonsOf(gateless), /No gates/);
    assert.doesNotMatch(reasonsOf(gateless, { allowGateLess: true }), /No gates/);

    const goalless = level();
    (goalless as any).goalKey = -1;
    assert.match(reasonsOf(goalless), /Goal missing/);

    assert.match(reasonsOf(level(), {}, K(3, 3)), /Portal terminals incomplete/);
});

test('out-of-bounds objects are reported with their 1-based coordinates', () => {
    const l = level({ grid: { w: 3, h: 3 }, goal: { x: 3, y: 3 } });
    (l as any).mustPassKeys = [PACK(5, 5)];
    assert.match(reasonsOf(l), /Out of bounds: mustPass \(6,6\)/);
});

test('unpaired portal terminals are flagged', () => {
    const l = level();
    (l as any).portalMap = new Map([[K(2, 2), { dest: K(4, 4) }]]); // one-way: dest not registered
    assert.match(reasonsOf(l), /Portal terminals incomplete/);
});

test('must-cross structural traps: edge, overlapping/adjacent blocks, filters, flanking gate+goal', () => {
    const edge = level({ mustCross: [{ x: 1, y: 4 }] });
    assert.match(reasonsOf(edge), /MustCross on grid edge/);

    const onBlock = level({ mustCross: [{ x: 4, y: 4 }], blocks: [{ x: 4, y: 4 }] });
    assert.match(reasonsOf(onBlock), /MustCross overlaps block/);

    const blockAdj = level({ mustCross: [{ x: 4, y: 4 }], blocks: [{ x: 3, y: 4 }] });
    assert.match(reasonsOf(blockAdj), /Block adjacent to MustCross/);

    const gooseAdj = level({ mustCross: [{ x: 4, y: 4 }], geese: [{ x: 4, y: 3 }] });
    assert.match(reasonsOf(gooseAdj), /Goose adjacent to MustCross/);

    const vFilter = level({ mustCross: [{ x: 4, y: 4 }], filters: [{ x: 3, y: 4, axis: 2 }] });
    assert.match(reasonsOf(vFilter), /Vertical filter blocks MustCross/);

    const hFilter = level({ mustCross: [{ x: 4, y: 4 }], filters: [{ x: 4, y: 3, axis: 1 }] });
    assert.match(reasonsOf(hFilter), /Horizontal filter blocks MustCross/);

    const flanked = level({
        gates: [{ x: 3, y: 4 }], goal: { x: 5, y: 4 },
        mustCross: [{ x: 4, y: 4 }],
    });
    assert.match(reasonsOf(flanked), /Gate and goal flank MustCross/);
});

test('flipping filters near a must-cross: blocked without a free flipper, exempt with one', () => {
    const trapped = level({
        mustCross: [{ x: 4, y: 4 }],
        flippingFilters: [{ x: 3, y: 4, axis: 2 }],
    });
    assert.match(reasonsOf(trapped), /Flipping V-filter blocks MustCross/);

    // A second flipping filter far away can be crossed first, flipping the blocker.
    const freed = level({
        mustCross: [{ x: 4, y: 4 }],
        flippingFilters: [{ x: 3, y: 4, axis: 2 }, { x: 7, y: 1, axis: 1 }],
    });
    assert.doesNotMatch(reasonsOf(freed), /Flipping V-filter/);
});

test('diagonal obstacle trap fires only when no alternate turn space exists', () => {
    // Corner-pocket must-cross at (2,2) of a tight grid with an obstacle on its diagonal
    // and no room to route around.
    const cramped = level({
        grid: { w: 3, h: 3 },
        gates: [{ x: 1, y: 2 }], goal: { x: 3, y: 2 },
        mustCross: [{ x: 2, y: 2 }],
        blocks: [{ x: 3, y: 3 }, { x: 1, y: 1 }, { x: 1, y: 3 }, { x: 3, y: 1 }],
    });
    const crampedReasons = reasonsOf(cramped);
    assert.match(crampedReasons, /Diagonal obstacle traps MustCross|Block adjacent to MustCross/);

    // Same diagonal obstacle on a roomy grid: alternate turn space exists → no diagonal flag.
    const roomy = level({ mustCross: [{ x: 4, y: 4 }], blocks: [{ x: 5, y: 5 }] });
    assert.doesNotMatch(reasonsOf(roomy), /Diagonal obstacle traps/);
});

test('surrounded gate / goal / must-pass accessibility checks', () => {
    const gateBoxed = level({
        gates: [{ x: 1, y: 1 }],
        blocks: [{ x: 2, y: 1 }, { x: 1, y: 2 }],
    });
    assert.match(reasonsOf(gateBoxed), /Gate completely surrounded/);

    const goalBoxed = level({
        grid: { w: 7, h: 7 }, goal: { x: 7, y: 7 },
        blocks: [{ x: 6, y: 7 }, { x: 7, y: 6 }],
    });
    assert.match(reasonsOf(goalBoxed), /Goal completely surrounded/);

    const mpPinched = level({
        mustPass: [{ x: 4, y: 1 }],
        blocks: [{ x: 3, y: 1 }, { x: 5, y: 1 }],
    });
    assert.match(reasonsOf(mpPinched), /MustPass blocked on 3\+ sides/);
});

test('impassable landmarks may not overlap gate or goal; enclosed surround landmarks are flagged', () => {
    const onGate = level({ landmarks: [{ x: 1, y: 1, objectType: 'statue', role: 'decorative' }] });
    assert.match(reasonsOf(onGate), /Impassable landmark overlaps gate/);

    const onGoal = level({ grid: { w: 7, h: 7 }, landmarks: [{ x: 7, y: 7, objectType: 'park', role: 'surround' }] });
    assert.match(reasonsOf(onGoal), /Impassable landmark overlaps goal/);

    const enclosed = level({
        landmarks: [{ x: 4, y: 4, objectType: 'park', role: 'surround' }],
        blocks: [
            { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 },
            { x: 3, y: 4 }, { x: 5, y: 4 },
            { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 },
        ],
    });
    assert.match(reasonsOf(enclosed), /Surround landmark completely enclosed/);
});

test('grid partition: goal cut off from every gate is flagged; a portal bridge heals it', () => {
    const split = level({
        grid: { w: 5, h: 3 },
        gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 3 },
        blocks: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }],
    });
    assert.match(reasonsOf(split), /Grid partitioned by barriers/);

    const bridged = level({
        grid: { w: 5, h: 3 },
        gates: [{ x: 1, y: 1 }], goal: { x: 5, y: 3 },
        blocks: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }],
        portals: [{ x1: 2, y1: 2, x2: 5, y2: 1 }],
    });
    assert.doesNotMatch(reasonsOf(bridged), /Grid partitioned/);
});
