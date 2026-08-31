import assert from 'node:assert/strict';
import { test } from 'vitest';
import { normalizeLevelFromData } from './level-data.js';

const playableButSchemaDiagnosticLevel = {
  grid: { w: 4, h: 5 },
  gates: [{ x: 1, y: 1 }],
  goal: { x: 4, y: 5 },
  reqLen: 2,
  reqInt: 0,
};

test('normalizeLevelFromData reports schema diagnostics but still returns a parseable level', () => {
  const reported: any[] = [];
  const data = {
    getLevels: () => [playableButSchemaDiagnosticLevel],
  } as any;

  const level = normalizeLevelFromData(data, 0, (...args: any[]) => reported.push(args)) as any;

  assert(level, 'parseable Firestore-published levels should still display when schema diagnostics are reported');
  assert.equal(level.grid.w, 4);
  assert.equal(level.grid.h, 5);
  assert.equal(Object.isFrozen(level), true);
  assert.equal(Object.isFrozen(level.grid), true);
  assert.equal(reported.length, 1);
  assert.equal(reported[0][0], 'level.validation');
});
