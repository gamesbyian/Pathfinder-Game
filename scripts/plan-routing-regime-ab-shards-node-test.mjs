import assert from 'node:assert/strict';
import { expandShardsByArm, resolveExpectedIds } from './plan-routing-regime-ab-shards.mjs';
import { assertMatchingPopulationSeals, buildPopulationSeal } from './seal-routing-regime-population.mjs';

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
  corpus1: [{ id: 'C1-A', width: 4 }, { id: 'C1-B', width: 5 }],
  corpus2: [{ id: 'C2-X', width: 6 }],
};
const ids = resolveExpectedIds(baseShards, key => levels[key]);
assert.deepEqual(ids, ['C1-A', 'C1-B', 'C2-X']);

assert.throws(
  () => resolveExpectedIds([{ idx: 'x', corpus_key: 'corpus1', levels: 'pos:99' }], () => [{ id: 'only-one' }]),
  /no level at position 99/,
);

const corpora = [['corpus1', levels.corpus1], ['corpus2', levels.corpus2], ['published', [{ id: 'P-1', width: 7 }]]];
const seal = buildPopulationSeal(['C2-X', 'P-1', 'C1-A'], corpora);
const reordered = buildPopulationSeal(['P-1', 'C1-A', 'C2-X'], corpora);
assert.equal(seal.count, 3);
assert.equal(seal.identityHash, reordered.identityHash, 'caller id order must not affect the population content seal');
assert.equal(assertMatchingPopulationSeals(seal, reordered), true);
const changedCorpora = JSON.parse(JSON.stringify(corpora));
changedCorpora[1][1][0].width = 99;
const changedSeal = buildPopulationSeal(['C2-X', 'P-1', 'C1-A'], changedCorpora);
assert.notEqual(changedSeal.identityHash, seal.identityHash, 'same level ids with changed content must not compare as the same population');
assert.throws(() => assertMatchingPopulationSeals(seal, changedSeal), /content seal mismatch/);
assert.throws(() => buildPopulationSeal(['missing'], corpora), /not found/);

console.log('plan routing regime ab shards tests passed');