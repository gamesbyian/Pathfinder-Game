import assert from 'node:assert/strict';
import { findPhase13NormalizedMetricResidue } from './naming-cleanup-phase13-closeout.mjs';

assert.deepEqual(
  findPhase13NormalizedMetricResidue('fixture.ts', 'const raw = input; return raw.reqLen + raw.reqInt;'),
  [],
);
assert.deepEqual(
  findPhase13NormalizedMetricResidue('fixture.ts', 'return wire.reqLen + point.reqInt;'),
  [],
);

assert.ok(
  findPhase13NormalizedMetricResidue(
    'fixture.ts',
    'const level = normalizeRawLevel(raw); return level.reqInt;',
  ).length > 0,
);
assert.ok(
  findPhase13NormalizedMetricResidue(
    'fixture.ts',
    'function f(level: NormalizedLevel) { return level.reqLen; }',
  ).length > 0,
);
assert.ok(
  findPhase13NormalizedMetricResidue(
    'modules/solver/example.test.ts',
    'const level = makeLevel(); return level.reqLen;',
  ).length > 0,
);
assert.ok(
  findPhase13NormalizedMetricResidue(
    'fixture.ts',
    'const level = { reqLen: 4, requiredIntersections: 0 } as NormalizedLevel;',
  ).length > 0,
);

assert.deepEqual(
  findPhase13NormalizedMetricResidue(
    'modules/domain/example.ts',
    'function f(raw) { return raw.reqLen; } function g(wire) { return wire.reqInt; }',
  ),
  [],
);

console.log('Phase-13 normalized metric closeout negative fixtures passed.');
