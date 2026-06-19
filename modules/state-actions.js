import { buildPathListHeatmap } from './domain/heatmap.js';

const resolveEngineState = (stateOrEngine) => stateOrEngine?.ENGINE ?? stateOrEngine;

export function markDirty(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.isDirty = true;
    return engineState;
}

export function clearDirty(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.isDirty = false;
    return engineState;
}

export function setMuted(stateOrEngine, muted) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.muted = !!muted;
    return engineState?.muted ?? false;
}

export function toggleMuted(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.muted = !engineState.muted;
    return engineState.muted;
}

export function setNavigationSnapshot(stateOrEngine, snapshot = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav) return null;
    nav.path = [...(snapshot.path || [])];
    nav.isPortalJump = new Set(snapshot.isPortalJump || []);
    nav.activeGateKey = snapshot.activeGateKey ?? null;
    return nav;
}

export function clearNavigation(stateOrEngine) {
    return setNavigationSnapshot(stateOrEngine, {
        path: [],
        isPortalJump: [],
        activeGateKey: null
    });
}

export function truncateNavigationPath(stateOrEngine, targetIdx) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav ?? engineState;
    if (!nav?.path || targetIdx < -1 || targetIdx >= nav.path.length - 1) return null;
    nav.path.splice(targetIdx + 1);
    nav.isPortalJump = new Set([...nav.isPortalJump].filter(jumpIdx => jumpIdx <= targetIdx));
    if (nav.path.length === 0) nav.activeGateKey = null;
    return nav;
}

export function reverseNavigationPath(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav ?? engineState;
    if (!nav?.path) return null;
    nav.path.reverse();
    nav.isPortalJump = new Set([...nav.isPortalJump].map(jumpIdx => nav.path.length - 1 - jumpIdx));
    return nav;
}

export function remapNavigationKeys(stateOrEngine, mapFn) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav ?? engineState;
    if (!nav?.path || typeof mapFn !== 'function') return null;
    nav.path = nav.path.map(key => key === -1 ? -1 : mapFn(key));
    if (nav.activeGateKey != null) nav.activeGateKey = mapFn(nav.activeGateKey);
    return nav;
}

export function setRevealedGeese(stateOrEngine, keys = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.revealedGeese = new Set(keys);
    return hazards.revealedGeese;
}

export function setDetonatedFalseGoals(stateOrEngine, keys = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.detonatedFalseGoals = new Set(keys);
    return hazards.detonatedFalseGoals;
}

export function setArmedFalseGoals(stateOrEngine, keys = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.armedFalseGoals = new Set(keys);
    return hazards.armedFalseGoals;
}

export function detonateFalseGoal(stateOrEngine, key) {
    const engineState = resolveEngineState(stateOrEngine);
    const hazards = engineState?.hazards;
    if (!hazards) return null;
    hazards.armedFalseGoals.delete(key);
    hazards.detonatedFalseGoals.add(key);
    return hazards;
}

export function resetFalseGoalHazardsForLevel(stateOrEngine, level) {
    const engineState = resolveEngineState(stateOrEngine);
    const activeLevel = level ?? engineState?.level;
    setArmedFalseGoals(engineState, activeLevel?.falseGoalKeys || []);
    setDetonatedFalseGoals(engineState, []);
    return engineState?.hazards ?? null;
}

export function restoreFalseGoalHazardsForLevel(stateOrEngine, level, detonatedKeys = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const activeLevel = level ?? engineState?.level;
    const detonated = setDetonatedFalseGoals(engineState, detonatedKeys) || new Set();
    const armed = new Set(activeLevel?.falseGoalKeys || []);
    detonated.forEach(k => armed.delete(k));
    setArmedFalseGoals(engineState, armed);
    return engineState?.hazards ?? null;
}

export function resetHintAnimationClock(stateOrEngine, { alpha = 0, index } = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.alpha = alpha;
    if (index !== undefined) hinter.index = index;
    hinter.holdStartMs = 0;
    hinter.blinkStartMs = 0;
    hinter.fadeStartMs = 0;
    return hinter;
}

export function setHintAnimationIndex(stateOrEngine, index) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.index = index;
    return hinter.index;
}

export function advanceHintAnimationIndex(stateOrEngine, delta = 0) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.index += delta;
    return hinter.index;
}

export function setHintAnimationAlpha(stateOrEngine, alpha) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.alpha = alpha;
    return hinter.alpha;
}

export function setHintHoldStartMsIfUnset(stateOrEngine, holdStartMs) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    if (!hinter.holdStartMs) hinter.holdStartMs = holdStartMs;
    return hinter.holdStartMs;
}

export function setHintBlinkStartMsIfUnset(stateOrEngine, blinkStartMs) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    if (!hinter.blinkStartMs) hinter.blinkStartMs = blinkStartMs;
    return hinter.blinkStartMs;
}

export function setHintFadeStartMs(stateOrEngine, fadeStartMs) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return undefined;
    hinter.fadeStartMs = fadeStartMs;
    return hinter.fadeStartMs;
}

export function setHintPaths(stateOrEngine, pathList = [], source = 'none', currentIdx = 0) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.pathList = pathList;
    hinter.currentPathIdx = currentIdx;
    hinter.source = source;
    hinter.heatmap = buildPathListHeatmap(pathList);
    return hinter;
}

export function clearHintPaths(stateOrEngine, { resetSource = true } = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.pathList = [];
    hinter.currentPathIdx = 0;
    if (resetSource) hinter.source = 'none';
    hinter.heatmap = null;
    return hinter;
}

export function resetHinterForLevel(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    clearHintPaths(engineState);
    resetHintAnimationClock(engineState, { alpha: 0, index: 0 });
    clearPersistedHint(stateOrEngine);
    clearPersistedHeatmap(stateOrEngine);
    return engineState?.hinter ?? null;
}

export function pinCurrentHint(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter?.pathList?.length) return false;
    hinter.persistedPath = [...hinter.pathList[hinter.currentPathIdx]];
    hinter.persistedHintIdx = hinter.currentPathIdx;
    return true;
}

export function clearPersistedHint(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.persistedPath = [];
    hinter.persistedHintIdx = -1;
    return hinter;
}

export function pinCurrentHeatmap(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter?.heatmap || !hinter.pathList.length) return false;
    hinter.persistedHeatmap = new Map(hinter.heatmap);
    hinter.persistedHeatmapPathCount = hinter.pathList.length;
    return true;
}

export function clearPersistedHeatmap(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const hinter = engineState?.hinter;
    if (!hinter) return null;
    hinter.persistedHeatmap = null;
    hinter.persistedHeatmapPathCount = 0;
    return hinter;
}

export function startSolverRun(stateOrEngine, controller) {
    const engineState = resolveEngineState(stateOrEngine);
    const solver = engineState?.solver;
    if (!solver) return null;
    solver.controller = controller;
    solver.abortRequested = false;
    return solver;
}

export function requestSolverAbort(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const solver = engineState?.solver;
    if (!solver?.controller) return null;
    solver.abortRequested = true;
    return solver;
}

export function endSolverRun(stateOrEngine) {
    return startSolverRun(stateOrEngine, null);
}

export function setReviewSavedPlayLevelIndex(stateOrEngine, levelIdx) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review) return undefined;
    review.savedPlayLevelIdx = levelIdx;
    return review.savedPlayLevelIdx;
}

export function setReviewIndex(stateOrEngine, currentIdx) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review) return undefined;
    review.currentIdx = currentIdx;
    return review.currentIdx;
}

export function setReviewSubmissions(stateOrEngine, submissions = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review) return null;
    review.submissions = submissions;
    return review.submissions;
}

export function removeReviewSubmission(stateOrEngine, idx) {
    const engineState = resolveEngineState(stateOrEngine);
    const review = engineState?.review;
    if (!review?.submissions) return null;
    review.submissions.splice(idx, 1);
    return review.submissions;
}

export function resetReviewSubmissions(stateOrEngine) {
    setReviewSubmissions(stateOrEngine, []);
    setReviewIndex(stateOrEngine, 0);
    return resolveEngineState(stateOrEngine)?.review ?? null;
}

export function setEditorWorkingLevel(stateOrEngine, workingLevel) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.workingLevel = workingLevel;
    return editor.workingLevel;
}

export function setEditorPencilMode(stateOrEngine, isPencilMode) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isPencilMode = !!isPencilMode;
    return editor.isPencilMode;
}

export function setEditorModified(stateOrEngine, isModified) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isModified = !!isModified;
    return editor.isModified;
}

export function setEditorEmptyClickCount(stateOrEngine, emptyClickCount) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.emptyClickCount = emptyClickCount;
    return editor.emptyClickCount;
}

export function incrementEditorEmptyClickCount(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.emptyClickCount += 1;
    return editor.emptyClickCount;
}

export function setEditorMetrics(stateOrEngine, metrics = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    if (Object.hasOwn(metrics, 'reqLen')) workingLevel.reqLen = metrics.reqLen;
    if (Object.hasOwn(metrics, 'reqInt')) workingLevel.reqInt = metrics.reqInt;
    return workingLevel;
}

export function setEditorWorkingHints(stateOrEngine, hints = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    workingLevel.hints = hints;
    return workingLevel.hints;
}

export function resetEditorWorkingGrid(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const workingLevel = engineState?.editor?.workingLevel;
    if (!workingLevel) return null;
    Object.assign(workingLevel, {
        gateKeys: [],
        goalKey: -1,
        falseGoalKeys: new Set(),
        blockSet: new Set(),
        gooseSet: new Set(),
        mustPassKeys: [],
        mustCrossKeys: [],
        filterMap: new Map(),
        flippingFilterMap: new Map(),
        portalMap: new Map(),
        portalVisuals: [],
        hints: []
    });
    return workingLevel;
}

export function clearEditorUndoStack(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.undoStack = [];
    return editor.undoStack;
}

export function popEditorUndoStack(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor?.undoStack?.length) return undefined;
    return editor.undoStack.pop();
}

export function clearEditorValidTrapSpots(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.validTrapSpots.clear();
    return editor.validTrapSpots;
}

export function setEditorDraggedFromGrid(stateOrEngine, draggedFromGrid) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.draggedFromGrid = !!draggedFromGrid;
    return editor.draggedFromGrid;
}

export function setEditorPendingPortal(stateOrEngine, pendingPortal) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.pendingPortal = pendingPortal;
    return editor.pendingPortal;
}

export function setEditorDraggedObject(stateOrEngine, draggedObject) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.draggedObject = draggedObject;
    return editor.draggedObject;
}

export function setEditorValidTrapSpots(stateOrEngine, validTrapSpots = new Set()) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return null;
    editor.validTrapSpots = validTrapSpots || new Set();
    return editor.validTrapSpots;
}

export function setEditorSelectedTool(stateOrEngine, selectedTool) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return undefined;
    editor.selectedTool = selectedTool;
    return editor.selectedTool;
}

export function toggleEditorPencilMode(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.isPencilMode = !editor.isPencilMode;
    return editor.isPencilMode;
}

export function toggleEditorMirrorHorizontal(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const editor = engineState?.editor;
    if (!editor) return false;
    editor.mirrorHorizontal = !editor.mirrorHorizontal;
    return editor.mirrorHorizontal;
}

export function resetEditorSession(stateOrEngine, options = {}) {
    if (Object.hasOwn(options, 'workingLevel')) {
        setEditorWorkingLevel(stateOrEngine, options.workingLevel);
    }
    setEditorPencilMode(stateOrEngine, options.isPencilMode ?? false);
    clearEditorUndoStack(stateOrEngine);
    if (options.clearTrapSpots !== false) clearEditorValidTrapSpots(stateOrEngine);
    setEditorEmptyClickCount(stateOrEngine, options.emptyClickCount ?? 0);
    setEditorModified(stateOrEngine, options.isModified ?? false);
    return resolveEngineState(stateOrEngine)?.editor ?? null;
}

export function clearNavigationUndoStack(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav) return null;
    nav.undoStack = [];
    return nav.undoStack;
}

export function popNavigationUndoStack(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav?.undoStack?.length) return undefined;
    return nav.undoStack.pop();
}

export function stepVisualFlipCount(stateOrEngine, step = 0.15) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav) return false;
    if (nav.visualFlipCount < nav.flipCount) {
        nav.visualFlipCount = Math.min(nav.flipCount, nav.visualFlipCount + step);
        return true;
    }
    if (nav.visualFlipCount > nav.flipCount) {
        nav.visualFlipCount = Math.max(nav.flipCount, nav.visualFlipCount - step);
        return true;
    }
    return false;
}

export function addRipple(stateOrEngine, ripple) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState?.ripples) return null;
    engineState.ripples.push(ripple);
    return engineState.ripples;
}

export function setRipples(stateOrEngine, ripples = []) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return null;
    engineState.ripples = ripples;
    return engineState.ripples;
}

export function clearRipples(stateOrEngine) {
    return setRipples(stateOrEngine, []);
}

export function pruneRipples(stateOrEngine, nowMs, maxAgeMs = 600) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState?.ripples) return null;
    engineState.ripples = engineState.ripples.filter(ripple => nowMs - ripple.startTime < maxAgeMs);
    return engineState.ripples;
}

export function setFoundHintsSinceLoad(stateOrEngine, hints = []) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return null;
    engineState.foundHintsSinceLoad = hints;
    return engineState.foundHintsSinceLoad;
}

export function setNavigationActiveGateKey(stateOrEngine, activeGateKey) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav;
    if (!nav) return undefined;
    nav.activeGateKey = activeGateKey;
    return nav.activeGateKey;
}

export function setNavigationLastFlipTime(stateOrEngine, lastFlipTime) {
    const engineState = resolveEngineState(stateOrEngine);
    const nav = engineState?.nav ?? engineState;
    if (!nav) return undefined;
    nav.lastFlipTime = lastFlipTime;
    return nav.lastFlipTime;
}

export function setRuntimeTapStartCoord(stateOrEngine, tapStartCoord) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.tapStartCoord = tapStartCoord;
    return runtime.tapStartCoord;
}

export function setRuntimeTapMoved(stateOrEngine, tapMoved) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return false;
    runtime.tapMoved = !!tapMoved;
    return runtime.tapMoved;
}

export function setRuntimeActivePointerId(stateOrEngine, activePointerId) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.activePointerId = activePointerId;
    return runtime.activePointerId;
}

export function setGamepadGridPrimaryAction(stateOrEngine, gamepadGridPrimaryAction) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.gamepadGridPrimaryAction = gamepadGridPrimaryAction;
    return ui.gamepadGridPrimaryAction;
}

export function setUiFocusGroupState(stateOrEngine, focusGroup, focusIndex) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return null;
    ui.focusGroup = focusGroup;
    ui.focusIndex = focusIndex;
    return ui;
}

export function setGamepadFocusEnabled(stateOrEngine, gamepadFocusEnabled) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return false;
    ui.gamepadFocusEnabled = !!gamepadFocusEnabled;
    return ui.gamepadFocusEnabled;
}

export function setUiFocusIndex(stateOrEngine, focusIndex) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.focusIndex = focusIndex;
    return ui.focusIndex;
}

export function toggleDevMode(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.isDevMode = !engineState.isDevMode;
    return engineState.isDevMode;
}

export function toggleFlag(stateOrEngine, flagName) {
    const engineState = resolveEngineState(stateOrEngine);
    const flags = engineState?.flags;
    if (!flags) return false;
    flags[flagName] = !flags[flagName];
    return flags[flagName];
}

export function setUiBLastPressTime(stateOrEngine, bLastPressTime) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.bLastPressTime = bLastPressTime;
    return ui.bLastPressTime;
}

export function setUiBSingleTimer(stateOrEngine, bSingleTimer) {
    const engineState = resolveEngineState(stateOrEngine);
    const ui = engineState?.ui;
    if (!ui) return undefined;
    ui.bSingleTimer = bSingleTimer;
    return ui.bSingleTimer;
}

export function setGamepadHasPad(stateOrEngine, hasPad) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return false;
    gamepad.hasPad = !!hasPad;
    return gamepad.hasPad;
}

export function setGamepadNextMoveAt(stateOrEngine, nextMoveAt) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return undefined;
    gamepad.nextMoveAt = nextMoveAt;
    return gamepad.nextMoveAt;
}

export function setGamepadLastButtons(stateOrEngine, lastButtons = []) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return null;
    gamepad.lastButtons = lastButtons;
    return gamepad.lastButtons;
}

export function setGamepadRafState(stateOrEngine, rafState = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const gamepad = engineState?.gamepad;
    if (!gamepad) return null;
    if (Object.hasOwn(rafState, 'rafId')) gamepad.rafId = rafState.rafId;
    if (Object.hasOwn(rafState, 'rafActive')) gamepad.rafActive = rafState.rafActive;
    return gamepad;
}

export function resetGamepadConnectionState(stateOrEngine) {
    setGamepadHasPad(stateOrEngine, false);
    setGamepadLastButtons(stateOrEngine, []);
    return resolveEngineState(stateOrEngine)?.gamepad ?? null;
}

export function setCurrentThemeName(stateOrEngine, name) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.currentTheme = name;
    return runtime.currentTheme;
}

export function setRuntimePendingAction(stateOrEngine, pendingAction) {
    const engineState = resolveEngineState(stateOrEngine);
    const runtime = engineState?.runtime;
    if (!runtime) return undefined;
    runtime.pendingAction = pendingAction;
    return runtime.pendingAction;
}

export function clearRuntimePendingAction(stateOrEngine) {
    return setRuntimePendingAction(stateOrEngine, null);
}

export function setOptionValue(stateOrEngine, key, value) {
    const engineState = resolveEngineState(stateOrEngine);
    const options = engineState?.options;
    if (!options) return undefined;
    options[key] = value;
    return options[key];
}

export function setCheatTimer(stateOrEngine, timer) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return undefined;
    engineState.cheatTimer = timer;
    return engineState.cheatTimer;
}

export function setCheatActive(stateOrEngine, active) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return false;
    engineState.cheatActive = !!active;
    return engineState.cheatActive;
}

export function incrementResetStreak(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return 0;
    engineState.resetStreak += 1;
    return engineState.resetStreak;
}

export function setResetStreak(stateOrEngine, resetStreak) {
    const engineState = resolveEngineState(stateOrEngine);
    if (!engineState) return undefined;
    engineState.resetStreak = resetStreak;
    return engineState.resetStreak;
}

export function setMode(stateOrEngine, mode) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.mode = mode;
    return engineState?.mode;
}

export function setLogicState(stateOrEngine, logicState) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.logicState = logicState;
    return engineState?.logicState;
}

export function setOverlayState(stateOrEngine, overlayState) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.overlayState = overlayState;
    return engineState?.overlayState;
}

export function setLevelIndex(stateOrEngine, levelIdx) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.levelIdx = levelIdx;
    return engineState?.levelIdx;
}

export function setVariant(stateOrEngine, variant) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.variant = variant;
    return engineState?.variant;
}

export function setLevel(stateOrEngine, level) {
    const engineState = resolveEngineState(stateOrEngine);
    if (engineState) engineState.level = level;
    return engineState?.level;
}

export function setLevelRatingContext(stateOrEngine, { fingerprint = null, levelNumber = null, loaded = false } = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return null;
    rating.fingerprint = fingerprint;
    rating.levelNumber = levelNumber;
    rating.loaded = loaded;
    rating.tags = new Set();
    rating.customTags = [];
    rating.difficulty = 0;
    rating.fun = 0;
    return rating;
}

export function applyLevelRatingData(stateOrEngine, { tags = [], customTags = [], difficulty = 0, fun = 0 } = {}) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return null;
    rating.tags = new Set(tags);
    rating.customTags = [...customTags];
    rating.difficulty = difficulty || 0;
    rating.fun = fun || 0;
    rating.loaded = true;
    return rating;
}

export function toggleLevelRatingTag(stateOrEngine, tag) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating || !tag) return false;
    if (rating.tags.has(tag)) rating.tags.delete(tag);
    else rating.tags.add(tag);
    return rating.tags.has(tag);
}

export function addLevelRatingCustomTag(stateOrEngine, tag) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    const trimmed = (tag || '').trim();
    if (!rating || !trimmed || rating.customTags.includes(trimmed)) return rating?.customTags ?? null;
    rating.customTags.push(trimmed);
    return rating.customTags;
}

export function removeLevelRatingCustomTag(stateOrEngine, tag) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return null;
    rating.customTags = rating.customTags.filter(t => t !== tag);
    return rating.customTags;
}

export function setLevelRatingDifficulty(stateOrEngine, value) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return undefined;
    rating.difficulty = value;
    return rating.difficulty;
}

export function setLevelRatingFun(stateOrEngine, value) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return undefined;
    rating.fun = value;
    return rating.fun;
}

export function incrementLevelRatingRequestId(stateOrEngine) {
    const engineState = resolveEngineState(stateOrEngine);
    const rating = engineState?.levelRating;
    if (!rating) return 0;
    rating.requestId += 1;
    return rating.requestId;
}
