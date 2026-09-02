import assert from 'node:assert/strict';
import { buildPlan } from './build-static-portfolio-plan.mjs';

const population = [
    { corpus: 'corpus2', levelPos: 5, levelId: 'R00005' },
    { corpus: 'corpus2', levelPos: 9, levelId: 'R00009' },
];
const arms = {
    'full-menu': ['beam|score=objectiveFirst|bias=none|width=5000|retention=plain', 'dfs|score=default|bias=none'],
    'portfolio-1': ['beam|score=objectiveFirst|bias=none|width=5000|retention=plain'],
};

const plan = buildPlan(population, arms, 67_000_000);

assert.equal(plan.cells.length, 4); // 2 levels x 2 arms
assert.equal(plan.budgetProtocol, 'static-portfolio-shared-work');
const fullMenuCellForLevel5 = plan.cells.find((c) => c.levelPos === 5 && c.variantLabel === 'full-menu');
assert.deepEqual(fullMenuCellForLevel5.techniqueKeys, arms['full-menu']);
assert.equal(fullMenuCellForLevel5.workBudget, 67_000_000);
assert.equal(fullMenuCellForLevel5.corpus, 'corpus2');
assert.equal(fullMenuCellForLevel5.levelId, 'R00005');
const portfolioCellForLevel9 = plan.cells.find((c) => c.levelPos === 9 && c.variantLabel === 'portfolio-1');
assert.deepEqual(portfolioCellForLevel9.techniqueKeys, arms['portfolio-1']);
// Cell ids must be unique across the whole plan.
assert.equal(new Set(plan.cells.map((c) => c.cellId)).size, plan.cells.length);

// perTechniqueWorkCap: omitted by default (backward compatible), set explicitly when passed.
assert.equal(Object.hasOwn(fullMenuCellForLevel5, 'perTechniqueWorkCap'), false);
const capped = buildPlan(population, arms, 67_000_000, 10_000_000);
assert.equal(capped.cells[0].perTechniqueWorkCap, 10_000_000);

// attemptBudgetMs: defaults to 600,000 (the historical ATTEMPT_BUDGET_MS constant) when omitted,
// and every cell honors an explicit override -- regression coverage for a real bug where the
// workflow's budget_ms input was documented but never actually reached this file.
assert.equal(fullMenuCellForLevel5.budgetMs, 600_000);
const customDeadline = buildPlan(population, arms, 67_000_000, null, 120_000);
assert.ok(customDeadline.cells.every((c) => c.budgetMs === 120_000));

assert.throws(() => buildPlan([], arms, 1), /non-empty array/);
assert.throws(() => buildPlan(population, {}, 1), /at least one named arm/);
assert.throws(() => buildPlan(population, { empty: [] }, 1), /non-empty technique-key array/);

console.log('build-static-portfolio-plan tests passed');
