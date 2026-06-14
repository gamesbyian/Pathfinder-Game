#!/usr/bin/env node
/** Unit tests for debug export window adapter. */
import assert from 'node:assert/strict';
import { createDebug } from '../modules/debug.js';

let passed = 0;
let failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed += 1; }
  catch (error) { console.error(`  ✗ ${name}`); console.error(`    ${error.stack || error.message}`); failed += 1; }
}

test('createDebug exposes registered values only in DEV mode', () => {
  const fakeWindow = {};
  const debug = createDebug({ core: { DEV: true, AXIS: { H: 1 } }, getWindow: () => fakeWindow });
  debug.register('TEST_VALUE', 42);
  debug.expose();
  assert.deepEqual(fakeWindow.AXIS, { H: 1 });
  assert.equal(fakeWindow.TEST_VALUE, 42);
});

test('createDebug is a no-op outside DEV mode and without a window', () => {
  const fakeWindow = {};
  createDebug({ core: { DEV: false, AXIS: {} }, getWindow: () => fakeWindow }).expose();
  assert.deepEqual(fakeWindow, {});
  createDebug({ core: { DEV: true, AXIS: {} }, getWindow: () => null }).expose();
});

if (failed > 0) { console.error(`\nDebug tests: ${passed} passed, ${failed} failed`); process.exit(1); }
console.log(`\nDebug tests: ${passed} passed, ${failed} failed`);
