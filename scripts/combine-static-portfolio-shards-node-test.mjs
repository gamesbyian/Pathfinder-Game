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
