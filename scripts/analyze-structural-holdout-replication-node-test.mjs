import assert from 'node:assert/strict';
import { analyzeHoldoutReplication } from './analyze-structural-holdout-replication.mjs';

const row = (id, split, solved, x) => ({
    levelId: id,
    corpus: split,
    productionSolved: solved,
    features: { requiredPathLength: x, portals: x / 10 },
});
const base = {
    schemaVersion: 2,
    levels: [
        row('A', 'corpus1', true, 10),
        row('B', 'corpus1', true, 12),
        row('C', 'corpus1', false, 30),
        row('D', 'corpus1', false, 28),
        row('E', 'corpus2', true, 11),
        row('F', 'corpus2', true, 13),
        row('G', 'corpus2', false, 31),
        row('H', 'corpus2', false, 29),
    ],
};
const result = analyzeHoldoutReplication(base, { splitValues: ['corpus1', 'corpus2'] });
assert.equal(result.splitA.value, 'corpus1');
assert.equal(result.splitB.value, 'corpus2');
assert.equal(result.splitA.n, 4);
assert.equal(result.splitB.n, 4);
assert.ok(result.spearmanRankCorrelation !== null);
assert.equal(result.splitA.ranking[0].feature, result.splitB.ranking[0].feature);
assert.ok(result.topOverlapCount >= 1);

assert.throws(() => analyzeHoldoutReplication({ levels: [] }), /non-empty/);
assert.throws(() => analyzeHoldoutReplication({
    levels: [
        { corpus: 'a', productionSolved: true, features: { x: 1 } },
        { corpus: 'b', productionSolved: true, features: { x: 1 } },
        { corpus: 'c', productionSolved: true, features: { x: 1 } },
    ],
}), /Expected exactly 2 split values/);

console.log('analyze-structural-holdout-replication tests passed');
