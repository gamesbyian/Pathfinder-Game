import assert from 'node:assert/strict';

import {
    frontierAncestryKey,
    resolveInheritedResearchBlock,
    reconstructBeamPath,
    sampleDistinctIndices,
} from './production-search-frontier-sampler-lib.mjs';

const first = sampleDistinctIndices(20, 8, 'same-seed');
const second = sampleDistinctIndices(20, 8, 'same-seed');
assert.deepEqual(first, second);
assert.equal(first.length, 8);
assert.equal(new Set(first).size, 8);
assert.ok(first.every(index => index >= 0 && index < 20));
assert.equal(sampleDistinctIndices(3, 10, 'bounded').length, 3);
assert.throws(() => sampleDistinctIndices(-1, 2, 'bad'), /count/);

const node0 = { depth: 0, key: 11, prev: null };
const node1 = { depth: 1, key: 12, prev: node0 };
const node2 = { depth: 2, key: 13, prev: node1 };
assert.deepEqual(reconstructBeamPath(node2), [11, 12, 13]);

assert.throws(() => frontierAncestryKey({
    corpus: 'c2', levelId: 'R00001', profile: 'intersectionHarvest', width: 5000, depth: 12,
}), /solverCommit/);

assert.equal(
    frontierAncestryKey({
        corpus: 'c2', levelId: 'R00001', profile: 'intersectionHarvest',
        width: 5000, depth: 12, solverCommit: 'abc123',
    }),
    'c2|R00001|beam-frontier|intersectionHarvest|width=5000|depth=12|solver=abc123',
);

const populationIdentity = `sha256:${'5'.repeat(64)}`;
const inherited = resolveInheritedResearchBlock({
    populationIdentity,
    researchBlock: {
        blockId: 'FRONTIER-BLOCK',
        questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
        sourceRegime: 'test',
        sourceRevision: 'test-revision',
        evidenceRole: 'development',
        independentUnit: 'parent-level',
        parentIds: ['R00001', 'R00002'],
        parentContentIdentities: ['v2:a', 'v2:b'],
        sourceArtifactRefs: ['tmp/block.json'],
        createdBy: { producer: 'test', manifestRef: 'tmp/block.json', runRef: null },
        generationRef: null,
        consumptionEvents: [],
    },
}, {
    levelIds: ['R00002'],
    artifactRef: 'tmp/block.json',
});
assert.equal(inherited.populationIdentity, populationIdentity);
assert.equal(inherited.resolvedQuestion, 'WS2-D1-PRODUCTION-INERT-OBSERVATION');
assert.throws(() => resolveInheritedResearchBlock({
    populationIdentity,
    researchBlock: inherited.researchBlock,
}, { levelIds: ['R99999'] }), /does not contain sampled parent/u);
assert.throws(() => resolveInheritedResearchBlock({
    populationIdentity,
    researchBlock: inherited.researchBlock,
}, { levelIds: ['R00001'], question: 'OTHER' }), /conflicts with block questionId/u);

console.log('production-search-frontier-sampler-node-test: ok');
