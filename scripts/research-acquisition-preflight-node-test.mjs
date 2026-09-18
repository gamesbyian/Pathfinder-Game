import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { acquisitionStopRule, chooseAcquisitionRoute, generationGuidanceForRoute, inferAcquisitionNeed, rankCandidateAssets } from './research-acquisition-preflight-lib.mjs';

const d1 = {
    id: 'D1',
    question: 'Does the observer disagree with production ranking across independent parents?',
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

const lengthTransfer = {
    id: 'LEN',
    question: 'Does remaining length transfer?',
    reopensOn: 'An independent shared-budget population exposes the same signal.',
};
assert.equal(chooseAcquisitionRoute({ question: lengthTransfer }).route, 'FRESH_SAME_SOURCE');

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
assert.deepEqual(generationGuidanceForRoute('FRESH_SAME_SOURCE').candidateMethods.map(row => row.id), ['random']);
assert.deepEqual(generationGuidanceForRoute('CROSS_SOURCE_TRANSFER').candidateMethods.map(row => row.id), ['random', 'topology']);
assert.equal(generationGuidanceForRoute('NO_LEVEL_GENERATION').automaticGeneration, false);


const tempDir = mkdtempSync(path.join(tmpdir(), 'pathfinder-acquisition-preflight-'));
try {
    const blockPath = path.join(tempDir, 'block.json');
    const controlPath = path.join(tempDir, 'control.json');
    const populationIdentity = `sha256:${'3'.repeat(64)}`;
    writeFileSync(blockPath, JSON.stringify({
        populationIdentity,
        researchBlock: {
            blockId: 'CLI-BLOCK',
            questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
            sourceRegime: 'test',
            sourceRevision: 'test-revision',
            evidenceRole: 'development',
            independentUnit: 'parent-level',
            parentIds: ['R1'],
            parentContentIdentities: ['v2:test'],
            sourceArtifactRefs: [blockPath],
            createdBy: { producer: 'test', manifestRef: blockPath, runRef: null },
            generationRef: null,
            consumptionEvents: [],
        },
    }));
    writeFileSync(controlPath, JSON.stringify({
        levels: [
            { id: 'R1', ok: false, attempts: [] },
            { id: 'R2', ok: true, attempts: [] },
        ],
    }));

    const run = spawnSync(process.execPath, [
        'scripts/research-acquisition-preflight.mjs',
        '--question-id=WS2-D1-PRODUCTION-INERT-OBSERVATION',
        `--artifact=${blockPath}`,
        `--control=${controlPath}`,
        '--opportunity-mode=control-fail',
        '--target-opportunities=1',
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const output = JSON.parse(run.stdout);
    assert.equal(output.route, 'REUSE_EXISTING');
    assert.equal(output.existing.mechanicallyEligibleBlocks, 1);
    assert.equal(output.generationGuidance.automaticGeneration, false);
    assert.equal(output.existing.explicitArtifactInputs, 1);
    assert.equal(output.opportunitySizing.opportunities, 1);
    assert.equal(output.opportunitySizing.total, 2);
    assert.ok(output.candidateAssets.assets.length > 0);
    assert.match(output.evidencePlan.stopRule, /existing material/u);
} finally {
    rmSync(tempDir, { recursive: true, force: true });
}
