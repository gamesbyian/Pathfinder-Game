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
writeFileSync(path.join(root, 'logs/family-census/corpus-a/solve-P1-sym.json'), JSON.stringify({
    runId: 'run-1', solverCommit: 'abc', workBudget: 123,
    levels: [{ id: 'V1', ok: true, winningConfig: 'beam', workSpent: 20 }],
}));
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
    evidenceArtifacts: 4, evidenceParseFailures: 1, skippedEvidenceArtifacts: 1, manifestDiagnostics: 2 });
assert.deepEqual(index.diagnostics.manifests.map(row => row.reason).sort(), ['not-a-family-manifest', 'parse-failure']);
assert.equal(index.diagnostics.skippedEvidenceArtifacts[0].reason, 'exceeds-parser-limit');
const duplicateIdRows = queryFamilyIndex(index, { variantId: 'V1' }).variants;
assert.equal(duplicateIdRows.length, 2);
assert.equal(duplicateIdRows.find(row => row.corpus === 'corpus-a').evidence[0].runId, 'run-1');
assert.equal(duplicateIdRows.find(row => row.corpus === 'corpus-b').evidence.length, 0);
assert.equal(queryFamilyIndex(index, { parentCorpus: 'data/levels.json', parentId: 'P1', variantId: 'V1' }).variants.length, 1);
assert.deepEqual(queryFamilyIndex(index, { evaluated: false }).variants.map(row => row.corpus), ['corpus-b']);
assert.deepEqual(queryFamilyIndex(index, { solved: true }).variants.map(row => row.variantId), ['V1']);
assert.equal(queryFamilyIndex(index, { variantId: 'V2' }).variants[0].evidence[0].solved, false);
assert.equal(queryFamilyIndex(index, { mode: 'symmetry' }).families.length, 2);
assert.equal(queryFamilyIndex(index, { operator: 'transform' }).variants.length, 3);
assert.deepEqual(queryFamilyIndex(index, { objectType: 'whole-level' }).counts,
    { families: 0, variants: 2, parents: 1, variantsWithEvidence: 2 });
assert.deepEqual(coverageByParent(index).find(row => row.corpus === 'corpus-a'), { corpus: 'corpus-a', parentId: 'P1', families: 1, variants: 2, evaluated: 2, solved: 1, unevaluated: 0 });
assert.deepEqual(buildFamilyIndex(root), index, 'derived indexes must be reproducible');
console.log('family index unit tests passed');
