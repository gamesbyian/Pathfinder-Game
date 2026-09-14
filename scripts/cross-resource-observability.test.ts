import { describe, expect, it } from 'vitest';
import {
    analyzeLevelObservability,
    familyCoverageFromIndex,
    summarizeCrossResourceObservability,
    summarizeHintObservability,
} from './cross-resource-observability-lib.mjs';

const pathfinder = (foundAt: string) => ({
    solver: { id: 'pathfinder-solver', version: 'abc', technique: 'repair', scoringProfileId: 'repair' },
    search: { termination: 'solved', randomSeed: null },
    context: { usedExistingHints: false, hintGuided: false, isolatedTechnique: false },
    foundAt,
});
const replay = (family: string, parent: string, foundAt: string) => ({
    solver: { id: 'variant-corpus-diagnostic', version: null, technique: `variant-parent-replay:${family}:${parent}:V1` },
    search: { termination: 'referee-accepted', randomSeed: null },
    context: { usedExistingHints: false, hintGuided: false },
    foundAt,
});

describe('cross-resource observability', () => {
    it('distinguishes replay-touched paths from replay-first paths', () => {
        const summary = summarizeHintObservability([
            { path: [1, 2], provenance: [pathfinder('2026-08-01T00:00:00Z'), replay('family-A', 'R00001', '2026-08-02T00:00:00Z')] },
            { path: [1, 3], provenance: [replay('family-A', 'R00001', '2026-08-01T00:00:00Z')] },
        ]);
        expect(summary.replayTouchedHints).toBe(2);
        expect(summary.replayFirstHints).toBe(1);
        expect(summary.replayOnlyHints).toBe(1);
        expect(summary.pathfinderTouchedHints).toBe(1);
        expect(summary.replayFamilies).toEqual(['family-A']);
        expect(summary.replayParents).toEqual(['R00001']);
        expect(summary.provenanceEntries).toBe(3);
        expect(summary.dependencyStrataWithinPath).toBe(3);
    });

    it('keeps unknown family coverage distinct from a mounted no-family result', () => {
        const level = {
            id: 'R00001',
            provenance: { origin: 'procedural', history: [{ action: 'generated', timestamp: '2026-07-09T00:00:00Z', detail: { corpusName: 'random-uniform-v1', generatorVersion: '1.1.0' } }] },
            hintRecords: [{ path: [1, 2], provenance: [pathfinder('2026-08-01T00:00:00Z')] }],
        };
        const metadata = { appendHistory: [{ appendedAt: '2026-07-11T00:00:00Z' }] };
        expect(analyzeLevelObservability({ source: 'stress2', level, metadata }).family.availability).toBe('not-mounted');
        expect(analyzeLevelObservability({ source: 'stress2', level, metadata, familyCoverage: new Map() }).family.availability).toBe('mounted-no-parent-record');
    });

    it('joins family coverage by current globally unique parent id', () => {
        const coverage = familyCoverageFromIndex({
            families: [{ parentId: 'R00001', parentCorpus: 'stress2', familyId: 'F1', variantCount: 3, mode: 'swap' }],
            variants: [
                { parentId: 'R00001', evaluated: true, solved: true },
                { parentId: 'R00001', evaluated: true, solved: false },
            ],
        }, ['R00001']);
        expect(coverage?.get('R00001')).toEqual({
            families: 1,
            variants: 3,
            modes: ['swap'],
            parentCorpora: ['stress2'],
            evaluated: 2,
            solved: 1,
        });
    });

    it('summarizes selection-conditioned and four-resource coverage without calling it independence', () => {
        const familyCoverage = new Map([['R00001', { families: 1, variants: 3, modes: ['swap'], parentCorpora: ['stress2'], evaluated: 0, solved: 0 }]]);
        const rows = [analyzeLevelObservability({
            source: 'stress2',
            metadata: { appendHistory: [{ appendedAt: '2026-07-11T00:00:00Z' }] },
            familyCoverage,
            level: {
                id: 'R00001',
                provenance: { origin: 'procedural', history: [{ action: 'generated', timestamp: '2026-07-09T00:00:00Z', detail: { corpusName: 'random-uniform-v1', generatorVersion: '1.1.0' } }] },
                hintRecords: [{ path: [1, 2], provenance: [replay('F1', 'R00001', '2026-08-01T00:00:00Z')] }],
            },
        })];
        const summary = summarizeCrossResourceObservability(rows, { loaded: true }, 5);
        expect(summary.totals.fourResourceJoinableLevels).toBe(1);
        expect(summary.totals.replayTouchedLevels).toBe(1);
        expect(summary.bySelectionStratum['c2-original-random-solver-negative-survivor'].levels).toBe(1);
        expect(summary.topCases.replayFeedbackCandidates[0].id).toBe('R00001');
    });
});
