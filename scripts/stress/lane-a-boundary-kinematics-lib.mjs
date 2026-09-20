import { unpackPackedCell } from './cpsat-explicit-prefix-reference-lib.mjs';

function rawCoordinate(value) {
    const coordinate = Number.isInteger(value) ? unpackPackedCell(value) : value;
    if (!Array.isArray(coordinate) || coordinate.length !== 2 ||
        !coordinate.every(Number.isInteger) || coordinate.some(n => n < 1)) {
        throw new Error(`invalid Lane-A coordinate: ${JSON.stringify(value)}`);
    }
    return [coordinate[0], coordinate[1]];
}

const coordKey = coordinate => JSON.stringify(rawCoordinate(coordinate));
const compareCoord = (a, b) => a[1] - b[1] || a[0] - b[0];

function portalTransitions(level) {
    const transitions = new Set();
    for (const portal of level?.portals ?? []) {
        const a = rawCoordinate([Number(portal.x1), Number(portal.y1)]);
        const b = rawCoordinate([Number(portal.x2), Number(portal.y2)]);
        transitions.add(JSON.stringify([a, b]));
        transitions.add(JSON.stringify([b, a]));
    }
    return transitions;
}

function transitionToken(fromValue, toValue, portals) {
    const from = rawCoordinate(fromValue);
    const to = rawCoordinate(toValue);
    if (portals.has(JSON.stringify([from, to]))) return 'portal';
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    if (dx === 1 && dy === 0) return 'E';
    if (dx === -1 && dy === 0) return 'W';
    if (dx === 0 && dy === 1) return 'S';
    if (dx === 0 && dy === -1) return 'N';
    throw new Error(`Lane-A prefix contains non-cardinal non-portal transition ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
}

export function laneABoundaryKinematics({ levelId, cutCells, prefix, level }) {
    if (!levelId) throw new Error('Lane-A C1 levelId is required');
    if (!Array.isArray(cutCells) || cutCells.length === 0) throw new Error('Lane-A C1 cutCells must be non-empty');
    if (!Array.isArray(prefix) || prefix.length === 0) throw new Error('Lane-A C1 prefix must be non-empty');
    const normalizedPrefix = prefix.map(rawCoordinate);
    const normalizedCutCells = cutCells.map(rawCoordinate).sort(compareCoord);
    const portals = portalTransitions(level);
    const cutKeys = new Set(normalizedCutCells.map(coordKey));
    const byCell = new Map(normalizedCutCells.map(cell => [coordKey(cell), { cell, visits: [] }]));

    for (let i = 0; i < normalizedPrefix.length; i++) {
        const cell = normalizedPrefix[i];
        const key = coordKey(cell);
        if (!cutKeys.has(key)) continue;
        const entry = i === 0 ? 'start' : transitionToken(normalizedPrefix[i - 1], cell, portals);
        const exit = i === normalizedPrefix.length - 1 ? 'end' : transitionToken(cell, normalizedPrefix[i + 1], portals);
        byCell.get(key).visits.push({ entry, exit });
    }

    const boundary = normalizedCutCells.map(cell => {
        const row = byCell.get(coordKey(cell));
        const visits = [...row.visits].sort((a, b) =>
            a.entry.localeCompare(b.entry) || a.exit.localeCompare(b.exit));
        return {
            cell,
            used: visits.length > 0,
            visits,
            portalIncident: visits.some(visit => visit.entry === 'portal' || visit.exit === 'portal'),
        };
    });

    return {
        schemaVersion: 1,
        levelId: String(levelId),
        cutCells: normalizedCutCells,
        boundary,
        boundaryVisitCount: boundary.reduce((sum, row) => sum + row.visits.length, 0),
    };
}

export function laneABoundaryKinematicsSignature(input) {
    const { boundaryVisitCount: _boundaryVisitCount, ...semantic } = laneABoundaryKinematics(input);
    return JSON.stringify(semantic);
}
