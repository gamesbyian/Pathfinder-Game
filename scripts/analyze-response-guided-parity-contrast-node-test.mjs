import assert from 'node:assert/strict';

import { analyzeResponseGuidedParityContrasts } from './analyze-response-guided-parity-contrast.mjs';

const rawLevel = (id, { portals = [], gate = { x: 1, y: 1 }, goal = { x: 5, y: 5 }, reqLen = 8 } = {}) => ({
    id,
    grid: { w: 5, h: 5 },
    goal,
    gates: [gate],
    reqLen,
    reqInt: 0,
    blocks: [],
    mustPass: [],
    mustCross: [],
    falseGoals: [],
    geese: [],
    filters: [],
    flippingFilters: [],
    portals,
    landmarks: [],
});

const base = {
    schemaVersion: 2,
    levels: [
        { levelId: 'A', solvingActions: ['left'], features: { portals: 1 } },
        { levelId: 'B', solvingActions: ['left'], features: { portals: 0 } },
        { levelId: 'C', solvingActions: ['right'], features: { portals: 1 } },
        { levelId: 'D', solvingActions: ['left', 'right'], features: { portals: 0 } },
    ],
};

const twistPortal = [{ x1: 1, y1: 2, x2: 2, y2: 2 }];
const samePortal = [{ x1: 1, y1: 2, x2: 3, y2: 2 }];
const result = analyzeResponseGuidedParityContrasts({
    base,
    pairs: [['left', 'right']],
    levels: [
        rawLevel('A', { portals: twistPortal }),
        rawLevel('B'),
        rawLevel('C', { portals: samePortal }),
        rawLevel('D'),
    ],
});

assert.equal(result.kind, 'pathfinder-response-guided-parity-contrast');
assert.equal(result.pairs.length, 1);
const pair = result.pairs[0];
assert.deepEqual(pair.contrastPopulation.leftOnlyIds, ['A', 'B']);
assert.deepEqual(pair.contrastPopulation.rightOnlyIds, ['C']);
assert.equal(pair.premiseUse, 'offline-premise-nomination-only');
const twistEffect = pair.parityEffects.find(effect => effect.feature === 'twistPortalPairs');
const sameEffect = pair.parityEffects.find(effect => effect.feature === 'sameParityPortalPairs');
assert.ok(twistEffect);
assert.ok(sameEffect);
assert.ok(twistEffect.leftMean > twistEffect.rightMean);
assert.ok(sameEffect.leftMean < sameEffect.rightMean);
assert.deepEqual(pair.gateDemand.leftOnly, { 'all-even': 2 });
assert.deepEqual(pair.gateDemand.rightOnly, { 'all-even': 1 });

assert.throws(
    () => analyzeResponseGuidedParityContrasts({
        base,
        pairs: [['left', 'right']],
        levels: [rawLevel('A'), rawLevel('A')],
    }),
    /duplicate raw level id/u,
);

console.log('response-guided parity contrast tests passed');
