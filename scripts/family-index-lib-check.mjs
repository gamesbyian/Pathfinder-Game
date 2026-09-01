#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildFamilyIndex, coverageByParent, queryFamilyIndex } from './family-index-lib.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'family-index-'));
mkdirSync(path.join(root, 'data/families/corpus-a'), { recursive: true });
mkdirSync(path.join(root, 'data/families/corpus-b'), { recursive: true });
mkdirSync(path.join(root, 'logs/family-census/runs/run-1'), { recursive: true });
mkdirSync(path.join(root, 'logs/family-census/runs/run-2/shard-1'), { recursive: true });
mkdirSync(path.join(root, 'logs/family-census/runs/run-2/shard-2'), { recursive: true });
mkdirSync(path.join(root, 'logs/family-census/runs/bad'), { recursive: true });
mkdirSync(path.join(root, 'logs/family-census/corpus-a'), { recursive: true });
mkdirSync(path.join(root, 'reports/families'), { recursive: true });
writeFileSync(path.join(root, 'data/families/corpus-a/family-P1-sym.json'), '[]\n');
writeFileSync(path.join(root, 'data/families/corpus-a/family-P1-sym-manifest.json'), JSON.stringify({
    familyId: 'family-P1-w0-symmetry', parentLevelId: 'P1', parentCorpus: 'data/levels.json', familyMode: 'symmetry',
    generatorVersion: 'old', variants: [
        { variantId: 'V1', relation: 'symmetry', mutationManifest: { operation: 'transform', objectType: 'whole-level' } },
        { variantId: 'V2', relation: 'symmetry', mutationManifest: { operation: 'transform', objectType: 'whole-level' } },
    ],
}));
writeFileSync(path.join(root, 'data/families/corpus-b/family-P1-sym-manifest.json'), JSON.stringify({
    familyId: 'family-P1-other', parentLevelId: 'P1', parentCorpus: 'data/stress-levels.json', familyMode: 'symmetry',
    variants: [{ variantId: 'V1', relation: 'symmetry', mutationManifest: { operation: 'transform' } }],
}));
writeFileSync(path.join(root, 'logs/family-census/runs/run-1/manifest.json'), JSON.stringify({
    runId: 'run-1', solverCommit: 'abc', workBudget: 123, corpus: 'corpus-a', parentId: 'P1',
}));
const normalizedRun = (index, output) => ({
    schemaVersion: 1, runId: 'run-2', solver: { commit: 'def', ref: 'refs/heads/main', dirty: false },
    invocation: { tool: 'family-evaluate', workflow: 'family-wide' },
    selection: { corpora: ['corpus-a'], families: ['family-P1-w0-symmetry'] },
    trove: { branch: 'trove', commit: '123', artifactSha256: null },
    solverPolicy: { mode: 'cold', profile: 'default', config: null, flags: {}, strictTotalWorkBudget: true },
    budgets: { workUnits: 500, nodeCeiling: null, wallDeadlineMs: 1000 }, seeds: [7],
    shard: { count: 2, index }, startedAt: `2026-08-21T00:0${index}:00Z`, completedAt: `2026-08-21T00:1${index}:00Z`,
    outputArtifacts: [output], sourceGenerationArtifacts: ['data/families/corpus-a/family-P1-sym-manifest.json'],
});
writeFileSync(path.join(root, 'logs/family-census/runs/run-2/shard-1/manifest.json'), JSON.stringify(
    normalizedRun(1, 'logs/family-census/corpus-a/normalized-1.json')));
writeFileSync(path.join(root, 'logs/family-census/runs/run-2/shard-2/manifest.json'), JSON.stringify(
    normalizedRun(2, 'logs/family-census/corpus-a/normalized-2.json')));
writeFileSync(path.join(root, 'logs/family-census/runs/bad/manifest.json'), JSON.stringify({ schemaVersion: 1, runId: 'bad' }));
writeFileSync(path.join(root, 'logs/family-census/corpus-a/solve-P1-sym.json'), JSON.stringify({
    runId: 'run-1', solverCommit: 'abc', workBudget: 123,
    levels: [{ id: 'V1', ok: true, winningConfig: 'beam', workSpent: 20 }],
}));
writeFileSync(path.join(root, 'logs/family-census/corpus-a/normalized-1.json'), JSON.stringify({
    levels: [{ id: 'V2', parentId: 'P1', corpus: 'corpus-a', ok: false, workSpent: 30 }],
}));
writeFileSync(path.join(root, 'logs/family-census/corpus-a/normalized-2.json'), JSON.stringify({ levels: [] }));
writeFileSync(path.join(root, 'reports/families/2026-08-07-wide-trove-attempts-corpus-a-part01.json'), JSON.stringify({
    levels: [{ id: 'V2', parentId: 'P1', corpus: 'corpus-a', ok: false, workSpent: 45 }],
}));
writeFileSync(path.join(root, 'logs/family-census/broken.json'), '{');
writeFileSync(path.join(root, 'data/families/broken-manifest.json'), '{');
writeFileSync(path.join(root, 'data/families/campaign-manifest.json'), '[]');
const oversizedEvidence = path.join(root, 'logs/family-census/oversized.json');
writeFileSync(oversizedEvidence, ''); truncateSync(oversizedEvidence, 513 * 1024 * 1024);
const index = buildFamilyIndex(root);
assert.deepEqual(index.counts, { families: 2, variants: 3, parents: 2, variantsWithEvidence: 2,
    evidenceArtifacts: 9, evidenceParseFailures: 1, skippedEvidenceArtifacts: 1, manifestDiagnostics: 2,
    normalizedRuns: 1, runManifestDiagnostics: 1 });
assert.deepEqual(index.diagnostics.manifests.map(row => row.reason).sort(), ['not-a-family-manifest', 'parse-failure']);
assert.equal(index.diagnostics.skippedEvidenceArtifacts[0].reason, 'exceeds-parser-limit');
assert.match(index.diagnostics.runManifests[0].error, /missing solver/);
assert.deepEqual(index.runs.map(run => ({ id: run.runId, shards: run.shards, complete: run.complete })),
    [{ id: 'run-2', shards: [1, 2], complete: true }]);
assert.equal(index.runs[0].schemaVersion, 2, 'all-v1 run shards normalize to canonical schema v2');
assert.deepEqual(index.runs[0].variantFamilyDataset, normalizedRun(1, '').trove);
assert.deepEqual(index.runs[0].variantFamilyDatasetShardFiles, []);
assert.equal('trove' in index.runs[0], false, 'family index must expose only the canonical normalized dataset field');
const duplicateIdRows = queryFamilyIndex(index, { variantId: 'V1' }).variants;
assert.equal(duplicateIdRows.length, 2);
assert.equal(duplicateIdRows.find(row => row.corpus === 'corpus-a').evidence[0].runId, 'run-1');
assert.equal(duplicateIdRows.find(row => row.corpus === 'corpus-b').evidence.length, 0);
assert.equal(queryFamilyIndex(index, { parentCorpus: 'data/levels.json', parentId: 'P1', variantId: 'V1' }).variants.length, 1);
assert.deepEqual(queryFamilyIndex(index, { evaluated: false }).variants.map(row => row.corpus), ['corpus-b']);
assert.deepEqual(queryFamilyIndex(index, { solved: true }).variants.map(row => row.variantId), ['V1']);
assert.equal(queryFamilyIndex(index, { variantId: 'V2' }).variants[0].evidence[0].solved, false);
const normalizedEvidence = queryFamilyIndex(index, { variantId: 'V2' }).variants[0].evidence
    .find(row => row.runId === 'run-2');
assert.equal(normalizedEvidence.solverCommit, 'def');
assert.equal(normalizedEvidence.budget, 500);
assert.equal(normalizedEvidence.runManifestPath, 'logs/family-census/runs/run-2/shard-1/manifest.json');
assert.equal(queryFamilyIndex(index, { mode: 'symmetry' }).families.length, 2);
assert.equal(queryFamilyIndex(index, { operator: 'transform' }).variants.length, 3);
assert.deepEqual(queryFamilyIndex(index, { objectType: 'whole-level' }).counts,
    { families: 0, variants: 2, parents: 1, variantsWithEvidence: 2 });
assert.deepEqual(coverageByParent(index).find(row => row.corpus === 'corpus-a'), { corpus: 'corpus-a', parentId: 'P1', families: 1, variants: 2, evaluated: 2, solved: 1, unevaluated: 0 });
assert.deepEqual(buildFamilyIndex(root), index, 'derived indexes must be reproducible');

// A shared runId is a claim that all shard-level policy and provenance fields agree. Reject
// duplicate shard identities and conflicting policy rather than silently taking the first shard.
mkdirSync(path.join(root, 'logs/family-census/runs/run-3/a'), { recursive: true });
mkdirSync(path.join(root, 'logs/family-census/runs/run-3/b'), { recursive: true });
const conflictingA = { ...normalizedRun(1, 'logs/family-census/corpus-a/conflict-a.json'), runId: 'run-3' };
const conflictingB = { ...normalizedRun(1, 'logs/family-census/corpus-a/conflict-b.json'), runId: 'run-3',
    budgets: { ...normalizedRun(1, '').budgets, workUnits: 501 } };
writeFileSync(path.join(root, 'logs/family-census/runs/run-3/a/manifest.json'), JSON.stringify(conflictingA));
writeFileSync(path.join(root, 'logs/family-census/runs/run-3/b/manifest.json'), JSON.stringify(conflictingB));
const conflictingIndex = buildFamilyIndex(root);
assert.equal(conflictingIndex.runs.find(run => run.runId === 'run-3').complete, false);
assert.deepEqual(conflictingIndex.diagnostics.runManifests.filter(row => row.runId === 'run-3').map(row => row.reason).sort(),
    ['duplicate-run-shard', 'inconsistent-run-shard']);

const discoveryRoot = mkdtempSync(path.join(tmpdir(), 'family-index-attempt-discovery-'));
mkdirSync(path.join(discoveryRoot, 'data/families/corpus-a'), { recursive: true });
mkdirSync(path.join(discoveryRoot, 'data/families/corpus-b'), { recursive: true });
mkdirSync(path.join(discoveryRoot, 'reports/families'), { recursive: true });
const familyManifest = (familyId, parentId, variantId) => ({
    familyId, parentLevelId: parentId, parentCorpus: 'historical-source.json', familyMode: 'symmetry',
    variants: [{ variantId, relation: 'symmetry', mutationManifest: { operation: 'transform' } }],
});
writeFileSync(path.join(discoveryRoot, 'data/families/corpus-a/family-P1-sym-manifest.json'),
    JSON.stringify(familyManifest('family-P1', 'P1', 'V1')));
writeFileSync(path.join(discoveryRoot, 'data/families/corpus-b/family-P2-sym-manifest.json'),
    JSON.stringify(familyManifest('family-P2', 'P2', 'V2')));

// corpus-a has only historical aggregate evidence, which must remain permanently discoverable.
writeFileSync(path.join(discoveryRoot, 'reports/families/wide-trove-attempts-corpus-a-part01.json'), JSON.stringify({
    levels: [{ id: 'V1', parentId: 'P1', corpus: 'corpus-a', ok: true, workSpent: 11 }],
}));
// corpus-b has both eras. Canonical current aggregate evidence owns precedence for that corpus so
// the same logical aggregate is not double-counted merely because the frozen historical file remains.
writeFileSync(path.join(discoveryRoot, 'reports/families/wide-trove-attempts-corpus-b-part01.json'), JSON.stringify({
    levels: [{ id: 'V2', parentId: 'P2', corpus: 'corpus-b', ok: false, workSpent: 22 }],
}));
writeFileSync(path.join(discoveryRoot, 'reports/families/variant-family-dataset-attempts-corpus-b-part01.json'), JSON.stringify({
    levels: [{ id: 'V2', parentId: 'P2', corpus: 'corpus-b', ok: true, workSpent: 33 }],
}));
const discoveryIndex = buildFamilyIndex(discoveryRoot);
const historicalOnly = queryFamilyIndex(discoveryIndex, { parentId: 'P1', variantId: 'V1' }).variants[0];
assert.equal(historicalOnly.evidence.length, 1);
assert.match(historicalOnly.evidence[0].evidencePath, /wide-trove-attempts-corpus-a-part01\.json$/u);
assert.equal(historicalOnly.evidence[0].work, 11);
const canonicalPreferred = queryFamilyIndex(discoveryIndex, { parentId: 'P2', variantId: 'V2' }).variants[0];
assert.equal(canonicalPreferred.evidence.length, 1, 'canonical corpus aggregate must not double-count frozen historical aggregate');
assert.match(canonicalPreferred.evidence[0].evidencePath, /variant-family-dataset-attempts-corpus-b-part01\.json$/u);
assert.equal(canonicalPreferred.evidence[0].work, 33);
assert.equal(canonicalPreferred.solved, true);

console.log('family index unit tests passed');
