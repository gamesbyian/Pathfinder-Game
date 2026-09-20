import assert from 'node:assert/strict';

import { laneAGlobalAccounting, laneAGlobalAccountingSignature } from './lane-a-global-accounting-lib.mjs';

const pack = (x, y) => (((y - 1) << 16) | (x - 1)) >>> 0;
const gate = pack(1, 1);
const cut = pack(2, 1);
const remainder = pack(3, 1);
const other = pack(4, 2);

const interfaceGeometry = {
    gateSideCells: [gate],
    cutCells: [cut],
    remainderSideCells: [remainder],
};

const level = {
    requiredLength: 6,
    requiredIntersections: 2,
    mustPassKeys: [gate, remainder],
    mustCrossKeys: [cut],
    surroundKeys: [other],
    adjacentTurnKeys: [remainder],
};
const prep = { mustTurnKeys: [gate] };
const state = {
    path: [gate, cut, remainder],
    portalJumps: 0,
    ints: 1,
    // First must-pass visited, second pending. mustMask is deliberately bogus to prove it is ignored.
    mpVisitedMask: 0b01,
    mustMask: 0,
    mustCrossMask: 0b1,
    mustTurnMask: 0b1,
    surroundMask: 0b1,
    adjTurnMask: 0b1,
};

const observed = laneAGlobalAccounting({ state, level, prep, interfaceGeometry });
assert.equal(observed.countedLengthUsed, 2);
assert.equal(observed.countedLengthRemaining, 4);
assert.equal(observed.intersectionsUsed, 1);
assert.equal(observed.intersectionsRemaining, 1);
assert.deepEqual(observed.pendingTotals, {
    mustPass: 1,
    mustCross: 1,
    mustTurn: 1,
    surround: 1,
    adjacentTurn: 1,
});
assert.equal(observed.pendingByRegion.remainder.mustPass, 1);
assert.equal(observed.pendingByRegion.cut.mustCross, 1);
assert.equal(observed.pendingByRegion.gate.mustTurn, 1);
assert.equal(observed.pendingByRegion.other.surround, 1);
assert.equal(observed.pendingByRegion.remainder.adjacentTurn, 1);

const same = laneAGlobalAccountingSignature({ state, level, prep, interfaceGeometry });
const changed = laneAGlobalAccountingSignature({
    state: { ...state, ints: 0 },
    level,
    prep,
    interfaceGeometry,
});
assert.notEqual(same, changed, 'C2 must distinguish changed exact intersection accounting');

assert.throws(() => laneAGlobalAccounting({
    state: { ...state, path: [gate, cut, remainder, other, gate, cut, remainder, other], portalJumps: 0 },
    level,
    prep,
    interfaceGeometry,
}), /negative accounting resource/u);

console.log('Lane A global-accounting tests passed');
