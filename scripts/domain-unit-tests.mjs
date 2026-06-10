/**
 * Phase 0 — Domain behaviour-locking tests.
 *
 * Tests the pure domain functions that Phase 1+ refactoring will extract.
 * Must pass before AND after every refactoring step.
 *
 * Run: node scripts/domain-unit-tests.mjs
 */
import assert from 'node:assert/strict';
import { installCore } from '../modules/core.js';
import { installLevelUtils } from '../modules/levelutils.js';
import { installEngine } from '../modules/engine.js';

// ---------------------------------------------------------------------------
// Minimal APP bootstrap
// ---------------------------------------------------------------------------
// Provides only what installCore/installLevelUtils/installEngine need at
// install time. DOM, Firebase, Canvas, and audio-unlock paths are all
// guarded internally and never called during the pure function tests below.

function buildTestApp() {
    const APP = {};

    installCore(APP);   // PACK/UNPACK, H/V/NONE, PLAY/EDITOR/REVIEW, IDLE, etc.

    APP.State = {
        ENGINE: {
            mode: APP.Core.PLAY,
            logicState: APP.Core.IDLE,
            overlayState: APP.Core.OVERLAY_NONE,
            isDevMode: false,
            level: null,
            path: [],
            isPortalJump: new Set(),
            visitedCounts: new Map(),
            cellUsage: new Map(),
            intersections: 0,
            flipCount: 0,
            crossedFlippingFilters: new Map(),
            detonatedFalseGoals: new Set(),
            armedFalseGoals: new Set(),
            activeGateKey: null,
            hinter: { pathList: [] },
            undoStack: [],
            revealedGeese: new Set(),
            ripples: [],
            isDirty: false,
            solverAbortRequested: false,
            editor: {
                workingLevel: null,
                isModified: false,
                pendingPortal: null,
                validTrapSpots: new Set(),
                draggedObject: null,
                draggedFromGrid: false,
                selectedTool: null,
                isPencilMode: false,
                undoStack: []
            }
        }
    };

    // Data stub — normalizeLevel(idx) reads from here; processRawLevel does not.
    APP.Data = { getLevels: () => _rawLevels };

    // Renderer/Editor/UI stubs — used only by impure functions we don't test here.
    APP.Renderer = { getCanvas: () => null, render: () => {} };
    APP.Editor   = { saveEditorState: () => {} };
    APP.UI = {
        EditorDragGhost: { update() {} },
        setSolverAbortRequested() {},
        applyOverlayState() {}
    };
    APP.Persistence = {};

    installLevelUtils(APP);
    installEngine(APP);

    return APP;
}

// Data store for normalizeLevel tests — populated per-test.
let _rawLevels = [];

const APP = buildTestApp();
const { PACK, UNPACK, inBounds, processRawLevel, denormalizeLevel, normalizeLevel,
        isValidMove, getLevelFingerprintSource, isSameLevelStructure } = APP.LevelUtils;
const { areWinMetricsSatisfied, getRealLength } = APP.Engine;

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✓ ${name}`);
        passed++;
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
        failed++;
    }
}

// Minimal level with sane defaults. All keys are packed (x,y) 0-based.
function makeLevel(opts = {}) {
    const w = opts.w ?? 8;
    const h = opts.h ?? 8;
    return {
        grid: { w, h },
        goalKey:         opts.goalKey  ?? PACK(w - 1, h - 1),
        gateKeys:        opts.gateKeys ?? [PACK(0, 0)],
        blockSet:        new Set(opts.blocks        || []),
        gooseSet:        new Set(opts.geese         || []),
        falseGoalKeys:   new Set(opts.falseGoals    || []),
        portalMap:       new Map(opts.portals       || []),
        portalVisuals:   opts.portalVisuals         || [],
        filterMap:       new Map(opts.filters       || []),
        flippingFilterMap: new Map(opts.flippingFilters || []),
        mustPassKeys:    opts.mustPass  || [],
        mustCrossKeys:   opts.mustCross || [],
        reqLen:          opts.reqLen    ?? 0,
        reqInt:          opts.reqInt    ?? 0,
        hints:           []
    };
}

// Build state with a path; derives visitedCounts and cellUsage incrementally.
function makeState(opts = {}) {
    const path = opts.path ?? [];
    const visitedCounts = new Map(opts.visitedCounts ?? []);
    const cellUsage = new Map(opts.cellUsage ?? []);
    const isPortalJump = new Set(opts.isPortalJump ?? []);
    let intersections = opts.intersections ?? 0;

    if (path.length > 0 && !opts.visitedCounts) {
        for (let i = 0; i < path.length; i++) {
            const k = path[i];
            const c = visitedCounts.get(k) ?? 0;
            if (c > 0) intersections++;
            visitedCounts.set(k, c + 1);
            if (i > 0 && !isPortalJump.has(i)) {
                const prev = path[i - 1];
                const p1 = UNPACK(prev), p2 = UNPACK(k);
                const axis = p2.y === p1.y ? APP.Core.H : APP.Core.V;
                const upd = (key) => {
                    const u = cellUsage.get(key) ?? { h: false, v: false };
                    if (axis === APP.Core.H) u.h = true; else u.v = true;
                    cellUsage.set(key, u);
                };
                upd(prev); upd(k);
            }
        }
    }

    return {
        mode:                  opts.mode        ?? APP.Core.PLAY,
        path,
        visitedCounts,
        cellUsage,
        isPortalJump,
        intersections,
        flipCount:             0,
        crossedFlippingFilters: new Map(),
        armedFalseGoals:       new Set(opts.armedFalseGoals ?? [])
    };
}

// Minimal raw level fixture (1-indexed, matching levels.js format).
function makeRaw(opts = {}) {
    return {
        grid:           opts.grid   ?? { w: 8, h: 8 },
        gates:          opts.gates  ?? [{ x: 1, y: 1 }],
        goal:           opts.goal   ?? { x: 8, y: 8 },
        reqLen:         opts.reqLen ?? 6,
        reqInt:         opts.reqInt ?? 0,
        blocks:         opts.blocks         || [],
        geese:          opts.geese          || [],
        falseGoals:     opts.falseGoals     || [],
        mustPass:       opts.mustPass       || [],
        mustCross:      opts.mustCross      || [],
        filters:        opts.filters        || [],
        flippingFilters: opts.flippingFilters || [],
        portals:        opts.portals        || [],
        hints:          opts.hints          || []
    };
}

// ---------------------------------------------------------------------------
// GROUP 1 — Cell key encoding (PACK / UNPACK / inBounds)
// ---------------------------------------------------------------------------
console.log('\nGROUP 1: Cell key encoding');

test('PACK(0,0) decodes back to {x:0, y:0}', () => {
    assert.deepEqual(UNPACK(PACK(0, 0)), { x: 0, y: 0 });
});

test('PACK(3,5) decodes back to {x:3, y:5}', () => {
    assert.deepEqual(UNPACK(PACK(3, 5)), { x: 3, y: 5 });
});

test('PACK(14,14) decodes back to {x:14, y:14}', () => {
    assert.deepEqual(UNPACK(PACK(14, 14)), { x: 14, y: 14 });
});

test('PACK uses (y<<16)|x encoding', () => {
    assert.equal(PACK(3, 5), (5 << 16) | 3);
});

test('PACK(1,2) !== PACK(2,1) — no coordinate aliasing', () => {
    assert.notEqual(PACK(1, 2), PACK(2, 1));
});

test('inBounds: inside 8x8 grid', () => {
    assert.ok(inBounds(0, 0, 8, 8));
    assert.ok(inBounds(7, 7, 8, 8));
    assert.ok(inBounds(4, 4, 8, 8));
});

test('inBounds: outside 8x8 grid', () => {
    assert.equal(inBounds(8, 0, 8, 8), false);   // x==w
    assert.equal(inBounds(0, 8, 8, 8), false);   // y==h
    assert.equal(inBounds(-1, 0, 8, 8), false);  // x<0
    assert.equal(inBounds(0, -1, 8, 8), false);  // y<0
});

// ---------------------------------------------------------------------------
// GROUP 2 — Move validation (isValidMove)
// ---------------------------------------------------------------------------
console.log('\nGROUP 2: Move validation (isValidMove)');

test('empty path: first step in bounds is always valid', () => {
    const level = makeLevel();
    const state = makeState();
    assert.ok(isValidMove(PACK(3, 3), state, level));
});

test('empty path: out-of-bounds target rejected (x=w)', () => {
    const level = makeLevel({ w: 8, h: 8 });
    const state = makeState();
    assert.equal(isValidMove(PACK(8, 0), state, level), false);
});

test('empty path: out-of-bounds target rejected (y=h)', () => {
    const level = makeLevel({ w: 8, h: 8 });
    const state = makeState();
    assert.equal(isValidMove(PACK(0, 8), state, level), false);
});

test('block at target cell is rejected', () => {
    const level = makeLevel({ blocks: [PACK(3, 3)] });
    const state = makeState();
    assert.equal(isValidMove(PACK(3, 3), state, level), false);
});

test('adjacent horizontal step is valid', () => {
    const level = makeLevel();
    const state = makeState({ path: [PACK(0, 0)] });
    assert.ok(isValidMove(PACK(1, 0), state, level));
});

test('non-adjacent step (distance 2) is rejected', () => {
    const level = makeLevel();
    const state = makeState({ path: [PACK(0, 0)] });
    assert.equal(isValidMove(PACK(2, 0), state, level), false);
});

test('diagonal step is rejected (distance 2 by Manhattan)', () => {
    const level = makeLevel();
    const state = makeState({ path: [PACK(0, 0)] });
    assert.equal(isValidMove(PACK(1, 1), state, level), false);
});

test('edge reuse: horizontal edge already traversed → rejected', () => {
    // Path forms a small loop and returns to a cell whose H edge is used.
    // (0,0)→(1,0)→(1,1)→(0,1)→(0,0): now at (0,0), try to move right to (1,0).
    // The H edge on (1,0) was used on the way out, so target cell reuse is blocked.
    const level = makeLevel();
    const path = [PACK(0,0), PACK(1,0), PACK(1,1), PACK(0,1), PACK(0,0)];
    const state = makeState({ path });
    assert.equal(isValidMove(PACK(1, 0), state, level), false);
});

test('gate re-entry blocked in PLAY mode', () => {
    // In PLAY mode, once the path has passed through a gate cell, it cannot re-enter.
    const gateKey = PACK(2, 0);
    const level = makeLevel({ gateKeys: [gateKey] });
    // Path started at gate and moved on.
    const state = makeState({ path: [gateKey, PACK(3, 0), PACK(4, 0)] });
    assert.equal(isValidMove(gateKey, state, level, { mode: APP.Core.PLAY }), false);
});

test('gate re-entry permitted in EDITOR mode (only last gate blocked)', () => {
    // In EDITOR mode, the gate re-entry rule is different: only blocked if gateKeys
    // contains lastK (the previous step was a gate, not the target).
    const gateKey = PACK(2, 0);
    const level = makeLevel({ gateKeys: [gateKey] });
    const state = makeState({ path: [PACK(0, 0), PACK(1, 0)] });
    // Entering the gate for the first time is fine in editor mode.
    assert.ok(isValidMove(gateKey, state, level, { mode: APP.Core.EDITOR }));
});

test('filter axis: entering a horizontal-filter cell vertically is blocked', () => {
    // filterMap: PACK(3,3) → APP.Core.H means only H-axis moves permitted through here.
    // Approaching from (3,2)→(3,3) is V-axis → blocked.
    const level = makeLevel({ filters: [[PACK(3, 3), APP.Core.H]] });
    const state = makeState({ path: [PACK(3, 2)] });   // approaching from above (V axis)
    assert.equal(isValidMove(PACK(3, 3), state, level), false);
});

test('filter axis: entering a horizontal-filter cell horizontally is valid', () => {
    const level = makeLevel({ filters: [[PACK(3, 3), APP.Core.H]] });
    const state = makeState({ path: [PACK(2, 3)] });   // approaching from left (H axis)
    assert.ok(isValidMove(PACK(3, 3), state, level));
});

test('portal legality: last cell is a portal entrance, next must be portal dest', () => {
    // Portal: PACK(2,2) ↔ PACK(6,6). Path is at the portal entrance PACK(2,2).
    // The only legal next step (with allowJump=true) is the portal dest PACK(6,6).
    const portalK1 = PACK(2, 2), portalK2 = PACK(6, 6);
    const portals = [[portalK1, { dest: portalK2 }], [portalK2, { dest: portalK1 }]];
    const level = makeLevel({ portals });
    const state = makeState({ path: [PACK(1, 2), portalK1] });
    // Adjacent non-portal step is blocked because we're at a portal entrance.
    assert.equal(isValidMove(PACK(3, 2), state, level, { allowJump: true }), false);
    // Portal jump to dest is valid.
    assert.ok(isValidMove(portalK2, state, level, { allowJump: true }));
});

test('isValidMove with checkWinMetrics: mustPass key absent blocks reaching goal', () => {
    const mustPassKey = PACK(4, 4);
    const goalKey = PACK(7, 7);
    const level = makeLevel({ goalKey, mustPass: [mustPassKey], reqLen: 3, reqInt: 0 });
    // Path has length 3 steps (4 nodes) but mustPass key not visited.
    const path = [PACK(4,7), PACK(5,7), PACK(6,7), goalKey];
    const state = makeState({ path });
    assert.equal(
        isValidMove(goalKey, state, level, { checkWinMetrics: true }),
        false
    );
});

// ---------------------------------------------------------------------------
// GROUP 3 — Win metrics (areWinMetricsSatisfied)
// ---------------------------------------------------------------------------
console.log('\nGROUP 3: Win metrics (areWinMetricsSatisfied)');

test('getRealLength: empty path returns 0', () => {
    const state = { path: [], isPortalJump: new Set() };
    assert.equal(getRealLength(state), 0);
});

test('getRealLength: 4-node path with no jumps returns 3', () => {
    const state = { path: [1, 2, 3, 4], isPortalJump: new Set() };
    assert.equal(getRealLength(state), 3);
});

test('getRealLength: 4-node path with 1 portal jump returns 2', () => {
    const state = { path: [1, 2, 3, 4], isPortalJump: new Set([2]) };
    assert.equal(getRealLength(state), 2);
});

test('areWinMetricsSatisfied: false when path is empty', () => {
    const level = makeLevel({ reqLen: 3, reqInt: 0 });
    assert.equal(areWinMetricsSatisfied({ path: [], isPortalJump: new Set(), intersections: 0, visitedCounts: new Map(), mustPassKeys: [], mustCrossKeys: [] }, level), false);
});

test('areWinMetricsSatisfied: correct reqLen and reqInt with no mustPass/mustCross', () => {
    const level = makeLevel({ reqLen: 3, reqInt: 0 });
    const path = [PACK(0,0), PACK(1,0), PACK(2,0), PACK(3,0)];   // 4 nodes = 3 steps
    const state = makeState({ path });
    assert.ok(areWinMetricsSatisfied(state, level));
});

test('areWinMetricsSatisfied: wrong reqLen fails', () => {
    const level = makeLevel({ reqLen: 5, reqInt: 0 });
    const path = [PACK(0,0), PACK(1,0), PACK(2,0), PACK(3,0)];   // 3 steps, not 5
    const state = makeState({ path });
    assert.equal(areWinMetricsSatisfied(state, level), false);
});

test('areWinMetricsSatisfied: wrong reqInt fails', () => {
    const level = makeLevel({ reqLen: 3, reqInt: 1 });
    const path = [PACK(0,0), PACK(1,0), PACK(2,0), PACK(3,0)];   // 0 intersections
    const state = makeState({ path });
    assert.equal(areWinMetricsSatisfied(state, level), false);
});

test('areWinMetricsSatisfied: mustPass key not visited fails', () => {
    const mustKey = PACK(5, 5);
    const level = makeLevel({ reqLen: 3, reqInt: 0, mustPass: [mustKey] });
    const path = [PACK(0,0), PACK(1,0), PACK(2,0), PACK(3,0)];
    const state = makeState({ path });
    assert.equal(areWinMetricsSatisfied(state, level), false);
});

test('areWinMetricsSatisfied: mustCross key visited only once fails', () => {
    const crossKey = PACK(1, 0);
    const level = makeLevel({ reqLen: 3, reqInt: 0, mustCross: [crossKey] });
    // crossKey is visited once in this path
    const path = [PACK(0,0), PACK(1,0), PACK(2,0), PACK(3,0)];
    const state = makeState({ path });
    assert.equal(areWinMetricsSatisfied(state, level), false);
});

test('areWinMetricsSatisfied: mustPass satisfied', () => {
    const mustKey = PACK(1, 0);
    const level = makeLevel({ reqLen: 3, reqInt: 0, mustPass: [mustKey] });
    const path = [PACK(0,0), mustKey, PACK(2,0), PACK(3,0)];
    const state = makeState({ path });
    assert.ok(areWinMetricsSatisfied(state, level));
});

// ---------------------------------------------------------------------------
// GROUP 4 — Level normalization roundtrip (processRawLevel → denormalizeLevel)
// ---------------------------------------------------------------------------
console.log('\nGROUP 4: Level normalization roundtrip');

test('goal coordinates round-trip (1-indexed)', () => {
    const raw = makeRaw({ goal: { x: 5, y: 7 } });
    const norm = processRawLevel(raw);
    const denorm = denormalizeLevel(norm);
    assert.deepEqual(denorm.goal, { x: 5, y: 7 });
});

test('gates array round-trips (1-indexed, sorted)', () => {
    const raw = makeRaw({ gates: [{ x: 3, y: 2 }, { x: 1, y: 1 }] });
    const norm = processRawLevel(raw);
    const denorm = denormalizeLevel(norm);
    // denormalizeLevel sorts gates by y then x
    assert.deepEqual(denorm.gates, [{ x: 1, y: 1 }, { x: 3, y: 2 }]);
});

test('blocks set round-trips', () => {
    const raw = makeRaw({ blocks: [{ x: 3, y: 4 }, { x: 5, y: 2 }] });
    const norm = processRawLevel(raw);
    const denorm = denormalizeLevel(norm);
    const sorted = denorm.blocks.map(b => `${b.x},${b.y}`).sort().join('|');
    assert.equal(sorted, '3,4|5,2');
});

test('portal pair round-trips (endpoints become x1/y1/x2/y2 ≥1)', () => {
    const raw = makeRaw({ portals: [{ x1: 2, y1: 1, x2: 7, y2: 6 }] });
    const norm = processRawLevel(raw);
    const denorm = denormalizeLevel(norm);
    assert.equal(denorm.portals.length, 1);
    const p = denorm.portals[0];
    // Both endpoint pairs must be present (order may differ; denorm picks canonical order)
    const has = (ax, ay, bx, by) =>
        (p.x1 === ax && p.y1 === ay && p.x2 === bx && p.y2 === by) ||
        (p.x1 === bx && p.y1 === by && p.x2 === ax && p.y2 === ay);
    assert.ok(has(2, 1, 7, 6), `portal endpoints not preserved: ${JSON.stringify(p)}`);
});

test('reqLen and reqInt round-trip through normalization', () => {
    const raw = makeRaw({ reqLen: 12, reqInt: 3 });
    const norm = processRawLevel(raw);
    const denorm = denormalizeLevel(norm);
    assert.equal(denorm.reqLen, 12);
    assert.equal(denorm.reqInt, 3);
});

test('grid dimensions round-trip', () => {
    const raw = makeRaw({ grid: { w: 10, h: 10 } });
    const norm = processRawLevel(raw, 0);
    const denorm = denormalizeLevel(norm);
    assert.deepEqual(denorm.grid, { w: 10, h: 10 });
});

test('normalizeLevel(idx) produces same structure as processRawLevel for same data', () => {
    const raw = makeRaw({ goal: { x: 6, y: 6 }, reqLen: 8 });
    _rawLevels = [raw];
    const viaIdx  = normalizeLevel(0);
    const viaDirect = processRawLevel(raw, 0);
    // Compare a few key fields
    assert.equal(viaIdx.goalKey, viaDirect.goalKey);
    assert.equal(viaIdx.reqLen,  viaDirect.reqLen);
    assert.deepEqual([...viaIdx.blockSet], [...viaDirect.blockSet]);
    _rawLevels = [];
});

// ---------------------------------------------------------------------------
// GROUP 5 — Fingerprint determinism
// ---------------------------------------------------------------------------
console.log('\nGROUP 5: Fingerprint determinism');

test('same level data produces identical fingerprint source', () => {
    const raw = makeRaw({ goal: { x: 5, y: 5 } });
    const a = processRawLevel(raw);
    const b = processRawLevel(raw);
    assert.equal(getLevelFingerprintSource(denormalizeLevel(a)), getLevelFingerprintSource(denormalizeLevel(b)));
});

test('different grid size produces different fingerprint source', () => {
    const a = processRawLevel(makeRaw({ grid: { w: 8, h: 8 } }));
    const b = processRawLevel(makeRaw({ grid: { w: 9, h: 9 } }));
    assert.notEqual(getLevelFingerprintSource(denormalizeLevel(a)), getLevelFingerprintSource(denormalizeLevel(b)));
});

test('different goal position produces different fingerprint source', () => {
    const a = processRawLevel(makeRaw({ goal: { x: 5, y: 5 } }));
    const b = processRawLevel(makeRaw({ goal: { x: 6, y: 6 } }));
    assert.notEqual(getLevelFingerprintSource(denormalizeLevel(a)), getLevelFingerprintSource(denormalizeLevel(b)));
});

test('hints are excluded from fingerprint source (structurally identical levels differ only in hints)', () => {
    const rawA = makeRaw({ hints: [] });
    const rawB = makeRaw({ hints: [[1, 2, 3]] });
    const a = processRawLevel(rawA);
    const b = processRawLevel(rawB);
    assert.equal(getLevelFingerprintSource(denormalizeLevel(a)), getLevelFingerprintSource(denormalizeLevel(b)));
});

test('isSameLevelStructure: same structure → true', () => {
    const raw = makeRaw();
    const a = denormalizeLevel(processRawLevel(raw));
    const b = denormalizeLevel(processRawLevel(raw));
    assert.ok(isSameLevelStructure(a, b));
});

test('isSameLevelStructure: different blocks → false', () => {
    const a = denormalizeLevel(processRawLevel(makeRaw({ blocks: [] })));
    const b = denormalizeLevel(processRawLevel(makeRaw({ blocks: [{ x: 3, y: 3 }] })));
    assert.equal(isSameLevelStructure(a, b), false);
});

// ---------------------------------------------------------------------------
// GROUP 6 — Persistence hint encode/decode
// ---------------------------------------------------------------------------
// encodeHints/decodeHints live as private functions inside installPersistence
// and are not exported. The logic is replicated here from persistence.js
// (lines ~203-211) to lock down the Firestore round-trip contract.
// If persistence.js changes the encoding, this test must be updated too.
console.log('\nGROUP 6: Persistence hint encode/decode (mirrors persistence.js)');

// Mirrors persistence.js encodeHints / decodeHints.
const encodeHints = (d) =>
    (!Array.isArray(d?.hints) || !d.hints.length) ? d
    : { ...d, hints: d.hints.map(h => JSON.stringify(h)) };

const decodeHints = (d) =>
    (!Array.isArray(d?.hints) || !d.hints.length) ? d
    : { ...d, hints: d.hints.map(h => typeof h === 'string' ? JSON.parse(h) : h) };

test('encode: converts nested arrays to JSON strings', () => {
    const input  = { id: 1, hints: [[1, 2, 3], [4, 5]] };
    const result = encodeHints(input);
    assert.deepEqual(result.hints, ['[1,2,3]', '[4,5]']);
});

test('decode: converts JSON strings back to nested arrays', () => {
    const input  = { id: 1, hints: ['[1,2,3]', '[4,5]'] };
    const result = decodeHints(input);
    assert.deepEqual(result.hints, [[1, 2, 3], [4, 5]]);
});

test('encode → decode roundtrip preserves hint paths', () => {
    const original = { id: 1, hints: [[10, 20, 30], [40, 50]] };
    const roundtripped = decodeHints(encodeHints(original));
    assert.deepEqual(roundtripped.hints, original.hints);
});

test('decode: already-decoded arrays pass through unchanged', () => {
    const input = { id: 1, hints: [[1, 2], [3, 4]] };
    const result = decodeHints(input);
    assert.deepEqual(result.hints, [[1, 2], [3, 4]]);
});

test('encode/decode: no-hints case returns input unchanged', () => {
    const noHints   = { id: 1 };
    const emptyHints = { id: 1, hints: [] };
    assert.equal(encodeHints(noHints), noHints);
    assert.equal(decodeHints(noHints), noHints);
    assert.equal(encodeHints(emptyHints), emptyHints);
    assert.equal(decodeHints(emptyHints), emptyHints);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\nDomain unit tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
}
