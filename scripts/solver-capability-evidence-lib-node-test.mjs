import assert from 'node:assert/strict';

import { buildCapabilityEvidence } from './solver-capability-evidence-lib.mjs';

const baselineRows = [
  { id: 'A', ok: true, workSpent: 10 },
  { id: 'B', ok: false, workSpent: 20 },
  { id: 'C', ok: false, workSpent: 30 },
];

const candidateRows = [
  { id: 'A', ok: true, workSpent: 11 },
  { id: 'B', ok: true, workSpent: 21 },
  { id: 'C', ok: false, workSpent: 31 },
];

const result = buildCapabilityEvidence({
  baselineId: 'fixture',
  baselineRows,
  candidates: [
    { id: 'live', rows: candidateRows },
    { id: 'historical', signature: { gainIds: ['B', 'C', 'Z'], lossIds: [] } },
  ],
});

const live = result.candidates.find(candidate => candidate.id === 'live');
const historical = result.candidates.find(candidate => candidate.id === 'historical');
assert.deepEqual(live.currentResidualNominationIds, ['B']);
assert.deepEqual(historical.currentResidualNominationIds, ['B', 'C']);
assert.deepEqual(historical.currentlySolvedHistoricalGainIds, []);

assert.deepEqual(result.pairwiseCurrentResidualNominationOverlap, [{
  a: 'live',
  b: 'historical',
  overlap: 1,
  union: 2,
  jaccard: 0.5,
  overlapIds: ['B'],
}]);

assert.deepEqual(live.uniqueCurrentResidualNominationIds, []);
assert.deepEqual(historical.uniqueCurrentResidualNominationIds, ['C']);
assert.deepEqual(result.union.nominatedIds, ['B', 'C']);
assert.deepEqual(result.union.unnominatedIds, []);

console.log('solver capability evidence shared-set regression tests passed');
