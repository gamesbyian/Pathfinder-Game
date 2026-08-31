/** Unit tests for state slice factories. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createState } from './state.js';
import { IDLE, OVERLAY_NONE, PLAY } from './app-constants.js';
import { createNavigationState, createHazardState, createEngineState } from './state-slices.js';

test('createState builds the expected top-level engineState defaults', () => {
  const { engineState } = createState();
  assert.equal(engineState.mode, PLAY);
  assert.equal(engineState.logicState, IDLE);
  assert.equal(engineState.overlayState, OVERLAY_NONE);
  assert.equal(engineState.runtime.currentTheme, 'classic');
  assert.equal(engineState.muted, true);
  assert.deepEqual(engineState.options, { geese: true, falseGoals: true, deadGates: true });
});

test('state slice factories return independent mutable collections', () => {
  const first = createEngineState();
  const second = createEngineState();
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
