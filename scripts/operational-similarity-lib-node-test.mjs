import assert from 'node:assert/strict';
import { compareBeamTraceBuckets, compareSiblingRankings, createBoundedSignatureCollector, orderByAdmissibleSlack } from './operational-similarity-lib.mjs';

for (const count of [2, 3, 4]) {
    const rows = Array.from({ length: count }, (_, id) => ({ id: String(id), score: count - id }));
    const same = compareSiblingRankings(rows, [...rows]);
    assert.equal(same.topChoiceAgreement, true);
    assert.equal(same.fullRankingAgreement, true);
    assert.equal(same.kendallAgreement, 1);
}
const tied = compareSiblingRankings([{ id: 'a', score: 1 }, { id: 'b', score: 1 }], [{ id: 'a', score: 1 }, { id: 'b', score: 1 }]);
assert.equal(tied.tiedPairCount, 1);
assert.deepEqual(tied.leftOrder, ['a', 'b']); // left candidate order is the deterministic tie rule
assert.throws(() => compareSiblingRankings([{ id: 'a', score: 1 }, { id: 'b', score: 0 }],
    [{ id: 'b', score: 0 }, { id: 'a', score: 1 }]), /original candidate order/);

const children = [{ id: 'a', slack: 1 }, { id: 'b', slack: 1 }, { id: 'c', slack: 0 }];
assert.deepEqual(orderByAdmissibleSlack(children).map(x => x.id), ['c', 'a', 'b']); // ida:none
assert.deepEqual(orderByAdmissibleSlack(children, { a: 1, b: 2, c: -9 }).map(x => x.id), ['c', 'b', 'a']);
assert.deepEqual(orderByAdmissibleSlack([{ id: 'a', slack: 0 }, { id: 'b', slack: 1 }], { b: 99 }).map(x => x.id), ['a', 'b']);

const collector = createBoundedSignatureCollector(2);
collector.observe('a'); collector.observe('b'); collector.observe('c');
assert.deepEqual(collector.snapshot(), { observed: 3, retained: 2, truncated: true, signatures: ['a', 'b'] });
assert.deepEqual(compareBeamTraceBuckets(
    [{ stage: 'retained', depth: 2, observed: 3, truncated: false, signatures: ['a', 'b'] }],
    [{ stage: 'retained', depth: 2, observed: 4, truncated: true, signatures: ['b', 'c'] }],
), [{ stage: 'retained', depth: 2, leftObserved: 3, rightObserved: 4,
    leftRetainedUnique: 2, rightRetainedUnique: 2, signatureIntersection: 1,
    signatureUnion: 3, retainedSignatureJaccard: 1 / 3, censored: true }]);
console.log('operational-similarity-lib-node-test: ok');
