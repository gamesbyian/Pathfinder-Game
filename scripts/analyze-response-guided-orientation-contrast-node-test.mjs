import assert from 'node:assert/strict';

import { analyzeResponseGuidedOrientationContrasts } from './analyze-response-guided-orientation-contrast.mjs';

const rawLevel = (id, block) => ({
    id,
    grid: { w: 5, h: 5 },
    goal: { x: 5, y: 5 },
    gates: [{ x: 1, y: 1 }],
    reqLen: 8,
    reqInt: 0,
    blocks: block ? [block] : [],
    mustPass: [],
    mustCross: [],
    falseGoals: [],
    geese: [],
    filters: [],
    flippingFilters: [],
    portals: [],
    landmarks: [],
});

const base = {
    schemaVersion: 2,
    levels: [
        { levelId: 'A', solvingActions: ['left'], features: { portals: 0 } },
        { levelId: 'B', solvingActions: ['left'], features: { portals: 0 } },
        { levelId: 'C', solvingActions: ['right'], features: { portals: 0 } },
        { levelId: 'D', solvingActions: ['left', 'right'], features: { portals: 0 } },
    ],
};

const result = analyzeResponseGuidedOrientationContrasts({
    base,
    pairs: [['left', 'right']],
    levels: [
        rawLevel('A', { x: 1, y: 5 }),
        rawLevel('B', { x: 1, y: 4 }),
        rawLevel('C', { x: 5, y: 1 }),
        rawLevel('D', null),
    ],
});

assert.equal(result.kind, 'pathfinder-response-guided-orientation-contrast');
assert.equal(result.pairs.length, 1);
const pair = result.pairs[0];
assert.deepEqual(pair.contrastPopulation.leftOnlyIds, ['A', 'B']);
assert.deepEqual(pair.contrastPopulation.rightOnlyIds, ['C']);
assert.equal(pair.premiseUse, 'offline-premise-nomination-only');
const side = pair.orientationEffects.find(effect => effect.feature === 'blocksSideBalance');
const moment = pair.orientationEffects.find(effect => effect.feature === 'blocksSignedMoment');
assert.ok(side);
assert.ok(moment);
assert.ok(side.leftMean > side.rightMean);
assert.ok(moment.leftMean > moment.rightMean);
assert.equal(result.transformLaw.includes('reflection'), true);

assert.throws(
    () => analyzeResponseGuidedOrientationContrasts({
        base,
        pairs: [['left', 'right']],
        levels: [rawLevel('A', null), rawLevel('A', null)],
    }),
    /duplicate raw level id/u,
);

console.log('response-guided orientation contrast tests passed');
