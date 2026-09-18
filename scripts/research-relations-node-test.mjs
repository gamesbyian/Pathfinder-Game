import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
    buildResearchRelations,
    indexBy,
    leftJoin,
    queryRelation,
    summarizeIndependentSupport,
} from './research-relations-lib.mjs';

const model = {
    relations: {
        demo: [
            { id: 'A', state: 'active', tags: ['topology', 'separator'] },
            { id: 'B', state: 'closed-tested-form', tags: ['repair'] },
        ],
    },
};

assert.deepEqual(queryRelation(model, 'demo', { query: 'topology separator' }).rows.map(row => row.id), ['A']);
assert.deepEqual(queryRelation(model, 'demo', { status: 'closed' }).rows.map(row => row.id), ['B']);
assert.throws(() => indexBy([{ id: 'x' }, { id: 'x' }], 'id'), /duplicate relation identity/);

const joined = leftJoin(
    [{ id: 'x' }, { id: 'y' }],
    [{ parent: 'x', value: 1 }, { parent: 'x', value: 2 }],
    { leftKey: 'id', rightKey: 'parent', as: 'children' },
);
assert.equal(joined[0].children.length, 2);
assert.equal(joined[1].children.length, 0);

assert.deepEqual(summarizeIndependentSupport([
    { parent: 'P1' }, { parent: 'P1' }, { parent: 'P2' }, { parent: null },
], 'parent'), {
    rows: 4,
    independentUnits: 2,
    missingIndependentUnit: 1,
    largestUnitRows: 2,
    units: { P1: 2, P2: 1 },
});

const artifactDir = mkdtempSync(path.join(tmpdir(), 'pathfinder-research-relations-'));
try {
    const populationIdentity = `sha256:${'2'.repeat(64)}`;
    const block = {
        blockId: 'D1-BLOCK-TEST',
        questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
        sourceRegime: 'data/stress/stress-levels-random.json',
        sourceRevision: `sha256:${'3'.repeat(64)}`,
        evidenceRole: 'development',
        independentUnit: 'parent-level',
        parentIds: ['R1', 'R2'],
        parentContentIdentities: ['v2:a', 'v2:b'],
        sourceArtifactRefs: ['capture.json'],
        createdBy: { producer: 'capture-d1', manifestRef: 'capture.json', runRef: 'run-1' },
        generationRef: null,
        consumptionEvents: [],
    };
    const capturePath = path.join(artifactDir, 'capture.json');
    const annotationPath = path.join(artifactDir, 'annotation.json');
    writeFileSync(capturePath, JSON.stringify({
        kind: 'd1-production-inert-decision-capture',
        populationIdentity,
        researchBlock: block,
    }));
    writeFileSync(annotationPath, JSON.stringify({
        kind: 'd1-production-inert-decision-annotation',
        populationIdentity,
        sourceCapture: capturePath,
        researchBlock: {
            ...block,
            consumptionEvents: [{
                questionId: block.questionId,
                decisionRef: 'reports/d1-decision.md',
                scope: { kind: 'block', id: block.blockId },
                evidenceRole: 'development',
                conditioning: ['stage-reach'],
                openedOutcomeKinds: ['exact-d1'],
                runRef: 'run-2',
                consumedAt: '2026-09-18T03:20:00.000Z',
            }],
        },
    }));

    const artifactModel = buildResearchRelations(process.cwd(), {
        artifactPaths: [capturePath, annotationPath],
        eligibility: {
            questionId: block.questionId,
            evidenceRole: 'confirmation',
            relatedQuestionIds: [],
        },
    });
    assert.equal(artifactModel.relations.researchBlocks.length, 1);
    assert.equal(artifactModel.relations.researchParents.length, 2);
    const blockRow = artifactModel.relations.researchBlocks[0];
    assert.equal(blockRow.blockId, block.blockId);
    assert.equal(blockRow.parentCount, 2);
    assert.equal(blockRow.consumptionCount, 1);
    assert.equal(blockRow.enrichments.observation.length, 1);
    assert.equal(blockRow.enrichments.exact.length, 1);
    assert.equal(blockRow.eligibility.eligible, false);
    assert.deepEqual(
        artifactModel.relations.researchParents.map(row => row.parentId),
        ['R1', 'R2'],
    );

    const cliBase = [
        'scripts/research-relations.mjs',
        `--artifact=${capturePath}`,
        '--relation=researchBlocks',
        '--eligibility-question=WS2-MUST-TURN-LATE-ADDITIVE',
        '--eligibility-role=confirmation',
    ];
    const unknownLineageRun = spawnSync(process.execPath, cliBase, { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(unknownLineageRun.status, 0, unknownLineageRun.stderr);
    assert.equal(JSON.parse(unknownLineageRun.stdout).rows[0].eligibility.eligible, null);

    const knownEmptyLineageRun = spawnSync(process.execPath, [...cliBase, '--related-questions='], {
        cwd: process.cwd(),
        encoding: 'utf8',
    });
    assert.equal(knownEmptyLineageRun.status, 0, knownEmptyLineageRun.stderr);
    assert.equal(JSON.parse(knownEmptyLineageRun.stdout).rows[0].eligibility.eligible, true);
} finally {
    rmSync(artifactDir, { recursive: true, force: true });
}

const real = buildResearchRelations(process.cwd());
assert.ok(real.relations.questions.some(row => row.id === 'WS2-D1-PRODUCTION-INERT-OBSERVATION'));
assert.ok(real.relations.measurementOpportunities.some(row => row.id === 'MO-005'));
assert.ok(real.relations.premiseAdmissions.some(row => row.premiseId === 'P201'));
assert.ok(real.relations.assets.some(row => row.id === 'experiment-manifests'));
assert.ok(real.relations.questions.every(row => row._researchSource?.relation === 'questions'));

console.log('research-relations-node-test: ok');
