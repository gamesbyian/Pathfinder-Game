import assert from 'node:assert/strict';
import { analyze } from './analyze-technique-niches.mjs';

const level = (id, reqLen) => ({ id, grid: { w: 3, h: 3 }, gates: [{ x: 1, y: 1 }], goal: { x: 3, y: 3 },
    falseGoals: [], reqLen, reqInt: 1, blocks: [], mustPass: [], mustCross: [], filters: [], flippingFilters: [], portals: [], geese: [], landmarks: [] });
const cell = (id, technique, ok, status = 'exhausted') => ({ tier: 'T1', corpus: 'c', levelId: id, techniqueKeys: [technique], ok, status, refereeValid: ok, winningConfigKey: ok ? technique : null, nodesExpanded: ok ? 10 : 50 });
const result = analyze({
    cells: [cell('A', 'dfs:default', true), cell('A', 'beam:default@beam2', false), cell('B', 'dfs:default', false, 'budget_exhausted')],
    coverage: [{ corpus: 'c', levelId: 'A', wasSolvedByProduction: false }, { corpus: 'c', levelId: 'B', wasSolvedByProduction: false }],
    levels: [level('A', 3), level('B', 7)],
});
assert.equal(result.summary.productionMissIsolatedSolvable, 1);
assert.equal(result.summary.noFrozenT1Winner, 1);
assert.equal(result.summary.productionMissNoFrozenT1Winner, 1);
assert.equal(result.levels[0].singleton, true);
assert.equal(result.levels[1].failureCensoring.budgetOrOtherCensored, 1);
assert.equal(result.actions.find((a) => a.action === 'dfs:default').exclusiveLevels, 1);
assert.equal(result.levels[1].frozenT1SupportClass, 'production-miss-without-frozen-t1-winner');
assert.ok(result.frozenT1SupportedVsNoWinnerEffects.some((e) => e.feature === 'requiredPathCoverageRatio' && e.unsupportedMean > e.supportedMean));
assert.ok(result.frozenT1SupportedVsNoWinnerEffects.some((e) => e.feature === 'nonNavigableDensity'));
const productionSolvedNoT1 = analyze({
    cells: [cell('C', 'dfs:default', false, 'budget_exhausted')],
    coverage: [{ corpus: 'c', levelId: 'C', wasSolvedByProduction: true }],
    levels: [level('C', 5)],
});
assert.equal(productionSolvedNoT1.summary.productionSolvedNoFrozenT1Winner, 1);
assert.equal(productionSolvedNoT1.levels[0].frozenT1SupportClass, 'production-solved-without-frozen-t1-winner');
assert.throws(() => analyze({ cells: [], coverage: [], levels: [level('D', 3), level('D', 4)] }), /Duplicate static level id D/);
console.log('analyze-technique-niches tests passed');
