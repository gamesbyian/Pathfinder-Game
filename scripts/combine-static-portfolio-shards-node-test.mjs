import assert from 'node:assert/strict';
import { combine } from './combine-static-portfolio-shards.mjs';

const cell = (cellId, levelId, arm, ok, workSpent, status = 'work-budget-reached') => ({
    cellId, levelId, variantLabel: arm, ok, workSpent, status,
});

const shard1 = {
    results: [
        cell('SP-c2-1-full-menu', 'L1', 'full-menu', true, 100, 'success'),
        cell('SP-c2-1-portfolio-11', 'L1', 'portfolio-11', true, 100, 'success'),
        cell('SP-c2-2-full-menu', 'L2', 'full-menu', true, 500, 'success'), // full-menu-only win
        cell('SP-c2-2-portfolio-11', 'L2', 'portfolio-11', false, 300),
    ],
};
const shard2 = {
    results: [
        cell('SP-c2-3-full-menu', 'L3', 'full-menu', false, 900),
        cell('SP-c2-3-portfolio-11', 'L3', 'portfolio-11', false, 900),
    ],
};

const result = combine([shard1, shard2], 'full-menu');

assert.equal(result.totalCells, 6);
assert.equal(result.armSummaries.length, 2);
const fullMenu = result.armSummaries.find((a) => a.arm === 'full-menu');
const portfolio11 = result.armSummaries.find((a) => a.arm === 'portfolio-11');
assert.equal(fullMenu.solved, 2);
assert.equal(portfolio11.solved, 1);
assert.equal(fullMenu.work, 100 + 500 + 900);
assert.equal(portfolio11.work, 100 + 300 + 900);

// solvedWorkStats: computed only from solved (ok:true) cells' workSpent, not the aggregate `work`
// column above (which includes censored/unsolved cells' spend too).
assert.deepEqual(fullMenu.solvedWorkStats, { count: 2, min: 100, median: 300, mean: 300, max: 500 });
assert.deepEqual(portfolio11.solvedWorkStats, { count: 1, min: 100, median: 100, mean: 100, max: 100 });

// An arm with zero solved cells gets null, not a zero/NaN placeholder.
const zeroSolvedShard = { results: [cell('SP-c2-4-never-solves', 'L4', 'never-solves', false, 700)] };
const zeroSolvedResult = combine([zeroSolvedShard], 'never-solves');
assert.equal(zeroSolvedResult.armSummaries[0].solvedWorkStats, null);

// Even-count median averages the two middle values.
const evenMedianShard = {
    results: [
        cell('SP-c2-5-arm', 'L5', 'arm', true, 100, 'success'),
        cell('SP-c2-6-arm', 'L6', 'arm', true, 300, 'success'),
        cell('SP-c2-7-arm', 'L7', 'arm', true, 500, 'success'),
        cell('SP-c2-8-arm', 'L8', 'arm', true, 900, 'success'),
    ],
};
const evenMedianResult = combine([evenMedianShard], 'arm');
assert.deepEqual(evenMedianResult.armSummaries[0].solvedWorkStats, { count: 4, min: 100, median: (300 + 500) / 2, mean: (100 + 300 + 500 + 900) / 4, max: 900 });

assert.equal(result.comparisons.length, 1);
const cmp = result.comparisons[0];
assert.equal(cmp.arm, 'portfolio-11');
assert.deepEqual(cmp.gained, []);
assert.deepEqual(cmp.lost, ['L2']); // full-menu solved L2, portfolio-11 did not
assert.equal(cmp.workDelta, portfolio11.work - fullMenu.work);

// Missing control arm.
assert.throws(() => combine([shard1], 'nonexistent-arm'), /control arm "nonexistent-arm" not present/);

// Plan completeness check: a plan naming a cellId no shard produced must fail loudly, not silently
// report a partial population as complete.
const incompletePlan = { cells: [{ cellId: 'SP-c2-1-full-menu' }, { cellId: 'SP-c2-1-portfolio-11' }, { cellId: 'SP-c2-99-full-menu' }] };
assert.throws(() => combine([shard1, shard2], 'full-menu', incompletePlan), /missing/);

// A duplicated cellId (two shards both produced the same cell) must also fail loudly.
const dupedShard = { results: [cell('SP-c2-1-full-menu', 'L1', 'full-menu', true, 1, 'success')] };
const planForDupeCheck = { cells: [{ cellId: 'SP-c2-1-full-menu' }] };
assert.throws(() => combine([shard1, dupedShard], 'full-menu', planForDupeCheck), /duplicated/);

console.log('combine-static-portfolio-shards tests passed');
