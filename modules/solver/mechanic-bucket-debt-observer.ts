/**
 * PG-I source-only numeric observation of original mechanic-bucket
 * selection debt. Extracted from search.ts to respect the 100-KiB
 * implementation file-size ratchet. No production entrypoint enables it.
 */
import type { PrepLevel } from './types.js';

interface BucketCandidate {
    score: number;
    mustCrossMask: number;
    flipperUsedMask: number;
}
type Observer = NonNullable<PrepLevel['_mechanicBucketOpportunityObserver']>;

export function observeMechanicBucketDebt<T extends BucketCandidate>(
    pool: readonly T[], frontier: readonly T[], top: readonly T[],
    width: number, flipperBase: number, phaseDepth: number,
    workSpent: number, observer: Observer,
): void {
    const retainedNodes = new Set(frontier);
    const globalTopNodes = new Set(top);
    let displaced = 0;
    let topHalf = 0;
    let topQuarter = 0;
    let firstRank: number | null = null;
    let bestSum = 0;
    let selectedSum = 0;

    for (let idx = 0; idx < top.length; idx++) {
        const candidate = top[idx];
        bestSum += candidate.score;
        if (!retainedNodes.has(candidate)) {
            displaced++;
            if (firstRank === null) firstRank = idx + 1;
            if (idx < Math.ceil(width / 2)) topHalf++;
            if (idx < Math.ceil(width / 4)) topQuarter++;
        }
    }
    let promoted = 0;
    for (const candidate of frontier) {
        selectedSum += candidate.score;
        if (!globalTopNodes.has(candidate)) promoted++;
    }
    let lastPromotedRank: number | null = null;
    if (promoted) {
        for (let idx = width; idx < pool.length; idx++) {
            if (retainedNodes.has(pool[idx])) lastPromotedRank = idx + 1;
        }
    }
    const buckets = new Set<number>();
    for (const candidate of pool) {
        buckets.add(candidate.mustCrossMask * flipperBase + (candidate.flipperUsedMask >>> 0));
    }
    const debt = frontier.length === top.length ? Math.max(0, bestSum - selectedSum) : 0;
    observer.observe({
        phaseDepth, workSpent, width, rankedPoolSize: pool.length,
        bucketCount: buckets.size, actualSelected: frontier.length,
        globallyTopKDisplaced: displaced, topHalfDisplaced: topHalf,
        topQuarterDisplaced: topQuarter, minimumDisplacedGlobalRank: firstRank,
        outsideTopKPromoted: promoted, largestPromotedGlobalRank: lastPromotedRank,
        totalScoreDebt: debt, relativeScoreDebt: debt / Math.max(1, Math.abs(bestSum)),
        effectiveMechanicBuckets: true,
    });
}
