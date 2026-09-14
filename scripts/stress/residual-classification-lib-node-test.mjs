#!/usr/bin/env node
import assert from 'node:assert/strict';

import {
    RESIDUAL_CLASSIFICATION_SCHEMA_VERSION,
    classifyKnownRescuer,
    classifyResidualLevel,
} from './residual-classification-lib.mjs';

assert.equal(RESIDUAL_CLASSIFICATION_SCHEMA_VERSION, 2);

const beamWin = { identity: 'beam|score=intersectionHarvest|bias=none|width=5000|retention=mechanic-buckets' };
const beamDispatched = classifyKnownRescuer(beamWin, {
    offeredLadder: new Set([beamWin.identity]),
    dispatchedIdentities: new Set([beamWin.identity]),
});
assert.equal(beamDispatched.class, 3);
assert.equal(beamDispatched.observability, 'dispatched-dose-unverified');

const repairWin = { identity: 'repair|score=repair|guidance=must-turn-biased' };
const repairDispatched = classifyKnownRescuer(repairWin, {
    dispatchedIdentities: new Set([repairWin.identity]),
    reachedSet: new Set(['late-repair-search']),
});
assert.equal(repairDispatched.class, 3);
assert.equal(repairDispatched.observability,
    'exact-dispatched-family-not-starved-dose-unverified');

const repairUndispatched = classifyKnownRescuer(repairWin, {
    reachedSet: new Set(['late-repair-search']),
});
assert.equal(repairUndispatched.class, 2);
assert.equal(repairUndispatched.observability, 'family-reached-exact-undispatched');

const repairStarved = classifyKnownRescuer(repairWin, {
    dispatchedIdentities: new Set([repairWin.identity]),
    reachedSet: new Set(['late-repair-search']),
    starvedSet: new Set(['late-repair-search']),
});
assert.equal(repairStarved.class, 2);
assert.equal(repairStarved.observability, 'family-reached-starved');

const level = classifyResidualLevel({
    t1Wins: [repairWin],
    dispatchedIdentities: new Set([repairWin.identity]),
    reachedSet: new Set(['late-repair-search']),
});
assert.equal(level.schemaVersion, 2);
assert.equal(level.primaryClass, 3);
assert.equal(level.t1Wins[0].observability,
    'exact-dispatched-family-not-starved-dose-unverified');

console.log('residual classification observability tests passed');
