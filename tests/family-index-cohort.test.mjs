import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';
import { queryFamilyIndex } from '../scripts/family-index-lib.mjs';

const fixtureIndex = () => ({
    families: [
        { corpus: 'corpus-a', parentCorpus: 'source-a', parentId: 'P1', familyId: 'F1', mode: 'symmetry' },
        { corpus: 'corpus-b', parentCorpus: 'source-b', parentId: 'P2', familyId: 'F2', mode: 'local-mutant' },
        { corpus: 'corpus-b', parentCorpus: 'source-b', parentId: 'P3', familyId: 'F3', mode: 'symmetry' },
    ],
    variants: [
        { corpus: 'corpus-a', parentCorpus: 'source-a', parentId: 'P1', familyId: 'F1', variantId: 'V1', mode: 'symmetry', evaluated: true, solved: true },
        { corpus: 'corpus-b', parentCorpus: 'source-b', parentId: 'P2', familyId: 'F2', variantId: 'V2', mode: 'local-mutant', evaluated: true, solved: false },
        { corpus: 'corpus-b', parentCorpus: 'source-b', parentId: 'P3', familyId: 'F3', variantId: 'V3', mode: 'symmetry', evaluated: false, solved: false },
    ],
});

describe('family index cohort filters', () => {
    test('query API treats array values as OR within a filter and AND across filters', () => {
        const result = queryFamilyIndex(fixtureIndex(), {
            parentId: ['P1', 'P3'],
            mode: 'symmetry',
        });
        expect(result.variants.map(row => row.variantId)).toEqual(['V1', 'V3']);
        expect(result.counts.parents).toBe(2);
    });

    test('CLI accepts comma-separated cohort values', () => {
        const root = mkdtempSync(path.join(tmpdir(), 'family-index-cohort-'));
        mkdirSync(path.join(root, '.cache'), { recursive: true });
        writeFileSync(path.join(root, '.cache/family-index.json'), `${JSON.stringify(fixtureIndex())}\n`);

        const stdout = execFileSync(process.execPath, [
            'scripts/family-index.mjs',
            'query',
            `--variant-family-dataset-root=${root}`,
            '--parent-id=P1,P3',
            '--mode=symmetry',
        ], { cwd: process.cwd(), encoding: 'utf8' });
        const result = JSON.parse(stdout);
        expect(result.variants.map(row => row.variantId)).toEqual(['V1', 'V3']);
        expect(result.counts.parents).toBe(2);
    });
});
