import { describe, expect, test } from 'vitest';
import { WinningLineageObserver, WinningPrefixIndex } from './research-lineage.js';
import { structuralSolutionFamilySignature } from '../domain/path-features.js';
import { PACK } from './encoding.js';

describe('winning lineage research instrumentation', () => {
    test('deduplicates labels and retains family support', () => {
        const index = new WinningPrefixIndex([
            { path: [1, 2, 3], provenance: 'canonical', family: 'a' },
            { path: [1, 2, 3], provenance: 'variant-replay', family: 'a' },
            { path: [1, 2, 3], provenance: 'other-family', family: 'c' },
            { path: [1, 2, 4], provenance: 'oracle', family: 'b' },
        ]);
        expect(index.solutions).toHaveLength(2);
        expect(index.support([1, 2])).toMatchObject({ paths: 2, families: 3 });
        expect(index.support([1, 2, 3]).provenances).toEqual(['canonical', 'other-family', 'variant-replay']);
        expect(index.support([1, 9]).paths).toBe(0);
    });

    test('keeps exact paths separate from established structural solution families', () => {
        const p = PACK, mc = p(2, 1);
        const localDetourA = [p(0, 0), p(1, 0), p(2, 0), mc, p(3, 1), mc, p(2, 2)];
        const localDetourB = [p(0, 0), p(0, 1), p(1, 1), mc, p(3, 1), mc, p(2, 2)];
        const differentCrossing = [p(0, 0), p(0, 1), p(1, 1), p(1, 2), p(1, 1), mc,
            p(3, 1), mc, p(2, 2)];
        const familyA = structuralSolutionFamilySignature(localDetourA, [mc]);
        const familyB = structuralSolutionFamilySignature(localDetourB, [mc]);
        const familyC = structuralSolutionFamilySignature(differentCrossing, [mc]);
        expect(familyA).toBe(familyB);
        expect(familyC).not.toBe(familyA);
        const index = new WinningPrefixIndex([
            { path: localDetourA, provenance: 'solver-a', family: familyA },
            { path: localDetourA, provenance: 'solver-b', family: familyA },
            { path: localDetourB, provenance: 'solver-c', family: familyB },
            { path: differentCrossing, provenance: 'solver-d', family: familyC },
        ]);
        expect(index.solutions).toHaveLength(3);
        expect(index.solutions[0].provenances).toEqual(['solver-a', 'solver-b']);
        expect(index.support([p(0, 0)])).toMatchObject({ paths: 3, families: 2 });
    });

    test('accounts for support loss and canonical work after loss', () => {
        const observer = new WinningLineageObserver(new WinningPrefixIndex([{ path: [1, 2, 3], provenance: 'fixture' }]));
        observer.observe({ stage: 'incoming-frontier', depth: 1, work: 2, paths: [[1, 2]] });
        observer.observe({ stage: 'post-hard-prune', depth: 2, work: 3, paths: [[1, 9]] });
        observer.observe({ stage: 'post-score-width-cull', depth: 3, work: 10, paths: [[1, 9, 8]] });
        const summary = observer.summary(3);
        expect(summary.firstSupportLoss).toMatchObject({ stage: 'post-hard-prune' });
        expect(summary.workAfterFinalKnownSupport).toBe(8);
    });

    test('unions support across candidates and raises a hard-prune correctness alarm', () => {
        const observer = new WinningLineageObserver(new WinningPrefixIndex([
            { path: [1, 2, 3], provenance: 'a', family: 'one' },
            { path: [1, 4, 5], provenance: 'b', family: 'two' },
        ]));
        observer.observe({ stage: 'generated', depth: 1, work: 1, paths: [[1, 2], [1, 4]] });
        observer.observe({ stage: 'hard-pruned', depth: 1, work: 1, paths: [[1, 2]] });
        expect(observer.stages[0]).toMatchObject({ supportedPaths: 2, supportedFamilies: 2 });
        expect(observer.summary(3).correctnessAlarms).toHaveLength(1);
    });

    test('attributes extinction to the supported removal event at that depth', () => {
        const observer = new WinningLineageObserver(new WinningPrefixIndex([{ path: [1, 2], provenance: 'x' }]));
        observer.observe({ stage: 'incoming-frontier', depth: 0, work: 0, paths: [[1]] });
        observer.observe({ stage: 'hard-pruned', depth: 1, work: 1, paths: [[1, 2]], details: { rejections: [{ cause: 'PRUNE_DISTANCE_BOUND' }] } });
        observer.observe({ stage: 'post-hard-prune', depth: 1, work: 1, paths: [[1, 3]] });
        expect(observer.summary(2).firstSupportLoss).toMatchObject({ lossCause: 'hard-pruned' });
    });

    test('retains only known-supported removal context by default', () => {
        const observer = new WinningLineageObserver(new WinningPrefixIndex([{ path: [1, 2], provenance: 'x' }]));
        observer.observe({ stage: 'score-width-culled', depth: 1, work: 2, paths: [[1, 2], [1, 9]],
            details: { culled: [{ path: [1, 2], rank: 3 }, { path: [1, 9], rank: 4 }], beamWidth: 2 } });
        expect(observer.stages[0].details).toEqual({ culled: [{ path: [1, 2], rank: 3 }], beamWidth: 2 });
    });

    test('summarizes ranked pools by default but can retain the full pool explicitly', () => {
        const index = new WinningPrefixIndex([{ path: [1, 2, 3], provenance: 'x', family: 'a' }]);
        const rankedPool = [
            { path: [1, 9], rank: 1, score: 10, insertionOrder: 0 },
            { path: [1, 2], rank: 2, score: 9, insertionOrder: 1 },
            { path: [1, 8], rank: 3, score: 8, insertionOrder: 2 },
        ];
        const record = { stage: 'score-width-culled', depth: 1, work: 3, paths: [[1, 2]],
            details: { rankedPool, beamWidth: 1 } };

        const compact = new WinningLineageObserver(index);
        compact.observe(record);
        expect(compact.stages[0].details).not.toHaveProperty('rankedPool');
        expect(compact.stages[0].details).toMatchObject({
            poolCandidateCount: 3,
            supportedPoolCandidates: 1,
            supportedPoolFamilies: 1,
            supportedPool: [{ rank: 2, score: 9, insertionOrder: 1, paths: 1, families: ['a'] }],
        });

        const fullPool = new WinningLineageObserver(index, { retainRankedPoolDetails: true });
        fullPool.observe(record);
        expect(fullPool.stages[0].details?.rankedPool).toEqual(rankedPool);
        expect(fullPool.stages[0].details).toMatchObject({ poolCandidateCount: 3, supportedPoolCandidates: 1 });
    });
});