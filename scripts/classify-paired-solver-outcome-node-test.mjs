import assert from 'node:assert/strict';
import { classifyPairedSolverOutcome } from './classify-paired-solver-outcome.mjs';

const row = (id, ok, workSpent) => ({ id, ok, workSpent });
const gate = { minGains: 1, maxLosses: 0, maxWorkDeltaPct: null };

let result = classifyPairedSolverOutcome(
  [row('A', true, 100), row('B', false, 100)],
  [row('A', true, 100), row('B', true, 100)],
  gate,
);
assert.equal(result.researchOutcome.outcome, 'completed-positive');
assert.deepEqual(result.gained, ['B']);

result = classifyPairedSolverOutcome([row('A', true, 100)], [row('A', false, 90)], gate);
assert.equal(result.researchOutcome.outcome, 'completed-negative');

result = classifyPairedSolverOutcome(
  [row('A', false, 100)],
  [row('A', true, 111)],
  { ...gate, maxWorkDeltaPct: 10 },
);
assert.equal(result.researchOutcome.outcome, 'completed-negative');
assert.match(result.researchOutcome.reason, /frozen gate/);

console.log('paired solver outcome classification tests passed');
