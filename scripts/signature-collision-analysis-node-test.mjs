import assert from 'node:assert/strict';

import {
    groupRowsByKey,
    summarizeSignatureCollisions,
} from './signature-collision-analysis-lib.mjs';

const rows = [
    { id: 'a1', parent: 'A', sig: ['x', 1], label: 'LIVE' },
    { id: 'a2', parent: 'A', sig: ['x', 1], label: 'DEAD' },
    { id: 'b1', parent: 'B', sig: ['y', 2], label: 'LIVE' },
    { id: 'c1', parent: 'C', sig: ['y', 2], label: 'LIVE' },
    { id: 'd1', parent: 'D', sig: ['z', 3], label: 'DEAD' },
];

const groups = groupRowsByKey(rows, row => row.sig);
assert.equal(groups.size, 3);

const summary = summarizeSignatureCollisions(rows, {
    signature: row => row.sig,
    label: 'label',
    independentUnit: 'parent',
    rowId: 'id',
    includeMembers: true,
});
assert.equal(summary.rowCount, 5);
assert.equal(summary.distinctSignatures, 3);
assert.equal(summary.multiMemberGroups, 2);
assert.equal(summary.mixedGroups, 1);
assert.equal(summary.sameUnitMixedGroups, 1);
assert.equal(summary.crossUnitMixedGroups, 0);
assert.equal(summary.crossUnitMultiMemberGroups, 1);
assert.equal(summary.rowsInMultiMemberGroups, 4);
assert.equal(summary.rowsInMixedGroups, 2);
assert.equal(summary.largestGroupRows, 2);
assert.ok(summary.signatureBytes.mean > 0);
assert.deepEqual(summary.groups.find(group => group.mixed).labels, ['DEAD', 'LIVE']);

assert.throws(() => summarizeSignatureCollisions(rows, { signature: 'sig' }), /label selectors/);
assert.throws(() => groupRowsByKey([{ sig: null }], 'sig'), /non-null group key/);

console.log('signature-collision-analysis-node-test: ok');
