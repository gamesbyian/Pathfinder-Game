import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
    buildResearchRelations,
    discoverResearchArtifactPaths,
    exactPathIntegrityRecords,
    indexBy,
    leftJoin,
    queryRelation,
    summarizeIndependentSupport,
} from './research-relations-lib.mjs';
import { DURABLE_EVIDENCE_BUNDLE_SCHEMA_VERSION, durableBundleManifestStoredPath } from './durable-evidence-bundle-lib.mjs';
import {
    assertCanonicalResearchArtifactEnvelope,
    assertCanonicalResearchArtifactLocations,
    extractResearchArtifactEnvelope,
} from './research-artifact-envelope-lib.mjs';

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
assert.equal(
    durableBundleManifestStoredPath({
        schemaVersion: DURABLE_EVIDENCE_BUNDLE_SCHEMA_VERSION,
        manifestStoredPath: 'manifest.json',
        files: [],
    }),
    'manifest.json',
);
assert.throws(
    () => durableBundleManifestStoredPath({
        schemaVersion: DURABLE_EVIDENCE_BUNDLE_SCHEMA_VERSION,
        files: [{ source: 'manifest.json', stored: 'legacy-manifest.json' }],
    }),
    /current durable evidence bundle lacks manifestStoredPath/,
    'v2 current bundles must not silently recover the v1 files[] convention',
);
assert.equal(
    durableBundleManifestStoredPath({
        schemaVersion: 1,
        files: [{ source: 'manifest.json', stored: 'legacy-manifest.json' }],
    }),
    'legacy-manifest.json',
    'v1 archive bundles retain fixture-backed historical manifest lookup',
);
assert.deepEqual(normalizePremiseAdmissions({
    records: [
        { id: 'P1', status: 'admitted' },
        { propositionId: 'P2', status: 'deferred' },
        { premiseId: 'P3', status: 'admitted' },
    ],
}), [
    { status: 'admitted', premiseId: 'P1' },
    { status: 'deferred', premiseId: 'P2' },
    { status: 'admitted', premiseId: 'P3' },
]);
assert.throws(
    () => normalizePremiseAdmissions([{ premiseId: 'P1', id: 'P2' }]),
    /conflicting premise identity aliases/,
);
assert.throws(() => normalizePremiseAdmissions([{ status: 'admitted' }]), /lacks premiseId/);

const envelopeBlock = {
    blockId: 'ENVELOPE-TEST',
    questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
    sourceRegime: 'fixture',
    sourceRevision: `sha256:${'1'.repeat(64)}`,
    evidenceRole: 'development',
    independentUnit: 'parent-level',
    parentIds: ['R1'],
    parentContentIdentities: ['v2:r1'],
    sourceArtifactRefs: ['fixture.json'],
    createdBy: { producer: 'fixture', manifestRef: 'fixture.json', runRef: null },
    generationRef: null,
    consumptionEvents: [],
};
const envelopePopulationIdentity = `sha256:${'2'.repeat(64)}`;
const canonicalEnvelope = extractResearchArtifactEnvelope({
    populationIdentity: envelopePopulationIdentity,
    researchBlock: envelopeBlock,
});
assert.equal(canonicalEnvelope.populationIdentity, envelopePopulationIdentity);
assert.equal(canonicalEnvelope.researchBlock, envelopeBlock);
assert.equal(canonicalEnvelope.canonicalCurrent, true);
assert.deepEqual(canonicalEnvelope.sources, {
    researchBlock: ['researchBlock'],
    populationIdentity: ['populationIdentity'],
});
assert.equal(assertCanonicalResearchArtifactEnvelope({
    populationIdentity: envelopePopulationIdentity,
    researchBlock: envelopeBlock,
}).canonicalCurrent, true);
assert.equal(assertCanonicalResearchArtifactLocations({
    populationIdentity: envelopePopulationIdentity,
}).populationIdentity, envelopePopulationIdentity);
assert.equal(assertCanonicalResearchArtifactLocations({}).populationIdentity, null);

const nestedEnvelope = extractResearchArtifactEnvelope({
    population: {
        populationIdentity: envelopePopulationIdentity,
        researchBlock: envelopeBlock,
    },
});
assert.equal(nestedEnvelope.populationIdentity, envelopePopulationIdentity);
assert.equal(nestedEnvelope.researchBlock, envelopeBlock);
assert.equal(nestedEnvelope.canonicalCurrent, false);
assert.throws(() => assertCanonicalResearchArtifactEnvelope({
    population: { populationIdentity: envelopePopulationIdentity, researchBlock: envelopeBlock },
}), /shared fields must use top-level researchBlock and populationIdentity/);
assert.throws(() => assertCanonicalResearchArtifactLocations({
    population: { populationIdentity: envelopePopulationIdentity },
}), /shared fields must use top-level researchBlock and populationIdentity/);

assert.throws(() => extractResearchArtifactEnvelope({
    populationIdentity: envelopePopulationIdentity,
    population: { corpusIdentity: `sha256:${'9'.repeat(64)}` },
    researchBlock: envelopeBlock,
}), /conflicting population identity locations/);
assert.throws(() => extractResearchArtifactEnvelope({
    populationIdentity: envelopePopulationIdentity,
    researchBlock: envelopeBlock,
    population: { researchBlock: { ...envelopeBlock, blockId: 'OTHER-BLOCK' } },
}), /conflicting researchBlock locations/);

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

        const treatmentLinkPath = path.join(artifactDir, 'treatment-link.json');
    writeFileSync(treatmentLinkPath, JSON.stringify({
        kind: 'pathfinder-research-enrichment-link',
        researchEnrichmentKind: 'treatment',
        populationIdentity,
        researchBlock: block,
        sourceArtifact: 'tmp/treatment-result.json',
    }));

    const artifactModel = buildResearchRelations(process.cwd(), {
        artifactPaths: [capturePath, annotationPath, treatmentLinkPath],
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
    assert.equal(blockRow.enrichments.treatment.length, 1);
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

// search-loss-evidence (docs/solver-search-loss-evidence-implementation-plan.md, Phase 2): a
// capture discovered from its own transient root, using its native population.populationIdentity
// field rather than the D1 fixture's top-level populationIdentity/corpusIdentity spellings.
const discoveryRoot = mkdtempSync(path.join(tmpdir(), 'pathfinder-research-discovery-'));
const searchLossRoot = path.join(discoveryRoot, 'tmp', 'search-loss-evidence');
mkdirSync(searchLossRoot, { recursive: true });
try {
    const searchLossPopulationIdentity = `sha256:${'4'.repeat(64)}`;
    const searchLossBlock = {
        blockId: 'SEARCH-LOSS-BLOCK-TEST',
        questionId: 'WS2-D1-PRODUCTION-INERT-OBSERVATION',
        sourceRegime: 'test-source',
        sourceRevision: `sha256:${'5'.repeat(64)}`,
        evidenceRole: 'development',
        independentUnit: 'parent-level',
        parentIds: ['R1'],
        parentContentIdentities: ['v2:a'],
        sourceArtifactRefs: ['capture.json'],
        createdBy: { producer: 'search-loss-capture-test', manifestRef: 'capture.json', runRef: 'run-1' },
        generationRef: null,
        consumptionEvents: [],
    };
    const searchLossCapturePath = path.join(searchLossRoot, 'capture.json');
    writeFileSync(searchLossCapturePath, JSON.stringify({
        schemaVersion: 1,
        kind: 'pathfinder-search-loss-capture',
        researchEnrichmentKind: 'observation',
        populationIdentity: searchLossPopulationIdentity,
        population: { source: 'test-population.json', parentCount: 1 },
        researchBlock: searchLossBlock,
        capsules: [],
    }));

    const discoveredSearchLoss = discoverResearchArtifactPaths(discoveryRoot);
    assert.deepEqual(discoveredSearchLoss, [path.join('tmp', 'search-loss-evidence', 'capture.json')],
        'search-loss capture under its own transient root is discoverable without touching the repository fixture space');

    const searchLossModel = buildResearchRelations(process.cwd(), { artifactPaths: [searchLossCapturePath] });
    const searchLossRow = searchLossModel.relations.researchBlocks.find(row => row.blockId === 'SEARCH-LOSS-BLOCK-TEST');
    assert.ok(searchLossRow, 'discovered search-loss capture appears as a research block');
    assert.equal(searchLossRow.enrichments.observation.length, 1);

    assert.ok(searchLossModel.relations.assets.some(row => row.id === 'search-loss-evidence'
        && row._researchSource?.relation === 'assets'), 'search-loss-evidence asset is discoverable with source provenance retained');
    assert.ok(searchLossModel.relations.assetRelationships.some(row => row.id === 'search-loss-to-lifecycle'));
} finally {
    rmSync(discoveryRoot, { recursive: true, force: true });
}

const real = buildResearchRelations(process.cwd());
assert.ok(real.relations.questions.some(row => row.id === 'WS2-D1-PRODUCTION-INERT-OBSERVATION'));
assert.ok(real.relations.measurementOpportunities.some(row => row.id === 'MO-005'));
assert.ok(real.relations.premiseAdmissions.some(row => row.premiseId === 'P201'));
assert.equal(real.relations.premises.length, 148);
assert.equal(real.relations.premiseEdges.length, 184);
assert.ok(real.relations.premises.some(row => row.premiseId === 'P204'));
assert.ok(real.relations.premiseEdges.some(row => row.from === 'P204' && row.to === 'P183'));
assert.ok(Array.isArray(real.relations.durableEvidence));
assert.ok(Array.isArray(real.relations.promotions));
assert.ok(real.relations.promotions.some(row =>
    row.mechanisms.includes('STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY')
    && row.decisionEvidenceRef === 'reports/2026-09-16-class4-113-allocation-promotion-001.md'),
    'promoted runtime mechanisms should expose their authored decision-evidence edge when retained');
assert.ok(real.relations.promotions.every(row => row._researchSource?.relation === 'promotions'));
for (const bundle of real.relations.durableEvidence) {
    const source = JSON.parse(readFileSync(bundle.bundlePath, 'utf8'));
    assert.ok(source.manifestStoredPath || (source.files ?? []).some(file => file.source === 'manifest.json'),
        'durable evidence relation must derive manifest membership from an authored bundle edge');
    assert.equal(
        bundle.manifestPath,
        path.join(path.dirname(bundle.bundlePath), source.manifestStoredPath ?? source.files.find(file => file.source === 'manifest.json').stored)
            .split(path.sep).join('/'),
        'durable evidence manifest relation must follow the bundle edge, not assume a sibling filename',
    );
}
assert.ok(real.relations.assets.some(row => row.id === 'experiment-manifests'));
assert.deepEqual(
    exactPathIntegrityRecords(
        { locations: [{ path: 'data/example.json' }, { path: 'data/other.json' }] },
        [
            { evidenceId: 'E1', sourcePaths: ['data/example.json'] },
            { evidenceId: 'E2', sourcePaths: ['data/unrelated.json'] },
        ],
    ).map(row => row.evidenceId),
    ['E1'],
);
assert.ok(real.relations.assetRelationships.length >= 16);
assert.ok(real.relations.assetRelationships.some(row => row.id === 'capability-memory-to-mechanism'));
assert.ok(real.relations.questions.every(row => row._researchSource?.relation === 'questions'));

console.log('research-relations-node-test: ok');
