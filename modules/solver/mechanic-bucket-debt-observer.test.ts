import assert from 'node:assert/strict';
import { test } from 'vitest';
import { observeMechanicBucketDebt } from './mechanic-bucket-debt-observer.js';

test('source-only bucket-debt observation counts displaced scored ranks without touching candidate order', () => {
    const pool = Array.from({ length: 8 }, (_, i) => ({
        score: 100 - 10 * i, mustCrossMask: i % 2, flipperUsedMask: 0,
    }));
    const top = pool.slice(0, 4);
    const selected = [pool[0], pool[2], pool[4], pool[5]];
    let detail: Record<string, number | boolean | null> | null = null;
    const oldPool = [...pool];
    const oldSelected = [...selected];
    observeMechanicBucketDebt(pool, selected, top, 4, 2, 19, 123,
        { observe: v => { detail = v; } });
    assert.deepEqual(pool, oldPool);
    assert.deepEqual(selected, oldSelected);
    assert.equal(detail!.globallyTopKDisplaced, 2);
    assert.equal(detail!.topHalfDisplaced, 1);
    assert.equal(detail!.topQuarterDisplaced, 0);
    assert.equal(detail!.minimumDisplacedGlobalRank, 2);
    assert.equal(detail!.outsideTopKPromoted, 2);
    assert.equal(detail!.largestPromotedGlobalRank, 6);
    assert.equal(detail!.bucketCount, 2);
    assert.equal(detail!.totalScoreDebt, 50);
    assert.equal(detail!.relativeScoreDebt, 50 / 340);
    assert.equal(detail!.phaseDepth, 19);
    assert.equal(detail!.workSpent, 123);
});

test('no quota displacement is reported as zero without changing global top-K', () => {
    const pool = Array.from({ length: 7 }, (_, i) => ({
        score: 10 - i, mustCrossMask: 0, flipperUsedMask: 0,
    }));
    let result: { globallyTopKDisplaced: number; totalScoreDebt: number } | null = null;
    observeMechanicBucketDebt(pool, pool.slice(0, 5), pool.slice(0, 5), 5, 1, 7, 99,
        { observe: v => { result = v; } });
    assert.equal(result!.globallyTopKDisplaced, 0);
    assert.equal(result!.totalScoreDebt, 0);
});
