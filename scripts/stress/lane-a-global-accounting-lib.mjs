import { unpackPackedCell } from './cpsat-explicit-prefix-reference-lib.mjs';

const REGIONS = ['gate', 'cut', 'remainder', 'other'];
const OBLIGATIONS = ['mustPass', 'mustCross', 'mustTurn', 'surround', 'adjacentTurn'];

function rawCoordinate(value) {
    const coordinate = Number.isInteger(value) ? unpackPackedCell(value) : value;
    if (!Array.isArray(coordinate) || coordinate.length !== 2 ||
        !coordinate.every(Number.isInteger) || coordinate.some(n => n < 1)) {
        throw new Error(`invalid Lane-A C2 coordinate: ${JSON.stringify(value)}`);
    }
    return [coordinate[0], coordinate[1]];
}

const coordKey = value => JSON.stringify(rawCoordinate(value));

function interfaceRegions(interfaceGeometry) {
    if (!interfaceGeometry || typeof interfaceGeometry !== 'object') {
        throw new Error('Lane-A C2 interfaceGeometry is required');
    }
    return {
        gate: new Set((interfaceGeometry.gateSideCells ?? []).map(coordKey)),
        cut: new Set((interfaceGeometry.cutCells ?? []).map(coordKey)),
        remainder: new Set((interfaceGeometry.remainderSideCells ?? []).map(coordKey)),
    };
}

function regionForKey(key, regions) {
    const id = coordKey(key);
    if (regions.gate.has(id)) return 'gate';
    if (regions.cut.has(id)) return 'cut';
    if (regions.remainder.has(id)) return 'remainder';
    return 'other';
}

function emptyRegionCounts() {
    return Object.fromEntries(REGIONS.map(region => [
        region,
        Object.fromEntries(OBLIGATIONS.map(kind => [kind, 0])),
    ]));
}

function addPending(keys, mask, kind, regions, counts) {
    for (let i = 0; i < keys.length; i++) {
        if ((mask & (1 << i)) === 0) continue;
        counts[regionForKey(keys[i], regions)][kind] += 1;
    }
}

export function laneAGlobalAccounting({ state, level, prep, interfaceGeometry }) {
    if (!state || !level || !prep) throw new Error('Lane-A C2 replayed state, level and prep are required');
    const regions = interfaceRegions(interfaceGeometry);
    const countedLengthUsed = state.path.length - 1 - state.portalJumps;
    const countedLengthRemaining = level.requiredLength - countedLengthUsed;
    const intersectionsUsed = state.ints;
    const intersectionsRemaining = level.requiredIntersections - intersectionsUsed;

    if (countedLengthUsed < 0 || countedLengthRemaining < 0 ||
        intersectionsUsed < 0 || intersectionsRemaining < 0) {
        throw new Error(`Lane-A C2 negative accounting resource: ${JSON.stringify({
            countedLengthUsed, countedLengthRemaining, intersectionsUsed, intersectionsRemaining,
        })}`);
    }

    const pendingByRegion = emptyRegionCounts();

    // mustMask is intentionally not authoritative on dense levels. mpVisitedMask is.
    const pendingMustPassMask = level.mustPassKeys.reduce(
        (mask, _key, i) => (state.mpVisitedMask & (1 << i)) === 0 ? (mask | (1 << i)) : mask,
        0,
    );
    addPending(level.mustPassKeys, pendingMustPassMask, 'mustPass', regions, pendingByRegion);
    addPending(level.mustCrossKeys, state.mustCrossMask, 'mustCross', regions, pendingByRegion);
    addPending(prep.mustTurnKeys ?? [], state.mustTurnMask ?? 0, 'mustTurn', regions, pendingByRegion);
    addPending(level.surroundKeys ?? [], state.surroundMask ?? 0, 'surround', regions, pendingByRegion);
    addPending(level.adjacentTurnKeys ?? [], state.adjTurnMask ?? 0, 'adjacentTurn', regions, pendingByRegion);

    const pendingTotals = Object.fromEntries(OBLIGATIONS.map(kind => [
        kind,
        REGIONS.reduce((sum, region) => sum + pendingByRegion[region][kind], 0),
    ]));

    return {
        schemaVersion: 1,
        countedLengthUsed,
        countedLengthRemaining,
        intersectionsUsed,
        intersectionsRemaining,
        pendingByRegion,
        pendingTotals,
    };
}

export function laneAGlobalAccountingSignature(input) {
    return JSON.stringify(laneAGlobalAccounting(input));
}
