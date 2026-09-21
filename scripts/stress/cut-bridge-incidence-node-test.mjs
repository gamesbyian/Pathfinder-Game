import assert from 'node:assert/strict';

import { PACK } from '../../modules/solver/encoding.js';
import { analyzeBridgeExcursionIncidence } from './cut-bridge-incidence.mjs';

const bridgeLevel = {
    id: 'B1',
    grid: { w: 5, h: 3 },
    gates: [{ x: 1, y: 1 }],
    goal: { x: 1, y: 3 },
    reqLen: 6,
    reqInt: 0,
    blocks: [{ x: 3, y: 1 }, { x: 3, y: 3 }],
    mustPass: [{ x: 4, y: 2 }],
    mustCross: [],
    falseGoals: [],
    geese: [],
    filters: [],
    flippingFilters: [],
    portals: [],
    landmarks: [],
};

const population = {
    question: 'WS2-CUT-BALANCE-PROJECTION',
    evidenceRole: 'development',
    independenceUnit: 'parent-level',
    rows: [{
        levelId: 'B1',
        parentId: 'B1',
        independentUnit: 'B1',
        frontierIndex: 0,
        depth: 0,
        prefix: [PACK(0, 0)],
    }],
};

const result = analyzeBridgeExcursionIncidence({ population, levels: [bridgeLevel] });
assert.equal(result.summary.sampledRows, 1);
assert.equal(result.summary.connectivityPassingRows, 1);
assert.equal(result.summary.conflictRows, 1);
assert.equal(result.summary.conflictParents, 1);
assert.equal(result.rows[0].ordinaryConnectivityPass, true);
assert.ok(result.rows[0].bridgeCount >= 1);
assert.ok(result.rows[0].conflictCount >= 1);
assert.ok(result.rows[0].conflicts.every(conflict =>
    conflict.farPendingIds.includes(String(PACK(3, 1))),
), 'every qualifying bridge conflict must strand the pending must-pass on the far side');

const noObligation = {
    ...bridgeLevel,
    id: 'B2',
    mustPass: [],
};
const clean = analyzeBridgeExcursionIncidence({
    population: {
        ...population,
        rows: [{ ...population.rows[0], levelId: 'B2', parentId: 'B2', independentUnit: 'B2' }],
    },
    levels: [noObligation],
});
assert.equal(clean.summary.connectivityPassingRows, 1);
assert.equal(clean.summary.conflictRows, 0);
assert.equal(clean.summary.conflictParents, 0);

assert.throws(
    () => analyzeBridgeExcursionIncidence({ population, levels: [] }),
    /missing raw level/u,
);

console.log('cut bridge incidence tests passed');
