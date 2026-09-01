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
const requiredLengthEffect = result.pairs[0].topEffects.find((effect) => effect.feature === 'requiredPathLength');
const portalEffect = result.pairs[0].topEffects.find((effect) => effect.feature === 'portals');
assert.ok(requiredLengthEffect);
assert.ok(portalEffect);
assert.ok(requiredLengthEffect.standardizedDifference < 0);
assert.ok(portalEffect.standardizedDifference < 0);
console.log('analyze-technique-relative-advantage tests passed');
