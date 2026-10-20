import assert from 'node:assert/strict';
import { test } from 'vitest';
import { observeMechanicBucketDebt } from './mechanic-bucket-debt-observer.js';

test('source-only bucket-debt observation counts displaced scored ranks without touching candidate order', () => {
    const pool = Array.from({ length: 8 }, (_, i) => ({
        score: 100 - 10 * i, mustCrossMask: i % 2, flipperUsedMask: 0,
    }));
    const top = pool.slice(0, 4);
    const selected = [pool[0], pool[2], pool[4], pool[5]];
    const details: Array<Record<string, number | boolean | null>> = [];
    const oldPool = [...pool];
    const oldSelected = [...selected];
    observeMechanicBucketDebt(pool, selected, top, 4, 2, 19, 123,
        { observe: v => { details.push(v); } });
    assert.deepEqual(pool, oldPool);
    assert.deepEqual(selected, oldSelected);
    assert.equal(details[0].globallyTopKDisplaced, 2);
    assert.equal(details[0].topHalfDisplaced, 1);
    assert.equal(details[0].topQuarterDisplaced, 0);
    assert.equal(details[0].minimumDisplacedGlobalRank, 2);
    assert.equal(details[0].outsideTopKPromoted, 2);
    assert.equal(details[0].largestPromotedGlobalRank, 6);
    assert.equal(details[0].bucketCount, 2);
    assert.equal(details[0].totalScoreDebt, 50);
    assert.equal(details[0].relativeScoreDebt, 50 / 340);
    assert.equal(details[0].phaseDepth, 19);
    assert.equal(details[0].workSpent, 123);
});

test('no quota displacement is reported as zero without changing global top-K', () => {
    const pool = Array.from({ length: 7 }, (_, i) => ({
        score: 10 - i, mustCrossMask: 0, flipperUsedMask: 0,
    }));
    const results: Array<{ globallyTopKDisplaced: number; totalScoreDebt: number }> = [];
    observeMechanicBucketDebt(pool, pool.slice(0, 5), pool.slice(0, 5), 5, 1, 7, 99,
        { observe: v => { results.push(v); } });
    assert.equal(results[0].globallyTopKDisplaced, 0);
    assert.equal(results[0].totalScoreDebt, 0);
});
