/**
 * Phase 0/2 — Domain and runtime behaviour-locking tests.
 *
 * Tests the pure domain and runtime functions extracted during Phase 1/2.
 * Must pass before AND after every refactoring step.
 *
 * Run: node scripts/domain-unit-tests.mjs
 */
import assert from 'node:assert/strict';
import { installCore } from '../modules/core.js';
import { installLevelUtils } from '../modules/levelutils.js';
import { installEngine } from '../modules/engine.js';
import { VALID_LOGIC_TRANSITIONS, isValidLogicTransition } from '../modules/runtime/state-machine.js';
import { cloneTapRouteState, rebuildDerivedState, simulateTapRouteStep, wouldCreateBlockedTIntersection } from '../modules/runtime/path-state.js';
import { checkWinConditionImpl as checkWinConditionImplDirect } from '../modules/runtime/game-rules.js';
import { validateLevelDetailed as validateLevelDetailedImpl } from '../modules/domain/level-validation.js';
import { getOccupant, removeOccupant, placeOccupant }        from '../modules/editor/editor-occupancy.js';
import { MoveContext }                                        from '../modules/domain/move-context.js';
import { createEditorState, DEFAULT_TOOL, TOOL_TYPES }       from '../modules/editor/editor-model.js';

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
// GROUP 7 — Logic-state machine (state-machine.js)
// ---------------------------------------------------------------------------
console.log('\nGROUP 7: Logic-state machine (isValidLogicTransition)');

test('IDLE → DRAGGING is a valid transition', () => {
    assert.ok(isValidLogicTransition('IDLE', 'DRAGGING'));
});

test('IDLE → HAZARD_TRIGGERED is blocked', () => {
    assert.equal(isValidLogicTransition('IDLE', 'HAZARD_TRIGGERED'), false);
});

test('any state → IDLE is always allowed (reset rule)', () => {
    assert.ok(isValidLogicTransition('DRAGGING',         'IDLE'));
    assert.ok(isValidLogicTransition('PORTAL_PAUSE',     'IDLE'));
    assert.ok(isValidLogicTransition('RESOLVED',         'IDLE'));
    assert.ok(isValidLogicTransition('HAZARD_TRIGGERED', 'IDLE'));
    assert.ok(isValidLogicTransition('EDIT_DRAG',        'IDLE'));
});

test('DRAGGING → PORTAL_PAUSE is valid', () => {
    assert.ok(isValidLogicTransition('DRAGGING', 'PORTAL_PAUSE'));
});

test('RESOLVED → DRAGGING is blocked', () => {
    assert.equal(isValidLogicTransition('RESOLVED', 'DRAGGING'), false);
});

test('unknown from-state → non-IDLE is false', () => {
    assert.equal(isValidLogicTransition('UNKNOWN', 'DRAGGING'), false);
});

test('VALID_LOGIC_TRANSITIONS has entries for every non-IDLE logic state', () => {
    ['IDLE', 'DRAGGING', 'PORTAL_PAUSE', 'RESOLVED', 'HAZARD_TRIGGERED', 'EDIT_DRAG'].forEach(state => {
        assert.ok(state in VALID_LOGIC_TRANSITIONS, `missing entry for ${state}`);
    });
});

// ---------------------------------------------------------------------------
// GROUP 8 — Path-state pure functions (path-state.js)
// ---------------------------------------------------------------------------
console.log('\nGROUP 8: Path-state pure functions (cloneTapRouteState / rebuildDerivedState / simulateTapRouteStep)');

function makeTapState(opts = {}) {
    // Minimal tap-route state compatible with path-state.js functions.
    return {
        mode:                   opts.mode ?? 0,  // PLAY=0
        path:                   [...(opts.path ?? [])],
        isPortalJump:           new Set(opts.isPortalJump ?? []),
        visitedCounts:          new Map(opts.visitedCounts ?? []),
        cellUsage:              new Map(opts.cellUsage ?? []),
        intersections:          opts.intersections ?? 0,
        flipCount:              opts.flipCount ?? 0,
        crossedFlippingFilters: new Map(opts.crossedFlippingFilters ?? []),
        activeGateKey:          opts.activeGateKey ?? null,
        armedFalseGoals:        new Set(opts.armedFalseGoals ?? []),
        revealedGeese:          new Set(opts.revealedGeese ?? [])
    };
}

test('cloneTapRouteState: produces a deep copy with independent collections', () => {
    const original = makeTapState({ path: [PACK(0,0), PACK(1,0)] });
    const clone = cloneTapRouteState(original);
    assert.deepEqual(clone.path, original.path);
    clone.path.push(PACK(2,0));
    assert.equal(original.path.length, 2, 'original path unchanged after clone mutation');
    clone.visitedCounts.set(PACK(0,0), 99);
    assert.equal(original.visitedCounts.get(PACK(0,0)), undefined, 'original visitedCounts independent');
});

test('rebuildDerivedState: empty path zeroes all counters', () => {
    const state = makeTapState({ path: [], intersections: 5, flipCount: 3 });
    state.visitedCounts.set(PACK(0,0), 2);
    rebuildDerivedState(state, makeLevel());
    assert.equal(state.visitedCounts.size, 0);
    assert.equal(state.cellUsage.size, 0);
    assert.equal(state.intersections, 0);
    assert.equal(state.flipCount, 0);
});

test('rebuildDerivedState: 3-step path produces correct visitedCounts', () => {
    const path = [PACK(0,0), PACK(1,0), PACK(2,0), PACK(3,0)];
    const state = makeTapState({ path });
    rebuildDerivedState(state, makeLevel());
    // Each cell visited once
    assert.equal(state.visitedCounts.get(PACK(0,0)), 1);
    assert.equal(state.visitedCounts.get(PACK(3,0)), 1);
    assert.equal(state.intersections, 0);
});

test('rebuildDerivedState: detects intersection when cell visited twice', () => {
    // (0,0)→(1,0)→(1,1)→(0,1)→(0,0): revisit (0,0)
    const path = [PACK(0,0), PACK(1,0), PACK(1,1), PACK(0,1), PACK(0,0)];
    const level = makeLevel();
    const state = makeTapState({ path });
    rebuildDerivedState(state, level);
    assert.equal(state.visitedCounts.get(PACK(0,0)), 2);
    assert.equal(state.intersections, 1);
});

test('simulateTapRouteStep: valid adjacent step advances path', () => {
    const level = makeLevel();
    const base  = makeTapState({ path: [PACK(0,0)] });
    const result = simulateTapRouteStep(base, PACK(1,0), level);
    assert.ok(result, 'should return a result');
    assert.equal(result.result, 'valid');
    assert.equal(result.state.path[result.state.path.length - 1], PACK(1,0));
});

test('simulateTapRouteStep: out-of-bounds target returns null', () => {
    const level = makeLevel({ w: 8, h: 8 });
    const base  = makeTapState({ path: [PACK(0,0)] });
    assert.equal(simulateTapRouteStep(base, PACK(8,0), level), null);
});

test('simulateTapRouteStep: blocked cell returns null', () => {
    const level = makeLevel({ blocks: [PACK(1,0)] });
    const base  = makeTapState({ path: [PACK(0,0)] });
    assert.equal(simulateTapRouteStep(base, PACK(1,0), level), null);
});

test('simulateTapRouteStep: backtrack (step to second-to-last) shortens path', () => {
    const level = makeLevel();
    const base  = makeTapState({ path: [PACK(0,0), PACK(1,0), PACK(2,0)] });
    // manually set visitedCounts to match path
    base.visitedCounts.set(PACK(0,0), 1); base.visitedCounts.set(PACK(1,0), 1); base.visitedCounts.set(PACK(2,0), 1);
    const result = simulateTapRouteStep(base, PACK(1,0), level);  // backtrack to (1,0)
    assert.ok(result);
    assert.equal(result.result, 'valid');
    assert.equal(result.state.path.length, 2);
    assert.equal(result.state.path[1], PACK(1,0));
});

test('wouldCreateBlockedTIntersection: returns false when revisitCount is 0', () => {
    const level = makeLevel();
    const state = makeTapState({ path: [PACK(0,0)] });
    // PACK(1,0) never visited → revisitCount = 0 → not a T-intersection issue
    assert.equal(wouldCreateBlockedTIntersection(state, PACK(1,0), level), false);
});

// ---------------------------------------------------------------------------
// GROUP 9 — checkWinConditionImpl (game-rules.js)
// ---------------------------------------------------------------------------
console.log('\nGROUP 9: checkWinConditionImpl (game-rules.js)');

test('checkWinConditionImpl: returns false in EDITOR mode (mode=1)', () => {
    const level  = makeLevel({ reqLen: 2, reqInt: 0 });
    const path   = [PACK(0,0), PACK(1,0), PACK(2,0)];
    assert.equal(
        checkWinConditionImplDirect(path, level, 1, 'IDLE', new Set(), new Map([[PACK(0,0),1],[PACK(1,0),1],[PACK(2,0),1]]), 0),
        false
    );
});

test('checkWinConditionImpl: returns false when last key ≠ goalKey', () => {
    const level  = makeLevel({ goalKey: PACK(7,7), reqLen: 2, reqInt: 0 });
    const path   = [PACK(0,0), PACK(1,0), PACK(2,0)];
    assert.equal(
        checkWinConditionImplDirect(path, level, 0, 'IDLE', new Set(), new Map([[PACK(0,0),1],[PACK(1,0),1],[PACK(2,0),1]]), 0),
        false
    );
});

test('checkWinConditionImpl: returns false when HAZARD_TRIGGERED', () => {
    const goalKey = PACK(2,0);
    const level   = makeLevel({ goalKey, reqLen: 2, reqInt: 0 });
    const path    = [PACK(0,0), PACK(1,0), goalKey];
    const vc      = new Map([[PACK(0,0),1],[PACK(1,0),1],[goalKey,1]]);
    assert.equal(checkWinConditionImplDirect(path, level, 0, 'HAZARD_TRIGGERED', new Set(), vc, 0), false);
});

test('checkWinConditionImpl: returns true when path ends at goal and metrics match', () => {
    const goalKey = PACK(2,0);
    const level   = makeLevel({ goalKey, reqLen: 2, reqInt: 0 });
    const path    = [PACK(0,0), PACK(1,0), goalKey];
    const vc      = new Map([[PACK(0,0),1],[PACK(1,0),1],[goalKey,1]]);
    assert.ok(checkWinConditionImplDirect(path, level, 0, 'IDLE', new Set(), vc, 0));
});

// ---------------------------------------------------------------------------
// GROUP 10 — Level validation (level-validation.js)
// ---------------------------------------------------------------------------
console.log('\nGROUP 10: Level validation (validateLevelDetailed)');

// Minimal valid level fixture (no mustPass/mustCross/portals/filters).
function makeValidEditorLevel(opts = {}) {
    const w = opts.w ?? 8;
    const h = opts.h ?? 8;
    return {
        grid:              { w, h },
        goalKey:           opts.goalKey  ?? PACK(w - 1, h - 1),
        gateKeys:          opts.gateKeys ?? [PACK(0, 0)],
        blockSet:          new Set(opts.blocks        ?? []),
        gooseSet:          new Set(opts.geese         ?? []),
        falseGoalKeys:     new Set(opts.falseGoals    ?? []),
        portalMap:         new Map(opts.portals       ?? []),
        portalVisuals:     opts.portalVisuals         ?? [],
        filterMap:         new Map(opts.filters       ?? []),
        flippingFilterMap: new Map(opts.flipping      ?? []),
        mustPassKeys:      opts.mustPass              ?? [],
        mustCrossKeys:     opts.mustCross             ?? [],
        reqLen: 0, reqInt: 0, hints: []
    };
}

test('valid minimal level returns {ok:true, reasons:[]}', () => {
    const l = makeValidEditorLevel();
    const result = validateLevelDetailedImpl(l);
    assert.ok(result.ok, `expected ok but got: ${JSON.stringify(result.reasons)}`);
    assert.deepEqual(result.reasons, []);
});

test('goal missing: {ok:false} with "Goal missing" reason', () => {
    const l = makeValidEditorLevel({ goalKey: -1 });
    const result = validateLevelDetailedImpl(l);
    assert.equal(result.ok, false);
    assert.ok(result.reasons.includes('Goal missing'), `reasons: ${JSON.stringify(result.reasons)}`);
});

test('no gates: {ok:false} with "No gates" reason', () => {
    const l = makeValidEditorLevel({ gateKeys: [] });
    const result = validateLevelDetailedImpl(l);
    assert.equal(result.ok, false);
    assert.ok(result.reasons.includes('No gates'), `reasons: ${JSON.stringify(result.reasons)}`);
});

test('allowGateLess option suppresses "No gates" error', () => {
    const l = makeValidEditorLevel({ gateKeys: [] });
    // Without a gate, the connectivity check is skipped too, so this should pass.
    const result = validateLevelDetailedImpl(l, { allowGateLess: true });
    assert.ok(result.ok, `expected ok but got: ${JSON.stringify(result.reasons)}`);
});

test('pendingPortal param triggers "Portal terminals incomplete" reason', () => {
    const l = makeValidEditorLevel();
    const result = validateLevelDetailedImpl(l, {}, PACK(3, 3));  // pendingPortal set
    assert.equal(result.ok, false);
    assert.ok(result.reasons.some(r => r.includes('Portal terminals incomplete')),
              `reasons: ${JSON.stringify(result.reasons)}`);
});

test('OOB gate produces "Out of bounds: gate" reason', () => {
    const l = makeValidEditorLevel({ gateKeys: [PACK(9, 9)] });  // outside 8×8
    const result = validateLevelDetailedImpl(l);
    assert.equal(result.ok, false);
    assert.ok(result.reasons.some(r => r.includes('Out of bounds: gate')),
              `reasons: ${JSON.stringify(result.reasons)}`);
});

test('gate completely surrounded by blocks: produces reason', () => {
    const gk = PACK(3, 3);
    const surrounding = [PACK(2,3), PACK(4,3), PACK(3,2), PACK(3,4)];
    const l = makeValidEditorLevel({ gateKeys: [gk], blocks: surrounding });
    const result = validateLevelDetailedImpl(l);
    assert.equal(result.ok, false);
    assert.ok(result.reasons.some(r => r.includes('Gate completely surrounded')),
              `reasons: ${JSON.stringify(result.reasons)}`);
});

test('goal completely surrounded by blocks: produces reason', () => {
    // Put goal in centre of a 3×3 cage
    const goal = PACK(4, 4);
    const surrounding = [PACK(3,4), PACK(5,4), PACK(4,3), PACK(4,5)];
    const l = makeValidEditorLevel({ goalKey: goal, blocks: surrounding });
    const result = validateLevelDetailedImpl(l);
    assert.equal(result.ok, false);
    assert.ok(result.reasons.some(r => r.includes('Goal completely surrounded')),
              `reasons: ${JSON.stringify(result.reasons)}`);
});

test('MustCross on grid edge produces reason', () => {
    const l = makeValidEditorLevel({ mustCross: [PACK(0, 3)] });  // x=0 is an edge
    const result = validateLevelDetailedImpl(l);
    assert.equal(result.ok, false);
    assert.ok(result.reasons.some(r => r.includes('MustCross on grid edge')),
              `reasons: ${JSON.stringify(result.reasons)}`);
});

test('MustCross with adjacent block produces reason', () => {
    const mc = PACK(3, 3);
    const l = makeValidEditorLevel({ mustCross: [mc], blocks: [PACK(4, 3)] });
    const result = validateLevelDetailedImpl(l);
    assert.equal(result.ok, false);
    assert.ok(result.reasons.some(r => r.includes('Block adjacent to MustCross')),
              `reasons: ${JSON.stringify(result.reasons)}`);
});

test('grid partitioned by a full vertical barrier produces "Grid partitioned" reason', () => {
    // Full vertical wall at x=3 blocks the path from gate (0,0) to goal (7,7).
    const wallX = 3;
    const blocks = Array.from({ length: 8 }, (_, y) => PACK(wallX, y));
    const l = makeValidEditorLevel({ blocks });
    const result = validateLevelDetailedImpl(l);
    assert.equal(result.ok, false);
    assert.ok(result.reasons.some(r => r.includes('Grid partitioned')),
              `reasons: ${JSON.stringify(result.reasons)}`);
});

test('portal connectivity: portal bridging a barrier allows validation to pass', () => {
    // Same full vertical wall at x=3, but a portal connects the two halves.
    const wallX = 3;
    const blocks = Array.from({ length: 8 }, (_, y) => PACK(wallX, y));
    // Portal: (2,4) ↔ (5,4) — bridges across the barrier
    const k1 = PACK(2, 4), k2 = PACK(5, 4);
    const portals = [[k1, { dest: k2 }], [k2, { dest: k1 }]];
    const l = makeValidEditorLevel({ blocks, portals, portalVisuals: [{ k1, k2 }] });
    const result = validateLevelDetailedImpl(l);
    assert.ok(result.ok, `expected ok (portal bridges barrier) but got: ${JSON.stringify(result.reasons)}`);
});

// ---------------------------------------------------------------------------
// GROUP 11 — Editor occupancy (editor-occupancy.js)
// ---------------------------------------------------------------------------
console.log('\nGROUP 11: Editor occupancy (getOccupant / removeOccupant / placeOccupant)');

function makeOccupancyLevel(opts = {}) {
    return {
        grid:              { w: 8, h: 8 },
        gateKeys:          opts.gateKeys          ?? [],
        goalKey:           opts.goalKey           ?? -1,
        falseGoalKeys:     new Set(opts.falseGoals ?? []),
        blockSet:          new Set(opts.blocks     ?? []),
        gooseSet:          new Set(opts.geese      ?? []),
        mustPassKeys:      opts.mustPass           ?? [],
        mustCrossKeys:     opts.mustCross          ?? [],
        filterMap:         new Map(opts.filters    ?? []),
        flippingFilterMap: new Map(opts.flipping   ?? []),
        portalMap:         new Map(opts.portals    ?? []),
        portalVisuals:     opts.portalVisuals      ?? [],
        hints: [], reqLen: 0, reqInt: 0,
    };
}

// --- getOccupant ---

test('getOccupant: returns null for empty cell', () => {
    const level = makeOccupancyLevel();
    assert.equal(getOccupant(level, PACK(3, 3)), null);
});

test('getOccupant: identifies gate', () => {
    const k = PACK(1, 1);
    const level = makeOccupancyLevel({ gateKeys: [k] });
    assert.deepEqual(getOccupant(level, k), { type: 'gate' });
});

test('getOccupant: identifies goal', () => {
    const k = PACK(5, 5);
    const level = makeOccupancyLevel({ goalKey: k });
    assert.deepEqual(getOccupant(level, k), { type: 'goal' });
});

test('getOccupant: identifies block', () => {
    const k = PACK(2, 2);
    const level = makeOccupancyLevel({ blocks: [k] });
    assert.deepEqual(getOccupant(level, k), { type: 'block' });
});

test('getOccupant: identifies filterH (axis=1)', () => {
    const k = PACK(2, 2);
    const level = makeOccupancyLevel({ filters: [[k, 1]] });
    const occ = getOccupant(level, k);
    assert.equal(occ.type, 'filterH');
    assert.equal(occ.axis, 1);
});

test('getOccupant: identifies filterV (axis=2)', () => {
    const k = PACK(2, 2);
    const level = makeOccupancyLevel({ filters: [[k, 2]] });
    const occ = getOccupant(level, k);
    assert.equal(occ.type, 'filterV');
    assert.equal(occ.axis, 2);
});

test('getOccupant: identifies portal', () => {
    const k = PACK(3, 3);
    const level = makeOccupancyLevel({ portals: [[k, { dest: -1 }]] });
    assert.deepEqual(getOccupant(level, k), { type: 'portal' });
});

// --- removeOccupant ---

test('removeOccupant: returns null for empty cell (no mutation)', () => {
    const k = PACK(2, 2);
    const level = makeOccupancyLevel();
    const result = removeOccupant(level, k, null);
    assert.equal(result, null);
});

test('removeOccupant: removes gate and returns {type:"gate", pendingPortal:null}', () => {
    const k = PACK(1, 1);
    const level = makeOccupancyLevel({ gateKeys: [k] });
    const result = removeOccupant(level, k, null);
    assert.ok(result);
    assert.equal(result.type, 'gate');
    assert.equal(result.pendingPortal, null);
    assert.ok(!level.gateKeys.includes(k));
});

test('removeOccupant: removes goal and sets goalKey to -1', () => {
    const k = PACK(5, 5);
    const level = makeOccupancyLevel({ goalKey: k });
    const result = removeOccupant(level, k, null);
    assert.ok(result);
    assert.equal(result.type, 'goal');
    assert.equal(level.goalKey, -1);
});

test('removeOccupant: removes block from blockSet', () => {
    const k = PACK(3, 3);
    const level = makeOccupancyLevel({ blocks: [k] });
    const result = removeOccupant(level, k, null);
    assert.ok(result);
    assert.equal(result.type, 'block');
    assert.ok(!level.blockSet.has(k));
});

test('removeOccupant: removing pendingPortal cancels it (message: "Portal Cancelled")', () => {
    const k = PACK(3, 3);
    const level = makeOccupancyLevel({ portals: [[k, { dest: -1 }]] });
    const result = removeOccupant(level, k, k);  // k is the pendingPortal
    assert.ok(result);
    assert.equal(result.type, 'portal');
    assert.equal(result.pendingPortal, null);
    assert.ok(result.message.includes('Portal Cancelled'));
    assert.ok(!level.portalMap.has(k));
});

test('removeOccupant: removing one half of a paired portal unpaints the other and sets pendingPortal', () => {
    const k1 = PACK(2, 2), k2 = PACK(5, 5);
    const level = makeOccupancyLevel({
        portals: [[k1, { dest: k2 }], [k2, { dest: k1 }]],
        portalVisuals: [{ k1, k2 }],
    });
    const result = removeOccupant(level, k1, null);
    assert.ok(result);
    assert.equal(result.type, 'portal');
    assert.equal(result.pendingPortal, k2);
    assert.ok(result.message.includes('unpaired'));
    assert.ok(!level.portalMap.has(k1));
    assert.equal(level.portalMap.get(k2).dest, -1);
    assert.equal(level.portalVisuals.length, 0);
});

// --- placeOccupant ---

test('placeOccupant: places gate on empty cell', () => {
    const k = PACK(1, 1);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'gate', null);
    assert.ok(result.ok);
    assert.equal(result.type, 'gate');
    assert.ok(level.gateKeys.includes(k));
});

test('placeOccupant: places block on empty cell', () => {
    const k = PACK(2, 2);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'block', null);
    assert.ok(result.ok);
    assert.ok(level.blockSet.has(k));
});

test('placeOccupant: rejects occupied cell', () => {
    const k = PACK(1, 1);
    const level = makeOccupancyLevel({ gateKeys: [k] });
    const result = placeOccupant(level, k, 'block', null);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'occupied');
});

test('placeOccupant: eraser on occupied cell removes it', () => {
    const k = PACK(2, 2);
    const level = makeOccupancyLevel({ blocks: [k] });
    const result = placeOccupant(level, k, 'eraser', null);
    assert.ok(result.ok);
    assert.equal(result.type, 'block');
    assert.ok(!level.blockSet.has(k));
});

test('placeOccupant: eraser on empty cell returns ok:false reason:empty_cell', () => {
    const k = PACK(3, 3);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'eraser', null);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'empty_cell');
});

test('placeOccupant: pending portal guard rejects non-portal/eraser tool', () => {
    const k = PACK(3, 3);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'block', PACK(1, 1));  // pendingPortal set
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'pending_portal_guard');
});

test('placeOccupant: first portal placement sets pendingPortal', () => {
    const k = PACK(3, 3);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'portal', null);
    assert.ok(result.ok);
    assert.equal(result.pendingPortal, k);
    assert.ok(level.portalMap.has(k));
    assert.equal(level.portalMap.get(k).dest, -1);
});

test('placeOccupant: second portal placement pairs the portals', () => {
    const k1 = PACK(1, 1), k2 = PACK(5, 5);
    const level = makeOccupancyLevel({ portals: [[k1, { dest: -1 }]] });
    const result = placeOccupant(level, k2, 'portal', k1);  // k1 is pendingPortal
    assert.ok(result.ok);
    assert.equal(result.pendingPortal, null);
    assert.equal(level.portalMap.get(k1).dest, k2);
    assert.equal(level.portalMap.get(k2).dest, k1);
    assert.equal(level.portalVisuals.length, 1);
    assert.ok(result.message.includes('paired'));
});

test('placeOccupant: same-key portal returns ok:false reason:same_portal_key', () => {
    const k = PACK(3, 3);
    const level = makeOccupancyLevel({ portals: [[k, { dest: -1 }]] });
    const result = placeOccupant(level, k, 'portal', k);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'same_portal_key');
});

test('placeOccupant: places filterH (axis stored as 1)', () => {
    const k = PACK(4, 4);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'filterH', null);
    assert.ok(result.ok);
    assert.equal(level.filterMap.get(k), 1);
});

test('placeOccupant: places flipV (axis stored as 2 in flippingFilterMap)', () => {
    const k = PACK(4, 4);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'flipV', null);
    assert.ok(result.ok);
    assert.equal(level.flippingFilterMap.get(k), 2);
});

// ---------------------------------------------------------------------------
// GROUP 12 — MoveContext presets and createEditorState
// ---------------------------------------------------------------------------
console.log('\nGROUP 12: MoveContext presets and createEditorState');

// --- MoveContext: PLAY vs TAP_ROUTE hazard check ---

test('MoveContext.PLAY: moving to a goose cell is blocked (checkHazards=true)', () => {
    const gooKey = PACK(1, 0);
    const level  = makeLevel({ geese: [gooKey] });
    const state  = makeState({ path: [PACK(0, 0)], mode: APP.Core.PLAY });
    assert.equal(isValidMove(gooKey, state, level, MoveContext.PLAY), false,
        'PLAY context should block goose cell');
});

test('MoveContext.TAP_ROUTE: moving to a goose cell is allowed (checkHazards=false)', () => {
    const gooKey = PACK(1, 0);
    const level  = makeLevel({ geese: [gooKey] });
    const state  = makeState({ path: [PACK(0, 0)], mode: APP.Core.PLAY });
    assert.equal(isValidMove(gooKey, state, level, MoveContext.TAP_ROUTE), true,
        'TAP_ROUTE context should permit goose cell');
});

// --- MoveContext: false-goal lock ---

test('MoveContext.TAP_ROUTE: continuation from armed false-goal cell is blocked (checkFalseGoals=true)', () => {
    const lastKey = PACK(1, 0);
    const nextKey = PACK(1, 1);
    const level   = makeLevel();
    const state   = makeState({ path: [PACK(0, 0), lastKey], armedFalseGoals: [lastKey] });
    assert.equal(isValidMove(nextKey, state, level, MoveContext.TAP_ROUTE), false,
        'TAP_ROUTE should block move away from armed false-goal cell');
});

test('MoveContext.SOLVER: continuation from armed false-goal cell is allowed (checkFalseGoals=false)', () => {
    const lastKey = PACK(1, 0);
    const nextKey = PACK(1, 1);
    const level   = makeLevel();
    const state   = makeState({ path: [PACK(0, 0), lastKey], armedFalseGoals: [lastKey] });
    assert.equal(isValidMove(nextKey, state, level, MoveContext.SOLVER), true,
        'SOLVER context should allow move away from armed false-goal cell');
});

test('MoveContext.SOLVER: moving to a goose cell is allowed (checkHazards=false)', () => {
    const gooKey = PACK(1, 0);
    const level  = makeLevel({ geese: [gooKey] });
    const state  = makeState({ path: [PACK(0, 0)], mode: APP.Core.PLAY });
    assert.equal(isValidMove(gooKey, state, level, MoveContext.SOLVER), true,
        'SOLVER context should permit goose cell');
});

// --- MoveContext: immutability ---

test('MoveContext and all its context objects are frozen', () => {
    assert.ok(Object.isFrozen(MoveContext),              'MoveContext itself is frozen');
    assert.ok(Object.isFrozen(MoveContext.PLAY),         'MoveContext.PLAY is frozen');
    assert.ok(Object.isFrozen(MoveContext.TAP_ROUTE),    'MoveContext.TAP_ROUTE is frozen');
    assert.ok(Object.isFrozen(MoveContext.EDITOR_PENCIL),'MoveContext.EDITOR_PENCIL is frozen');
    assert.ok(Object.isFrozen(MoveContext.SOLVER),       'MoveContext.SOLVER is frozen');
});

// --- createEditorState ---

test('createEditorState: returns object with correct initial field values', () => {
    const s = createEditorState();
    assert.equal(s.selectedTool,     null,  'selectedTool starts null');
    assert.equal(s.pendingPortal,    null,  'pendingPortal starts null');
    assert.equal(s.workingLevel,     null,  'workingLevel starts null');
    assert.equal(s.isPencilMode,     false, 'isPencilMode starts false');
    assert.equal(s.isModified,       false, 'isModified starts false');
    assert.equal(s.mirrorHorizontal, true,  'mirrorHorizontal starts true');
    assert.ok(Array.isArray(s.undoStack),         'undoStack is an array');
    assert.ok(s.validTrapSpots instanceof Set,    'validTrapSpots is a Set');
});

test('createEditorState: each call returns independent collections', () => {
    const a = createEditorState();
    const b = createEditorState();
    assert.notStrictEqual(a.undoStack,      b.undoStack,      'undoStack is not shared');
    assert.notStrictEqual(a.validTrapSpots, b.validTrapSpots, 'validTrapSpots is not shared');
});

test('TOOL_TYPES includes eraser and all expected tool names', () => {
    assert.ok(TOOL_TYPES.includes('eraser'),     'eraser present');
    assert.ok(TOOL_TYPES.includes('gate'),       'gate present');
    assert.ok(TOOL_TYPES.includes('portal'),     'portal present');
    assert.ok(TOOL_TYPES.includes('must_cross'), 'must_cross present');
    assert.ok(Object.isFrozen(TOOL_TYPES),       'TOOL_TYPES is frozen');
});

test('DEFAULT_TOOL is a member of TOOL_TYPES', () => {
    assert.ok(TOOL_TYPES.includes(DEFAULT_TOOL),
        `DEFAULT_TOOL "${DEFAULT_TOOL}" must be in TOOL_TYPES`);
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\nDomain unit tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
    process.exit(1);
}
