import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const tempDir = mkdtempSync(path.join(tmpdir(), 'pathfinder-research-enrichment-link-'));
try {
    const blockPath = path.join(tempDir, 'block.json');
    const sourcePath = path.join(tempDir, 'exact.json');
    const outPath = path.join(tempDir, 'link.json');
    const populationIdentity = `sha256:${'4'.repeat(64)}`;
    const researchBlock = {
        blockId: 'LINK-BLOCK',
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
    };
    writeFileSync(blockPath, JSON.stringify({ populationIdentity, researchBlock }));
    writeFileSync(sourcePath, JSON.stringify({ kind: 'test-exact-result', rows: [] }));

    const run = spawnSync(process.execPath, [
        'scripts/research-enrichment-link.mjs',
        `--block-artifact=${blockPath}`,
        `--artifact=${sourcePath}`,
        '--kind=exact',
        '--state-ref=state-1',
        '--run-ref=run-1',
        `--out=${outPath}`,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const link = JSON.parse(readFileSync(outPath, 'utf8'));
    assert.equal(link.kind, 'pathfinder-research-enrichment-link');
    assert.equal(link.researchEnrichmentKind, 'exact');
    assert.equal(link.populationIdentity, populationIdentity);
    assert.equal(link.researchBlock.blockId, 'LINK-BLOCK');
    assert.equal(link.sourceArtifact, sourcePath);
    assert.equal(link.stateRef, 'state-1');
    assert.equal(link.runRef, 'run-1');
} finally {
    rmSync(tempDir, { recursive: true, force: true });
}

console.log('research enrichment link tests passed');
