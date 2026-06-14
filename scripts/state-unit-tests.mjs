#!/usr/bin/env node
/** Unit tests for state slice factories. */
import assert from 'node:assert/strict';
import { createState } from '../modules/state.js';
import { createNavigationState, createHazardState, createEngineState } from '../modules/state-slices.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed += 1; }
  catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

const core = { PLAY: 1, IDLE: 2, OVERLAY_NONE: 3 };

test('createState builds the expected top-level ENGINE defaults', () => {
  const { ENGINE } = createState({ core });
  assert.equal(ENGINE.mode, core.PLAY);
  assert.equal(ENGINE.logicState, core.IDLE);
  assert.equal(ENGINE.overlayState, core.OVERLAY_NONE);
  assert.equal(ENGINE.runtime.currentTheme, 'classic');
  assert.equal(ENGINE.muted, true);
  assert.deepEqual(ENGINE.options, { geese: true, falseGoals: true, deadGates: true });
});

test('state slice factories return independent mutable collections', () => {
  const first = createEngineState({ core });
  const second = createEngineState({ core });
  first.nav.path.push(123);
  first.nav.visitedCounts.set(1, 2);
  first.hazards.revealedGeese.add(5);
  first.progressSet.add(7);
  assert.deepEqual(second.nav.path, []);
  assert.equal(second.nav.visitedCounts.size, 0);
  assert.equal(second.hazards.revealedGeese.size, 0);
  assert.equal(second.progressSet.size, 0);
});

test('navigation and hazard slices expose expected collection types', () => {
  const nav = createNavigationState();
  const hazards = createHazardState();
  assert.ok(nav.isPortalJump instanceof Set);
  assert.ok(nav.visitedCounts instanceof Map);
  assert.ok(nav.crossedFlippingFilters instanceof Map);
  assert.ok(hazards.armedFalseGoals instanceof Set);
  assert.ok(hazards.detonatedFalseGoals instanceof Set);
});

if (failed > 0) { console.error(`\nState tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nState tests: ${passed} passed, ${failed} failed`);
