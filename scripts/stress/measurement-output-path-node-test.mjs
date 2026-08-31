#!/usr/bin/env node
import assert from 'node:assert/strict';

import { defaultStressMeasurementOutput } from './measurement-output-path.mjs';

assert.equal(
  defaultStressMeasurementOutput('data/stress/stress-levels.json', true),
  'reports/stress/solver-corpus1-latest.json',
);
assert.equal(
  defaultStressMeasurementOutput('data/stress/stress-levels-random.json', true),
  'reports/stress/solver-corpus2-latest.json',
);
assert.equal(
  defaultStressMeasurementOutput('./data/stress/stress-levels-random.json', true),
  'reports/stress/solver-corpus2-latest.json',
);
assert.equal(
  defaultStressMeasurementOutput(
    new URL('../../data/stress/stress-levels.json', import.meta.url).pathname,
    true,
    new URL('../../', import.meta.url).pathname,
  ),
  'reports/stress/solver-corpus1-latest.json',
);
assert.equal(
  defaultStressMeasurementOutput('tmp/custom-stress-corpus.json', true),
  'reports/stress/solver-parallel-latest.json',
);
assert.equal(
  defaultStressMeasurementOutput('data/stress/stress-levels-random.json', false),
  'reports/stress/benchmark-latest.json',
);

console.log('stress measurement default output identity is corpus-aware.');
