import assert from 'node:assert/strict';

import { createSolver } from '../modules/solver.js';
import {
    analyzeResponseGuidedOrientationContrasts,
    describeStaticOrientationStructure,
} from './analyze-response-guided-orientation-contrast.mjs';
import { freezeResponseGuidedContrasts } from './freeze-response-guided-contrasts.mjs';

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

const frozenContrasts = freezeResponseGuidedContrasts(base, { pairs: [['left', 'right']] });
const result = analyzeResponseGuidedOrientationContrasts({
    frozenContrasts,
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


const mirrorPoint = point => point ? { ...point, x: 6 - point.x } : point;
const mirrorRawHorizontal = raw => ({
    ...raw,
    goal: mirrorPoint(raw.goal),
    gates: raw.gates.map(mirrorPoint),
    blocks: raw.blocks.map(mirrorPoint),
    mustPass: raw.mustPass.map(mirrorPoint),
    mustCross: raw.mustCross.map(mirrorPoint),
    falseGoals: raw.falseGoals.map(mirrorPoint),
    geese: raw.geese.map(mirrorPoint),
    filters: raw.filters.map(mirrorPoint),
    flippingFilters: raw.flippingFilters.map(mirrorPoint),
    portals: raw.portals.map(portal => ({
        ...portal,
        x1: 6 - portal.x1,
        x2: 6 - portal.x2,
    })),
    landmarks: raw.landmarks.map(mirrorPoint),
});

const metamorphicRaw = {
    ...rawLevel('M', { x: 1, y: 5 }),
    mustPass: [{ x: 2, y: 5 }],
    mustCross: [{ x: 5, y: 2 }],
    flippingFilters: [{ x: 4, y: 1, axis: 1 }],
    portals: [{ x1: 2, y1: 2, x2: 4, y2: 3, color: '#123456' }],
};
const Solver = createSolver();
const originalStructure = describeStaticOrientationStructure(
    Solver.prepareLevelForSolver(metamorphicRaw, { source: 'raw' }),
);
const mirroredStructure = describeStaticOrientationStructure(
    Solver.prepareLevelForSolver(mirrorRawHorizontal(metamorphicRaw), { source: 'raw' }),
);
assert.equal(mirroredStructure.gateGoalDxMean, -originalStructure.gateGoalDxMean);
assert.equal(mirroredStructure.gateGoalDyMean, originalStructure.gateGoalDyMean);
assert.equal(mirroredStructure.gateGoalCenterSideBalance, -originalStructure.gateGoalCenterSideBalance);
for (const key of ['blocks', 'mustPass', 'mustCross', 'portalTerminals', 'flippers', 'constrained']) {
    assert.equal(mirroredStructure[key].sideBalance, -originalStructure[key].sideBalance, key);
    assert.equal(mirroredStructure[key].signedMoment, -originalStructure[key].signedMoment, key);
    assert.equal(mirroredStructure[key].absoluteMoment, originalStructure[key].absoluteMoment, key);
}

assert.throws(
    () => analyzeResponseGuidedOrientationContrasts({
        frozenContrasts,
        pairs: [['left', 'right']],
        levels: [rawLevel('A', null), rawLevel('A', null)],
    }),
    /duplicate raw level id/u,
);

console.log('response-guided orientation contrast tests passed');
