import { describe, expect, test } from 'vitest';
import { Bc1ShadowDispositionObserver } from './bc1-shadow-disposition.js';

const conflict = (edgeId = 'c:1:2') =>
    [{ edgeId, edgeKind: 'cardinal' as const, a: 1, b: 2, farPendingIds: [9], currentSideSize: 3, farSideSize: 2 }];

describe('BC1 shadow later-disposition observer', () => {
    test('immediate same-phase width cull, never expanded', () => {
        const observer = new Bc1ShadowDispositionObserver();
        observer.observeBc1Candidate({ depth: 2, workBefore: 10, workSpent: 22, constructionWorkUnits: 12, path: [1, 2, 3], conflicts: conflict() });
        observer.observe({ stage: 'post-hard-prune', depth: 2, work: 1, workSpent: 22, paths: [[1, 2, 3], [1, 2, 9]] });
        observer.observe({ stage: 'score-width-culled', depth: 2, work: 1, workSpent: 23, paths: [[1, 2, 3]] });
        observer.observe({ stage: 'post-score-width-cull', depth: 2, work: 1, workSpent: 23, paths: [[1, 2, 9]] });
        const summary = observer.summary();
        expect(summary.flaggedCount).toBe(1);
        expect(summary.resolved[0]).toMatchObject({
            everExpanded: false, lossCause: 'score-width-culled', overlap: 'later-lossy-cull', workDistance: 1,
        });
    });

    test('later deterministic rejection after the node survives and is expanded', () => {
        const observer = new Bc1ShadowDispositionObserver();
        observer.observeBc1Candidate({ depth: 2, workBefore: 10, workSpent: 20, constructionWorkUnits: 10, path: [1, 2, 3], conflicts: conflict() });
        // Same phase: node itself survives untouched into the next frontier (small cands.length branch).
        observer.observe({ stage: 'post-hard-prune', depth: 2, work: 1, workSpent: 20, paths: [[1, 2, 3]] });
        observer.observe({ stage: 'post-score-width-cull', depth: 2, work: 1, workSpent: 20, paths: [[1, 2, 3]] });
        // Next phase: the node is walked; both children die immediately to an ordinary hard prune.
        observer.observe({ stage: 'incoming-frontier', depth: 3, work: 2, workSpent: 20, paths: [[1, 2, 3]] });
        observer.observe({ stage: 'generated', depth: 3, work: 2, workSpent: 25, paths: [[1, 2, 3, 4], [1, 2, 3, 5]] });
        observer.observe({ stage: 'hard-pruned', depth: 3, work: 2, workSpent: 25, paths: [[1, 2, 3, 4], [1, 2, 3, 5]] });
        observer.observe({ stage: 'post-hard-prune', depth: 3, work: 2, workSpent: 25, paths: [] });
        const summary = observer.summary();
        expect(summary.resolved[0]).toMatchObject({
            everExpanded: true, lossCause: 'hard-pruned', overlap: 'later-deterministic-rejection', workDistance: 5,
        });
    });

    test('survives the observation window when never resolved', () => {
        const observer = new Bc1ShadowDispositionObserver();
        observer.observeBc1Candidate({ depth: 1, workBefore: 0, workSpent: 5, constructionWorkUnits: 5, path: [1, 2], conflicts: conflict() });
        observer.observe({ stage: 'post-hard-prune', depth: 1, work: 1, workSpent: 5, paths: [[1, 2]] });
        const summary = observer.summary();
        expect(summary.resolved[0]).toMatchObject({ lossCause: null, overlap: 'survived-observation-window', workDistance: null });
    });

    test('does not reflag the same exact prefix twice', () => {
        const observer = new Bc1ShadowDispositionObserver();
        observer.observeBc1Candidate({ depth: 1, workBefore: 0, workSpent: 5, constructionWorkUnits: 5, path: [1, 2], conflicts: conflict() });
        observer.observeBc1Candidate({ depth: 1, workBefore: 0, workSpent: 99, constructionWorkUnits: 99, path: [1, 2], conflicts: conflict('other') });
        expect(observer.summary().flaggedCount).toBe(1);
        expect(observer.summary().resolved[0].workAtProof).toBe(5);
    });

    test('tracks aggregate shadow cost across every evaluated candidate, flagged or not', () => {
        const observer = new Bc1ShadowDispositionObserver();
        observer.observeBc1ShadowCost(12);
        observer.observeBc1ShadowCost(0); // pending-mandatory early exit
        observer.observeBc1ShadowCost(12);
        observer.observeBc1Candidate({ depth: 1, workBefore: 0, workSpent: 5, constructionWorkUnits: 12, path: [1, 2], conflicts: conflict() });
        const summary = observer.summary();
        expect(summary.shadowInvocations).toBe(3);
        expect(summary.shadowTotalCost).toBe(24);
        expect(summary.flaggedCount).toBe(1); // independent of the unconditional cost counter
    });

    test('solution-safety alarm fires only when a real solution passes through a flagged prefix', () => {
        const observer = new Bc1ShadowDispositionObserver();
        observer.observeBc1Candidate({ depth: 1, workBefore: 0, workSpent: 5, constructionWorkUnits: 5, path: [1, 2], conflicts: conflict() });
        expect(observer.checkSolutionSafety(null)).toEqual({ alarm: false, violatingPrefixes: [] });
        expect(observer.checkSolutionSafety([9, 9, 9])).toEqual({ alarm: false, violatingPrefixes: [] });
        expect(observer.checkSolutionSafety([1, 2, 3, 4])).toEqual({ alarm: true, violatingPrefixes: [[1, 2]] });
    });
    test('lineage counts and lineage-aware flag are reported', () => {
        const observer = new Bc1ShadowDispositionObserver({ lineageAware: true });
        observer.observeBc1ShadowCost(5, 'first-flag');
        observer.observeBc1ShadowCost(0, 'inherited');
        observer.observeBc1ShadowCost(3);
        expect(observer.bc1LineageAware).toBe(true);
        expect(new Bc1ShadowDispositionObserver().bc1LineageAware).toBe(false);
        const summary = observer.summary();
        expect(summary.lineageCounts).toEqual({ inherited: 1, 'first-flag': 1, clear: 1, skipped: 0 });
        expect(summary.shadowTotalCost).toBe(8);
    });
});
