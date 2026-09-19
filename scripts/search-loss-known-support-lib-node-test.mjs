#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    joinSearchLossToKnownHintSupport,
    knownHintSupportForPrefix,
    pathHasPrefix,
} from './search-loss-known-support-lib.mjs';

assert.equal(pathHasPrefix([1, 2, 3], [1, 2]), true);
assert.equal(pathHasPrefix([1, 3, 2], [1, 2]), false);

const hints = [
    { path: [1, 2, 3, 4], provenance: [] },
    { path: [1, 2, 5, 6], provenance: [] },
    { path: [1, 9, 8], provenance: [] },
];
assert.deepEqual(knownHintSupportForPrefix([1, 2], hints), {
    support: 'PRESENT',
    supportedHintCount: 2,
    terminalHintCount: 0,
    distinctKnownNextSteps: 2,
    knownNextSteps: [3, 5],
    minRemainingMoves: 2,
    maxRemainingMoves: 2,
    matchedHintIndices: [1, 2],
    matchedHintIndicesTruncated: false,
});
assert.equal(knownHintSupportForPrefix([1, 7], hints).support, 'NOT_OBSERVED');

const capture = {
    capsules: [
        { capsuleId: 'a', parentId: 'P1', replayBasis: 'replayable', prefix: [1, 2] },
        { capsuleId: 'b', parentId: 'P1', replayBasis: 'identity-only' },
        { capsuleId: 'c', parentId: 'P2', replayBasis: 'replayable', prefix: [7, 8] },
    ],
};
const joined = joinSearchLossToKnownHintSupport(capture, {
    resolvePrefix: capsule => capsule.prefix ?? null,
    resolveHints: parentId => parentId === 'P1' ? hints : [{ path: [7, 8, 9], provenance: [] }],
});
assert.equal(joined.summary.capsules, 3);
assert.equal(joined.summary.observed, 2);
assert.equal(joined.summary.unavailable, 1);
assert.equal(joined.summary.withKnownSupport, 2);
assert.equal(joined.summary.parentsWithKnownSupport, 2);
assert.equal(joined.rows[1].reason, 'capsule-not-replayable');

console.log('search-loss-known-support-lib-node-test: ok');
