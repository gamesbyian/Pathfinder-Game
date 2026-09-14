import { describe, expect, it } from 'vitest';
import { auditTrackedProfileLibrary } from './cross-resource-profile-integrity.mjs';
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

    it('joins family coverage and uses evaluation counts only when evidence artifacts are loaded', () => {
        const coverage = familyCoverageFromIndex({
            counts: { evidenceArtifacts: 2 },
            families: [{ parentId: 'R00001', parentCorpus: 'stress2', familyId: 'F1', variantCount: 3, mode: 'swap' }],
            variants: [
                { parentId: 'R00001', evaluated: true, solved: true },
                { parentId: 'R00001', evaluated: true, solved: false },
            ],
        }, ['R00001']);
        expect(coverage?.get('R00001')).toEqual({
            families: 1,
            variants: 3,
            familyIds: ['F1'],
            modes: ['swap'],
            parentCorpora: ['stress2'],
            evaluationEvidenceLoaded: true,
            evaluated: 2,
            solved: 1,
        });

        const manifestOnly = familyCoverageFromIndex({
            counts: { evidenceArtifacts: 0 },
            families: [{ parentId: 'R00001', parentCorpus: 'stress2', familyId: 'F1', variantCount: 3, mode: 'swap' }],
            variants: [{ parentId: 'R00001', evaluated: false, solved: false }],
        }, ['R00001']);
        expect(manifestOnly?.get('R00001')?.evaluationEvidenceLoaded).toBe(false);
        expect(manifestOnly?.get('R00001')?.evaluated).toBeNull();
        expect(manifestOnly?.get('R00001')?.solved).toBeNull();
    });

    it('checks replay family identity against mounted parent manifests', () => {
        const base = {
            id: 'R00001',
            provenance: { origin: 'procedural', history: [{ action: 'generated', timestamp: '2026-07-09T00:00:00Z', detail: { corpusName: 'random-uniform-v1', generatorVersion: '1.1.0' } }] },
        };
        const coverage = new Map([['R00001', {
            families: 1, variants: 3, familyIds: ['F1'], modes: ['swap'], parentCorpora: ['stress2'],
            evaluationEvidenceLoaded: false, evaluated: null, solved: null,
        }]]);
        const matched = analyzeLevelObservability({
            source: 'stress2', metadata: { appendHistory: [{ appendedAt: '2026-07-11T00:00:00Z' }] }, familyCoverage: coverage,
            level: { ...base, hintRecords: [{ path: [1, 2], provenance: [replay('F1', 'R00001', '2026-08-01T00:00:00Z')] }] },
        });
        expect(matched.ancestry.replayFamilyCompatibility.status).toBe('matched');
        expect(matched.ancestry.replayFamilyCompatibility.unmatchedFamilies).toEqual([]);

        const unmatched = analyzeLevelObservability({
            source: 'stress2', metadata: { appendHistory: [{ appendedAt: '2026-07-11T00:00:00Z' }] }, familyCoverage: coverage,
            level: { ...base, hintRecords: [{ path: [1, 2], provenance: [replay('F2', 'R00001', '2026-08-01T00:00:00Z')] }] },
        });
        expect(unmatched.ancestry.replayFamilyCompatibility.status).toBe('partial-or-unmatched');
        expect(unmatched.ancestry.replayFamilyCompatibility.unmatchedFamilies).toEqual(['F2']);
    });

    it('summarizes selection-conditioned and four-resource coverage without calling it independence', () => {
        const familyCoverage = new Map([['R00001', {
            families: 1, variants: 3, familyIds: ['F1'], modes: ['swap'], parentCorpora: ['stress2'],
            evaluationEvidenceLoaded: false, evaluated: null, solved: null,
        }]]);
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
        expect(summary.totals.matchedReplayFamilyLevelLineages).toBe(1);
        expect(summary.totals.unmatchedReplayFamilyLevelLineages).toBe(0);
        expect(summary.bySelectionStratum['c2-original-random-solver-negative-survivor'].levels).toBe(1);
        expect(summary.byFamilyAvailability['parent-indexed'].levels).toBe(1);
        expect(summary.topCases.replayFeedbackCandidates[0].id).toBe('R00001');
    });

    it('checks tracked Solution Profile rows against current hint support at corpus position', () => {
        const levels = [{
            id: 'S00001',
            hintRecords: [
                { path: [1, 2], provenance: [pathfinder('2026-08-01T00:00:00Z')] },
                { path: [1, 3], provenance: [pathfinder('2026-08-02T00:00:00Z')] },
            ],
        }];
        const library = {
            schemaVersion: 3,
            provenanceTaxonomy: 'origin-facet-applicability-v2',
            profileAlgorithmVersion: 'sample-support-v2',
            source: 'data/stress/stress-levels.json',
            levels: [{
                level: 1,
                hintCount: 2,
                combined: {
                    pathCount: 2,
                    distinctPathCount: 2,
                    discoverySaturation: { chronologyDatedHints: 2, chronologyComplete: true },
                },
            }],
        };
        const compatible = auditTrackedProfileLibrary(library, levels, { sourcePath: 'data/stress/stress-levels.json' });
        expect(compatible.compatible).toBe(true);
        expect(compatible.mismatchCount).toBe(0);

        library.levels[0].hintCount = 1;
        const stale = auditTrackedProfileLibrary(library, levels, { sourcePath: 'data/stress/stress-levels.json' });
        expect(stale.compatible).toBe(false);
        expect(stale.mismatchTypes['hint-count']).toBe(1);
    });
});
