import assert from 'node:assert/strict';
import { test } from 'vitest';
import { scoreProtectedBucketOverlay } from './score-protected-bucket-overlay.js';

test('PG-I global top 75% is protected while bucket-selected minority fills remaining slots', () => {
    const pool = Array.from({ length: 12 }, (_, rank) => ({ rank: rank + 1 }));
    const originalBuckets = [pool[0], pool[1], pool[2], pool[4], pool[7], pool[8], pool[10], pool[11]];
    const rawOrder = [...originalBuckets];
    const overlay = scoreProtectedBucketOverlay(pool, originalBuckets, 8, 6);
    assert.deepEqual(overlay.map(x => x.rank), [1, 2, 3, 4, 5, 6, 8, 9]);
    assert.deepEqual(originalBuckets, rawOrder, 'source bucket result not mutated');
    assert.equal(new Set(overlay).size, 8);
});
test('zero protected slots reproduces original bucket set and width-full protection reproduces scored topK', () => {
    const xs = Array.from({ length: 8 }, (_, id) => ({ id }));
    const buckets = [xs[0], xs[2], xs[4], xs[6]];
    assert.deepEqual(scoreProtectedBucketOverlay(xs, buckets, 4, 0), buckets);
    assert.deepEqual(scoreProtectedBucketOverlay(xs, buckets, 4, 4), xs.slice(0, 4));
});
test('PG-I overlay fails closed on malformed floor and does not reuse an already chosen node', () => {
    const xs = [{ id: 1 }, { id: 2 }, { id: 3 }];
    assert.throws(() => scoreProtectedBucketOverlay(xs, xs, 2, 3), /invalid width/);
    assert.throws(() => scoreProtectedBucketOverlay(xs, xs, 0, 0), /invalid width/);
    assert.deepEqual(scoreProtectedBucketOverlay(xs, [xs[0], xs[0], xs[1]], 2, 0), xs.slice(0, 2));
});
