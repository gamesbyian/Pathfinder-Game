/**
 * Phase 0/2 — Domain and runtime behaviour-locking tests.
 *
 * Tests the pure domain and runtime functions extracted during Phase 1/2.
 * Must pass before AND after every refactoring step.
 *
 * Run: npx vitest run domain
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { EDITOR, H, PLAY, V } from '../app-constants.js';
import { deepClone } from '../deep-clone.js';
import { createState } from '../state.js';
import { createEngine } from '../engine.js';
import { createData, validateDataSources } from '../data.js';
import { VALID_LOGIC_TRANSITIONS, isValidLogicTransition } from '../runtime/state-machine.js';
import { cloneTapRouteState, rebuildDerivedState, replayMoves, simulateTapRouteStep, wouldCreateBlockedTIntersection } from '../runtime/path-state.js';
import { checkWinConditionImpl as checkWinConditionImplDirect } from '../runtime/game-rules.js';
import { validateLevelDetailed as validateLevelDetailedImpl } from './level-validation.js';
import { getOccupant, removeOccupant, placeOccupant }        from '../editor/editor-occupancy.js';
import { MoveContext }                                        from './move-context.js';
import { createEditorState }                                  from '../editor/editor-model.js';
import { contrastRatio } from '../theme-engine.js';
import { isValidHexColor, toRgb, darkenHex, collectThemePaths,
         getLeaveThemeColors, normalizeTheme, CLASSIC_LEAVE,
         REQUIRED_THEME_PATHS }                               from '../theme/theme-normalizer.js';
import { encodeHints, decodeHints }                          from '../persistence/level-submission-repository.js';
import { getLevelFingerprintSource, isSameLevelStructure }   from './level-fingerprint.js';
import { PACK, UNPACK, inBounds }                               from './cell-key.js';
import { parseRawLevel as processRawLevel, denormalizeLevel }  from './level-codec.js';
import { isValidMove }                                         from './move-rules.js';
import { normalizeLevelFromData }                              from '../level-data.js';

// ---------------------------------------------------------------------------
// Minimal bootstrap using Phase 9 factory functions
// ---------------------------------------------------------------------------
// Provides only what createEngine and the direct level-data adapter need at construction time.
// DOM, Firebase, Canvas, and audio-unlock paths are all guarded internally
// and never called during the pure function tests below.

function buildTestApp() {
    const state = createState();

    // Data stub — normalizeLevel(idx) reads from here; processRawLevel does not.
    const data = { getLevels: () => _rawLevels };

    // Stubs for deps that are only used in impure paths not exercised here.
    const rendererStub    = { getCanvas: () => null, render: () => {} };
    const editorStub      = { saveEditorState: () => {}, syncMetadataFieldsFromLevel: () => {} };
    const uiStub = {
        EditorDragGhost: { update() {} },
        setSolverAbortRequested() {},
        applyOverlayState() {}
    };
    const persistenceStub = {};
    const themesStub      = {};

    const _engine = createEngine({
        state,
        ui:          uiStub,
        renderer:    rendererStub,
        themes:      themesStub,
        data:        data as any,
        persistence: persistenceStub,
        editor:      editorStub,
        audioService: { play() {} },
    });

    return { state, engine: _engine, data };
}

// Data store for normalizeLevel tests — populated per-test.
let _rawLevels: any[] = [];

const { engine, data } = buildTestApp();
const normalizeLevel = (idx: number) => normalizeLevelFromData(data as any, idx);
const { areWinMetricsSatisfied, getRealLength } = engine;

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

// Minimal level with sane defaults. All keys are packed (x,y) 0-based.
function makeLevel(opts: any = {}) {
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
        surroundKeys:    opts.surroundKeys      || [],
        adjacentTurnKeys: opts.adjacentTurnKeys || [],
        adjacentTurnDirs: opts.adjacentTurnDirs || [],
        mustPassTurnDirs: new Map(opts.mustPassTurnDirs || []),
        requiredLength:          opts.requiredLength    ?? 0,
        requiredIntersections:          opts.requiredIntersections    ?? 0,
        hints:           []
    } as any;
}

// Build state with a path; derives visitedCounts and cellUsage incrementally.
function makeState(opts: any = {}) {
    const path = opts.path ?? [];
    const visitedCounts = new Map<number, number>(opts.visitedCounts ?? []);
    const cellUsage = new Map<number, { h: boolean; v: boolean }>(opts.cellUsage ?? []);
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
                const axis = p2.y === p1.y ? H : V;
                const upd = (key: number) => {
                    const u = cellUsage.get(key) ?? { h: false, v: false };
                    if (axis === H) u.h = true; else u.v = true;
                    cellUsage.set(key, u);
                };
                upd(prev); upd(k);
            }
        }
    }

    return {
        mode:                  opts.mode        ?? PLAY,
        path,
        visitedCounts,
        cellUsage,
        isPortalJump,
        intersections,
        flipCount:             opts.flipCount ?? 0,
        crossedFlippingFilters: new Map(opts.crossedFlippingFilters ?? []),
        armedFalseGoals:       new Set(opts.armedFalseGoals ?? []),
        turnsAtMap:            opts.turnsAtMap ? new Map(opts.turnsAtMap) : undefined
    } as unknown as any;
}

// Minimal raw level fixture (1-indexed, matching levels.js format).
function makeRaw(opts: any = {}) {
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
    assert.equal(isValidMove(gateKey, state, level, { mode: PLAY }), false);
});

test('gate re-entry permitted in EDITOR mode (only last gate blocked)', () => {
    // In EDITOR mode, the gate re-entry rule is different: only blocked if gateKeys
    // contains lastK (the previous step was a gate, not the target).
    const gateKey = PACK(2, 0);
    const level = makeLevel({ gateKeys: [gateKey] });
    const state = makeState({ path: [PACK(0, 0), PACK(1, 0)] });
    // Entering the gate for the first time is fine in editor mode.
    assert.ok(isValidMove(gateKey, state, level, { mode: EDITOR }));
});

test('filter axis: entering a horizontal-filter cell vertically is blocked', () => {
    // filterMap: PACK(3,3) → H means only H-axis moves permitted through here.
    // Approaching from (3,2)→(3,3) is V-axis → blocked.
    const level = makeLevel({ filters: [[PACK(3, 3), H]] });
    const state = makeState({ path: [PACK(3, 2)] });   // approaching from above (V axis)
    assert.equal(isValidMove(PACK(3, 3), state, level), false);
});

test('filter axis: entering a horizontal-filter cell horizontally is valid', () => {
    const level = makeLevel({ filters: [[PACK(3, 3), H]] });
    const state = makeState({ path: [PACK(2, 3)] });   // approaching from left (H axis)
    assert.ok(isValidMove(PACK(3, 3), state, level));
});

test('flipping filter axis: entering on the wrong axis (never yet crossed) is blocked (regression)', () => {
    // Bug: the flipping-filter branch only computed an axis when crossedSet already had the
    // target key — but crossedSet can never contain a cell before the step onto it commits, so
    // the very first entry into any flipping filter skipped the axis check entirely (live play
    // enforced no axis restriction at all on first use, and — since the correct exit-side check
    // only ever compares exit axis to the filter's own designated axis, never to entry axis —
    // could silently accept a turn on it too, whenever off-axis entry happened to line up with
    // that designated exit axis). Declared axis H, zero flips so far (flipCount 0, even) →
    // current axis is still H; approaching vertically must be rejected exactly like a plain
    // filter would be. Blocking this transitively blocks the turn as well: entry and exit are
    // now both pinned to the same designated axis, so they can never diverge.
    const level = makeLevel({ flippingFilters: [[PACK(3, 3), H]] });
    const state = makeState({ path: [PACK(3, 2)] });   // approaching from above (V axis)
    assert.equal(isValidMove(PACK(3, 3), state, level), false);
});

test('flipping filter axis: entering on the declared axis (never yet crossed) is valid', () => {
    const level = makeLevel({ flippingFilters: [[PACK(3, 3), H]] });
    const state = makeState({ path: [PACK(2, 3)] });   // approaching from left (H axis)
    assert.ok(isValidMove(PACK(3, 3), state, level));
});

test('flipping filter single-use: re-entering an already-crossed flipping filter is blocked, even via the axis it just flipped to (regression)', () => {
    // 2026-08-06 design ruling: a flipping filter may be crossed at most once, ever. Before this
    // fix, isValidMove had no explicit rule for this -- only the axis-matching checks, which do
    // NOT block a second crossing via the filter's newly-required (post-flip) axis: declared axis
    // H, first crossing via H flips the requirement to V for the next crossing (flipCount: 1
    // simulates that one global flip has already happened), and entering via V is a fresh axis at
    // that cell (no edge-reuse conflict either -- only H was marked used there), so the axis and
    // edge-reuse checks alone would have wrongly ACCEPTED this move. Path already crossed (3,3)
    // once via H (from (2,3) to (4,3)), looped around to (3,2), and now approaches (3,3) again
    // from above -- via V, exactly the now-"required" axis -- which must still be rejected outright
    // by the single-use rule regardless.
    const level = makeLevel({ flippingFilters: [[PACK(3, 3), H]] });
    const state = makeState({ path: [PACK(2, 3), PACK(3, 3), PACK(4, 3), PACK(4, 2), PACK(3, 2)], flipCount: 1 });
    assert.equal(isValidMove(PACK(3, 3), state, level), false);
});

test('must-cross lock: turning on a still-pending must-cross cell is blocked (regression)', () => {
    // Bug: isValidMove had no counterpart to search-state.ts's "must-cross lock" dynamic check
    // (CLAUDE.md's own documented gotcha) — live play and the referee enforced no restriction on
    // turning at a must-cross cell at all, even though the game rule requires it to be crossed
    // straight through (entered and exited on the same axis) while its 2-visit requirement is
    // still pending; turning consumes both axis bits, making the required 2nd straight crossing
    // permanently impossible. Path arrives at the must-cross cell via V (from below); turning to
    // exit via H must be rejected.
    const level = makeLevel({ mustCross: [PACK(3, 3)] });
    const state = makeState({ path: [PACK(3, 2), PACK(3, 3)] }); // arrived via V
    assert.equal(isValidMove(PACK(4, 3), state, level), false); // would exit via H — a turn
});

test('must-cross lock: continuing straight through a still-pending must-cross cell is valid', () => {
    const level = makeLevel({ mustCross: [PACK(3, 3)] });
    const state = makeState({ path: [PACK(3, 2), PACK(3, 3)] }); // arrived via V
    assert.ok(isValidMove(PACK(3, 4), state, level)); // continues via V — straight through
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
    // Fixed (was accidentally passing for the wrong reason): state.path must end at the cell
    // BEFORE the move being validated, not already include goalKey -- with the full path
    // (including goalKey) as state.path, isValidMove's own unconditional "invalid-after-goal"
    // rule fired first (lastK === level.goalKey), so this test passed without ever reaching
    // checkWinMetrics's must-pass check at all. Verified via diagnostics before fixing.
    const mustPassKey = PACK(4, 4);
    const goalKey = PACK(7, 7);
    const level = makeLevel({ goalKey, mustPass: [mustPassKey], requiredLength: 3, requiredIntersections: 0 });
    // Path has length 3 steps (4 nodes) but mustPass key not visited.
    const path = [PACK(4,7), PACK(5,7), PACK(6,7), goalKey];
    const state = makeState({ path: path.slice(0, -1) });
    assert.equal(
        isValidMove(goalKey, state, level, { checkWinMetrics: true }),
        false
    );
});

test('isValidMove with checkWinMetrics: must-turn cell never turned blocks reaching goal (regression)', () => {
    // Regression: checkWinMetrics had silently drifted from runtime/game-rules.ts's
    // areWinMetricsSatisfied, which already checked must-turn correctly -- this block didn't check
    // it at all. Not a live bug (the referee has its own independent post-loop must-turn check),
    // but this function's own answer was incomplete for any caller that DOES supply turnsAtMap.
    const turnKey = PACK(4, 4);
    const goalKey = PACK(7, 7);
    const level = makeLevel({ goalKey, mustPassTurnDirs: [[turnKey, 'either']], requiredLength: 3, requiredIntersections: 0 });
    const path = [PACK(4, 7), PACK(5, 7), PACK(6, 7), goalKey];
    const state = makeState({ path: path.slice(0, -1), turnsAtMap: [] }); // no turn ever recorded at turnKey
    assert.equal(
        isValidMove(goalKey, state, level, { checkWinMetrics: true }),
        false
    );
});

test('isValidMove with checkWinMetrics: must-turn cell turned in the required direction is valid', () => {
    const turnKey = PACK(4, 4);
    const goalKey = PACK(7, 7);
    const level = makeLevel({ goalKey, mustPassTurnDirs: [[turnKey, 'cw']], requiredLength: 3, requiredIntersections: 0 });
    const path = [PACK(4, 7), PACK(5, 7), PACK(6, 7), goalKey];
    const state = makeState({ path: path.slice(0, -1), turnsAtMap: [[turnKey, 'cw']] });
    assert.ok(isValidMove(goalKey, state, level, { checkWinMetrics: true }));
});

test('isValidMove with checkWinMetrics: no turnsAtMap in state conservatively skips the must-turn check (matches adjacent-turn\'s existing behavior)', () => {
    // This is the referee's actual shape: path-validator.ts's stepState never includes turnsAtMap,
    // so this check (like the pre-existing adjacent-turn one) must not false-reject when it's
    // simply absent -- the referee enforces must-turn itself, independently, after the loop.
    const turnKey = PACK(4, 4);
    const goalKey = PACK(7, 7);
    const level = makeLevel({ goalKey, mustPassTurnDirs: [[turnKey, 'cw']], requiredLength: 3, requiredIntersections: 0 });
    const path = [PACK(4, 7), PACK(5, 7), PACK(6, 7), goalKey];
    const state = makeState({ path: path.slice(0, -1) }); // no turnsAtMap supplied at all
    assert.ok(isValidMove(goalKey, state, level, { checkWinMetrics: true }));
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
    const level = makeLevel({ requiredLength: 3, requiredIntersections: 0 });
    assert.equal(areWinMetricsSatisfied({ path: [], isPortalJump: new Set(), intersections: 0, visitedCounts: new Map(), mustPassKeys: [], mustCrossKeys: [] }, level), false);
});

test('areWinMetricsSatisfied: correct requiredLength and requiredIntersections with no mustPass/mustCross', () => {
    const level = makeLevel({ requiredLength: 3, requiredIntersections: 0 });
    const path = [PACK(0,0), PACK(1,0), PACK(2,0), PACK(3,0)];   // 4 nodes = 3 steps
    const state = makeState({ path });
    assert.ok(areWinMetricsSatisfied(state, level));
});

test('areWinMetricsSatisfied: wrong requiredLength fails', () => {
    const level = makeLevel({ requiredLength: 5, requiredIntersections: 0 });
    const path = [PACK(0,0), PACK(1,0), PACK(2,0), PACK(3,0)];   // 3 steps, not 5
    const state = makeState({ path });
    assert.equal(areWinMetricsSatisfied(state, level), false);
});

test('areWinMetricsSatisfied: wrong requiredIntersections fails', () => {
    const level = makeLevel({ requiredLength: 3, requiredIntersections: 1 });
    const path = [PACK(0,0), PACK(1,0), PACK(2,0), PACK(3,0)];   // 0 intersections
    const state = makeState({ path });
    assert.equal(areWinMetricsSatisfied(state, level), false);
});

test('areWinMetricsSatisfied: mustPass key not visited fails', () => {
    const mustKey = PACK(5, 5);
    const level = makeLevel({ requiredLength: 3, requiredIntersections: 0, mustPass: [mustKey] });
    const path = [PACK(0,0), PACK(1,0), PACK(2,0), PACK(3,0)];
    const state = makeState({ path });
    assert.equal(areWinMetricsSatisfied(state, level), false);
});

test('areWinMetricsSatisfied: mustCross key visited only once fails', () => {
    const crossKey = PACK(1, 0);
    const level = makeLevel({ requiredLength: 3, requiredIntersections: 0, mustCross: [crossKey] });
    // crossKey is visited once in this path
    const path = [PACK(0,0), PACK(1,0), PACK(2,0), PACK(3,0)];
    const state = makeState({ path });
    assert.equal(areWinMetricsSatisfied(state, level), false);
});

test('areWinMetricsSatisfied: mustPass satisfied', () => {
    const mustKey = PACK(1, 0);
    const level = makeLevel({ requiredLength: 3, requiredIntersections: 0, mustPass: [mustKey] });
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
    const sorted = denorm.blocks.map((b: any) => `${b.x},${b.y}`).sort().join('|');
    assert.equal(sorted, '3,4|5,2');
});

test('portal pair round-trips (endpoints become x1/y1/x2/y2 ≥1)', () => {
    const raw = makeRaw({ portals: [{ x1: 2, y1: 1, x2: 7, y2: 6 }] });
    const norm = processRawLevel(raw);
    const denorm = denormalizeLevel(norm);
    assert.equal(denorm.portals.length, 1);
    const p = denorm.portals[0];
    // Both endpoint pairs must be present (order may differ; denorm picks canonical order)
    const has = (ax: any, ay: any, bx: any, by: any) =>
        (p.x1 === ax && p.y1 === ay && p.x2 === bx && p.y2 === by) ||
        (p.x1 === bx && p.y1 === by && p.x2 === ax && p.y2 === ay);
    assert.ok(has(2, 1, 7, 6), `portal endpoints not preserved: ${JSON.stringify(p)}`);
});

test('requiredLength and requiredIntersections round-trip through normalization', () => {
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
    const viaIdx = normalizeLevel(0)!;
    const viaDirect = processRawLevel(raw, 0)!;
    // Compare a few key fields
    assert.equal(viaIdx!.goalKey, viaDirect.goalKey);
    assert.equal(viaIdx!.requiredLength,  viaDirect.requiredLength);
    assert.deepEqual([...viaIdx!.blockSet], [...viaDirect.blockSet]);
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
console.log('\nGROUP 6: Persistence hint encode/decode (level-submission-repository.js)');

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

function makeTapState(opts: any = {}) {
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
    } as unknown as any;
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

test('replayMoves: plays a legal move sequence and reports per-step outcomes', () => {
    const level = makeLevel();                              // 8×8, gate (0,0), goal (7,7)
    const base  = makeTapState({ path: [PACK(0,0)] });
    const { state, outcomes } = replayMoves(base, [PACK(1,0), PACK(2,0), PACK(2,1)], level);
    assert.deepEqual(outcomes, ['valid', 'valid', 'valid']);
    assert.deepEqual(state.path, [PACK(0,0), PACK(1,0), PACK(2,0), PACK(2,1)]);
    assert.equal(base.path.length, 1, 'replayMoves does not mutate the base state');
});

test('replayMoves: an illegal move is recorded as invalid and leaves state unchanged', () => {
    const level = makeLevel({ blocks: [PACK(2,0)] });       // (2,0) blocked
    const base  = makeTapState({ path: [PACK(0,0)] });
    const { state, outcomes } = replayMoves(base, [PACK(1,0), PACK(2,0), PACK(1,1)], level);
    // (2,0) is blocked → 'invalid'; replay continues from (1,0) to (1,1).
    assert.deepEqual(outcomes, ['valid', 'invalid', 'valid']);
    assert.deepEqual(state.path, [PACK(0,0), PACK(1,0), PACK(1,1)]);
});

test('replayMoves: backtracking within a sequence shortens the path', () => {
    const level = makeLevel();
    const base  = makeTapState({ path: [PACK(0,0)] });
    // forward to (2,0), then step back onto (1,0) (the second-to-last cell) = backtrack.
    const { state, outcomes } = replayMoves(base, [PACK(1,0), PACK(2,0), PACK(1,0)], level);
    assert.deepEqual(outcomes, ['valid', 'valid', 'valid']);
    assert.deepEqual(state.path, [PACK(0,0), PACK(1,0)], 'backtrack removed the last cell');
});

// ---------------------------------------------------------------------------
// GROUP 9 — checkWinConditionImpl (game-rules.js)
// ---------------------------------------------------------------------------
console.log('\nGROUP 9: checkWinConditionImpl (game-rules.js)');

test('checkWinConditionImpl: returns false in EDITOR mode (mode=1)', () => {
    const level  = makeLevel({ requiredLength: 2, requiredIntersections: 0 });
    const path   = [PACK(0,0), PACK(1,0), PACK(2,0)];
    assert.equal(
        checkWinConditionImplDirect(path, level, 1, 'IDLE', new Set(), new Map([[PACK(0,0),1],[PACK(1,0),1],[PACK(2,0),1]]), 0),
        false
    );
});

test('checkWinConditionImpl: returns false when last key ≠ goalKey', () => {
    const level  = makeLevel({ goalKey: PACK(7,7), requiredLength: 2, requiredIntersections: 0 });
    const path   = [PACK(0,0), PACK(1,0), PACK(2,0)];
    assert.equal(
        checkWinConditionImplDirect(path, level, 0, 'IDLE', new Set(), new Map([[PACK(0,0),1],[PACK(1,0),1],[PACK(2,0),1]]), 0),
        false
    );
});

test('checkWinConditionImpl: returns false when HAZARD_TRIGGERED', () => {
    const goalKey = PACK(2,0);
    const level   = makeLevel({ goalKey, requiredLength: 2, requiredIntersections: 0 });
    const path    = [PACK(0,0), PACK(1,0), goalKey];
    const vc      = new Map([[PACK(0,0),1],[PACK(1,0),1],[goalKey,1]]);
    assert.equal(checkWinConditionImplDirect(path, level, 0, 'HAZARD_TRIGGERED', new Set(), vc, 0), false);
});

test('checkWinConditionImpl: returns true when path ends at goal and metrics match', () => {
    const goalKey = PACK(2,0);
    const level   = makeLevel({ goalKey, requiredLength: 2, requiredIntersections: 0 });
    const path    = [PACK(0,0), PACK(1,0), goalKey];
    const vc      = new Map([[PACK(0,0),1],[PACK(1,0),1],[goalKey,1]]);
    assert.ok(checkWinConditionImplDirect(path, level, 0, 'IDLE', new Set(), vc, 0));
});

// Regression: must-turn levels need turnsAtMap threaded through to the win check.
// Previously checkWinConditionImpl dropped turnsAtMap, so must-turn / adjacent-turn
// levels (L149/L150) could never be won in actual play.
test('checkWinConditionImpl: must-turn level needs turnsAtMap (regression)', () => {
    const goalKey = PACK(2,1);
    const turnKey = PACK(1,0);
    const level   = makeLevel({ goalKey, requiredLength: 3, requiredIntersections: 0 });
    level.mustPassTurnDirs! = new Map([[turnKey, 'either']]);
    // Path turns at turnKey (enters horizontally, leaves vertically).
    const path    = [PACK(0,0), turnKey, PACK(1,1), goalKey];
    const vc      = new Map(path.map(k => [k, 1]));
    // Without turnsAtMap the win check must fail...
    assert.equal(checkWinConditionImplDirect(path, level, 0, 'IDLE', new Set(), vc, 0), false);
    // ...and succeed once the satisfying turn is provided.
    const turnsAtMap = new Map([[turnKey, 'ccw']]);
    assert.ok(checkWinConditionImplDirect(path, level, 0, 'IDLE', new Set(), vc, 0, turnsAtMap));
});

// ---------------------------------------------------------------------------
// GROUP 10 — Level validation (level-validation.js)
// ---------------------------------------------------------------------------
console.log('\nGROUP 10: Level validation (validateLevelDetailed)');

// Minimal valid level fixture (no mustPass/mustCross/portals/filters).
function makeValidEditorLevel(opts: any = {}) {
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
        requiredLength: 0, requiredIntersections: 0, hints: []
    } as any;
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

function makeOccupancyLevel(opts: any = {}) {
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
        surroundKeys:      opts.surroundKeys       ?? [],
        adjacentTurnKeys:  opts.adjacentTurnKeys    ?? [],
        adjacentTurnDirs:  opts.adjacentTurnDirs    ?? [],
        mustPassTurnDirs:  new Map(opts.mustPassTurnDirs ?? []),
        landmarkMeta:      new Map(opts.landmarkMeta ?? []),
        hints: [], requiredLength: 0, requiredIntersections: 0,
    } as any;
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
    assert.equal(level.portalVisuals!.length, 0);
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
    assert.equal(level.portalVisuals!.length, 1);
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

// --- placeOccupant: landmarks ---
// Landmarks are placed through the same atomic-toolType path as every other
// object — these cases cover one variant per mechanical role family.

test('placeOccupant: surround landmark (park) blocks the cell and registers in surroundKeys', () => {
    const k = PACK(2, 2);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'park', null);
    assert.ok(result.ok);
    assert.equal(result.type, 'park');
    assert.ok(level.blockSet.has(k));
    assert.ok(level.surroundKeys!.includes(k));
    assert.deepEqual(level.landmarkMeta!.get(k), { objectType: 'park', role: 'surround' });
});

test('placeOccupant: adjacentTurn landmark (fountain, no direction) blocks the cell and resolves turn "either"', () => {
    const k = PACK(2, 3);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'fountain', null);
    assert.ok(result.ok);
    assert.ok(level.blockSet.has(k));
    const idx = level.adjacentTurnKeys!.indexOf(k);
    assert.ok(idx !== -1);
    assert.equal(level.adjacentTurnDirs![idx], 'either');
});

test('placeOccupant: adjacentTurn landmark with explicit direction (lamppostCcw) resolves turn "ccw"', () => {
    const k = PACK(2, 4);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'lamppostCcw', null);
    assert.ok(result.ok);
    const idx = level.adjacentTurnKeys!.indexOf(k);
    assert.ok(idx !== -1);
    assert.equal(level.adjacentTurnDirs![idx], 'ccw');
    assert.equal(level.landmarkMeta!.get(k).role, 'adjacentTurn');
});

test('placeOccupant: mustTurn landmark (library, no direction) is passable and resolves turn "either"', () => {
    const k = PACK(3, 3);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'library', null);
    assert.ok(result.ok);
    assert.ok(!level.blockSet.has(k));
    assert.ok(level.mustPassKeys.includes(k));
    assert.equal(level.mustPassTurnDirs!.get(k), 'either');
});

test('placeOccupant: mustTurn landmark with explicit direction (libraryCw) resolves turn "cw"', () => {
    const k = PACK(3, 4);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'libraryCw', null);
    assert.ok(result.ok);
    assert.equal(level.mustPassTurnDirs!.get(k), 'cw');
    assert.equal(level.landmarkMeta!.get(k).role, 'mustTurn');
});

test('placeOccupant: decorative landmark (statue) blocks the cell with no turn/must-pass bookkeeping', () => {
    const k = PACK(5, 5);
    const level = makeOccupancyLevel();
    const result = placeOccupant(level, k, 'statue', null);
    assert.ok(result.ok);
    assert.ok(level.blockSet.has(k));
    assert.ok(!level.mustPassKeys.includes(k));
    assert.ok(!level.adjacentTurnKeys!.includes(k));
});

test('placeOccupant: rejects landmark on an occupied cell', () => {
    const k = PACK(2, 2);
    const level = makeOccupancyLevel({ blocks: [k] });
    const result = placeOccupant(level, k, 'park', null);
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'occupied');
});

test('getOccupant: identifies a placed landmark with its objectType and base role', () => {
    const k = PACK(4, 1);
    const level = makeOccupancyLevel();
    placeOccupant(level, k, 'fountainCw', null);
    assert.deepEqual(getOccupant(level, k), { type: 'landmark', objectType: 'fountain', role: 'adjacentTurn' });
});

test('removeOccupant + placeOccupant: landmark placement and removal round-trips cleanly', () => {
    const k = PACK(6, 6);
    const level = makeOccupancyLevel();
    placeOccupant(level, k, 'libraryCcw', null);
    assert.ok(level.landmarkMeta!.has(k));
    const result = removeOccupant(level, k, null);
    assert.ok(result);
    assert.equal(result.type, 'landmark');
    assert.ok(!level.landmarkMeta!.has(k));
    assert.ok(!level.blockSet.has(k));
    assert.ok(!level.mustPassKeys.includes(k));
    assert.ok(!level.mustPassTurnDirs!.has(k));
    assert.equal(getOccupant(level, k), null);
});

test('removeOccupant: removing an adjacentTurn landmark clears both adjacentTurnKeys and adjacentTurnDirs', () => {
    const k = PACK(1, 6);
    const level = makeOccupancyLevel();
    placeOccupant(level, k, 'fountainCcw', null);
    removeOccupant(level, k, null);
    assert.ok(!level.adjacentTurnKeys!.includes(k));
    assert.equal(level.adjacentTurnDirs!.length, 0);
    assert.ok(!level.blockSet.has(k));
});

// ---------------------------------------------------------------------------
// GROUP 12 — MoveContext presets and createEditorState
// ---------------------------------------------------------------------------
console.log('\nGROUP 12: MoveContext presets and createEditorState');

// --- MoveContext: PLAY vs TAP_ROUTE hazard check ---

test('MoveContext.PLAY: moving to a goose cell is blocked (checkHazards=true)', () => {
    const gooKey = PACK(1, 0);
    const level  = makeLevel({ geese: [gooKey] });
    const state  = makeState({ path: [PACK(0, 0)], mode: PLAY });
    assert.equal(isValidMove(gooKey, state, level, MoveContext.PLAY), false,
        'PLAY context should block goose cell');
});

test('MoveContext.TAP_ROUTE: moving to a goose cell is allowed (checkHazards=false)', () => {
    const gooKey = PACK(1, 0);
    const level  = makeLevel({ geese: [gooKey] });
    const state  = makeState({ path: [PACK(0, 0)], mode: PLAY });
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
    const state  = makeState({ path: [PACK(0, 0)], mode: PLAY });
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
    assert.ok(s.triggerableFalseGoalCells instanceof Set,    'triggerableFalseGoalCells is a Set');
    assert.equal(s.falseGoalTriggerScanState, 'stale',        'falseGoalTriggerScanState starts stale');
    assert.ok(s.falseGoalTriggerParityCandidates instanceof Set, 'falseGoalTriggerParityCandidates is a Set');
});

test('createEditorState: each call returns independent collections', () => {
    const a = createEditorState();
    const b = createEditorState();
    assert.notStrictEqual(a.undoStack,      b.undoStack,      'undoStack is not shared');
    assert.notStrictEqual(a.triggerableFalseGoalCells, b.triggerableFalseGoalCells, 'triggerableFalseGoalCells is not shared');
    assert.notStrictEqual(a.falseGoalTriggerParityCandidates, b.falseGoalTriggerParityCandidates, 'falseGoalTriggerParityCandidates is not shared');
});

// ---------------------------------------------------------------------------
// GROUP 13 — Theme normalizer (theme-normalizer.js)
// ---------------------------------------------------------------------------
console.log('\nGROUP 13: Theme normalizer (isValidHexColor / toRgb / darkenHex / collectThemePaths / getLeaveThemeColors / normalizeTheme)');

// --- isValidHexColor ---

test('isValidHexColor: accepts valid 6-digit hex with #', () => {
    assert.ok(isValidHexColor('#a1b2c3'));
    assert.ok(isValidHexColor('#FFFFFF'));
    assert.ok(isValidHexColor('#000000'));
});

test('isValidHexColor: rejects 3-digit shorthand', () => {
    assert.equal(isValidHexColor('#fff'), false);
});

test('isValidHexColor: rejects value without #', () => {
    assert.equal(isValidHexColor('aabbcc'), false);
});

test('isValidHexColor: rejects non-hex characters', () => {
    assert.equal(isValidHexColor('#gggggg'), false);
});

test('isValidHexColor: rejects empty string', () => {
    assert.equal(isValidHexColor(''), false);
});

test('isValidHexColor: rejects non-string input', () => {
    assert.equal(isValidHexColor(null), false);
    assert.equal(isValidHexColor(123456), false);
});

// --- toRgb ---

test('toRgb: parses pure red correctly', () => {
    assert.deepEqual(toRgb('#ff0000'), { r: 255, g: 0, b: 0 });
});

test('toRgb: parses pure white correctly', () => {
    assert.deepEqual(toRgb('#ffffff'), { r: 255, g: 255, b: 255 });
});

test('toRgb: returns fallback for invalid input', () => {
    const fallback = { r: 1, g: 2, b: 3 };
    assert.deepEqual(toRgb('not-a-color', fallback), fallback);
});

test('toRgb: handles missing # prefix gracefully (uses fallback)', () => {
    const result = toRgb('aabbcc');
    assert.ok(result && typeof result.r === 'number');
});

// --- darkenHex ---

test('darkenHex: darkens #ffffff by factor 0 to #000000', () => {
    assert.equal(darkenHex('#ffffff', 0), '#000000');
});

test('darkenHex: darkens #ffffff by factor 1 to #ffffff', () => {
    assert.equal(darkenHex('#ffffff', 1), '#ffffff');
});

test('darkenHex: default factor 0.85 darkens a mid-grey', () => {
    const result = darkenHex('#888888');
    assert.ok(isValidHexColor(result), 'result should be a valid hex color');
    const { r } = toRgb(result);
    const { r: orig } = toRgb('#888888');
    assert.ok(r < orig, 'darkened value should be numerically smaller');
});

// --- collectThemePaths ---

test('collectThemePaths: collects top-level keys', () => {
    const paths = collectThemePaths({ a: '#fff', b: '#000' });
    assert.ok(paths.has('a'));
    assert.ok(paths.has('b'));
});

test('collectThemePaths: collects nested keys as dot-paths', () => {
    const paths = collectThemePaths({ colors: { goal: '#fff' } });
    assert.ok(paths.has('colors'));
    assert.ok(paths.has('colors.goal'));
});

test('collectThemePaths: ignores array values (does not descend)', () => {
    const paths = collectThemePaths({ items: ['a', 'b'] });
    assert.ok(paths.has('items'));
    assert.equal(paths.has('items.0'), false);
});

test('collectThemePaths: handles empty object', () => {
    const paths = collectThemePaths({});
    assert.equal(paths.size, 0);
});

// --- CLASSIC_LEAVE ---

test('CLASSIC_LEAVE is frozen and has expected shape', () => {
    assert.ok(Object.isFrozen(CLASSIC_LEAVE));
    assert.equal(CLASSIC_LEAVE.bg, '#dc2626');
    assert.equal(CLASSIC_LEAVE.hover, '#b91c1c');
    assert.equal(CLASSIC_LEAVE.text, '#ffffff');
    assert.equal(CLASSIC_LEAVE.border, '#b91c1c');
});

// --- getLeaveThemeColors ---

test('getLeaveThemeColors: isClassic=true returns a copy of CLASSIC_LEAVE', () => {
    const result = getLeaveThemeColors({}, true);
    assert.deepEqual(result, { bg: '#dc2626', hover: '#b91c1c', text: '#ffffff', border: '#b91c1c' });
    assert.notStrictEqual(result, CLASSIC_LEAVE, 'should be a copy, not the same object');
});

test('getLeaveThemeColors: derives leave colors from headerRight when leave is absent', () => {
    const theme = { headerRight: '#3b82f6', btns: {}, colors: {} };
    const result = getLeaveThemeColors(theme, false);
    assert.ok(isValidHexColor(result.bg),     'bg should be a valid hex');
    assert.ok(isValidHexColor(result.hover),  'hover should be a valid hex');
    assert.ok(isValidHexColor(result.text),   'text should be a valid hex');
    assert.ok(isValidHexColor(result.border), 'border should be a valid hex');
});

test('getLeaveThemeColors: explicit leave.bg in theme is honored', () => {
    const theme = { leave: { bg: '#123456', hover: '#654321', text: '#ffffff', border: '#654321' } };
    const result = getLeaveThemeColors(theme, false);
    assert.equal(result.bg, '#123456');
});

// --- normalizeTheme ---

test('normalizeTheme: returns object with required top-level fields from empty input', () => {
    const t = normalizeTheme({});
    assert.ok(t.bodyBg, 'bodyBg is filled');
    assert.ok(t.canvasBg, 'canvasBg is filled');
    assert.ok(t.colors && t.colors.goal, 'colors.goal is filled');
    assert.ok(t.btns && t.btns.hint, 'btns.hint is filled');
    assert.ok(t.modal && t.modal.bg, 'modal.bg is filled');
    assert.ok(t.leave && t.leave.bg, 'leave.bg is filled');
});

test('normalizeTheme: respects explicit values already set', () => {
    const t = normalizeTheme({ bodyBg: '#abcdef', canvasBg: '#fedcba' });
    assert.equal(t.bodyBg, '#abcdef');
    assert.equal(t.canvasBg, '#fedcba');
});

test('normalizeTheme: produces all paths required by REQUIRED_THEME_PATHS', () => {
    const t = normalizeTheme({}, '__schema__');
    const paths = collectThemePaths(t);
    const missing = Array.from(REQUIRED_THEME_PATHS).filter(p => !paths.has(p));
    assert.deepEqual(missing, [], `normalizeTheme({}) is missing schema paths: ${missing.join(', ')}`);
});

test('normalizeTheme: vibrant mode-toggle override applied for candy_apple', () => {
    const t = normalizeTheme({}, 'candy_apple');
    assert.equal(t.btns.modeToggle, '#ff0800');
    assert.equal(t.text.actionBtn, '#ffffff');
});

test('normalizeTheme: chaos key skips shell preset branch but shell fields are still filled', () => {
    const t = normalizeTheme({ shell: {} }, 'chaos');
    assert.ok(t.shell.btnBg || t.btns.orient, 'shell.btnBg derives from available btn values');
});

test('normalizeTheme: action button labels keep stable colours across mode layouts without adjacent duplicates', () => {
    const t = normalizeTheme({
        btns: {
            guide: '#2563eb',
            hint: '#2563eb',
            modeToggle: '#2563eb',
            undo: '#64748b',
            reset: '#64748b',
            editClear: '#dc2626',
        },
    });
    const key = (color: any) => String(color || '').toLowerCase();
    const assertNoAdjacentDuplicate = (name: any, row: any) => {
        for (let i = 1; i < row.length; i += 1) {
            assert.notEqual(key(row[i - 1]), key(row[i]), `${name} buttons at ${i - 1}/${i} should not share ${row[i]}`);
        }
    };

    assert.equal(t.btns.solve, t.btns.guide, 'Solve token should stay paired with the Guide action family');
    assert.equal(t.btns.approve, t.btns.hint, 'Approve token should stay paired with the Hint action family');
    assertNoAdjacentDuplicate('play', [t.btns.guide, t.btns.hint, t.btns.whoa, t.btns.undo, t.btns.reset]);
    assertNoAdjacentDuplicate('edit', [t.btns.guide, t.btns.editNew, t.btns.editClear, t.btns.editTrapSpots, t.btns.solve, t.btns.submit]);
    assertNoAdjacentDuplicate('review', [t.btns.editNew, t.btns.hint, t.btns.solve, t.btns.submit, t.btns.reject, t.btns.approve]);
});

test('normalizeTheme: landmark/badge/unsatisfied colors are valid hex and adapt per theme', () => {
    const light = normalizeTheme({ seeds: {
        bg: '#e0f2fe', surface: '#ffffff', primary: '#2563eb', secondary: '#dc2626',
        neutral: '#94a3b8', text: '#334155', border: '#cbd5e1', path: 'rainbow',
    } }, 'light-like');
    const dark = normalizeTheme({ seeds: {
        bg: '#020617', surface: '#111827', primary: '#1e3a8a', secondary: '#7f1d1d',
        neutral: '#475569', text: '#f8fafc', border: '#334155', path: '#22c55e',
    } }, 'dark-like');

    const keys = ['landmarkPark', 'landmarkMarket', 'landmarkLibrary', 'landmarkFountain', 'landmarkLamppost', 'landmarkStatue', 'badge', 'badgeText', 'unsatisfied'];
    for (const t of [light, dark]) {
        for (const key of keys) assert.ok(isValidHexColor(t.colors[key]), `colors.${key} should be a hex color, got ${t.colors[key]}`);
    }

    // The 6 landmark types stay mutually distinct within a single theme (so they're still
    // individually recognizable — a park shouldn't become the same color as a library).
    const landmarkKeys = keys.slice(0, 6);
    const light6 = landmarkKeys.map(k => light.colors[k]);
    assert.equal(new Set(light6).size, 6, 'the 6 landmark colors should be mutually distinct');

    // ...and adapt across themes, rather than being a fixed constant regardless of theme.
    assert.notEqual(light.colors.landmarkPark, dark.colors.landmarkPark);
    assert.notEqual(light.colors.badge, dark.colors.badge);
});

test('normalizeTheme: badgeText always contrasts reasonably with the badge background', () => {
    for (const bg of ['#0f172a', '#f8fafc', '#7f1d1d', '#22c55e', '#4de4ff']) {
        const t = normalizeTheme({ colors: { badge: bg } });
        assert.ok(
            contrastRatio(t.colors.badge, t.colors.badgeText) >= 2,
            `badgeText should contrast with badge ${bg}, got ${t.colors.badgeText}`
        );
    }
});

// --- REQUIRED_THEME_PATHS ---

test('REQUIRED_THEME_PATHS is a non-empty Set', () => {
    assert.ok(REQUIRED_THEME_PATHS instanceof Set);
    assert.ok(REQUIRED_THEME_PATHS.size > 0, 'schema must have at least one path');
});

test('REQUIRED_THEME_PATHS includes key deeply nested paths', () => {
    assert.ok(REQUIRED_THEME_PATHS.has('colors.goal'));
    assert.ok(REQUIRED_THEME_PATHS.has('btns.hint'));
    assert.ok(REQUIRED_THEME_PATHS.has('btns.submit'));
    assert.ok(REQUIRED_THEME_PATHS.has('btns.approve'));
    assert.ok(REQUIRED_THEME_PATHS.has('btns.reject'));
    assert.ok(REQUIRED_THEME_PATHS.has('modal.bg'));
    assert.ok(REQUIRED_THEME_PATHS.has('leave.bg'));
    assert.ok(REQUIRED_THEME_PATHS.has('text.body'));
});

// GROUP 14 — Data ingestion boundary (data.js)
// ---------------------------------------------------------------------------
console.log('\nGROUP 14: Data ingestion boundary (createData)');

test('createData: can ingest injected levels/themes', () => {
    const dataStore = createData({
        deepClone: deepClone,
        getThemes: () => ({ base: { label: 'base' } }),
        levels: [{ goal: { x: 1, y: 1 }, gates: [], reqLen: 0 }],
        themes: { injected: { label: 'injected' } },
    });
    assert.equal(dataStore.ingest(), true);
    assert.equal(dataStore.isLoaded(), true);
    assert.equal(dataStore.getLevels().length, 1);
    assert.deepEqual(dataStore.getLevel(0).grid, { w: 10, h: 10 });
    assert.equal(dataStore.getTheme('base').label, 'base');
    assert.equal(dataStore.getTheme('injected').label, 'injected');
});

test('validateDataSources: reports structural errors and warnings without throwing', () => {
    const result = validateDataSources({
        levels: [{ grid: { w: 0, h: 4 }, gates: null }],
        themes: [],
    });
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes('themes must be an object map'));
    assert.ok(result.warnings.some(w => w.includes('missing a goal object')));
    assert.ok(result.warnings.some(w => w.includes('gates should be an array')));
    assert.ok(result.warnings.some(w => w.includes('grid.w should be a positive number')));
});

test('createData: exposes validation diagnostics after ingest', () => {
    const dataStore = createData({
        deepClone: deepClone,
        levels: [{ grid: { w: 2, h: 2 }, goal: { x: 1, y: 1 }, gates: [] }],
        themes: { injected: { label: 'injected' } },
    });
    dataStore.ingest();
    assert.equal(dataStore.getValidation().ok, true);
    assert.deepEqual(dataStore.getValidation().errors, []);
});

test('createData: appendLevels refreshes validation diagnostics', () => {
    const dataStore = createData({
        deepClone: deepClone,
        levels: [{ grid: { w: 2, h: 2 }, goal: { x: 1, y: 1 }, gates: [] }],
        themes: {},
    });
    dataStore.ingest();
    assert.equal(dataStore.getValidation().warnings.length, 0);
    dataStore.appendLevels([{ grid: { w: 0, h: 2 }, gates: [] }]);
    assert.ok(dataStore.getValidation().warnings.some(w => w.includes('grid.w should be a positive number')));
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
