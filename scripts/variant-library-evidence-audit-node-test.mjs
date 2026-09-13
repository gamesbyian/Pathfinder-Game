#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { auditVariantLibrary } from './variant-library-evidence-audit.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'variant-library-evidence-audit-'));
mkdirSync(path.join(root, 'data/families/corpus-a'), { recursive: true });
mkdirSync(path.join(root, 'data/families/corpus-b'), { recursive: true });
mkdirSync(path.join(root, 'logs/family-census'), { recursive: true });
mkdirSync(path.join(root, 'reports/families'), { recursive: true });

const writeManifest = (corpus, name, value) => writeFileSync(
    path.join(root, `data/families/${corpus}/${name}-manifest.json`),
    `${JSON.stringify(value)}\n`,
);

writeManifest('corpus-a', 'family-P1-sym', {
    schemaVersion: 2,
    familyId: 'family-shared-id',
    parentLevelId: 'P1',
    parentCorpus: 'source-a.json',
    familyMode: 'symmetry',
    parentContentHash: 'parent-shared',
    variants: [
        { variantId: 'V1', relation: 'symmetry', variantContentHash: 'variant-shared', mutationManifest: { operation: 'transform' } },
        { variantId: 'V2', relation: 'symmetry', variantContentHash: 'parent-shared', mutationManifest: { operation: 'transform' } },
        { variantId: 'V3', relation: 'symmetry', variantContentHash: 'variant-three-a', mutationManifest: { operation: 'transform' } },
        { variantId: 'V4', relation: 'symmetry', mutationManifest: { operation: 'transform' } },
    ],
});
writeManifest('corpus-a', 'family-P1-repeat', {
    schemaVersion: 2,
    familyId: 'family-repeat',
    parentLevelId: 'P1',
    parentCorpus: 'source-a.json',
    familyMode: 'symmetry',
    parentContentHash: 'parent-shared',
    variants: [
        { variantId: 'V3', relation: 'symmetry', variantContentHash: 'variant-three-b', mutationManifest: { operation: 'transform' } },
    ],
});
writeManifest('corpus-b', 'family-P2-sym', {
    schemaVersion: 2,
    familyId: 'family-shared-id',
    parentLevelId: 'P2',
    parentCorpus: 'source-b.json',
    familyMode: 'symmetry',
    parentContentHash: 'parent-shared',
    variants: [
        { variantId: 'W1', relation: 'symmetry', variantContentHash: 'variant-shared', mutationManifest: { operation: 'transform' } },
    ],
});
writeFileSync(path.join(root, 'reports/families/2026-08-07-wide-trove-attempts-corpus-a-part01.json'), JSON.stringify({
    levels: [{ id: 'V1', parentId: 'P1', corpus: 'corpus-a', mode: 'symmetry', ok: true, workSpent: 10 }],
}));
writeFileSync(path.join(root, 'data/families/campaign-manifest.json'), '[]\n');

const audit = auditVariantLibrary(root);
assert.equal(audit.schemaVersion, 1);
assert.equal(audit.counts.familyManifests, 3);
assert.equal(audit.counts.variantRows, 6);
assert.equal(audit.counts.uniqueParentIdentities, 2);
assert.equal(audit.contentIdentity.parentsMissingContentHash, 0);
assert.equal(audit.contentIdentity.variantsMissingContentHash, 1);
assert.equal(audit.contentIdentity.exactParentHashIdentityCollisions, 1);
assert.equal(audit.contentIdentity.exactVariantHashIdentityCollisions, 1);
assert.equal(audit.contentIdentity.exactNoOpVariants, 1);
assert.equal(audit.contentIdentity.duplicateLogicalVariants, 1);
assert.equal(audit.contentIdentity.conflictingLogicalVariants, 1);
assert.equal(audit.contentIdentity.familyIdCollisions, 1);
assert.equal(audit.evaluationEvidence.rows, 1);
assert.equal(audit.evaluationEvidence.missingSolverCommit, 1);
assert.equal(audit.evaluationEvidence.missingRunId, 1);
assert.equal(audit.evaluationEvidence.withRecordedBudgetContext, 0);
assert.match(audit.evidencePurposes['current-solver-capability'], /rechecked on current code/u);
assert.match(audit.interpretation.exactHashCollision, /classify semantics/u);
assert.equal(audit.populationShape.modes.find(row => row.mode === 'symmetry').variants, 6);
console.log('variant-library-evidence-audit checks passed');
