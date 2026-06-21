import { createHazardController, computeJumpScareEffects, computeBombDetonationEffects } from '../modules/engine/hazard-controller.js';
import { createWinController, computeWinEffects } from '../modules/engine/win-controller.js';
import { EffectType } from '../modules/runtime/effects.js';
import { createChallengeOptionsController } from '../modules/engine/challenge-options.js';
import { createTapRouter } from '../modules/engine/tap-router.js';
import { createLevelFlowController, planResetCheat } from '../modules/engine/level-flow.js';
import { createReviewModeController, planSubmissionAdvance } from '../modules/engine/review-mode.js';
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

// ─── computeJumpScareEffects / computeBombDetonationEffects (pure) ───────────

test('computeJumpScareEffects returns SHOW_GOOSE_JUMP_SCARE effect', () => {
    const effects = computeJumpScareEffects();
    assert(Array.isArray(effects), 'should return an array');
    assert(effects.some(e => e.type === 'SHOW_GOOSE_JUMP_SCARE'), 'should include SHOW_GOOSE_JUMP_SCARE');
});

test('computeBombDetonationEffects returns SHOW_BOMB_DETONATION and PLAY_SOUND effects', () => {
    const effects = computeBombDetonationEffects();
    assert(Array.isArray(effects), 'should return an array');
    assert(effects.some(e => e.type === 'SHOW_BOMB_DETONATION'), 'should include SHOW_BOMB_DETONATION');
    assert(effects.some(e => e.type === 'PLAY_SOUND'), 'should include PLAY_SOUND');
});

test('computeBombDetonationEffects PLAY_SOUND uses C2 note', () => {
    const effects = computeBombDetonationEffects();
    const soundFx = effects.find(e => e.type === 'PLAY_SOUND');
    assertEqual(soundFx.note, 'C2', 'initial bomb sound should be C2');
});

test('triggerJumpScare cleanup fires hideGooseJumpScare when overlay unchanged (sync timer)', () => {
    const state = makeState();
    state.ENGINE.overlayState = core.GOOSE_OVERLAY;
    const uiCalls = [];
    const ui = {
        showGooseJumpScare: () => uiCalls.push('show'),
        hideGooseJumpScare: () => uiCalls.push('hide'),
    };
    const fakeTimer = (fn) => fn(); // fire immediately — bypasses the real 2500ms delay
    const setOverlayState = (v) => { state.ENGINE.overlayState = v; };
    const ctrl = createHazardController({ core, state, ui, setOverlayState, scheduleTimer: fakeTimer });
    ctrl.triggerJumpScare();
    assert(uiCalls.includes('hide'), 'hideGooseJumpScare should fire when overlay is still GOOSE_OVERLAY');
    assertEqual(state.ENGINE.overlayState, core.OVERLAY_NONE, 'overlay should reset to NONE');
});

test('triggerJumpScare cleanup does NOT fire hide when overlay changed before timer fires', () => {
    const state = makeState();
    const uiCalls = [];
    const ui = {
        showGooseJumpScare: () => uiCalls.push('show'),
        hideGooseJumpScare: () => uiCalls.push('hide'),
    };
    // Capture the callback without firing it immediately
    let capturedCallback = null;
    const capturingTimer = (fn) => { capturedCallback = fn; };
    const setOverlayState = (v) => { state.ENGINE.overlayState = v; };
    const ctrl = createHazardController({ core, state, ui, setOverlayState, scheduleTimer: capturingTimer });
    ctrl.triggerJumpScare(); // sets overlay to GOOSE_OVERLAY, captures callback
    // Simulate something else changing the overlay before the timer fires
    state.ENGINE.overlayState = core.FALSE_GOAL_ANIMATING;
    capturedCallback(); // now fire the cleanup manually
    assert(!uiCalls.includes('hide'), 'hideGooseJumpScare should NOT fire when overlay changed before timer');
});

test('triggerBombDetonation full sequence fires via injected sync timer', () => {
    const state = makeState();
    state.ENGINE.hazards = { detonatedFalseGoals: new Set(), revealedGeese: new Set(), armedFalseGoals: new Set() };
    const uiCalls = [];
    const sounds = [];
    const ui = {
        showBombDetonation: (opts) => uiCalls.push(['showBombDetonation', opts]),
        hideBombDetonation: () => uiCalls.push('hideBombDetonation'),
    };
    const localCore = { ...core, SOUND_BUS: { play: (n) => sounds.push(n) } };
    const overlayHistory = [];
    const setOverlayState = (v) => { state.ENGINE.overlayState = v; overlayHistory.push(v); };
    const fakeTimer = (fn) => fn(); // fires both stages immediately
    const ctrl = createHazardController({ core: localCore, state, ui, setOverlayState, scheduleTimer: fakeTimer });
    ctrl.triggerBombDetonation(42);
    // Stage 1: showBombDetonation({ exploded: true }) + F1
    assert(uiCalls.some(c => Array.isArray(c) && c[1]?.exploded === true), 'should show exploded bomb');
    assert(sounds.includes('F1'), 'F1 sound should play in stage 1');
    // Stage 2: hideBombDetonation + overlay reset
    assert(uiCalls.includes('hideBombDetonation'), 'bomb detonation UI should be hidden');
    assert(overlayHistory.includes(core.OVERLAY_NONE), 'overlay should return to NONE after full sequence');
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

test('applyPlayChallengeOptions strips geese in returned level without mutating input', () => {
    const state = makeState();
    state.ENGINE.mode = core.PLAY;
    state.ENGINE.options = { geese: false, falseGoals: true, deadGates: true };
    const level = { gooseSet: new Set([1, 2]), falseGoalKeys: new Set([3]), gateKeys: [5] };
    const ctrl = createChallengeOptionsController({ core, state, ui: {}, levelUtils: {} });
    const result = ctrl.applyPlayChallengeOptions(level);
    assertEqual(result.playable, true, 'should still be playable');
    assertEqual(result.level.gooseSet.size, 0, 'derived level should have geese cleared');
    assertEqual(result.level.falseGoalKeys.size, 1, 'derived level false goals should be unaffected');
    assertEqual(level.gooseSet.size, 2, 'input level must NOT be mutated');
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
    assertEqual(level.gateKeys.length, 1, 'input level gateKeys must NOT be mutated');
});

test('applyPlayChallengeOptions is no-op outside PLAY mode and returns same level', () => {
    const state = makeState();
    state.ENGINE.mode = core.EDITOR;
    state.ENGINE.options = { geese: false, falseGoals: false };
    const level = { gooseSet: new Set([1]), falseGoalKeys: new Set([2]) };
    const ctrl = createChallengeOptionsController({ core, state, ui: {}, levelUtils: {} });
    const result = ctrl.applyPlayChallengeOptions(level);
    assertEqual(level.gooseSet.size, 1, 'geese should be unchanged in editor mode');
    assert(result.level === level, 'returned level should be the same reference in non-PLAY mode');
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
        setClassState: () => {},
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

// Characterization: the editor-working-copy init is duplicated in switchMode(EDITOR) and
// _loadLevelByIndex (editor mode). These lock that behavior before/after consolidation.
function assertEditorWorkingCopyInitialized(deps, { inputs, syncedLevel }, expectReqLen, expectReqInt) {
    assert(deps.state.ENGINE.editor.workingLevel, 'working level should be set');
    assertEqual(deps.state.ENGINE.editor.isPencilMode, false, 'pencil mode reset off');
    assertEqual(deps.state.ENGINE.editor.isModified, false, 'modified flag reset');
    assertEqual(deps.state.ENGINE.editor.emptyClickCount, 0, 'empty click count reset');
    assert(inputs.some(([id, v]) => id === 'editReqLen' && v === expectReqLen), 'editReqLen input set');
    assert(inputs.some(([id, v]) => id === 'editReqInt' && v === expectReqInt), 'editReqInt input set');
    assert(syncedLevel, 'metadata fields synced from working level');
}

function instrumentEditorInit(deps) {
    const inputs = [];
    const recorder = { inputs, syncedLevel: null };
    deps.ui.setInputValue = (id, v) => inputs.push([id, v]);
    deps.editor.syncMetadataFieldsFromLevel = (l) => { recorder.syncedLevel = l; };
    deps.levelUtils.deepCloneLevel = (l) => ({ ...l });
    return recorder;
}

test('switchMode(EDITOR) initializes the editor working copy from the current level', () => {
    const deps = makeLevelFlowDeps();
    deps.state.ENGINE.level = { reqLen: 5, reqInt: 2 };
    deps.state.ENGINE.editor = { workingLevel: null, isPencilMode: true, emptyClickCount: 3, isModified: true, undoStack: [{}], validTrapSpots: new Set([1]) };
    const rec = instrumentEditorInit(deps);
    const ctrl = createLevelFlowController(deps);
    ctrl.switchMode(core.EDITOR);
    assertEditorWorkingCopyInitialized(deps, rec, 5, 2);
    assertEqual(deps.state.ENGINE.editor.workingLevel.reqLen, 5, 'working level cloned from current level');
});

test('loadLevel(idx) in EDITOR mode initializes the editor working copy', () => {
    const deps = makeLevelFlowDeps();
    deps.state.ENGINE.mode = core.EDITOR;
    deps.state.ENGINE.editor = { workingLevel: null, isPencilMode: true, emptyClickCount: 3, isModified: true, undoStack: [{}], validTrapSpots: new Set([1]) };
    const rec = instrumentEditorInit(deps);
    const ctrl = createLevelFlowController(deps);
    ctrl.loadLevel(0);
    // normalizeLevel stub returns reqLen:3, reqInt:0 → that's the level the editor copy comes from.
    assertEditorWorkingCopyInitialized(deps, rec, 3, 0);
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

test('handleResetAction activates cheat mode after 5 resets and fires sync timer', () => {
    const deps = makeLevelFlowDeps();
    deps.state.ENGINE.resetStreak = 4;
    deps.state.ENGINE.cheatActive = false;
    deps.state.ENGINE.cheatTimer  = null;
    const sounds = [];
    deps.core = { ...core, SOUND_BUS: { play: (n) => sounds.push(n) } };
    const fakeTimer = (fn) => fn();
    const ctrl = createLevelFlowController({ ...deps, scheduleTimer: fakeTimer });
    ctrl.handleResetAction(); // streak becomes 5 → cheat activates, timer fires immediately
    assert(sounds.includes('F5'), 'cheat activation should play F5');
    // Timer fires immediately → cheat deactivated and streak reset
    assertEqual(deps.state.ENGINE.cheatActive, false, 'cheat should be deactivated after timer fires');
    assertEqual(deps.state.ENGINE.resetStreak, 0, 'reset streak should be zeroed after cheat timer fires');
});

test('planResetCheat: below threshold just increments the streak', () => {
    const plan = planResetCheat({ cheatActive: false, resetStreak: 2 });
    assertEqual(plan.nextResetStreak, 3, 'streak should increment');
    assertEqual(plan.activateCheat, false, 'cheat should not activate below 5');
    assertEqual(plan.rescheduleExpiry, false, 'no expiry timer below threshold');
});

test('planResetCheat: the 5th reset activates cheat, plays sound, and clears streak on expiry', () => {
    const plan = planResetCheat({ cheatActive: false, resetStreak: 4 });
    assertEqual(plan.nextResetStreak, 5, 'streak reaches 5');
    assertEqual(plan.activateCheat, true, 'cheat activates at 5');
    assertEqual(plan.playSound, true, 'activation plays a sound');
    assertEqual(plan.rescheduleExpiry, true, 'an expiry timer is scheduled');
    assertEqual(plan.expiryClearsStreak, true, 'expiry zeroes the streak');
});

test('planResetCheat: a reset while cheat is active only refreshes expiry (streak untouched)', () => {
    const plan = planResetCheat({ cheatActive: true, resetStreak: 5 });
    assertEqual(plan.nextResetStreak, 5, 'streak is untouched while cheat is active');
    assertEqual(plan.activateCheat, false, 'cheat stays active without re-activating');
    assertEqual(plan.playSound, false, 'no sound on refresh');
    assertEqual(plan.rescheduleExpiry, true, 'expiry timer is refreshed');
    assertEqual(plan.expiryClearsStreak, false, 'refresh does not zero the streak');
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

test('planSubmissionAdvance: empty queue after removal loads index 0 and reports allDone', () => {
    const plan = planSubmissionAdvance(0, 2);
    assertEqual(plan.loadReviewIdx, 0, 'should load index 0 when none remain');
    assertEqual(plan.allDone, true, 'should report the queue is done');
});

test('planSubmissionAdvance: removing the last item clamps to the new last index', () => {
    // 3 submissions, remove index 2 → 2 remain → clamp to index 1.
    const plan = planSubmissionAdvance(2, 2);
    assertEqual(plan.loadReviewIdx, 1, 'should clamp to the new last index');
    assertEqual(plan.allDone, false, 'should not be done');
});

test('planSubmissionAdvance: removing a middle item stays on the same index', () => {
    // 3 submissions, remove index 1 → 2 remain → stay on index 1 (now the old index 2).
    const plan = planSubmissionAdvance(2, 1);
    assertEqual(plan.loadReviewIdx, 1, 'should stay on the same index');
    assertEqual(plan.allDone, false, 'should not be done');
});

test('removeAndAdvance removes the submission, loads the next, and reports allDone', () => {
    const state = makeState();
    state.ENGINE.review = { submissions: [{ id: 'A', levelData: {} }, { id: 'B', levelData: {} }], currentIdx: 0, savedPlayLevelIdx: 0 };
    const ctrl = createReviewModeController({
        state, ui: { setInputValue: () => {}, renderMetricsPanel: () => {}, updateLevelDisplay: () => {},
                     setButtonLabel: () => {}, setClassState: () => {}, updateAppScale: () => {}, updateViewport: () => {},
                     showMessage: () => {}, applyHintPinState: () => {} },
        levelUtils: { processRawLevel: (raw) => ({ ...raw, reqLen: 0, reqInt: 0 }) },
        editor: { syncMetadataFieldsFromLevel: () => {} },
        PathNavigator: { clear: () => {} },
    });
    const plan1 = ctrl.removeAndAdvance(0);
    assertEqual(state.ENGINE.review.submissions.length, 1, 'one submission removed');
    assertEqual(plan1.allDone, false, 'still one left');
    assertEqual(plan1.loadReviewIdx, 0, 'loads the remaining item');
    const plan2 = ctrl.removeAndAdvance(0);
    assertEqual(state.ENGINE.review.submissions.length, 0, 'all submissions removed');
    assertEqual(plan2.allDone, true, 'queue is now done');
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
