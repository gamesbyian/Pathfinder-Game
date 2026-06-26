import { createOverlayController } from '../modules/engine/overlay-controller.js';
import { test } from 'vitest';
import { createEngineState } from '../modules/state-slices.js';

function assert(condition, message) { if (!condition) throw new Error(message); }
function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, got ${actual}`);
}
function assertArrayEqual(actual, expected, message) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}: expected ${e}, got ${a}`);
}

const core = {
  PLAY: 0,
  EDITOR: 1,
  IDLE: 'IDLE',
  OVERLAY_NONE: 'OVERLAY_NONE',
  HINT_ANIMATING: 'HINT_ANIMATING'
};

const createHarness = () => {
  const calls = [];
  const state = { ENGINE: createEngineState({ core }) };
  state.ENGINE.isDirty = false;
  const ui = {
    applyHintPinState: (...args) => calls.push(['applyHintPinState', ...args]),
    setSolverAbortRequested: (...args) => calls.push(['setSolverAbortRequested', ...args]),
    applyOverlayState: (...args) => calls.push(['applyOverlayState', ...args]),
    showMessage: (...args) => calls.push(['showMessage', ...args])
  };
  return { calls, state, controller: createOverlayController({ core, state, ui }) };
};

test('setOverlayState updates overlay, invalidates render, and applies UI effects', () => {
  const { calls, state, controller } = createHarness();
  controller.setOverlayState(core.HINT_ANIMATING);
  assertEqual(state.ENGINE.overlayState, core.HINT_ANIMATING, 'overlay state should update');
  assertEqual(state.ENGINE.isDirty, true, 'overlay change should mark dirty');
  assert(calls.some(call => call[0] === 'applyOverlayState' && call[1] === core.HINT_ANIMATING), 'overlay UI should be applied');
  assert(calls.some(call => call[0] === 'setSolverAbortRequested' && call[1] === false), 'solver abort UI should be refreshed');
});

test('leaving hint animation resets animation alpha and pin UI', () => {
  const { calls, state, controller } = createHarness();
  state.ENGINE.overlayState = core.HINT_ANIMATING;
  state.ENGINE.hinter.alpha = 1;
  state.ENGINE.hinter.persistedPath = [1, 2, 3];
  controller.setOverlayState(core.OVERLAY_NONE);
  assertEqual(state.ENGINE.hinter.alpha, 0, 'leaving hint animation should reset alpha');
  assert(calls.some(call => call[0] === 'applyHintPinState' && call[1] === false && call[2] === true), 'pin UI should reflect persisted hint availability');
});

test('startHintAnimation starts only when hint paths exist', () => {
  const { calls, state, controller } = createHarness();
  controller.startHintAnimation();
  assertEqual(state.ENGINE.overlayState, core.OVERLAY_NONE, 'empty hint list should not start animation');
  state.ENGINE.hinter.pathList = [[1, 2], [3, 4]];
  state.ENGINE.hinter.currentPathIdx = 1;
  controller.startHintAnimation();
  assertEqual(state.ENGINE.overlayState, core.HINT_ANIMATING, 'hint paths should start animation');
  assertEqual(state.ENGINE.hinter.alpha, 1, 'start should reset alpha to visible');
  assertEqual(state.ENGINE.hinter.index, 0, 'start should reset animation index');
  assert(calls.some(call => call[0] === 'showMessage' && call[1] === 'Solution 2/2'), 'start should announce selected solution');
});

test('pin and clear persisted hint route through state and UI effects', () => {
  const { calls, state, controller } = createHarness();
  state.ENGINE.overlayState = core.HINT_ANIMATING;
  state.ENGINE.hinter.pathList = [[7, 8]];
  controller.pinCurrentHint();
  assertArrayEqual(state.ENGINE.hinter.persistedPath, [7, 8], 'pin should persist current hint path');
  assertEqual(state.ENGINE.overlayState, core.OVERLAY_NONE, 'pin should close hint overlay');
  assert(calls.some(call => call[0] === 'applyHintPinState' && call[1] === false && call[2] === true), 'pin should update pin UI');
  controller.clearPersistedHint();
  assertArrayEqual(state.ENGINE.hinter.persistedPath, [], 'clear should remove persisted hint path');
  assertEqual(state.ENGINE.hinter.persistedHintIdx, -1, 'clear should reset persisted hint index');
  assert(calls.some(call => call[0] === 'applyHintPinState' && call[2] === false), 'clear should update pin UI');
});

test('stopHintAnimation preserves source while clearing transient paths', () => {
  const { state, controller } = createHarness();
  state.ENGINE.overlayState = core.HINT_ANIMATING;
  state.ENGINE.hinter.pathList = [[1, 2]];
  state.ENGINE.hinter.source = 'solver';
  state.ENGINE.hinter.alpha = 1;
  controller.stopHintAnimation();
  assertArrayEqual(state.ENGINE.hinter.pathList, [], 'stop should clear transient paths');
  assertEqual(state.ENGINE.hinter.source, 'solver', 'stop should preserve hint source');
  assertEqual(state.ENGINE.hinter.alpha, 0, 'stop should reset animation alpha');
  assertEqual(state.ENGINE.overlayState, core.OVERLAY_NONE, 'stop should close overlay');
});
