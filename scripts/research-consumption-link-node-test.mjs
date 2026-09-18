import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildResearchRelations } from './research-relations-lib.mjs';

const temp = mkdtempSync(path.join(tmpdir(), 'pathfinder-research-consumption-'));
try {
    const blockPath = path.join(temp, 'block.json');
    const out = path.join(temp, 'consumption.json');
    const selectionPath = path.join(temp, 'selection.json');
    const populationIdentity = `sha256:${'4'.repeat(64)}`;
    const questionId = 'WS2-D1-PRODUCTION-INERT-OBSERVATION';
    writeFileSync(blockPath, JSON.stringify({
        populationIdentity,
        researchBlock: {
            blockId: 'CONSUMPTION-TEST-BLOCK',
            questionId,
            sourceRegime: 'fixture',
            sourceRevision: 'fixture-v1',
            evidenceRole: 'development',
            independentUnit: 'parent-level',
            parentIds: ['R1', 'R2'],
            parentContentIdentities: ['v2:r1', 'v2:r2'],
            sourceArtifactRefs: [blockPath],
            createdBy: { producer: 'fixture', manifestRef: blockPath, runRef: null },
            generationRef: null,
            consumptionEvents: [],
        },
    }));
    writeFileSync(selectionPath, JSON.stringify({
        schemaVersion: 1,
        kind: 'research-cross-source-matched-selection',
        selectionProcedure: { outcomeBlind: true },
        sources: [{ name: 'random', file: blockPath, blockId: 'CONSUMPTION-TEST-BLOCK' }],
        groups: [
            { members: [{ source: 'random', id: 'R1' }] },
            { members: [{ source: 'random', id: 'R2' }] },
        ],
    }));

    const run = spawnSync(process.execPath, [
        'scripts/research-consumption-link.mjs',
        `--block-artifact=${blockPath}`,
        `--question-id=${questionId}`,
        `--selection-artifact=${selectionPath}`,
        '--selection-source=random',
        '--opened-outcome-kind=solver-outcome',
        '--consumed-at=2026-09-18T05:00:00.000Z',
        `--out=${out}`,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);

    const sidecar = JSON.parse(readFileSync(out, 'utf8'));
    assert.equal(sidecar.kind, 'pathfinder-research-consumption-link');
    assert.equal(sidecar.researchBlock.consumptionEvents.length, 2);
    assert.deepEqual(sidecar.recordedConsumption.scopes.map(scope => scope.id), ['R1', 'R2']);
    assert.deepEqual(sidecar.recordedConsumption.conditioning, ['outcome-blind-static-descriptor-match']);
    assert.equal(sidecar.recordedConsumption.selectionArtifact, selectionPath);

    const model = buildResearchRelations(process.cwd(), {
        artifactPaths: [blockPath, out],
        eligibility: {
            questionId,
            evidenceRole: 'confirmation',
            relatedQuestionIds: [],
        },
    });
    assert.equal(model.relations.researchBlocks.length, 1);
    assert.equal(model.relations.researchBlocks[0].consumptionCount, 2);
    assert.equal(model.relations.researchBlocks[0].eligibility.eligible, false);

    const badSelection = path.join(temp, 'bad-selection.json');
    writeFileSync(badSelection, JSON.stringify({
        schemaVersion: 1,
        kind: 'research-cross-source-matched-selection',
        selectionProcedure: { outcomeBlind: true },
        sources: [{ name: 'random', file: blockPath, blockId: 'CONSUMPTION-TEST-BLOCK' }],
        groups: [{ members: [{ source: 'random', id: 'NOT-IN-BLOCK' }] }],
    }));
    const rejected = spawnSync(process.execPath, [
        'scripts/research-consumption-link.mjs',
        `--block-artifact=${blockPath}`,
        `--question-id=${questionId}`,
        `--selection-artifact=${badSelection}`,
        '--selection-source=random',
        `--out=${path.join(temp, 'bad-consumption.json')}`,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.notEqual(rejected.status, 0);
    assert.match(`${rejected.stdout}${rejected.stderr}`, /not present in source block/);
} finally {
    rmSync(temp, { recursive: true, force: true });
}

console.log('research-consumption-link-node-test: ok');
