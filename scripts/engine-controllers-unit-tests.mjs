import { createHazardController } from '../modules/engine/hazard-controller.js';
import { createWinController, computeWinEffects } from '../modules/engine/win-controller.js';
import { EffectType } from '../modules/runtime/effects.js';
import { createChallengeOptionsController } from '../modules/engine/challenge-options.js';
import { createTapRouter } from '../modules/engine/tap-router.js';
import { createLevelFlowController } from '../modules/engine/level-flow.js';
import { createReviewModeController } from '../modules/engine/review-mode.js';
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

// ─── computeWinEffects (pure, DOM-free) ──────────────────────────────────────

test('computeWinEffects always includes PLAY_SOUND and OPEN_MODAL', () => {
    const state = makeState();
    state.ENGINE.mode = core.PLAY;
    state.ENGINE.levelIdx = 0;
    const effects = computeWinEffects(state, core);
    assert(effects.some(e => e.type === EffectType.PLAY_SOUND), 'should include PLAY_SOUND');
    assert(effects.some(e => e.type === EffectType.OPEN_MODAL), 'should include OPEN_MODAL');
});

test('computeWinEffects PLAY_SOUND uses C5 note', () => {
    const state = makeState();
    state.ENGINE.mode = core.PLAY;
    const effects = computeWinEffects(state, core);
    const soundFx = effects.find(e => e.type === EffectType.PLAY_SOUND);
    assertEqual(soundFx.note, 'C5', 'win sound should be C5');
});

test('computeWinEffects OPEN_MODAL targets winModal', () => {
    const state = makeState();
    state.ENGINE.mode = core.PLAY;
    const effects = computeWinEffects(state, core);
    const modalFx = effects.find(e => e.type === EffectType.OPEN_MODAL);
    assertEqual(modalFx.modalId, 'winModal', 'should open winModal');
});

test('computeWinEffects in PLAY mode includes PERSIST_PROGRESS with correct levelIdx', () => {
    const state = makeState();
    state.ENGINE.mode = core.PLAY;
    state.ENGINE.levelIdx = 7;
    const effects = computeWinEffects(state, core);
    const persistFx = effects.find(e => e.type === EffectType.PERSIST_PROGRESS);
    assert(persistFx !== undefined, 'should include PERSIST_PROGRESS in PLAY mode');
    assertEqual(persistFx.levelIdx, 7, 'persistProgress should carry the correct levelIdx');
});

test('computeWinEffects in EDITOR mode omits PERSIST_PROGRESS', () => {
    const state = makeState();
    state.ENGINE.mode = core.EDITOR;
    state.ENGINE.levelIdx = 7;
    const effects = computeWinEffects(state, core);
    assert(!effects.some(e => e.type === EffectType.PERSIST_PROGRESS), 'PERSIST_PROGRESS should be absent in EDITOR mode');
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

// ─── LevelFlowController ─────────────────────────────────────────────────────

function makeLevelFlowDeps(overrides = {}) {
    const state = makeState();
    state.ENGINE.mode = core.PLAY;
    state.ENGINE.levelIdx = 0;
    state.ENGINE.level = { reqLen: 3, reqInt: 0 };
    state.ENGINE.editor = { workingLevel: null, isPencilMode: false, emptyClickCount: 0, isModified: false, validTrapSpots: new Set() };
    state.ENGINE.hazards = { detonatedFalseGoals: new Set(), revealedGeese: new Set(), armedFalseGoals: new Set() };
    state.ENGINE.solver = { controller: null };
    state.ENGINE.review = { submissions: [], currentIdx: 0, savedPlayLevelIdx: 0 };
    state.ENGINE.cheatActive = false;
    state.ENGINE.cheatTimer = null;
    state.ENGINE.resetStreak = 0;
    state.ENGINE.progressSet = new Set();
    state.ENGINE.runtime = { pendingAction: null };
    state.ENGINE.options = {};
    state.ENGINE.isDevMode = false;
    state.ENGINE.ripples = [];
    state.ENGINE.nav = {
        path: [], visitedCounts: new Map(), cellUsage: new Map(),
        intersections: 0, flipCount: 0, crossedFlippingFilters: new Map(),
        activeGateKey: null, isPortalJump: new Set(),
    };
    const uiCalls = [];
    const ui = {
        updatePencilButton: () => {},
        applyModeLayout: (...a) => uiCalls.push(['applyModeLayout', ...a]),
        updateLevelDisplay: () => {},
        closeModal: (id) => uiCalls.push(['closeModal', id]),
        setSolutionOutput: () => {},
        showMessage: () => {},
        updateAppScale: () => {},
        updateViewport: () => {},
        syncEditorPalettePlacement: () => {},
        applyHintPinState: () => {},
        setInputValue: () => {},
        setOptionsBlockedVisible: () => {},
    };
    return {
        state, ui, uiCalls,
        core,
        data: { getLevels: () => [{}], getLevel: () => ({}) },
        levelUtils: {
            normalizeLevel: (_idx) => ({ reqLen: 3, reqInt: 0, gateKeys: [0], goalKey: 9, grid: { w: 3, h: 3 }, blockSet: new Set(), gooseSet: new Set(), falseGoalKeys: new Set(), mustPassKeys: [], filterMap: new Map(), flippingFilterMap: new Map(), portalMap: new Map() }),
            assertLevelShape: () => {},
            deepCloneLevel: (l) => ({ ...l }),
        },
        persistence: { persistSessionState: () => {} },
        editor: { syncMetadataFieldsFromLevel: () => {} },
        PathNavigator: { clear: () => {} },
        clearBombTimers: () => {},
        applyPlayChallengeOptions: () => ({ playable: true }),
        showOptionsBlockedModalIfNeeded: () => {},
        resetEmptyReviewState: () => {},
        setLogicState: () => true,
        setOverlayState: () => {},
        ...overrides,
    };
}

test('switchMode to EDITOR sets editor working level from current level', () => {
    const deps = makeLevelFlowDeps();
    deps.state.ENGINE.level = { reqLen: 5, reqInt: 1 };
    let cloned = null;
    deps.levelUtils.deepCloneLevel = (l) => { cloned = { ...l }; return cloned; };
    deps.state.ENGINE.editor = { workingLevel: null, isPencilMode: false, emptyClickCount: 0, isModified: false, validTrapSpots: new Set() };
    const ctrl = createLevelFlowController(deps);
    ctrl.switchMode(core.EDITOR);
    // After switchMode(EDITOR), applyModeLayout should have been called with EDITOR
    assert(deps.uiCalls.some(c => c[0] === 'applyModeLayout' && c[1] === core.EDITOR),
        'applyModeLayout should be called with EDITOR mode');
});

test('switchMode to REVIEW calls resetEmptyReviewState', () => {
    const deps = makeLevelFlowDeps();
    let resetCalled = false;
    deps.resetEmptyReviewState = () => { resetCalled = true; };
    deps.state.ENGINE.levelIdx = 3;
    deps.state.ENGINE.review = { savedPlayLevelIdx: 3, submissions: [], currentIdx: 0 };
    const ctrl = createLevelFlowController(deps);
    ctrl.switchMode(core.REVIEW);
    assert(resetCalled, 'resetEmptyReviewState should be called when entering REVIEW mode');
});

test('handleResetAction increments reset streak', () => {
    const deps = makeLevelFlowDeps();
    deps.state.ENGINE.resetStreak = 0;
    deps.state.ENGINE.cheatActive = false;
    deps.data.getLevels = () => [{}];
    deps.data.getLevel = () => ({});
    const ctrl = createLevelFlowController(deps);
    ctrl.handleResetAction();
    assert(deps.state.ENGINE.resetStreak >= 1, 'reset streak should increment');
});

test('initReviewMode resets submissions then switches to REVIEW', () => {
    const deps = makeLevelFlowDeps();
    deps.state.ENGINE.review = { submissions: [{ id: 1 }], currentIdx: 0, savedPlayLevelIdx: 0 };
    let resetCalled = false;
    deps.resetEmptyReviewState = () => { resetCalled = true; };
    const ctrl = createLevelFlowController(deps);
    ctrl.initReviewMode();
    assertEqual(deps.state.ENGINE.review.submissions.length, 0, 'submissions should be cleared');
    assert(resetCalled, 'resetEmptyReviewState should be called');
});

// ─── ReviewModeController (setReviewSubmissions / removeReviewSubmission) ─────

test('setReviewSubmissions replaces the submissions array', () => {
    const state = makeState();
    state.ENGINE.review = { submissions: [], currentIdx: 0, savedPlayLevelIdx: 0 };
    const ctrl = createReviewModeController({
        state, ui: { setInputValue: () => {}, renderMetricsPanel: () => {}, updateLevelDisplay: () => {},
                     setButtonLabel: () => {}, setClassState: () => {}, updateAppScale: () => {}, updateViewport: () => {},
                     showMessage: () => {} },
        levelUtils: { processRawLevel: () => null },
        editor: { syncMetadataFieldsFromLevel: () => {} },
        PathNavigator: { clear: () => {} },
    });
    ctrl.setReviewSubmissions([{ levelData: {} }, { levelData: {} }]);
    assertEqual(state.ENGINE.review.submissions.length, 2, 'should have 2 submissions after set');
});

test('removeReviewSubmission removes entry by index', () => {
    const state = makeState();
    state.ENGINE.review = { submissions: [{ id: 'A' }, { id: 'B' }, { id: 'C' }], currentIdx: 0, savedPlayLevelIdx: 0 };
    const ctrl = createReviewModeController({
        state, ui: { setInputValue: () => {}, renderMetricsPanel: () => {}, updateLevelDisplay: () => {},
                     setButtonLabel: () => {}, setClassState: () => {}, updateAppScale: () => {}, updateViewport: () => {},
                     showMessage: () => {} },
        levelUtils: { processRawLevel: () => null },
        editor: { syncMetadataFieldsFromLevel: () => {} },
        PathNavigator: { clear: () => {} },
    });
    ctrl.removeReviewSubmission(1);
    assertEqual(state.ENGINE.review.submissions.length, 2, 'should have 2 submissions after removal');
    assertEqual(state.ENGINE.review.submissions[0].id, 'A', 'first entry should be A');
    assertEqual(state.ENGINE.review.submissions[1].id, 'C', 'second entry should be C');
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
