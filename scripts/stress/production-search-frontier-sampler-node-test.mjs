import assert from 'node:assert/strict';

import {
    frontierAncestryKey,
    reconstructBeamPath,
    sampleDistinctIndices,
} from './production-search-frontier-sampler-lib.mjs';

const first = sampleDistinctIndices(20, 8, 'same-seed');
const second = sampleDistinctIndices(20, 8, 'same-seed');
assert.deepEqual(first, second);
assert.equal(first.length, 8);
assert.equal(new Set(first).size, 8);
assert.ok(first.every(index => index >= 0 && index < 20));
assert.equal(sampleDistinctIndices(3, 10, 'bounded').length, 3);
assert.throws(() => sampleDistinctIndices(-1, 2, 'bad'), /count/);

const node0 = { depth: 0, key: 11, prev: null };
const node1 = { depth: 1, key: 12, prev: node0 };
const node2 = { depth: 2, key: 13, prev: node1 };
assert.deepEqual(reconstructBeamPath(node2), [11, 12, 13]);

assert.equal(
    frontierAncestryKey({
        corpus: 'c2', levelId: 'R00001', profile: 'intersectionHarvest',
        width: 5000, depth: 12, seed: 's',
    }),
    'c2|R00001|beam-frontier|intersectionHarvest|width=5000|depth=12|seed=s',
);

console.log('production-search-frontier-sampler-node-test: ok');
