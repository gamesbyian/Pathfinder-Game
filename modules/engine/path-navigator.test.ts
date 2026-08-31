import { createPathNavigator } from './path-navigator.js';
import { test } from 'vitest';
import { createEngineState } from '../state-slices.js';
import { DRAGGING, EDITOR, HAZARD_TRIGGERED, IDLE, PORTAL_PAUSE } from '../app-constants.js';

function assertEqual(actual: any, expected: any, message: any) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, got ${actual}`);
}
function assertArrayEqual(actual: any, expected: any, message: any) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${message}: expected ${e}, got ${a}`);
}



const createHarness = () => {
  const calls = { rebuild: 0, assert: 0, logic: [] as any[] };
  const engineState = createEngineState();
  engineState.isDirty = false;
  engineState.level = { flippingFilterMap: new Map() } as any;
  const navigator = createPathNavigator({
    getLevel: (state: any) => state.level,
    setLogicState: (value: any) => {
      calls.logic.push(value);
      engineState.logicState = value;
    },
    rebuildDerivedPathState: () => { calls.rebuild += 1; },
    assertStateConsistency: () => { calls.assert += 1; },
    now: () => 1234
  });
  return { calls, engineState, navigator };
};

test('pushStep appends to navigation and invalidates render state', () => {
  const { calls, engineState, navigator } = createHarness();
  navigator.pushStep(engineState, 42, false);
  assertArrayEqual(engineState.nav.path, [42], 'pushStep should append the packed key');
  assertEqual(engineState.isDirty, true, 'pushStep should mark the engine dirty');
  assertEqual(calls.assert, 1, 'pushStep should validate consistency');
});

test('truncateTo routes path shortening through rebuild and editor modified flags', () => {
  const { calls, engineState, navigator } = createHarness();
  engineState.mode = EDITOR;
  engineState.logicState = DRAGGING;
  engineState.editor.isModified = false;
  engineState.nav.path = [1, 2, 3] as any;
  engineState.nav.isPortalJump = new Set([1]);
  navigator.truncateTo(engineState, 0);
  assertArrayEqual(engineState.nav.path, [1], 'truncateTo should keep cells through target index');
  assertEqual(engineState.nav.isPortalJump.size, 0, 'truncateTo should prune stale portal jumps');
  assertEqual(engineState.logicState, IDLE, 'truncateTo should reset active drag logic');
  assertEqual(engineState.editor.isModified, true, 'truncateTo should mark editor levels modified');
  assertEqual(engineState.isDirty, true, 'truncateTo should mark the engine dirty');
  assertEqual(calls.rebuild, 1, 'truncateTo should rebuild derived path state');
  assertEqual(calls.assert, 1, 'truncateTo should validate consistency');
});

test('clear resets navigation and active logic through injected effects', () => {
  const { calls, engineState, navigator } = createHarness();
  engineState.logicState = HAZARD_TRIGGERED;
  engineState.nav.path = [1, 2] as any;
  engineState.nav.isPortalJump = new Set([1]);
  engineState.nav.activeGateKey = 1;
  navigator.clear(engineState);
  assertArrayEqual(engineState.nav.path, [], 'clear should empty the path');
  assertEqual(engineState.nav.isPortalJump.size, 0, 'clear should empty portal jumps');
  assertEqual(engineState.nav.activeGateKey, null, 'clear should reset active gate');
  assertEqual(engineState.logicState, IDLE, 'clear should reset active logic');
  assertEqual(engineState.isDirty, true, 'clear should mark the engine dirty');
  assertEqual(calls.rebuild, 1, 'clear should rebuild derived path state');
  assertEqual(calls.assert, 1, 'clear should validate consistency');
});

test('applySnapshot restores nav path, portal jumps, and active gate', () => {
  const { calls, engineState, navigator } = createHarness();
  engineState.level = { flippingFilterMap: new Map(), falseGoalKeys: [] } as any;
  navigator.applySnapshot(engineState, {
    path: [5, 6, 7], isPortalJump: [2], activeGateKey: 5,
    logicState: IDLE, detonatedFalseGoals: []
  } as any);
  assertArrayEqual(engineState.nav.path, [5, 6, 7], 'applySnapshot should restore the path');
  assertEqual(engineState.nav.isPortalJump.has(2), true, 'applySnapshot should restore portal jumps');
  assertEqual(engineState.nav.activeGateKey, 5, 'applySnapshot should restore the active gate');
  assertEqual(engineState.isDirty, true, 'applySnapshot should mark the engine dirty');
  assertEqual(calls.rebuild, 1, 'applySnapshot should rebuild derived path state');
});

test('applySnapshot routes the logic-state restore through IDLE', () => {
  const { calls, engineState, navigator } = createHarness();
  engineState.level = { flippingFilterMap: new Map(), falseGoalKeys: [] } as any;
  engineState.logicState = DRAGGING;
  navigator.applySnapshot(engineState, {
    path: [1], isPortalJump: [], activeGateKey: 1,
    logicState: PORTAL_PAUSE, detonatedFalseGoals: []
  } as any);
  assertArrayEqual(calls.logic, [IDLE, PORTAL_PAUSE],
    'applySnapshot should set IDLE first, then the restored logic state');
});

test('applySnapshot never restores into the transient HAZARD_TRIGGERED lock', () => {
  const { calls, engineState, navigator } = createHarness();
  engineState.level = { flippingFilterMap: new Map(), falseGoalKeys: [] } as any;
  navigator.applySnapshot(engineState, {
    path: [1], isPortalJump: [], activeGateKey: 1,
    logicState: HAZARD_TRIGGERED, detonatedFalseGoals: []
  } as any);
  assertArrayEqual(calls.logic, [IDLE],
    'a HAZARD_TRIGGERED snapshot should land on IDLE only');
});

test('applySnapshot restores false-goal hazards (armed = level falseGoals − detonated)', () => {
  const { engineState, navigator } = createHarness();
  engineState.level = { flippingFilterMap: new Map(), falseGoalKeys: [10, 11, 12] } as any;
  navigator.applySnapshot(engineState, {
    path: [1], isPortalJump: [], activeGateKey: 1,
    logicState: IDLE, detonatedFalseGoals: [11]
  } as any);
  assertEqual(engineState.hazards.detonatedFalseGoals.has(11), true, 'detonated set restored from snapshot');
  assertEqual(engineState.hazards.armedFalseGoals.has(11), false, 'detonated goal is not re-armed');
  assertEqual(engineState.hazards.armedFalseGoals.has(10), true, 'remaining false goals are armed');
  assertEqual(engineState.hazards.armedFalseGoals.has(12), true, 'remaining false goals are armed');
});
