import { createHazardController } from '../modules/engine/hazard-controller.js';
import { createWinController } from '../modules/engine/win-controller.js';
import { createChallengeOptionsController } from '../modules/engine/challenge-options.js';
import { createTapRouter } from '../modules/engine/tap-router.js';
import { createEngineState } from '../modules/state-slices.js';

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

const core = {
    PLAY: 0, EDITOR: 1, REVIEW: 2,
    IDLE: 'IDLE', RESOLVED: 'RESOLVED', DRAGGING: 'DRAGGING',
    OVERLAY_NONE: 'OVERLAY_NONE', GOOSE_OVERLAY: 'GOOSE_OVERLAY', FALSE_GOAL_ANIMATING: 'FALSE_GOAL_ANIMATING',
    SOUND_BUS: { play: () => {} },
};

const makeState = () => ({ ENGINE: createEngineState({ core }) });

// ─── HazardController ────────────────────────────────────────────────────────

test('triggerJumpScare sets GOOSE_OVERLAY and schedules reset', () => {
    const state = makeState();
    const overlayHistory = [];
    const setOverlayState = (v) => { state.ENGINE.overlayState = v; overlayHistory.push(v); };
    const uiCalls = [];
    const ui = {
        showGooseJumpScare: () => uiCalls.push('showGooseJumpScare'),
        hideGooseJumpScare: () => uiCalls.push('hideGooseJumpScare'),
    };
    const ctrl = createHazardController({ core, state, ui, setOverlayState });
    ctrl.triggerJumpScare();
    assertEqual(state.ENGINE.overlayState, core.GOOSE_OVERLAY, 'overlay should switch to GOOSE_OVERLAY');
    assert(uiCalls.includes('showGooseJumpScare'), 'showGooseJumpScare should be called');
});

test('triggerBombDetonation sets FALSE_GOAL_ANIMATING and plays sounds', () => {
    const state = makeState();
    state.ENGINE.hazards = { detonatedFalseGoals: new Set(), revealedGeese: new Set(), armedFalseGoals: new Set() };
    const overlayHistory = [];
    const setOverlayState = (v) => { state.ENGINE.overlayState = v; overlayHistory.push(v); };
    const sounds = [];
    const localCore = { ...core, SOUND_BUS: { play: (note) => sounds.push(note) } };
    const uiCalls = [];
    const ui = {
        showBombDetonation: (opts) => uiCalls.push(['showBombDetonation', opts]),
        hideBombDetonation: () => uiCalls.push('hideBombDetonation'),
    };
    const ctrl = createHazardController({ core: localCore, state, ui, setOverlayState });
    ctrl.triggerBombDetonation(42);
    assertEqual(state.ENGINE.overlayState, core.FALSE_GOAL_ANIMATING, 'overlay should switch to FALSE_GOAL_ANIMATING');
    assert(state.ENGINE.hazards.detonatedFalseGoals.has(42), 'key should be added to detonated set');
    assert(sounds.includes('C2'), 'initial bomb sound should play');
});

test('clearBombTimers resets timer references without throwing', () => {
    const state = makeState();
    const ctrl = createHazardController({ core, state, ui: {}, setOverlayState: () => {} });
    // Should not throw even when no timers are active
    ctrl.clearBombTimers();
    ctrl.clearBombTimers();
});

// ─── WinController ───────────────────────────────────────────────────────────

test('handleWin marks level complete and opens win modal', () => {
    const state = makeState();
    state.ENGINE.mode = core.PLAY;
    state.ENGINE.levelIdx = 5;
    state.ENGINE.nav = { path: [1, 2, 3] };
    const completed = [];
    const persistence = { markLevelComplete: (idx) => completed.push(idx) };
    const uiCalls = [];
    const ui = {
        renderWinExportPanel: (opts) => uiCalls.push(['renderWinExportPanel', opts]),
        openModal: (id) => uiCalls.push(['openModal', id]),
    };
    const sounds = [];
    const localCore = { ...core, SOUND_BUS: { play: (n) => sounds.push(n) } };
    let setLogicArg;
    const ctrl = createWinController({ core: localCore, state, ui, persistence, setLogicState: (v) => { setLogicArg = v; } });
    ctrl.handleWin();
    assertEqual(setLogicArg, core.RESOLVED, 'logic state should become RESOLVED');
    assert(completed.includes(5), 'level 5 should be marked complete');
    assert(uiCalls.some(c => c[0] === 'openModal' && c[1] === 'winModal'), 'winModal should open');
    assert(sounds.includes('C5'), 'win sound should play');
});

test('handleWin does not mark complete in EDITOR mode', () => {
    const state = makeState();
    state.ENGINE.mode = core.EDITOR;
    state.ENGINE.levelIdx = 3;
    state.ENGINE.nav = { path: [] };
    const completed = [];
    const persistence = { markLevelComplete: (idx) => completed.push(idx) };
    const ui = { renderWinExportPanel: () => {}, openModal: () => {} };
    const ctrl = createWinController({ core, state, ui, persistence, setLogicState: () => {} });
    ctrl.handleWin();
    assertEqual(completed.length, 0, 'editor wins should not mark level complete');
});

// ─── ChallengeOptionsController ───────────────────────────────────────────────

test('applyPlayChallengeOptions strips geese when option disabled', () => {
    const state = makeState();
    state.ENGINE.mode = core.PLAY;
    state.ENGINE.options = { geese: false, falseGoals: true, deadGates: true };
    const level = { gooseSet: new Set([1, 2]), falseGoalKeys: new Set([3]), gateKeys: [5] };
    const ctrl = createChallengeOptionsController({ core, state, ui: {}, levelUtils: {} });
    const result = ctrl.applyPlayChallengeOptions(level);
    assertEqual(result.playable, true, 'should still be playable');
    assertEqual(level.gooseSet.size, 0, 'geese should be cleared');
    assertEqual(level.falseGoalKeys.size, 1, 'false goals should be unaffected');
});

test('applyPlayChallengeOptions returns playable:false when all gates are dead', () => {
    const state = makeState();
    state.ENGINE.mode = core.PLAY;
    state.ENGINE.options = { geese: true, falseGoals: true, deadGates: false };
    const deadKey = 99;
    const level = { gooseSet: new Set(), falseGoalKeys: new Set(), gateKeys: [deadKey] };
    const levelUtils = { getParityInvalidKeys: () => ({ gates: new Set([deadKey]) }) };
    const ctrl = createChallengeOptionsController({ core, state, ui: {}, levelUtils });
    const result = ctrl.applyPlayChallengeOptions(level);
    assertEqual(result.playable, false, 'should be unplayable when all gates are dead');
    assertEqual(result.reason, 'dead-gates', 'reason should identify dead-gates');
});

test('applyPlayChallengeOptions is no-op outside PLAY mode', () => {
    const state = makeState();
    state.ENGINE.mode = core.EDITOR;
    state.ENGINE.options = { geese: false, falseGoals: false };
    const level = { gooseSet: new Set([1]), falseGoalKeys: new Set([2]) };
    const ctrl = createChallengeOptionsController({ core, state, ui: {}, levelUtils: {} });
    ctrl.applyPlayChallengeOptions(level);
    assertEqual(level.gooseSet.size, 1, 'geese should be unchanged in editor mode');
});

test('showOptionsBlockedModalIfNeeded shows/hides modal based on result', () => {
    const state = makeState();
    const shown = [];
    const ui = { setOptionsBlockedVisible: (v) => shown.push(v) };
    const ctrl = createChallengeOptionsController({ core, state, ui, levelUtils: {} });
    ctrl.showOptionsBlockedModalIfNeeded({ playable: false });
    assertEqual(shown[shown.length - 1], true, 'blocked modal should show when not playable');
    ctrl.showOptionsBlockedModalIfNeeded({ playable: true });
    assertEqual(shown[shown.length - 1], false, 'blocked modal should hide when playable');
});

// ─── TapRouter ───────────────────────────────────────────────────────────────

test('findTapRoute returns null when no nav path is active', () => {
    const state = makeState();
    state.ENGINE.mode = core.PLAY;
    state.ENGINE.level = { grid: { w: 5, h: 5 } };
    state.ENGINE.nav = { path: [] };
    const levelUtils = { PACK: (x, y) => y * 5 + x, UNPACK: (k) => ({ x: k % 5, y: Math.floor(k / 5) }) };
    const router = createTapRouter({ core, state, levelUtils });
    const result = router.findTapRoute({ x: 2, y: 2 });
    assertEqual(result, null, 'no path → null');
});

test('findTapRoute returns empty array when target equals head position', () => {
    const state = makeState();
    state.ENGINE.mode = core.PLAY;
    state.ENGINE.level = {
        grid: { w: 5, h: 5 },
        blockSet: new Set(), gooseSet: new Set(), falseGoalKeys: new Set(),
        gateKeys: [0], goalKey: 24, mustPassKeys: [], filterMap: new Map(),
        flippingFilterMap: new Map(), portalMap: new Map(),
    };
    // head is at PACK(1,0) = 1; nav needs full shape for cloneTapRouteState
    state.ENGINE.nav = {
        path: [0, 1],
        visitedCounts: new Map([[0, 1], [1, 1]]),
        cellUsage: new Map(),
        intersections: 0,
        flipCount: 0,
        crossedFlippingFilters: new Map(),
        activeGateKey: 0,
        isPortalJump: new Set(),
    };
    state.ENGINE.hazards = { armedFalseGoals: new Set(), revealedGeese: new Set(), detonatedFalseGoals: new Set() };
    const levelUtils = { PACK: (x, y) => y * 5 + x, UNPACK: (k) => ({ x: k % 5, y: Math.floor(k / 5) }) };
    const router = createTapRouter({ core, state, levelUtils });
    const result = router.findTapRoute({ x: 1, y: 0 }); // same as head
    assert(Array.isArray(result) && result.length === 0, 'target == head → empty array');
});

let passed = 0;
for (const { name, fn } of tests) {
    try {
        fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(err.message);
        process.exitCode = 1;
    }
}
console.log(`\nEngine controller tests: ${passed} passed, ${tests.length - passed} failed`);
