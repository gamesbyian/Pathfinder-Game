/** Unit tests for narrow state command helpers. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
  addRipple,
  advanceHintAnimationIndex,
  clearDirty,
  clearEditorUndoStack,
  addEditorTriggerableFalseGoalCells,
  clearEditorTriggerableFalseGoalCells,
  clearHintPaths,
  clearNavigation,
  clearNavigationUndoStack,
  popNavigationUndoStack,
  clearPersistedHint,
  clearRipples,
  clearRuntimePendingAction,
  detonateFalseGoal,
  endSolverRun,
  incrementEditorEmptyClickCount,
  incrementResetStreak,
  markDirty,
  pinCurrentHint,
  removeReviewSubmission,
  popEditorUndoStack,
  resetEditorSession,
  resetEditorWorkingGrid,
  resetHintAnimationClock,
  resetFalseGoalHazardsForLevel,
  resetHinterForLevel,
  reverseNavigationPath,
  remapNavigationKeys,
  resetReviewSubmissions,
  requestSolverAbort,
  pruneRipples,
  restoreFalseGoalHazardsForLevel,
  setArmedFalseGoals,
  setCheatActive,
  setCheatTimer,
  setCurrentThemeName,
  setDetonatedFalseGoals,
  setEditorDraggedFromGrid,
  setEditorDraggedObject,
  setEditorEmptyClickCount,
  setEditorMetrics,
  setEditorModified,
  setEditorPendingPortal,
  setEditorPencilMode,
  setEditorSelectedTool,
  setEditorFalseGoalTriggerParityCandidates,
  setEditorFalseGoalTriggerScanState,
  setEditorTriggerableFalseGoalCells,
  setEditorWorkingHints,
  setEditorWorkingLevel,
  setFoundHintsSinceLoad,
  setHintAnimationAlpha,
  setHintAnimationIndex,
  setHintBlinkStartMsIfUnset,
  setHintFadeStartMs,
  setHintHoldStartMsIfUnset,
  setHintPaths,
  setLevel,
  setLevelIndex,
  setLogicState,
  setMode,
  setNavigationActiveGateKey,
  setNavigationLastFlipTime,
  setNavigationSnapshot,
  setMuted,
  setOptionValue,
  setOverlayState,
  setRuntimeActivePointerId,
  setRuntimeTapMoved,
  setRuntimeTapStartCoord,
  setRevealedGeese,
  setReviewIndex,
  setReviewSavedPlayLevelIndex,
  setResetStreak,
  setReviewSubmissions,
  setRuntimePendingAction,
  resetGamepadConnectionState,
  setGamepadFocusEnabled,
  setGamepadGridPrimaryAction,
  setGamepadHasPad,
  setGamepadLastButtons,
  setGamepadNextMoveAt,
  setGamepadRafState,
  setUiBLastPressTime,
  setUiBSingleTimer,
  setUiFocusGroupState,
  setUiFocusIndex,
  startSolverRun,
  stepVisualFlipCount,
  setOrientation,
  toggleDevMode,
  toggleFlag,
  toggleEditorMirrorHorizontal,
  toggleEditorPencilMode,
  toggleMuted,
  truncateNavigationPath
} from './state-actions.js';


test('markDirty and clearDirty accept the app state wrapper', () => {
  const state = { ENGINE: { isDirty: false } } as any;
  assert.equal(markDirty(state), state.ENGINE);
  assert.equal(state.ENGINE.isDirty, true);
  assert.equal(clearDirty(state), state.ENGINE);
  assert.equal(state.ENGINE.isDirty, false);
});

test('markDirty and clearDirty accept the raw engine state', () => {
  const engineState = { isDirty: false } as any;
  markDirty(engineState);
  assert.equal(engineState.isDirty, true);
  clearDirty(engineState);
  assert.equal(engineState.isDirty, false);
});

test('setMuted normalizes values and toggleMuted returns the next state', () => {
  const state = { ENGINE: { muted: false } } as any;
  assert.equal(setMuted(state, 'yes'), true);
  assert.equal(state.ENGINE.muted, true);
  assert.equal(toggleMuted(state), false);
  assert.equal(state.ENGINE.muted, false);
});

test('navigation snapshot helpers replace path, jumps, and active gate', () => {
  const state = {
    ENGINE: {
      nav: {
        path: [1],
        isPortalJump: new Set([1]),
        activeGateKey: 1
      }
    }
  } as any;
  const nav = setNavigationSnapshot(state, {
    path: [2, 3],
    isPortalJump: new Set([0]),
    activeGateKey: 2
  });
  assert.equal(nav, state.ENGINE.nav);
  assert.deepEqual(state.ENGINE.nav.path, [2, 3]);
  assert.deepEqual([...state.ENGINE.nav.isPortalJump], [0]);
  assert.equal(state.ENGINE.nav.activeGateKey, 2);
  clearNavigation(state);
  assert.deepEqual(state.ENGINE.nav.path, []);
  assert.deepEqual([...state.ENGINE.nav.isPortalJump], []);
  assert.equal(state.ENGINE.nav.activeGateKey, null);
  setNavigationSnapshot(state, { path: [1, 2, 3], isPortalJump: [1], activeGateKey: 1 });
  assert.equal(reverseNavigationPath(state), state.ENGINE.nav);
  assert.deepEqual(state.ENGINE.nav.path, [3, 2, 1]);
  assert.deepEqual([...state.ENGINE.nav.isPortalJump], [1]);
  assert.equal(remapNavigationKeys(state, key => key + 10), state.ENGINE.nav);
  assert.deepEqual(state.ENGINE.nav.path, [13, 12, 11]);
  assert.equal(state.ENGINE.nav.activeGateKey, 11);
  assert.equal(setNavigationActiveGateKey(state, 9), 9);
  assert.equal(setNavigationLastFlipTime(state, 12345), 12345);
  assert.equal(state.ENGINE.nav.lastFlipTime, 12345);
  setNavigationSnapshot(state, { path: [1, 2, 3, 4], isPortalJump: [1, 3], activeGateKey: 1 });
  assert.equal(truncateNavigationPath(state, 1), state.ENGINE.nav);
  assert.deepEqual(state.ENGINE.nav.path, [1, 2]);
  assert.deepEqual([...state.ENGINE.nav.isPortalJump], [1]);
  assert.equal(truncateNavigationPath(state, -1), state.ENGINE.nav);
  assert.deepEqual(state.ENGINE.nav.path, []);
  assert.equal(state.ENGINE.nav.activeGateKey, null);
});

test('hazard helpers replace revealed geese and false-goal sets', () => {
  const state = {
    ENGINE: {
      hazards: {
        revealedGeese: new Set([1]),
        armedFalseGoals: new Set([2]),
        detonatedFalseGoals: new Set([3])
      }
    }
  } as any;
  assert.deepEqual([...(setRevealedGeese(state, [4, 5]) ?? [])], [4, 5]);
  assert.deepEqual([...(setArmedFalseGoals(state, [6]) ?? [])], [6]);
  assert.deepEqual([...(setDetonatedFalseGoals(state, [7]) ?? [])], [7]);
  assert.equal(detonateFalseGoal(state, 6), state.ENGINE.hazards);
  assert.deepEqual([...state.ENGINE.hazards.armedFalseGoals], []);
  assert.deepEqual([...state.ENGINE.hazards.detonatedFalseGoals], [7, 6]);

  const level = { falseGoalKeys: new Set([10, 11, 12]) } as any;
  assert.equal(resetFalseGoalHazardsForLevel(state, level), state.ENGINE.hazards);
  assert.deepEqual([...state.ENGINE.hazards.armedFalseGoals], [10, 11, 12]);
  assert.deepEqual([...state.ENGINE.hazards.detonatedFalseGoals], []);

  assert.equal(restoreFalseGoalHazardsForLevel(state, level, [11]), state.ENGINE.hazards);
  assert.deepEqual([...state.ENGINE.hazards.armedFalseGoals], [10, 12]);
  assert.deepEqual([...state.ENGINE.hazards.detonatedFalseGoals], [11]);
});

test('hinter helpers reset animation, paths, and persisted hint state', () => {
  const state = {
    ENGINE: {
      hinter: {
        pathList: [[1, 2], [3, 4]],
        currentPathIdx: 1,
        alpha: 0.5,
        index: 4,
        source: 'solver',
        holdStartMs: 10,
        blinkStartMs: 20,
        fadeStartMs: 30,
        persistedPath: [9],
        persistedHintIdx: 0
      }
    }
  } as any;
  assert.equal(resetHintAnimationClock(state, { alpha: 1, index: 0 }), state.ENGINE.hinter);
  assert.equal(state.ENGINE.hinter.alpha, 1);
  assert.equal(state.ENGINE.hinter.index, 0);
  assert.equal(state.ENGINE.hinter.holdStartMs, 0);
  assert.equal(state.ENGINE.hinter.blinkStartMs, 0);
  assert.equal(state.ENGINE.hinter.fadeStartMs, 0);
  assert.equal(setHintAnimationIndex(state, 2), 2);
  assert.equal(advanceHintAnimationIndex(state, 0.5), 2.5);
  assert.equal(setHintAnimationAlpha(state, 0.75), 0.75);
  assert.equal(setHintHoldStartMsIfUnset(state, 100), 100);
  assert.equal(setHintHoldStartMsIfUnset(state, 200), 100);
  assert.equal(setHintBlinkStartMsIfUnset(state, 300), 300);
  assert.equal(setHintBlinkStartMsIfUnset(state, 400), 300);
  assert.equal(setHintFadeStartMs(state, 500), 500);

  assert.equal(setHintPaths(state, [[5]], 'manual', 0), state.ENGINE.hinter);
  assert.deepEqual(state.ENGINE.hinter.pathList, [[5]]);
  assert.equal(state.ENGINE.hinter.source, 'manual');
  assert.equal(pinCurrentHint(state), true);
  assert.deepEqual(state.ENGINE.hinter.persistedPath, [5]);
  assert.equal(state.ENGINE.hinter.persistedHintIdx, 0);

  assert.equal(clearHintPaths(state), state.ENGINE.hinter);
  assert.deepEqual(state.ENGINE.hinter.pathList, []);
  assert.equal(state.ENGINE.hinter.source, 'none');
  assert.equal(clearPersistedHint(state), state.ENGINE.hinter);
  assert.deepEqual(state.ENGINE.hinter.persistedPath, []);
  assert.equal(state.ENGINE.hinter.persistedHintIdx, -1);

  setHintPaths(state, [[8]], 'solver', 0);
  pinCurrentHint(state);
  resetHinterForLevel(state);
  assert.deepEqual(state.ENGINE.hinter.pathList, []);
  assert.equal(state.ENGINE.hinter.currentPathIdx, 0);
  assert.equal(state.ENGINE.hinter.source, 'none');
  assert.equal(state.ENGINE.hinter.alpha, 0);
  assert.equal(state.ENGINE.hinter.index, 0);
  assert.deepEqual(state.ENGINE.hinter.persistedPath, []);
  assert.equal(state.ENGINE.hinter.persistedHintIdx, -1);
});

test('solver run helpers start, request abort, and end solver state', () => {
  const controller = { abort() {} };
  const state = {
    ENGINE: {
      solver: {
        controller: null,
        abortRequested: true
      }
    }
  } as any;
  assert.equal(startSolverRun(state, controller), state.ENGINE.solver);
  assert.equal(state.ENGINE.solver.controller, controller);
  assert.equal(state.ENGINE.solver.abortRequested, false);
  assert.equal(requestSolverAbort(state), state.ENGINE.solver);
  assert.equal(state.ENGINE.solver.abortRequested, true);
  assert.equal(endSolverRun(state), state.ENGINE.solver);
  assert.equal(state.ENGINE.solver.controller, null);
  assert.equal(state.ENGINE.solver.abortRequested, false);
  assert.equal(requestSolverAbort(state), null);
});

test('review helpers set saved index, current index, and submissions', () => {
  const submissions = [{ id: 'a' }, { id: 'b' }];
  const state = {
    ENGINE: {
      review: {
        submissions: [],
        currentIdx: 0,
        savedPlayLevelIdx: 0
      }
    }
  } as any;
  assert.equal(setReviewSavedPlayLevelIndex(state, 4), 4);
  assert.equal(setReviewIndex(state, 1), 1);
  assert.equal(setReviewSubmissions(state, submissions), submissions);
  assert.deepEqual(removeReviewSubmission(state, 0), [{ id: 'b' }]);
  assert.equal(resetReviewSubmissions(state), state.ENGINE.review);
  assert.deepEqual(state.ENGINE.review.submissions, []);
  assert.equal(state.ENGINE.review.currentIdx, 0);
});

test('editor helpers update session fields and reset transient editor state', () => {
  const state = {
    ENGINE: {
      editor: {
        workingLevel: null,
        isPencilMode: true,
        isModified: false,
        emptyClickCount: 2,
        undoStack: [{ id: 'undo' }],
        triggerableFalseGoalCells: new Set(['1,1'])
      }
    }
  } as any;
  const level = { id: 'draft', reqLen: 0, reqInt: 0, hints: [] } as any;
  assert.equal(setEditorWorkingLevel(state, level), level);
  assert.equal(setEditorPencilMode(state, false), false);
  assert.equal(setEditorModified(state, true), true);
  assert.equal(setEditorEmptyClickCount(state, 3), 3);
  assert.equal(incrementEditorEmptyClickCount(state), 4);
  assert.equal(setEditorMetrics(state, { reqLen: 7, reqInt: 2 }), level);
  assert.equal(level.reqLen, 7);
  assert.equal(level.reqInt, 2);
  assert.deepEqual(setEditorWorkingHints(state, [[1, 2]]), [[1, 2]]);
  Object.assign(level, { gateKeys: [1], goalKey: 2, falseGoalKeys: new Set([3]), blockSet: new Set([4]), gooseSet: new Set([5]), mustPassKeys: [6], mustCrossKeys: [7], filterMap: new Map([[8, 1]]), flippingFilterMap: new Map([[9, 2]]), portalMap: new Map([[10, 11]]), portalVisuals: [{ a: 1 }] });
  assert.equal(resetEditorWorkingGrid(state), level);
  assert.deepEqual(level.gateKeys, []);
  assert.equal(level.goalKey, -1);
  assert.deepEqual([...level.blockSet], []);
  assert.deepEqual(level.hints, []);
  state.ENGINE.editor.undoStack = [{ id: 'undo' }] as any;
  assert.deepEqual(popEditorUndoStack(state), { id: 'undo' });
  assert.deepEqual(clearEditorUndoStack(state), []);
  assert.equal(clearEditorTriggerableFalseGoalCells(state), state.ENGINE.editor.triggerableFalseGoalCells);
  assert.deepEqual([...state.ENGINE.editor.triggerableFalseGoalCells], []);
  assert.equal(setEditorDraggedFromGrid(state, true), true);
  assert.equal(setEditorPendingPortal(state, 'portal-a' as any), 'portal-a');
  const draggedObject = { type: 'gate' };
  assert.equal(setEditorDraggedObject(state, draggedObject), draggedObject);
  assert.deepEqual([...(setEditorTriggerableFalseGoalCells(state, new Set(['3,3']) as any) ?? [])], ['3,3']);
  assert.deepEqual([...(addEditorTriggerableFalseGoalCells(state, ['4,4'] as any) ?? [])], ['3,3', '4,4']);
  assert.equal(setEditorFalseGoalTriggerScanState(state, 'scanning'), 'scanning');
  assert.deepEqual([...(setEditorFalseGoalTriggerParityCandidates(state, new Set([5]) as any) ?? [])], [5]);
  // Clearing the spots resets the whole scan lifecycle (stale + no candidates).
  clearEditorTriggerableFalseGoalCells(state);
  assert.equal(state.ENGINE.editor.falseGoalTriggerScanState, 'stale');
  assert.equal(state.ENGINE.editor.falseGoalTriggerParityCandidates.size, 0);
  assert.equal(setEditorSelectedTool(state, 'block'), 'block');
  assert.equal(toggleEditorPencilMode(state), true);
  assert.equal(toggleEditorMirrorHorizontal(state), true);

  state.ENGINE.editor.undoStack = [{ id: 'redo' }] as any;
  state.ENGINE.editor.triggerableFalseGoalCells.add('2,2');
  const nextLevel = { id: 'next-draft' };
  assert.equal(resetEditorSession(state, { workingLevel: nextLevel }), state.ENGINE.editor);
  assert.equal(state.ENGINE.editor.workingLevel, nextLevel);
  assert.equal(state.ENGINE.editor.isPencilMode, false);
  assert.equal(state.ENGINE.editor.isModified, false);
  assert.equal(state.ENGINE.editor.emptyClickCount, 0);
  assert.deepEqual(state.ENGINE.editor.undoStack, []);
  assert.deepEqual([...state.ENGINE.editor.triggerableFalseGoalCells], []);
});

test('transient runtime helpers update nav, ripple, hint, option, and cheat state', () => {
  const timer = { id: 'timer' };
  const pending = () => {};
  const state = {
    ENGINE: {
      nav: { undoStack: ['move'], visualFlipCount: 0, flipCount: 0.2 },
      ui: { focusGroup: 'GRID', focusIndex: 0, gamepadFocusEnabled: false, gamepadGridPrimaryAction: null, bLastPressTime: 0, bSingleTimer: null },
      gamepad: { hasPad: false, nextMoveAt: 0, lastButtons: [false], rafId: null, rafActive: false },
      flags: { useRefereeSolver: false },
      isDevMode: false,
      ripples: [{ startTime: 0 }, { startTime: 500 }],
      foundHintsSinceLoad: ['old'],
      runtime: { pendingAction: null, currentTheme: 'classic' },
      options: {},
      cheatTimer: null,
      cheatActive: false,
      resetStreak: 0
    }
  } as any;

  assert.equal(popNavigationUndoStack(state), 'move');
  state.ENGINE.nav.undoStack = ['move-2'] as any;
  assert.deepEqual(clearNavigationUndoStack(state), []);
  assert.equal(stepVisualFlipCount(state, 0.15), true);
  assert.equal(state.ENGINE.nav.visualFlipCount, 0.15);
  assert.equal(stepVisualFlipCount({ nav: { visualFlipCount: 1, flipCount: 1 } } as any), false);
  assert.equal(addRipple(state, { startTime: 900 } as any), state.ENGINE.ripples);
  assert.deepEqual(pruneRipples(state, 1000, 600), [{ startTime: 500 }, { startTime: 900 }]);
  assert.deepEqual(clearRipples(state), []);
  assert.deepEqual(setFoundHintsSinceLoad(state, ['hint'] as any), ['hint']);
  assert.equal(setCurrentThemeName(state, 'neon'), 'neon');
  assert.deepEqual(setRuntimeTapStartCoord(state, { x: 1, y: 2 }), { x: 1, y: 2 });
  assert.equal(setRuntimeTapMoved(state, true), true);
  assert.equal(setRuntimeActivePointerId(state, 12), 12);
  assert.equal(setGamepadGridPrimaryAction(state, pending), pending);
  assert.equal(setGamepadFocusEnabled(state, true), true);
  assert.equal(setGamepadHasPad(state, true), true);
  assert.equal(setGamepadNextMoveAt(state, 123), 123);
  assert.deepEqual(setGamepadLastButtons(state, [true, false]), [true, false]);
  assert.equal(setGamepadRafState(state, { rafId: 7, rafActive: true }), state.ENGINE.gamepad);
  assert.equal(state.ENGINE.gamepad.rafId, 7);
  assert.equal(state.ENGINE.gamepad.rafActive, true);
  assert.equal(setUiBLastPressTime(state, 321), 321);
  assert.equal(setUiBSingleTimer(state, timer as any), timer);
  assert.equal(resetGamepadConnectionState(state), state.ENGINE.gamepad);
  assert.equal(state.ENGINE.gamepad.hasPad, false);
  assert.deepEqual(state.ENGINE.gamepad.lastButtons, []);
  assert.equal(setUiFocusGroupState(state, 'CONTROLS', 2), state.ENGINE.ui);
  assert.equal(setUiFocusIndex(state, 1), 1);
  assert.equal(toggleDevMode(state), true);
  assert.equal(toggleFlag(state, 'useRefereeSolver'), true);
  assert.equal(setRuntimePendingAction(state, pending), pending);
  assert.equal(clearRuntimePendingAction(state), null);
  assert.equal(setOptionValue(state, 'geese', false), false);
  assert.equal(setCheatTimer(state, timer as any), timer);
  assert.equal(setCheatActive(state, true), true);
  assert.equal(incrementResetStreak(state), 1);
  assert.equal(setResetStreak(state, 0), 0);
});

test('mode, logic, overlay, level index, orientation, and level setters update engine state', () => {
  const state = { ENGINE: {} } as any;
  assert.equal(setMode(state, 'PLAY' as any), 'PLAY');
  assert.equal(setLogicState(state, 'IDLE'), 'IDLE');
  assert.equal(setOverlayState(state, 'NONE'), 'NONE');
  assert.equal(setLevelIndex(state, 3), 3);
  assert.equal(setOrientation(state, 7), 7);
  const level = { id: 'level' } as any;
  assert.equal(setLevel(state, level), level);
  assert.deepEqual(state.ENGINE, { mode: 'PLAY', logicState: 'IDLE', overlayState: 'NONE', levelIdx: 3, orientation: 7, level });
});
