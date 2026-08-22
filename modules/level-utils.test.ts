import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createLevelUtils } from './level-utils.js';

const playableButSchemaDiagnosticLevel = {
  grid: { w: 4, h: 5 },
  gates: [{ x: 1, y: 1 }],
  goal: { x: 4, y: 5 },
  reqLen: 2,
  reqInt: 0,
};

test('normalizeLevel reports schema diagnostics but still returns a parseable level', () => {
  const reported: any[] = [];
  const levelUtils = createLevelUtils({
    core: {},
    data: { getLevels: () => [playableButSchemaDiagnosticLevel] },
    getState: () => ({ viewport: {} }),
    getRenderer: () => ({ getCanvas: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }), width: 1, height: 1 }) }),
    reportError: (...args: any[]) => reported.push(args),
  });

  const level = levelUtils.normalizeLevel(0) as any;

  assert(level, 'parseable Firestore-published levels should still display when schema diagnostics are reported');
  assert.equal(level.grid.w, 4);
  assert.equal(level.grid.h, 5);
  assert.equal(reported.length, 1);
  assert.equal(reported[0][0], 'level.validation');
});
