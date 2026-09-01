#!/usr/bin/env node
/**
 * Producer-side coverage for buildFamilyEvaluationRunManifest (experiment-manifest-lib.mjs) — the
 * shared helper collect-variant-family-dataset-shard.mjs (and any future family/variant evaluation
 * producer) builds its run manifest through, instead of hand-assembling the
 * FAMILY_RUN_REQUIRED shape itself. Complements family-index-lib-check.mjs's consumer-side
 * coverage (which hand-builds manifest fixtures) by proving the PRODUCER helper itself emits
 * something family-index-lib.mjs actually accepts and joins evidence against correctly.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildFamilyEvaluationRunManifest, validateFamilyEvaluationRunManifest } from './experiment-manifest-lib.mjs';
import { buildFamilyIndex, queryFamilyIndex } from './family-index-lib.mjs';

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (err) { console.error(`  ✗ ${name}\n    ${err.stack}`); process.exitCode = 1; }
}

const baseInput = {
    runId: 'run-wide-9001', tool: 'collect-variant-family-dataset-shard.mjs', workflow: 'collect-variant-family-dataset.yml',
    corpora: ['corpus1'], families: ['corpus1:S00001'],
    variantFamilyDataset: { manifest: 'data/families/variant-family-dataset-manifest.json', shardFile: 'logs/family-census/wide-shard-01-slice.json' },
    solverPolicy: { mode: 'production', profile: null, config: null, flags: {}, strictTotalWorkBudget: false },
    budgets: { workUnits: 48_240_000, nodeCeiling: 36_000_000, wallDeadlineMs: 86_400_000 },
    seeds: [20260807], shardCount: 2, shardIndex: 1,
    startedAt: '2026-08-21T00:00:00Z', completedAt: '2026-08-21T00:05:00Z',
    outputArtifacts: ['logs/family-census/corpus1/solve-S00001-sym.json'],
    sourceGenerationArtifacts: ['data/families/corpus1/family-S00001-sym.json'],
    solver: { commit: 'abcdef0123456789abcdef0123456789abcdef01', ref: 'main', dirty: false },
};

// (1) A producer emits a validator-compliant manifest.
test('buildFamilyEvaluationRunManifest produces a manifest validateFamilyEvaluationRunManifest accepts', () => {
    const manifest = buildFamilyEvaluationRunManifest(baseInput);
    assert.deepEqual(validateFamilyEvaluationRunManifest(manifest), manifest);
    assert.equal(manifest.schemaVersion, 2);
    assert.deepEqual(manifest.variantFamilyDataset, baseInput.variantFamilyDataset);
    assert.equal('trove' in manifest, false, 'new producers must single-write only the canonical dataset field');
    assert.equal(manifest.invocation.tool, 'collect-variant-family-dataset-shard.mjs');
    assert.deepEqual(manifest.shard, { count: 2, index: 1 });
});

function legacyV1(manifest) {
    const { variantFamilyDataset, ...rest } = manifest;
    return { ...rest, schemaVersion: 1, trove: variantFamilyDataset };
}

function buildEraPairIndex(firstEra, secondEra) {
    const root = mkdtempSync(path.join(tmpdir(), `family-run-era-${firstEra}-${secondEra}-`));
    mkdirSync(path.join(root, 'data/families'), { recursive: true });
    mkdirSync(path.join(root, 'logs/family-census/run/shard-1'), { recursive: true });
    mkdirSync(path.join(root, 'logs/family-census/run/shard-2'), { recursive: true });
    const shard1 = buildFamilyEvaluationRunManifest({
        ...baseInput, runId: 'era-run', shardIndex: 1, outputArtifacts: [],
        variantFamilyDataset: { ...baseInput.variantFamilyDataset, shardFile: 'logs/family-census/wide-shard-01-slice.json' },
    });
    const shard2 = buildFamilyEvaluationRunManifest({
        ...baseInput, runId: 'era-run', shardIndex: 2, outputArtifacts: [],
        variantFamilyDataset: { ...baseInput.variantFamilyDataset, shardFile: 'logs/family-census/wide-shard-02-slice.json' },
    });
    writeFileSync(
        path.join(root, 'logs/family-census/run/shard-1/manifest.json'),
        JSON.stringify(firstEra === 'v1' ? legacyV1(shard1) : shard1),
    );
    writeFileSync(
        path.join(root, 'logs/family-census/run/shard-2/manifest.json'),
        JSON.stringify(secondEra === 'v1' ? legacyV1(shard2) : shard2),
    );
    return buildFamilyIndex(root);
}

for (const [firstEra, secondEra] of [['v1', 'v1'], ['v2', 'v2'], ['v1', 'v2']]) {
    test(`${firstEra}/${secondEra} shard manifests normalize to one complete canonical run`, () => {
        const index = buildEraPairIndex(firstEra, secondEra);
        assert.deepEqual(index.diagnostics.runManifests, []);
        assert.equal(index.runs.length, 1);
        assert.equal(index.runs[0].complete, true);
        assert.equal(index.runs[0].schemaVersion, 2);
        const { shardFile: _shardFile, ...datasetIdentity } = baseInput.variantFamilyDataset;
        assert.deepEqual(index.runs[0].variantFamilyDataset, datasetIdentity);
        assert.deepEqual(index.runs[0].variantFamilyDatasetShardFiles, [
            'logs/family-census/wide-shard-01-slice.json',
            'logs/family-census/wide-shard-02-slice.json',
        ]);
        assert.equal('trove' in index.runs[0], false);
    });
}

test('mixed-era invariant comparison ignores JSON object key insertion order', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'family-run-era-key-order-'));
    mkdirSync(path.join(root, 'data/families'), { recursive: true });
    mkdirSync(path.join(root, 'logs/family-census/run/shard-1'), { recursive: true });
    mkdirSync(path.join(root, 'logs/family-census/run/shard-2'), { recursive: true });
    const first = legacyV1(buildFamilyEvaluationRunManifest({
        ...baseInput, runId: 'key-order-run', shardIndex: 1, outputArtifacts: [],
        variantFamilyDataset: {
            manifest: baseInput.variantFamilyDataset.manifest,
            shardFile: 'logs/family-census/wide-shard-01-slice.json',
        },
    }));
    first.solverPolicy = {
        strictTotalWorkBudget: first.solverPolicy.strictTotalWorkBudget,
        flags: first.solverPolicy.flags,
        config: first.solverPolicy.config,
        profile: first.solverPolicy.profile,
        mode: first.solverPolicy.mode,
    };
    first.trove = { shardFile: first.trove.shardFile, manifest: first.trove.manifest };
    const second = buildFamilyEvaluationRunManifest({
        ...baseInput, runId: 'key-order-run', shardIndex: 2, outputArtifacts: [],
        variantFamilyDataset: {
            manifest: baseInput.variantFamilyDataset.manifest,
            shardFile: 'logs/family-census/wide-shard-02-slice.json',
        },
    });
    writeFileSync(path.join(root, 'logs/family-census/run/shard-1/manifest.json'), JSON.stringify(first));
    writeFileSync(path.join(root, 'logs/family-census/run/shard-2/manifest.json'), JSON.stringify(second));
    const index = buildFamilyIndex(root);
    assert.deepEqual(index.diagnostics.runManifests, []);
    assert.equal(index.runs[0].complete, true);
    assert.deepEqual(index.runs[0].variantFamilyDataset, { manifest: baseInput.variantFamilyDataset.manifest });
});

// (2)+(3): shards of one run agree on invariant fields, and output artifact paths join back to
// family-index evidence — set up a real variant-family dataset tree with two shards' manifests +
// their evidence files and run them through the real consumer (family-index-lib.mjs's
// buildFamilyIndex).
test('two shards of one run agree on invariant fields and join their evidence via outputArtifacts', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'family-run-manifest-producer-'));
    mkdirSync(path.join(root, 'logs/family-census/wide-shard-01'), { recursive: true });
    mkdirSync(path.join(root, 'logs/family-census/wide-shard-02'), { recursive: true });
    mkdirSync(path.join(root, 'logs/family-census/corpus1'), { recursive: true });
    mkdirSync(path.join(root, 'data/families/corpus1'), { recursive: true });

    const shard1 = buildFamilyEvaluationRunManifest(baseInput);
    const shard2 = buildFamilyEvaluationRunManifest({
        ...baseInput, shardIndex: 2,
        outputArtifacts: ['logs/family-census/corpus1/solve-S00002-sym.json'],
        sourceGenerationArtifacts: ['data/families/corpus1/family-S00002-sym.json'],
    });
    writeFileSync(path.join(root, 'logs/family-census/wide-shard-01/manifest.json'), JSON.stringify(shard1));
    writeFileSync(path.join(root, 'logs/family-census/wide-shard-02/manifest.json'), JSON.stringify(shard2));

    // Evidence files at exactly the paths each shard declared as its own outputArtifacts.
    writeFileSync(path.join(root, 'logs/family-census/corpus1/solve-S00001-sym.json'), JSON.stringify({
        levels: [{ id: 'V1', parentId: 'S00001', corpus: 'corpus1', ok: true, winningConfig: 'dfs:default', workSpent: 12345 }],
    }));
    writeFileSync(path.join(root, 'logs/family-census/corpus1/solve-S00002-sym.json'), JSON.stringify({
        levels: [{ id: 'V1', parentId: 'S00002', corpus: 'corpus1', ok: false, workSpent: 999 }],
    }));
    // A family manifest so the evidence above actually joins to an indexed variant identity —
    // matches family-index-lib.mjs's own required shape (parentLevelId + variants[]).
    writeFileSync(path.join(root, 'data/families/corpus1/family-S00001-sym-manifest.json'), JSON.stringify({
        familyId: 'family-S00001-w0-symmetry', parentLevelId: 'S00001', parentCorpus: 'data/stress/stress-levels.json',
        familyMode: 'symmetry', variants: [{ variantId: 'V1', relation: 'symmetry', mutationManifest: { operation: 'transform', objectType: 'whole-level' } }],
    }));
    writeFileSync(path.join(root, 'data/families/corpus1/family-S00002-sym-manifest.json'), JSON.stringify({
        familyId: 'family-S00002-w0-symmetry', parentLevelId: 'S00002', parentCorpus: 'data/stress/stress-levels.json',
        familyMode: 'symmetry', variants: [{ variantId: 'V1', relation: 'symmetry', mutationManifest: { operation: 'transform', objectType: 'whole-level' } }],
    }));

    const index = buildFamilyIndex(root);
    assert.deepEqual(index.diagnostics.runManifests, [], 'no invariant-field/shard disagreement diagnostics');
    assert.equal(index.runs.length, 1, 'both shards must be recognized as ONE run, not two');
    const run = index.runs[0];
    assert.equal(run.runId, 'run-wide-9001');
    assert.deepEqual(run.shards, [1, 2]);
    assert.equal(run.complete, true, 'a run with both its declared shards present must report complete');
    assert.deepEqual(run.outputArtifacts, ['logs/family-census/corpus1/solve-S00001-sym.json', 'logs/family-census/corpus1/solve-S00002-sym.json']);

    // Output-artifact join: each solve file's evidence row must be enriched with the producing
    // shard's own solver/budget provenance, keyed off outputArtifacts -> runManifestPath.
    const v1 = queryFamilyIndex(index, { parentId: 'S00001', variantId: 'V1' }).variants[0];
    assert.equal(v1.evidence.length, 1);
    assert.equal(v1.evidence[0].solverCommit, baseInput.solver.commit);
    assert.equal(v1.evidence[0].nodeBudget, baseInput.budgets.nodeCeiling);
    assert.equal(v1.evidence[0].wallDeadlineMs, baseInput.budgets.wallDeadlineMs);
    assert.equal(v1.evidence[0].runManifestPath, 'logs/family-census/wide-shard-01/manifest.json');
    assert.equal(v1.solved, true);
    const v2 = queryFamilyIndex(index, { parentId: 'S00002', variantId: 'V1' }).variants[0];
    assert.equal(v2.evidence[0].runManifestPath, 'logs/family-census/wide-shard-02/manifest.json');
    assert.equal(v2.solved, false);
});

// (4) Invalid producer inputs fail before writing misleading evidence.
test('an out-of-range shard index throws before any manifest is produced', () => {
    assert.throws(() => buildFamilyEvaluationRunManifest({ ...baseInput, shardIndex: 3, shardCount: 2 }), /shard/);
});
test('a missing solver commit throws rather than defaulting to a fabricated identity', () => {
    assert.throws(() => buildFamilyEvaluationRunManifest({ ...baseInput, solver: { ref: 'main', dirty: false } }), /solver/);
});
test('non-array selection.corpora/families throws', () => {
    assert.throws(() => buildFamilyEvaluationRunManifest({ ...baseInput, corpora: 'corpus1' }), /selection\.corpora/);
    assert.throws(() => buildFamilyEvaluationRunManifest({ ...baseInput, families: null }), /selection\.families/);
});
test('completedAt preceding startedAt throws', () => {
    assert.throws(() => buildFamilyEvaluationRunManifest({ ...baseInput, startedAt: '2026-08-21T01:00:00Z', completedAt: '2026-08-21T00:00:00Z' }), /completedAt/);
});
test('a negative node budget throws', () => {
    assert.throws(() => buildFamilyEvaluationRunManifest({ ...baseInput, budgets: { ...baseInput.budgets, nodeCeiling: -1 } }), /budgets/);
});

console.log(`\nfamily-run-manifest producer tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
