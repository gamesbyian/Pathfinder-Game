import assert from 'node:assert/strict';
import { sampleDeterministic } from './select-random-sample.mjs';

const levels = Array.from({ length: 20 }, (_, i) => ({ id: `L${i + 1}` }));

const a = sampleDeterministic(levels, 5, 'seed-alpha');
const b = sampleDeterministic(levels, 5, 'seed-alpha');
const c = sampleDeterministic(levels, 5, 'seed-beta');

assert.equal(a.length, 5);
// Same seed -> byte-identical sample (same indices, same order).
assert.deepEqual(a.map((r) => r.index), b.map((r) => r.index));
// A different seed is very unlikely to draw the exact same 5-of-20 set.
assert.notDeepEqual(a.map((r) => r.index), c.map((r) => r.index));
// Output is sorted by original position, not draw order.
for (let i = 1; i < a.length; i++) assert.ok(a[i].index > a[i - 1].index);
// No duplicates.
assert.equal(new Set(a.map((r) => r.index)).size, 5);
// n >= levels.length returns every level, in original order, index-tagged.
const all = sampleDeterministic(levels, 20, 'irrelevant');
assert.equal(all.length, 20);
assert.deepEqual(all.map((r) => r.index), levels.map((_, i) => i));
const over = sampleDeterministic(levels, 25, 'irrelevant');
assert.equal(over.length, 20);

// excludeIds: an excluded level can never be drawn, and the sample still reaches full size from
// the remaining pool.
const excludeIds = new Set(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10']);
const excluded = sampleDeterministic(levels, 5, 'seed-alpha', excludeIds);
assert.equal(excluded.length, 5);
assert.ok(excluded.every((r) => !excludeIds.has(r.level.id)));

console.log('select-random-sample tests passed');
