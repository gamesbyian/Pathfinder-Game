/** Unit tests for debug export window adapter. */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createDebug } from './debug.js';


test('createDebug exposes registered values only in DEV mode', () => {
  const fakeWindow: any = {};
  const debug = createDebug({ isDevMode: true, axis: { H: 1 }, getWindow: () => fakeWindow });
  debug.register('TEST_VALUE', 42);
  debug.expose();
  assert.deepEqual(fakeWindow.AXIS, { H: 1 });
  assert.equal(fakeWindow.TEST_VALUE, 42);
});

test('createDebug is a no-op outside DEV mode and without a window', () => {
  const fakeWindow: any = {};
  createDebug({ isDevMode: false, axis: {}, getWindow: () => fakeWindow }).expose();
  assert.deepEqual(fakeWindow, {});
  createDebug({ isDevMode: true, axis: {}, getWindow: () => null }).expose();
});
