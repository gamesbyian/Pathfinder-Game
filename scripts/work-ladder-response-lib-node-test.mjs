import assert from 'node:assert/strict';
import { analyzeWorkLadder } from './work-ladder-response-lib.mjs';

const result = analyzeWorkLadder([
    { workBudget: 30, rows: [{ id: 'a', ok: true }, { id: 'b', ok: true }] },
    { workBudget: 10, rows: [{ id: 'a', ok: false }, { id: 'b', ok: true }] },
    { workBudget: 20, rows: [{ id: 'a', ok: true }, { id: 'b', ok: false }] },
]);
assert.deepEqual(result.budgets, [10, 20, 30]);
assert.deepEqual(result.steps[1].gainedFromPrevious, ['a']);
assert.deepEqual(result.steps[1].lostFromPrevious, ['b']);
assert.deepEqual(result.nonMonotoneLevels, ['b']);
assert.equal(result.perLevel.find(row => row.id === 'a').firstSolvedWorkBudget, 20);
assert.throws(() => analyzeWorkLadder([{ workBudget: 10, rows: [] }]), /at least two/);
assert.throws(() => analyzeWorkLadder([
    { workBudget: 10, rows: [{ id: 'a', ok: false }, { id: 'b', ok: false }] },
    { workBudget: 20, rows: [{ id: 'a', ok: true }] },
]), /identical row population/);
assert.throws(() => analyzeWorkLadder([
    { workBudget: 10, rows: [{ id: 'a', ok: false }, { id: 'a', ok: true }] },
    { workBudget: 20, rows: [{ id: 'a', ok: true }, { id: 'b', ok: false }] },
]), /duplicate row ids/);
console.log('work-ladder-response-lib-node-test: ok');
