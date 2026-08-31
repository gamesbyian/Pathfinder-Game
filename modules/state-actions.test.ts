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
  clearRuntimePendingConfirmationAction,
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
  setRuntimePendingConfirmationAction,
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
  const state = { engineState: { isDirty: false } } as any;
  assert.equal(markDirty(state), state.engineState);
  assert.equal(state.engineState.isDirty, true);
  assert.equal(clearDirty(state), state.engineState);
  assert.equal(state.engineState.isDirty, false);
});

test('markDirty and clearDirty accept the raw engine state', () => {
  const engineState = { isDirty: false } as any;
  markDirty(engineState);
  assert.equal(engineState.isDirty, true);
  clearDirty(engineState);
  assert.equal(engineState.isDirty, false);
});

test('setMuted normalizes values and toggleMuted returns the next state', () => {
  const state = { engineState: { muted: false } } as any;
  assert.equal(setMuted(state, 'yes'), true);
  assert.equal(state.engineState.muted, true);
  assert.equal(toggleMuted(state), false);
  assert.equal(state.engineState.muted, false);
});

test('navigation snapshot helpers replace path, jumps, and active gate', () => {
  const state = {
    engineState: {
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
  assert.equal(nav, state.engineState.nav);
  assert.deepEqual(state.engineState.nav.path, [2, 3]);
  assert.deepEqual([...state.engineState.nav.isPortalJump], [0]);
  assert.equal(state.engineState.nav.activeGateKey, 2);
  clearNavigation(state);
  assert.deepEqual(state.engineState.nav.path, []);
  assert.deepEqual([...state.engineState.nav.isPortalJump], []);
  assert.equal(state.engineState.nav.activeGateKey, null);
  setNavigationSnapshot(state, { path: [1, 2, 3], isPortalJump: [1], activeGateKey: 1 });
  assert.equal(reverseNavigationPath(state), state.engineState.nav);
  assert.deepEqual(state.engineState.nav.path, [3, 2, 1]);
  assert.deepEqual([...state.engineState.nav.isPortalJump], [1]);
  assert.equal(remapNavigationKeys(state, key => key + 10), state.engineState.nav);
  assert.deepEqual(state.engineState.nav.path, [13, 12, 11]);
  assert.equal(state.engineState.nav.activeGateKey, 11);
  assert.equal(setNavigationActiveGateKey(state, 9), 9);
  assert.equal(setNavigationLastFlipTime(state, 12345), 12345);
  assert.equal(state.engineState.nav.lastFlipTime, 12345);
  setNavigationSnapshot(state, { path: [1, 2, 3, 4], isPortalJump: [1, 3], activeGateKey: 1 });
  assert.equal(truncateNavigationPath(state, 1), state.engineState.nav);
  assert.deepEqual(state.engineState.nav.path, [1, 2]);
  assert.deepEqual([...state.engineState.nav.isPortalJump], [1]);
  assert.equal(truncateNavigationPath(state, -1), state.engineState.nav);
  assert.deepEqual(state.engineState.nav.path, []);
  assert.equal(state.engineState.nav.activeGateKey, null);
});

test('hazard helpers replace revealed geese and false-goal sets', () => {
  const state = {
    engineState: {
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
  assert.equal(detonateFalseGoal(state, 6), state.engineState.hazards);
  assert.deepEqual([...state.engineState.hazards.armedFalseGoals], []);
  assert.deepEqual([...state.engineState.hazards.detonatedFalseGoals], [7, 6]);

  const level = { falseGoalKeys: new Set([10, 11, 12]) } as any;
  assert.equal(resetFalseGoalHazardsForLevel(state, level), state.engineState.hazards);
  assert.deepEqual([...state.engineState.hazards.armedFalseGoals], [10, 11, 12]);
  assert.deepEqual([...state.engineState.hazards.detonatedFalseGoals], []);

  assert.equal(restoreFalseGoalHazardsForLevel(state, level, [11]), state.engineState.hazards);
  assert.deepEqual([...state.engineState.hazards.armedFalseGoals], [10, 12]);
  assert.deepEqual([...state.engineState.hazards.detonatedFalseGoals], [11]);
});

test('hinter helpers reset animation, paths, and persisted hint state', () => {
  const state = {
    engineState: {
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
  assert.equal(resetHintAnimationClock(state, { alpha: 1, index: 0 }), state.engineState.hinter);
  assert.equal(state.engineState.hinter.alpha, 1);
  assert.equal(state.engineState.hinter.index, 0);
  assert.equal(state.engineState.hinter.holdStartMs, 0);
  assert.equal(state.engineState.hinter.blinkStartMs, 0);
  assert.equal(state.engineState.hinter.fadeStartMs, 0);
  assert.equal(setHintAnimationIndex(state, 2), 2);
  assert.equal(advanceHintAnimationIndex(state, 0.5), 2.5);
  assert.equal(setHintAnimationAlpha(state, 0.75), 0.75);
  assert.equal(setHintHoldStartMsIfUnset(state, 100), 100);
  assert.equal(setHintHoldStartMsIfUnset(state, 200), 100);
  assert.equal(setHintBlinkStartMsIfUnset(state, 300), 300);
  assert.equal(setHintBlinkStartMsIfUnset(state, 400), 300);
  assert.equal(setHintFadeStartMs(state, 500), 500);

  assert.equal(setHintPaths(state, [[5]], 'manual', 0), state.engineState.hinter);
  assert.deepEqual(state.engineState.hinter.pathList, [[5]]);
  assert.equal(state.engineState.hinter.source, 'manual');
  assert.equal(pinCurrentHint(state), true);
  assert.deepEqual(state.engineState.hinter.persistedPath, [5]);
  assert.equal(state.engineState.hinter.persistedHintIdx, 0);

  assert.equal(clearHintPaths(state), state.engineState.hinter);
  assert.deepEqual(state.engineState.hinter.pathList, []);
  assert.equal(state.engineState.hinter.source, 'none');
  assert.equal(clearPersistedHint(state), state.engineState.hinter);
  assert.deepEqual(state.engineState.hinter.persistedPath, []);
  assert.equal(state.engineState.hinter.persistedHintIdx, -1);

  setHintPaths(state, [[8]], 'solver', 0);
  pinCurrentHint(state);
  resetHinterForLevel(state);
  assert.deepEqual(state.engineState.hinter.pathList, []);
  assert.equal(state.engineState.hinter.currentPathIdx, 0);
  assert.equal(state.engineState.hinter.source, 'none');
  assert.equal(state.engineState.hinter.alpha, 0);
  assert.equal(state.engineState.hinter.index, 0);
  assert.deepEqual(state.engineState.hinter.persistedPath, []);
  assert.equal(state.engineState.hinter.persistedHintIdx, -1);
});

test('solver run helpers start, request abort, and end solver state', () => {
  const controller = { abort() {} };
  const state = {
    engineState: {
      solver: {
        controller: null,
        abortRequested: true
      }
    }
  } as any;
  assert.equal(startSolverRun(state, controller), state.engineState.solver);
  assert.equal(state.engineState.solver.controller, controller);
  assert.equal(state.engineState.solver.abortRequested, false);
  assert.equal(requestSolverAbort(state), state.engineState.solver);
  assert.equal(state.engineState.solver.abortRequested, true);
  assert.equal(endSolverRun(state), state.engineState.solver);
  assert.equal(state.engineState.solver.controller, null);
  assert.equal(state.engineState.solver.abortRequested, false);
  assert.equal(requestSolverAbort(state), null);
});

test('review helpers set saved index, current index, and submissions', () => {
  const submissions = [{ id: 'a' }, { id: 'b' }];
  const state = {
    engineState: {
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
  assert.equal(resetReviewSubmissions(state), state.engineState.review);
  assert.deepEqual(state.engineState.review.submissions, []);
  assert.equal(state.engineState.review.currentIdx, 0);
});

test('editor helpers update session fields and reset transient editor state', () => {
  const state = {
    engineState: {
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
  const level = { id: 'draft', requiredLength: 0, requiredIntersections: 0, hints: [] } as any;
  assert.equal(setEditorWorkingLevel(state, level), level);
  assert.equal(setEditorPencilMode(state, false), false);
  assert.equal(setEditorModified(state, true), true);
  assert.equal(setEditorEmptyClickCount(state, 3), 3);
  assert.equal(incrementEditorEmptyClickCount(state), 4);
  assert.equal(setEditorMetrics(state, { requiredLength: 7, requiredIntersections: 2 }), level);
  assert.equal(level.requiredLength, 7);
  assert.equal(level.requiredIntersections, 2);
  assert.deepEqual(setEditorWorkingHints(state, [[1, 2]]), [[1, 2]]);
  Object.assign(level, { gateKeys: [1], goalKey: 2, falseGoalKeys: new Set([3]), blockSet: new Set([4]), gooseSet: new Set([5]), mustPassKeys: [6], mustCrossKeys: [7], filterMap: new Map([[8, 1]]), flippingFilterMap: new Map([[9, 2]]), portalMap: new Map([[10, 11]]), portalVisuals: [{ a: 1 }] });
  assert.equal(resetEditorWorkingGrid(state), level);
  assert.deepEqual(level.gateKeys, []);
  assert.equal(level.goalKey, -1);
  assert.deepEqual([...level.blockSet], []);
  assert.deepEqual(level.hints, []);
  state.engineState.editor.undoStack = [{ id: 'undo' }] as any;
  assert.deepEqual(popEditorUndoStack(state), { id: 'undo' });
  assert.deepEqual(clearEditorUndoStack(state), []);
  assert.equal(clearEditorTriggerableFalseGoalCells(state), state.engineState.editor.triggerableFalseGoalCells);
  assert.deepEqual([...state.engineState.editor.triggerableFalseGoalCells], []);
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
  assert.equal(state.engineState.editor.falseGoalTriggerScanState, 'stale');
  assert.equal(state.engineState.editor.falseGoalTriggerParityCandidates.size, 0);
  assert.equal(setEditorSelectedTool(state, 'block'), 'block');
  assert.equal(toggleEditorPencilMode(state), true);
  assert.equal(toggleEditorMirrorHorizontal(state), true);

  state.engineState.editor.undoStack = [{ id: 'redo' }] as any;
  state.engineState.editor.triggerableFalseGoalCells.add('2,2');
  const nextLevel = { id: 'next-draft' };
  assert.equal(resetEditorSession(state, { workingLevel: nextLevel }), state.engineState.editor);
  assert.equal(state.engineState.editor.workingLevel, nextLevel);
  assert.equal(state.engineState.editor.isPencilMode, false);
  assert.equal(state.engineState.editor.isModified, false);
  assert.equal(state.engineState.editor.emptyClickCount, 0);
  assert.deepEqual(state.engineState.editor.undoStack, []);
  assert.deepEqual([...state.engineState.editor.triggerableFalseGoalCells], []);
});

test('transient runtime helpers update nav, ripple, hint, option, and cheat state', () => {
  const timer = { id: 'timer' };
  const pending = () => {};
  const state = {
    engineState: {
      nav: { undoStack: ['move'], visualFlipCount: 0, flipCount: 0.2 },
      ui: { focusGroup: 'GRID', focusIndex: 0, gamepadFocusEnabled: false, gamepadGridPrimaryAction: null, bLastPressTime: 0, bSingleTimer: null },
      gamepad: { hasPad: false, nextMoveAt: 0, lastButtons: [false], rafId: null, rafActive: false },
      flags: { useRefereeSolver: false },
      isDevMode: false,
      ripples: [{ startTime: 0 }, { startTime: 500 }],
      foundHintsSinceLoad: ['old'],
      runtime: { pendingConfirmationAction: null, currentTheme: 'classic' },
      options: {},
      cheatTimer: null,
      cheatActive: false,
      resetStreak: 0
    }
  } as any;

  assert.equal(popNavigationUndoStack(state), 'move');
  state.engineState.nav.undoStack = ['move-2'] as any;
  assert.deepEqual(clearNavigationUndoStack(state), []);
  assert.equal(stepVisualFlipCount(state, 0.15), true);
  assert.equal(state.engineState.nav.visualFlipCount, 0.15);
  assert.equal(stepVisualFlipCount({ nav: { visualFlipCount: 1, flipCount: 1 } } as any), false);
  assert.equal(addRipple(state, { startTime: 900 } as any), state.engineState.ripples);
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
  assert.equal(setGamepadRafState(state, { rafId: 7, rafActive: true }), state.engineState.gamepad);
  assert.equal(state.engineState.gamepad.rafId, 7);
  assert.equal(state.engineState.gamepad.rafActive, true);
  assert.equal(setUiBLastPressTime(state, 321), 321);
  assert.equal(setUiBSingleTimer(state, timer as any), timer);
  assert.equal(resetGamepadConnectionState(state), state.engineState.gamepad);
  assert.equal(state.engineState.gamepad.hasPad, false);
  assert.deepEqual(state.engineState.gamepad.lastButtons, []);
  assert.equal(setUiFocusGroupState(state, 'CONTROLS', 2), state.engineState.ui);
  assert.equal(setUiFocusIndex(state, 1), 1);
  assert.equal(toggleDevMode(state), true);
  assert.equal(toggleFlag(state, 'useRefereeSolver'), true);
  assert.equal(setRuntimePendingConfirmationAction(state, pending), pending);
  assert.equal(clearRuntimePendingConfirmationAction(state), null);
  assert.equal(setOptionValue(state, 'geese', false), false);
  assert.equal(setCheatTimer(state, timer as any), timer);
  assert.equal(setCheatActive(state, true), true);
  assert.equal(incrementResetStreak(state), 1);
  assert.equal(setResetStreak(state, 0), 0);
});

test('mode, logic, overlay, level index, orientation, and level setters update engine state', () => {
  const state = { engineState: {} } as any;
  assert.equal(setMode(state, 'PLAY' as any), 'PLAY');
  assert.equal(setLogicState(state, 'IDLE'), 'IDLE');
  assert.equal(setOverlayState(state, 'NONE'), 'NONE');
  assert.equal(setLevelIndex(state, 3), 3);
  assert.equal(setOrientation(state, 7), 7);
  const level = { id: 'level' } as any;
  assert.equal(setLevel(state, level), level);
  assert.deepEqual(state.engineState, { mode: 'PLAY', logicState: 'IDLE', overlayState: 'NONE', levelIdx: 3, orientation: 7, level });
});
