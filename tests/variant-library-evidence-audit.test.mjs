import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { auditVariantLibrary } from '../scripts/variant-library-evidence-audit.mjs';

function fixture() {
    const root = mkdtempSync(path.join(tmpdir(), 'variant-library-evidence-audit-'));
    mkdirSync(path.join(root, 'data/families/a'), { recursive: true });
    mkdirSync(path.join(root, 'data/families/b'), { recursive: true });
    mkdirSync(path.join(root, 'logs/family-census'), { recursive: true });
    mkdirSync(path.join(root, 'reports/families'), { recursive: true });
    const writeManifest = (corpus, name, value) => writeFileSync(
        path.join(root, `data/families/${corpus}/${name}-manifest.json`),
        `${JSON.stringify(value)}\n`,
    );
    writeManifest('a', 'p1-sym', {
        schemaVersion: 2,
        familyId: 'shared-family-id',
        parentLevelId: 'P1',
        parentCorpus: 'source-a.json',
        familyMode: 'symmetry',
        parentContentHash: 'same-parent-content',
        requestedCount: 5,
        acceptedCount: 4,
        generationAttempts: 7,
        attemptBudget: 20,
        variants: [
            { variantId: 'V1', relation: 'symmetry', variantContentHash: 'shared-variant-content', generationAttempts: 1, mutationManifest: { operation: 'transform' } },
            { variantId: 'V2', relation: 'symmetry', variantContentHash: 'same-parent-content', generationAttempts: 1, mutationManifest: { operation: 'transform' } },
            { variantId: 'V3', relation: 'symmetry', variantContentHash: 'first-v3-content', generationAttempts: 2, mutationManifest: { operation: 'transform' } },
            { variantId: 'V4', relation: 'symmetry', generationAttempts: 3, mutationManifest: { operation: 'transform' } },
        ],
    });
    writeManifest('a', 'p1-other', {
        schemaVersion: 2,
        familyId: 'other-family',
        parentLevelId: 'P1',
        parentCorpus: 'source-a.json',
        familyMode: 'local-mutant',
        parentContentHash: 'same-parent-content',
        requestedCount: 1,
        acceptedCount: 1,
        generationAttempts: 2,
        attemptBudget: 10,
        variants: [
            { variantId: 'V3', relation: 'local-mutant', variantContentHash: 'second-v3-content', generationAttempts: 2, mutationManifest: { operation: 'mutate' } },
        ],
    });
    writeManifest('b', 'p2-sym', {
        schemaVersion: 2,
        familyId: 'shared-family-id',
        parentLevelId: 'P2',
        parentCorpus: 'source-b.json',
        familyMode: 'symmetry',
        parentContentHash: 'same-parent-content',
        variants: [
            { variantId: 'W1', relation: 'symmetry', variantContentHash: 'shared-variant-content', mutationManifest: { operation: 'transform' } },
        ],
    });
    writeFileSync(path.join(root, 'reports/families/2026-08-07-wide-trove-attempts-a-part01.json'), JSON.stringify({
        levels: [{ id: 'V1', parentId: 'P1', corpus: 'a', mode: 'symmetry', ok: true, workSpent: 10 }],
    }));
    return root;
}

describe('variant-library evidence audit', () => {
    test('separates record/content identity, observation attachment, and generation selection', () => {
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
            exactParentHashIdentityCollisions: 1,
            exactVariantHashIdentityCollisions: 1,
            exactNoOpVariants: 1,
            duplicateLogicalVariants: 1,
            conflictingLogicalVariants: 1,
            crossModeLogicalVariants: 1,
            familyIdCollisions: 1,
            variantsMissingContentHash: 1,
        });
        expect(audit.generationEvidence).toMatchObject({
            familiesWithRequestAcceptanceCounts: 2,
            familiesMissingRequestAcceptanceCounts: 1,
            familiesWithAttemptBudget: 2,
            familiesWithGenerationAttempts: 2,
            variantsWithGenerationAttempts: 5,
        });
        expect(audit.evaluationEvidence).toMatchObject({
            observations: 1,
            attachments: 1,
            duplicateAttachmentsFromDuplicateVariantRecords: 0,
            missingSolverCommit: 1,
            missingRunId: 1,
            withRecordedBudgetContext: 0,
        });
        expect(audit.evidencePurposes['current-solver-capability']).toMatch(/rechecked on current code/u);
        expect(audit.evidencePurposes['generation-selectivity']).toMatch(/requested\/attempted\/accepted/u);
    });
});
