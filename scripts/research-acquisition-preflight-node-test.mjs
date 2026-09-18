import assert from 'node:assert/strict';
import { acquisitionStopRule, chooseAcquisitionRoute, inferAcquisitionNeed, rankCandidateAssets } from './research-acquisition-preflight-lib.mjs';

const d1 = {
    id: 'D1',
    question: 'Does the observer disagree with production ranking?',
    constrains: ['measure information cost and workSpent before any exact-query production mechanism'],
    reopensOn: null,
};
assert.equal(inferAcquisitionNeed(d1), 'telemetry-or-economics');
assert.equal(chooseAcquisitionRoute({ question: d1 }).route, 'NO_LEVEL_GENERATION');

const fresh = {
    id: 'F3',
    question: 'descriptor coverage',
    reopensOn: 'Fresh independent parents produce non-zero decision-bearing discordance.',
};
assert.equal(chooseAcquisitionRoute({ question: fresh }).route, 'FRESH_SAME_SOURCE');

const family = {
    id: 'CF',
    question: 'causal contrast',
    reopensOn: 'A controlled family expansion isolates the perturbation.',
};
assert.equal(chooseAcquisitionRoute({ question: family }).route, 'CONTROLLED_FAMILY');

assert.equal(chooseAcquisitionRoute({
    question: d1,
    eligibleBlocks: [{ blockId: 'B1' }],
}).route, 'REUSE_EXISTING');

assert.equal(chooseAcquisitionRoute({
    question: d1,
    requestedNeed: 'cross-source-transfer',
}).route, 'CROSS_SOURCE_TRANSFER');

console.log('research acquisition preflight tests passed');


const ranked = rankCandidateAssets(
    { id: 'Q', question: 'exact prefix feasibility and production frontier observation' },
    [
        { id: 'unrelated', name: 'Unrelated archive', affordances: ['weather'] },
        { id: 'exact-reference-labels', name: 'Exact/reference feasibility labels', affordances: ['prefix feasibility'], queryEntryPoints: ['query exact'] },
        { id: 'operational-traces', name: 'Operational traces', affordances: ['production frontier observation'], queryEntryPoints: ['query trace'] },
    ],
);
assert.deepEqual(ranked.map(row => row.id), ['exact-reference-labels', 'operational-traces']);
assert.match(acquisitionStopRule('NO_LEVEL_GENERATION'), /stop before generation/u);
assert.match(acquisitionStopRule('FRESH_SAME_SOURCE'), /pilot first/u);
