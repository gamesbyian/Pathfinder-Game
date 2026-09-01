import assert from 'node:assert/strict';
import { analyzeRelativeAdvantage } from './analyze-technique-relative-advantage.mjs';

const row = (id, solvingActions, x) => ({
    levelId: id,
    solvingActions,
    features: { requiredPathLength: x, portals: x / 10 },
});
const base = {
    schemaVersion: 2,
    levels: [
        row('A', ['left'], 10),
        row('B', ['left'], 12),
        row('C', ['right'], 30),
        row('D', ['left', 'right'], 20),
        row('E', [], 5),
    ],
};
const result = analyzeRelativeAdvantage(base, [['left', 'right']]);
assert.equal(result.pairs.length, 1);
assert.equal(result.pairs[0].leftOnly, 2);
assert.equal(result.pairs[0].rightOnly, 1);
assert.equal(result.pairs[0].both, 1);
assert.equal(result.pairs[0].neither, 1);
assert.equal(result.pairs[0].evidenceRole, 'outcome-selected-development');
assert.equal(result.pairs[0].topEffects[0].feature, 'requiredPathLength');
assert.ok(result.pairs[0].topEffects[0].standardizedDifference < 0);
console.log('analyze-technique-relative-advantage tests passed');
