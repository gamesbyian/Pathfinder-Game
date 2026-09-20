import assert from 'node:assert/strict';

import {
    laneABoundaryKinematics,
    laneABoundaryKinematicsSignature,
} from './lane-a-boundary-kinematics-lib.mjs';

const pack = (x, y) => (((y - 1) << 16) | (x - 1)) >>> 0;

const adjacentPortalLevel = {
    portals: [{ x1: 2, y1: 2, x2: 3, y2: 2 }],
};
const portalInterface = {
    cutCells: [pack(2, 3)],
    gateSideCells: [pack(1, 1), pack(1, 2), pack(2, 2)],
    remainderSideCells: [pack(3, 2), pack(3, 3)],
};
const portalPrefix = [[1, 1], [1, 2], [2, 2], [3, 2], [3, 3]];

const observed = laneABoundaryKinematics({
    levelId: 'fixture',
    interfaceGeometry: portalInterface,
    prefix: portalPrefix,
    level: adjacentPortalLevel,
});
assert.equal(observed.endpointSide, 'remainder');
assert.deepEqual(observed.crossingEvents, [{
    fromSide: 'gate',
    toSide: 'remainder',
    viaCutCells: [],
    moves: ['portal'],
    incoming: 'E',
    outgoing: 'S',
    portalIncident: true,
}], 'adjacent portal crossings must come from the level portal map, not Manhattan geometry');
assert.deepEqual(observed.crossingPortalState, [{
    pair: [[2, 2], [3, 2]],
    regions: ['gate', 'remainder'],
    state: 'first-to-second',
}]);
assert.equal(observed.cutIncidence[0].used, false);

const sameBoundaryDifferentHistory = laneABoundaryKinematicsSignature({
    levelId: 'fixture',
    interfaceGeometry: portalInterface,
    prefix: [[2, 1], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3]],
    level: adjacentPortalLevel,
});
assert.equal(
    laneABoundaryKinematicsSignature({
        levelId: 'fixture',
        interfaceGeometry: portalInterface,
        prefix: portalPrefix,
        level: adjacentPortalLevel,
    }),
    sameBoundaryDifferentHistory,
    'C1 must ignore unrelated earlier prefix history when boundary state/kinematics are unchanged',
);

const changedHeading = laneABoundaryKinematicsSignature({
    levelId: 'fixture',
    interfaceGeometry: portalInterface,
    prefix: [[2, 1], [2, 2], [3, 2], [3, 3]],
    level: adjacentPortalLevel,
});
assert.notEqual(
    laneABoundaryKinematicsSignature({
        levelId: 'fixture',
        interfaceGeometry: portalInterface,
        prefix: portalPrefix,
        level: adjacentPortalLevel,
    }),
    changedHeading,
    'C1 must distinguish changed incoming boundary heading',
);

const ordinaryLevel = { portals: [] };
const ordinaryInterface = {
    cutCells: [pack(2, 2)],
    gateSideCells: [pack(1, 2)],
    remainderSideCells: [pack(3, 2), pack(4, 2)],
};
const ordinary = laneABoundaryKinematics({
    levelId: 'ordinary',
    interfaceGeometry: ordinaryInterface,
    prefix: [[1, 2], [2, 2], [3, 2], [4, 2]],
    level: ordinaryLevel,
});
assert.deepEqual(ordinary.cutIncidence, [{
    cell: [2, 2],
    used: true,
    visits: [{ entry: 'E', exit: 'E', entryRegion: 'gate', exitRegion: 'remainder' }],
}]);
assert.deepEqual(ordinary.crossingEvents, [{
    fromSide: 'gate',
    toSide: 'remainder',
    viaCutCells: [[2, 2]],
    moves: ['E', 'E'],
    incoming: 'start',
    outgoing: 'E',
    portalIncident: false,
}]);

assert.throws(() => laneABoundaryKinematics({
    levelId: 'invalid',
    interfaceGeometry: ordinaryInterface,
    prefix: [[1, 2], [2, 3], [3, 2]],
    level: ordinaryLevel,
}), /non-cardinal non-portal transition/u);

console.log('Lane A boundary-kinematics tests passed');
