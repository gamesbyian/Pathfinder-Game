import assert from 'node:assert/strict';
import { analyzeExperimentResponseCovariance } from './experiment-response-covariance-lib.mjs';

const result = analyzeExperimentResponseCovariance([
    { id: 'A', ancestryKey: 'x', rows: [{ id: '1', outcome: 'gain' }, { id: '2', outcome: 'loss' }] },
    { id: 'B', ancestryKey: 'y', rows: [{ id: '1', outcome: 'gain' }, { id: '2', outcome: 'loss' }] },
    { id: 'C', ancestryKey: 'x', rows: [{ id: '1', outcome: 'gain' }, { id: '2', outcome: 'loss' }] },
]);
assert.equal(result.pairs.find(row => row.left === 'A' && row.right === 'B').signedResponseCosine, 1);
assert.equal(result.pairs.find(row => row.left === 'A' && row.right === 'B').eligibleNomination, true);
assert.equal(result.pairs.find(row => row.left === 'A' && row.right === 'C').ancestryIndependent, false);
assert.equal(result.pairs.find(row => row.left === 'A' && row.right === 'C').eligibleNomination, false);
assert.throws(() => analyzeExperimentResponseCovariance([{ id: 'A', ancestryKey: 'x', rows: [{ id: '1', outcome: 'maybe' }] }]), /outcome/);
console.log('experiment-response-covariance-lib-node-test: ok');
