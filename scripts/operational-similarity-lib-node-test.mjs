import assert from 'node:assert/strict';
import { compareBeamTraceBuckets, compareDeterministicDecisionTraces, compareSiblingRankings, createBoundedSignatureCollector, orderByAdmissibleSlack } from './operational-similarity-lib.mjs';

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

const event = (depth, candidates, activeOrder, family = 'admissible-order') => ({ family, depth, candidates, activeOrder });
const identicalTrace = { observed: 2, retained: 2, truncated: false, events: [
    event(1, [10, 11], [10, 11]), event(2, [20, 21, 22], [21, 20, 22]),
] };
const identicalCopy = JSON.parse(JSON.stringify(identicalTrace));
const identicalComparison = compareDeterministicDecisionTraces(identicalTrace, identicalCopy);
assert.equal(identicalComparison.status, 'identical-retained-trace');
assert.equal(identicalComparison.commonEventPrefix, 2);
assert.equal(identicalComparison.firstDivergence, null);
assert.equal(identicalComparison.retainedEventOverlap.eventSignatureJaccard, 1);

const orderingRight = { observed: 2, retained: 2, truncated: false, events: [
    event(1, [10, 11], [11, 10]), event(2, [30, 31], [30, 31]),
] };
const orderingDivergence = compareDeterministicDecisionTraces(identicalTrace, orderingRight);
assert.equal(orderingDivergence.commonEventPrefix, 0);
assert.equal(orderingDivergence.firstDivergence.reason, 'ordering');
assert.deepEqual(orderingDivergence.firstDivergence.left.activeOrder, [10, 11]);
assert.deepEqual(orderingDivergence.firstDivergence.right.activeOrder, [11, 10]);

const candidateRight = { observed: 2, retained: 2, truncated: false, events: [
    event(1, [10, 12], [10, 12]), event(2, [20, 21, 22], [21, 20, 22]),
] };
assert.equal(compareDeterministicDecisionTraces(identicalTrace, candidateRight).firstDivergence.reason, 'candidate-set');

const censoredLeft = { ...identicalTrace, observed: 9, truncated: true };
const censoredComparison = compareDeterministicDecisionTraces(censoredLeft, identicalTrace);
assert.equal(censoredComparison.status, 'no-divergence-observed-within-censored-bound');
assert.equal(censoredComparison.censored, true);
assert.equal(censoredComparison.left.retained, 2);
assert.equal(censoredComparison.left.observed, 9);

console.log('operational-similarity-lib-node-test: ok');