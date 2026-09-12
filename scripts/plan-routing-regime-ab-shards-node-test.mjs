import assert from 'node:assert/strict';
import { expandShardsByArm, resolveExpectedIds } from './plan-routing-regime-ab-shards.mjs';

const baseShards = [
  { idx: 'corpus1', corpus: 'c1.json', corpus_key: 'corpus1', levels: 'pos:1,2' },
  { idx: 'corpus2-01', corpus: 'c2.json', corpus_key: 'corpus2', levels: 'pos:1' },
];

const doubled = expandShardsByArm(baseShards);
assert.equal(doubled.length, 4);
assert.deepEqual(doubled.map(s => s.idx), ['control-corpus1', 'control-corpus2-01', 'treatment-corpus1', 'treatment-corpus2-01']);
assert.equal(doubled[0].arm, 'control');
assert.equal(doubled[2].arm, 'treatment');
assert.equal(doubled[0].levels, 'pos:1,2', 'both arms must reuse the exact same position list');
assert.equal(doubled[2].levels, 'pos:1,2');

const levels = {
  corpus1: [{ id: 'C1-A' }, { id: 'C1-B' }],
  corpus2: [{ id: 'C2-X' }],
};
const ids = resolveExpectedIds(baseShards, key => levels[key]);
assert.deepEqual(ids, ['C1-A', 'C1-B', 'C2-X']);

assert.throws(
  () => resolveExpectedIds([{ idx: 'x', corpus_key: 'corpus1', levels: 'pos:99' }], () => [{ id: 'only-one' }]),
  /no level at position 99/,
);

console.log('plan routing regime ab shards tests passed');
