import assert from 'node:assert/strict';

import {
    laneABoundaryKinematics,
    laneABoundaryKinematicsSignature,
} from './lane-a-boundary-kinematics-lib.mjs';

const pack = (x, y) => (((y - 1) << 16) | (x - 1)) >>> 0;

const adjacentPortalLevel = {
    portals: [{ x1: 2, y1: 2, x2: 3, y2: 2 }],
};
const cutCells = [pack(2, 2), pack(3, 2)];
const prefix = [[1, 1], [1, 2], [2, 2], [3, 2], [3, 3]];

const observed = laneABoundaryKinematics({
    levelId: 'fixture',
    cutCells,
    prefix,
    level: adjacentPortalLevel,
});
assert.deepEqual(observed.boundary, [
    {
        cell: [2, 2],
        used: true,
        visits: [{ entry: 'E', exit: 'portal' }],
        portalIncident: true,
    },
    {
        cell: [3, 2],
        used: true,
        visits: [{ entry: 'portal', exit: 'S' }],
        portalIncident: true,
    },
], 'adjacent portal terminals must be classified from the level portal map, not Manhattan geometry');
assert.equal(observed.boundaryVisitCount, 2);

const sameBoundaryDifferentHistory = laneABoundaryKinematicsSignature({
    levelId: 'fixture',
    cutCells,
    prefix: [[2, 1], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3]],
    level: adjacentPortalLevel,
});
assert.equal(
    laneABoundaryKinematicsSignature({ levelId: 'fixture', cutCells, prefix, level: adjacentPortalLevel }),
    sameBoundaryDifferentHistory,
    'C1 must retain bounded local boundary state rather than encode irrelevant earlier prefix history',
);

const changedHeading = laneABoundaryKinematicsSignature({
    levelId: 'fixture',
    cutCells,
    prefix: [[2, 1], [2, 2], [3, 2], [3, 3]],
    level: adjacentPortalLevel,
});
assert.notEqual(
    laneABoundaryKinematicsSignature({ levelId: 'fixture', cutCells, prefix, level: adjacentPortalLevel }),
    changedHeading,
    'C1 must distinguish a changed incoming boundary heading',
);

const noPortalLevel = { portals: [] };
assert.throws(() => laneABoundaryKinematics({
    levelId: 'fixture',
    cutCells: [pack(2, 2)],
    prefix: [[1, 1], [2, 2]],
    level: noPortalLevel,
}), /non-cardinal non-portal transition/u);

console.log('Lane A boundary-kinematics tests passed');
