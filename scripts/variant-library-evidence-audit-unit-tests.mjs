import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { auditVariantLibrary } from './variant-library-evidence-audit.mjs';

function fixture() {
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
        schemaVersion: 2, familyId: 'family-shared-id', parentLevelId: 'P1', parentCorpus: 'source-a.json',
        familyMode: 'symmetry', parentContentHash: 'parent-shared', variants: [
            { variantId: 'V1', relation: 'symmetry', variantContentHash: 'variant-shared', mutationManifest: { operation: 'transform' } },
            { variantId: 'V2', relation: 'symmetry', variantContentHash: 'parent-shared', mutationManifest: { operation: 'transform' } },
            { variantId: 'V3', relation: 'symmetry', variantContentHash: 'variant-three-a', mutationManifest: { operation: 'transform' } },
            { variantId: 'V4', relation: 'symmetry', mutationManifest: { operation: 'transform' } },
        ],
    });
    writeManifest('corpus-a', 'family-P1-repeat', {
        schemaVersion: 2, familyId: 'family-repeat', parentLevelId: 'P1', parentCorpus: 'source-a.json',
        familyMode: 'symmetry', parentContentHash: 'parent-shared', variants: [
            { variantId: 'V3', relation: 'symmetry', variantContentHash: 'variant-three-b', mutationManifest: { operation: 'transform' } },
        ],
    });
    writeManifest('corpus-b', 'family-P2-sym', {
        schemaVersion: 2, familyId: 'family-shared-id', parentLevelId: 'P2', parentCorpus: 'source-b.json',
        familyMode: 'symmetry', parentContentHash: 'parent-shared', variants: [
            { variantId: 'W1', relation: 'symmetry', variantContentHash: 'variant-shared', mutationManifest: { operation: 'transform' } },
        ],
    });
    writeFileSync(path.join(root, 'reports/families/2026-08-07-wide-trove-attempts-corpus-a-part01.json'), JSON.stringify({
        levels: [{ id: 'V1', parentId: 'P1', corpus: 'corpus-a', mode: 'symmetry', ok: true, workSpent: 10 }],
    }));
    writeFileSync(path.join(root, 'data/families/campaign-manifest.json'), '[]\n');
    return root;
}

describe('variant-library evidence audit', () => {
    it('separates logical identity, exact content identity, and evidence context', () => {
        const audit = auditVariantLibrary(fixture());
        expect(audit.counts).toMatchObject({ familyManifests: 3, variantRows: 6, uniqueParentIdentities: 2 });
        expect(audit.contentIdentity).toMatchObject({
            parentsMissingContentHash: 0,
            variantsMissingContentHash: 1,
            exactParentHashIdentityCollisions: 1,
            exactVariantHashIdentityCollisions: 1,
            exactNoOpVariants: 1,
            duplicateLogicalVariants: 1,
            conflictingLogicalVariants: 1,
            familyIdCollisions: 1,
        });
        expect(audit.evaluationEvidence).toMatchObject({
            rows: 1,
            missingSolverCommit: 1,
            missingRunId: 1,
            withRecordedBudgetContext: 0,
        });
        expect(audit.evidencePurposes['current-solver-capability']).toMatch(/rechecked on current code/u);
        expect(audit.interpretation.exactHashCollision).toMatch(/classify semantics/u);
        expect(audit.populationShape.modes.find(row => row.mode === 'symmetry')?.variants).toBe(6);
    });
});
