// Self-tests for the shared test-lib (modernization-plan §6 Phase 3): the harness and fixtures
// are themselves load-bearing, so they get their own fast unit suite.
import { test, run, assert } from './test-lib/harness.mjs';
import { makeRawLevel, createFakeScheduler } from './test-lib/fixtures.mjs';
import { SOLVER_TESTING_API } from '../modules/SolverV2.js';

// ── harness ────────────────────────────────────────────────────────────────
test('harness runs sync and async tests and exposes assert', async () => {
  let ran = 0;
  // A nested harness instance would share module state, so exercise the public assert instead.
  assert.equal(typeof assert.equal, 'function');
  await Promise.resolve();
  ran += 1;
  assert.equal(ran, 1);
});

// ── makeRawLevel ───────────────────────────────────────────────────────────
test('makeRawLevel produces a solver-normalizable level by default', () => {
  const raw = makeRawLevel();
  const level = SOLVER_TESTING_API.normalizeRawLevel(raw);
  assert.equal(level.grid.w, 5);
  assert.equal(level.grid.h, 1);
  assert.equal(level.gateKeys.length, 1);
  assert.equal(level.reqLen, 4);
});

test('makeRawLevel overrides merge over the defaults', () => {
  const raw = makeRawLevel({ grid: { w: 3, h: 3 }, reqInt: 2, mustPass: [{ x: 2, y: 2 }] });
  assert.equal(raw.grid.w, 3);
  assert.equal(raw.reqInt, 2);
  assert.equal(raw.goal.x, 3); // recomputed from the overridden grid width
  assert.deepEqual(raw.mustPass, [{ x: 2, y: 2 }]);
  // Untouched defaults remain present.
  assert.deepEqual(raw.blocks, []);
});

// ── createFakeScheduler ──────────────────────────────────────────────────────
test('createFakeScheduler captures timers and runs them on demand', () => {
  const sched = createFakeScheduler();
  let a = 0;
  let b = 0;
  sched.scheduleTimer('a', 100, () => { a += 1; });
  sched.scheduleTimer('b', 200, () => { b += 1; });
  assert.equal(sched.pending().length, 2);
  assert.equal(a, 0); // not run until advanced

  assert.equal(sched.runId('a'), 1);
  assert.equal(a, 1);
  assert.equal(b, 0);
  assert.equal(sched.pending().length, 1);

  assert.equal(sched.runAll(), 1);
  assert.equal(b, 1);
  assert.equal(sched.pending().length, 0);
});

await run('Test-lib (harness + fixtures)');
