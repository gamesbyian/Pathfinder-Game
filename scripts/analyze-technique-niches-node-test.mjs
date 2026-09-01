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
assert.equal(result.summary.noCurrentTechnique, 1);
assert.equal(result.levels[0].singleton, true);
assert.equal(result.levels[1].failureCensoring.budgetOrOtherCensored, 1);
assert.equal(result.actions.find((a) => a.action === 'dfs:default').exclusiveLevels, 1);
assert.ok(result.supportedVsUnsupportedEffects.some((e) => e.feature === 'requiredPathCoverageRatio' && e.unsupportedMean > e.supportedMean));
console.log('analyze-technique-niches tests passed');
