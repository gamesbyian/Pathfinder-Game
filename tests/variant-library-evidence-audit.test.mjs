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
        variants: [
            { variantId: 'V1', relation: 'symmetry', variantContentHash: 'shared-variant-content', mutationManifest: { operation: 'transform' } },
            { variantId: 'V2', relation: 'symmetry', variantContentHash: 'same-parent-content', mutationManifest: { operation: 'transform' } },
            { variantId: 'V3', relation: 'symmetry', variantContentHash: 'first-v3-content', mutationManifest: { operation: 'transform' } },
            { variantId: 'V4', relation: 'symmetry', mutationManifest: { operation: 'transform' } },
        ],
    });
    writeManifest('a', 'p1-other', {
        schemaVersion: 2,
        familyId: 'other-family',
        parentLevelId: 'P1',
        parentCorpus: 'source-a.json',
        familyMode: 'local-mutant',
        parentContentHash: 'same-parent-content',
        variants: [
            { variantId: 'V3', relation: 'local-mutant', variantContentHash: 'second-v3-content', mutationManifest: { operation: 'mutate' } },
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
    test('separates record identity, content identity and evaluation provenance', () => {
        const audit = auditVariantLibrary(fixture());
        expect(audit.counts.familyManifests).toBe(3);
        expect(audit.counts.variantRows).toBe(6);
        expect(audit.contentIdentity.exactParentHashIdentityCollisions).toBe(1);
        expect(audit.contentIdentity.exactVariantHashIdentityCollisions).toBe(1);
        expect(audit.contentIdentity.exactNoOpVariants).toBe(1);
        expect(audit.contentIdentity.duplicateLogicalVariants).toBe(1);
        expect(audit.contentIdentity.conflictingLogicalVariants).toBe(1);
        expect(audit.contentIdentity.familyIdCollisions).toBe(1);
        expect(audit.contentIdentity.variantsMissingContentHash).toBe(1);
        expect(audit.evaluationEvidence.rows).toBe(1);
        expect(audit.evaluationEvidence.missingSolverCommit).toBe(1);
        expect(audit.evaluationEvidence.missingRunId).toBe(1);
        expect(audit.evaluationEvidence.withRecordedBudgetContext).toBe(0);
        expect(audit.evidencePurposes['current-solver-capability']).toMatch(/rechecked on current code/u);
    });
});
