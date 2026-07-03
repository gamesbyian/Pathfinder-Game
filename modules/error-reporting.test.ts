/** Unit tests for the error-reporting seam (hardening plan §4). */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createErrorReporter, defaultReportError } from './error-reporting.js';

test('report forwards context, error, and meta to the sink', () => {
  const calls: any[] = [];
  const { report } = createErrorReporter({ sink: (...args) => calls.push(args) });
  const err = new Error('boom');
  report('submit.save', err, { levelNumber: 3 });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ['submit.save', err, { levelNumber: 3 }]);
  report('load.parse', err);
  assert.deepEqual(calls[1], ['load.parse', err, undefined]);
});

test('onReport observes every report alongside the sink', () => {
  const seen: string[] = [];
  const { report } = createErrorReporter({ sink: () => {}, onReport: (ctx) => seen.push(ctx) });
  report('a', new Error('x'));
  report('b', 'plain-string-reason');
  assert.deepEqual(seen, ['a', 'b']);
});

test('a throwing sink or onReport never propagates into the failure path', () => {
  const { report } = createErrorReporter({
    sink: () => { throw new Error('sink broke'); },
    onReport: () => { throw new Error('observer broke'); },
  });
  assert.doesNotThrow(() => report('ctx', new Error('original')));
});

test('defaultReportError logs through the console without throwing', () => {
  const original = console.error;
  const logged: any[] = [];
  console.error = (...args: any[]) => { logged.push(args); };
  try {
    defaultReportError('fallback.context', new Error('boom'));
  } finally {
    console.error = original;
  }
  assert.equal(logged.length, 1);
  assert.equal(logged[0][0], '[Error] fallback.context');
});
