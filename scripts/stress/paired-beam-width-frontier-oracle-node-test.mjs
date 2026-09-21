import assert from 'node:assert/strict';

import {
    compareBeamFrontiers,
    compareFrontierIdentitySets,
} from './paired-beam-width-frontier-oracle.mjs';

const sets = compareFrontierIdentitySets(
    ['A', 'B', 'C'],
    ['B', 'C', 'D', 'E'],
);
assert.equal(sets.left, 3);
assert.equal(sets.right, 4);
assert.equal(sets.shared, 2);
assert.equal(sets.leftOnly, 1);
assert.equal(sets.rightOnly, 2);
assert.equal(sets.jaccard, 2 / 5);
assert.equal(sets.leftContainedInRight, false);
assert.equal(sets.rightContainedInLeft, false);
assert.deepEqual(sets.leftOnlyIds, ['A']);
assert.deepEqual(sets.rightOnlyIds, ['D', 'E']);

const nested = compareFrontierIdentitySets(['A', 'B'], ['A', 'B', 'C']);
assert.equal(nested.leftContainedInRight, true);
assert.equal(nested.rightContainedInLeft, false);

const node = (key, prev = null, score = 0) => ({
    key,
    prev,
    depth: prev ? prev.depth + 1 : 0,
    score,
});
const root = node(1);
const a = node(2, root, 10);
const b = node(3, root, 11);
const a2 = node(4, a, 20);
const b2 = node(5, b, 21);
const c2 = node(6, a, 22);

const frontier = compareBeamFrontiers([a2, b2], [b2, c2]);
assert.equal(frontier.shared, 1);
assert.equal(frontier.leftOnly, 1);
assert.equal(frontier.rightOnly, 1);
assert.deepEqual(frontier.leftOnlyRows[0].prefix, [1, 2, 4]);
assert.deepEqual(frontier.rightOnlyRows[0].prefix, [1, 2, 6]);
assert.deepEqual(frontier.sharedRows[0].left.prefix, [1, 3, 5]);
assert.deepEqual(frontier.sharedRows[0].right.prefix, [1, 3, 5]);

console.log('paired beam-width frontier oracle tests passed');
