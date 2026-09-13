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
        familyMode: 'symmetry', parentContentHash: 'parent-shared', requestedCount: 5, acceptedCount: 4,
        generationAttempts: 7, attemptBudget: 20, variants: [
            { variantId: 'V1', relation: 'symmetry', variantContentHash: 'variant-shared', generationAttempts: 1, mutationManifest: { operation: 'transform' } },
            { variantId: 'V2', relation: 'symmetry', variantContentHash: 'parent-shared', generationAttempts: 1, mutationManifest: { operation: 'transform' } },
            { variantId: 'V3', relation: 'symmetry', variantContentHash: 'variant-three-a', generationAttempts: 2, mutationManifest: { operation: 'transform' } },
            { variantId: 'V4', relation: 'symmetry', generationAttempts: 3, mutationManifest: { operation: 'transform' } },
        ],
    });
    writeManifest('corpus-a', 'family-P1-repeat', {
        schemaVersion: 2, familyId: 'family-repeat', parentLevelId: 'P1', parentCorpus: 'source-a.json',
        familyMode: 'local-mutant', parentContentHash: 'parent-shared', requestedCount: 1, acceptedCount: 1,
        generationAttempts: 2, attemptBudget: 10, variants: [
            { variantId: 'V3', relation: 'local-mutant', variantContentHash: 'variant-three-b', generationAttempts: 2, mutationManifest: { operation: 'mutate' } },
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
    it('separates record/content identity, observation attachment, and generation selection', () => {
        const audit = auditVariantLibrary(fixture());
        expect(audit.schemaVersion).toBe(2);
        expect(audit.counts).toMatchObject({
            familyManifests: 3,
            variantRows: 6,
            uniqueParentIdentities: 2,
            evidenceObservations: 1,
            evidenceAttachments: 1,
        });
        expect(audit.identitySemantics.variantRecordIdentity).toBe('(parentCorpus,parentId,variantId)');
        expect(audit.contentIdentity).toMatchObject({
            parentsMissingContentHash: 0,
            variantsMissingContentHash: 1,
            exactParentHashIdentityCollisions: 1,
            exactVariantHashIdentityCollisions: 1,
            exactNoOpVariants: 1,
            duplicateLogicalVariants: 1,
            conflictingLogicalVariants: 1,
            crossModeLogicalVariants: 1,
            familyIdCollisions: 1,
        });
        expect(audit.generationEvidence).toMatchObject({
            familiesWithRequestAcceptanceCounts: 2,
            familiesMissingRequestAcceptanceCounts: 1,
            familiesWithAttemptBudget: 2,
            familiesWithGenerationAttempts: 2,
            variantsWithGenerationAttempts: 5,
        });
        expect(audit.generationEvidence.byMode.find(row => row.mode === 'symmetry')).toMatchObject({
            families: 2,
            familiesWithRequestAcceptanceCounts: 1,
            requested: 5,
            accepted: 4,
        });
        expect(audit.evaluationEvidence).toMatchObject({
            observations: 1,
            attachments: 1,
            duplicateAttachmentsFromDuplicateVariantRecords: 0,
            missingSolverCommit: 1,
            missingRunId: 1,
            withRecordedBudgetContext: 0,
        });
        expect(audit.evidencePurposes['generation-selectivity']).toMatch(/requested\/attempted\/accepted/u);
        expect(audit.interpretation.exactHashCollision).toMatch(/classify semantics/u);
    });
});
