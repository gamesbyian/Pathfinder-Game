import { createPathNavigator } from '../modules/engine/path-navigator.js';
import { createEngineState } from '../modules/state-slices.js';

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }
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
  DRAGGING: 'DRAGGING',
  PORTAL_PAUSE: 'PORTAL_PAUSE',
  HAZARD_TRIGGERED: 'HAZARD_TRIGGERED'
};

const createHarness = () => {
  const calls = { rebuild: 0, assert: 0, logic: [] };
  const engineState = createEngineState({ core });
  engineState.isDirty = false;
  engineState.level = { flippingFilterMap: new Map() };
  const navigator = createPathNavigator({
    core,
    getLevel: state => state.level,
    setLogicState: value => {
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
  engineState.mode = core.EDITOR;
  engineState.logicState = core.DRAGGING;
  engineState.editor.isModified = false;
  engineState.nav.path = [1, 2, 3];
  engineState.nav.isPortalJump = new Set([1]);
  navigator.truncateTo(engineState, 0);
  assertArrayEqual(engineState.nav.path, [1], 'truncateTo should keep cells through target index');
  assertEqual(engineState.nav.isPortalJump.size, 0, 'truncateTo should prune stale portal jumps');
  assertEqual(engineState.logicState, core.IDLE, 'truncateTo should reset active drag logic');
  assertEqual(engineState.editor.isModified, true, 'truncateTo should mark editor levels modified');
  assertEqual(engineState.isDirty, true, 'truncateTo should mark the engine dirty');
  assertEqual(calls.rebuild, 1, 'truncateTo should rebuild derived path state');
  assertEqual(calls.assert, 1, 'truncateTo should validate consistency');
});

test('clear resets navigation and active logic through injected effects', () => {
  const { calls, engineState, navigator } = createHarness();
  engineState.logicState = core.HAZARD_TRIGGERED;
  engineState.nav.path = [1, 2];
  engineState.nav.isPortalJump = new Set([1]);
  engineState.nav.activeGateKey = 1;
  navigator.clear(engineState);
  assertArrayEqual(engineState.nav.path, [], 'clear should empty the path');
  assertEqual(engineState.nav.isPortalJump.size, 0, 'clear should empty portal jumps');
  assertEqual(engineState.nav.activeGateKey, null, 'clear should reset active gate');
  assertEqual(engineState.logicState, core.IDLE, 'clear should reset active logic');
  assertEqual(engineState.isDirty, true, 'clear should mark the engine dirty');
  assertEqual(calls.rebuild, 1, 'clear should rebuild derived path state');
  assertEqual(calls.assert, 1, 'clear should validate consistency');
});

test('applySnapshot restores nav path, portal jumps, and active gate', () => {
  const { calls, engineState, navigator } = createHarness();
  engineState.level = { flippingFilterMap: new Map(), falseGoalKeys: [] };
  navigator.applySnapshot(engineState, {
    path: [5, 6, 7], isPortalJump: [2], activeGateKey: 5,
    logicState: core.IDLE, detonatedFalseGoals: []
  });
  assertArrayEqual(engineState.nav.path, [5, 6, 7], 'applySnapshot should restore the path');
  assertEqual(engineState.nav.isPortalJump.has(2), true, 'applySnapshot should restore portal jumps');
  assertEqual(engineState.nav.activeGateKey, 5, 'applySnapshot should restore the active gate');
  assertEqual(engineState.isDirty, true, 'applySnapshot should mark the engine dirty');
  assertEqual(calls.rebuild, 1, 'applySnapshot should rebuild derived path state');
});

test('applySnapshot routes the logic-state restore through IDLE', () => {
  const { calls, engineState, navigator } = createHarness();
  engineState.level = { flippingFilterMap: new Map(), falseGoalKeys: [] };
  engineState.logicState = core.DRAGGING;
  navigator.applySnapshot(engineState, {
    path: [1], isPortalJump: [], activeGateKey: 1,
    logicState: core.PORTAL_PAUSE, detonatedFalseGoals: []
  });
  assertArrayEqual(calls.logic, [core.IDLE, core.PORTAL_PAUSE],
    'applySnapshot should set IDLE first, then the restored logic state');
});

test('applySnapshot never restores into the transient HAZARD_TRIGGERED lock', () => {
  const { calls, engineState, navigator } = createHarness();
  engineState.level = { flippingFilterMap: new Map(), falseGoalKeys: [] };
  navigator.applySnapshot(engineState, {
    path: [1], isPortalJump: [], activeGateKey: 1,
    logicState: core.HAZARD_TRIGGERED, detonatedFalseGoals: []
  });
  assertArrayEqual(calls.logic, [core.IDLE],
    'a HAZARD_TRIGGERED snapshot should land on IDLE only');
});

test('applySnapshot restores false-goal hazards (armed = level falseGoals − detonated)', () => {
  const { engineState, navigator } = createHarness();
  engineState.level = { flippingFilterMap: new Map(), falseGoalKeys: [10, 11, 12] };
  navigator.applySnapshot(engineState, {
    path: [1], isPortalJump: [], activeGateKey: 1,
    logicState: core.IDLE, detonatedFalseGoals: [11]
  });
  assertEqual(engineState.hazards.detonatedFalseGoals.has(11), true, 'detonated set restored from snapshot');
  assertEqual(engineState.hazards.armedFalseGoals.has(11), false, 'detonated goal is not re-armed');
  assertEqual(engineState.hazards.armedFalseGoals.has(10), true, 'remaining false goals are armed');
  assertEqual(engineState.hazards.armedFalseGoals.has(12), true, 'remaining false goals are armed');
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

console.log(`\nPath navigator tests: ${passed} passed, ${tests.length - passed} failed`);
