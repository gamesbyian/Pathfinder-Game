import { unpackPackedCell } from './cpsat-explicit-prefix-reference-lib.mjs';

function rawCoordinate(value) {
    const coordinate = Number.isInteger(value) ? unpackPackedCell(value) : value;
    if (!Array.isArray(coordinate) || coordinate.length !== 2 ||
        !coordinate.every(Number.isInteger) || coordinate.some(n => n < 1)) {
        throw new Error(`invalid Lane-A coordinate: ${JSON.stringify(value)}`);
    }
    return [coordinate[0], coordinate[1]];
}

const coordKey = value => JSON.stringify(rawCoordinate(value));
const compareCoord = (a, b) => a[1] - b[1] || a[0] - b[0];
const stableJson = value => JSON.stringify(value);

function portalPairs(level) {
    return (level?.portals ?? []).map((portal, index) => {
        const a = rawCoordinate([Number(portal.x1), Number(portal.y1)]);
        const b = rawCoordinate([Number(portal.x2), Number(portal.y2)]);
        const ordered = [a, b].sort(compareCoord);
        return { index, a, b, ordered };
    });
}

function portalTransitionMap(level) {
    const map = new Map();
    for (const pair of portalPairs(level)) {
        map.set(stableJson([pair.a, pair.b]), { ...pair, direction: 'a-to-b' });
        map.set(stableJson([pair.b, pair.a]), { ...pair, direction: 'b-to-a' });
    }
    return map;
}

function moveToken(fromValue, toValue, portalMap) {
    const from = rawCoordinate(fromValue);
    const to = rawCoordinate(toValue);
    if (portalMap.has(stableJson([from, to]))) return 'portal';
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    if (dx === 1 && dy === 0) return 'E';
    if (dx === -1 && dy === 0) return 'W';
    if (dx === 0 && dy === 1) return 'S';
    if (dx === 0 && dy === -1) return 'N';
    throw new Error(`Lane-A prefix contains non-cardinal non-portal transition ${JSON.stringify(from)} -> ${JSON.stringify(to)}`);
}

function interfaceSets(interfaceGeometry) {
    if (!interfaceGeometry || typeof interfaceGeometry !== 'object') {
        throw new Error('Lane-A C1 interfaceGeometry is required');
    }
    const cutCells = (interfaceGeometry.cutCells ?? []).map(rawCoordinate).sort(compareCoord);
    if (!cutCells.length) throw new Error('Lane-A C1 interfaceGeometry.cutCells must be non-empty');
    return {
        cutCells,
        cut: new Set(cutCells.map(coordKey)),
        gate: new Set((interfaceGeometry.gateSideCells ?? []).map(coordKey)),
        remainder: new Set((interfaceGeometry.remainderSideCells ?? []).map(coordKey)),
    };
}

function cellRegion(value, sets) {
    const key = coordKey(value);
    if (sets.cut.has(key)) return 'cut';
    if (sets.gate.has(key)) return 'gate';
    if (sets.remainder.has(key)) return 'remainder';
    return 'other';
}

function compareVisit(a, b) {
    return a.entry.localeCompare(b.entry)
        || a.exit.localeCompare(b.exit)
        || a.entryRegion.localeCompare(b.entryRegion)
        || a.exitRegion.localeCompare(b.exitRegion);
}

function compareEvent(a, b) {
    return stableJson(a).localeCompare(stableJson(b));
}

function crossingEvents(prefix, sets, portalMap) {
    const events = [];
    let lastSide = null;
    let lastSideIndex = -1;

    for (let i = 0; i < prefix.length; i++) {
        const region = cellRegion(prefix[i], sets);
        if (region !== 'gate' && region !== 'remainder') continue;
        if (lastSide && region !== lastSide) {
            const interior = prefix.slice(lastSideIndex + 1, i);
            const interiorRegions = interior.map(cell => cellRegion(cell, sets));
            if (interiorRegions.some(value => value !== 'cut')) {
                throw new Error(`Lane-A interface transition crosses an unclassified interior waypoint: ${stableJson(interiorRegions)}`);
            }
            const segment = prefix.slice(lastSideIndex, i + 1);
            const moves = segment.slice(1).map((cell, index) => moveToken(segment[index], cell, portalMap));
            const viaCutCells = interior.map(rawCoordinate);
            events.push({
                fromSide: lastSide,
                toSide: region,
                viaCutCells,
                moves,
                incoming: lastSideIndex > 0 ? moveToken(prefix[lastSideIndex - 1], prefix[lastSideIndex], portalMap) : 'start',
                outgoing: i + 1 < prefix.length ? moveToken(prefix[i], prefix[i + 1], portalMap) : 'end',
                portalIncident: moves.includes('portal'),
            });
        }
        lastSide = region;
        lastSideIndex = i;
    }

    return events.sort(compareEvent);
}

function cutIncidence(prefix, sets, portalMap) {
    const visitsByCell = new Map(sets.cutCells.map(cell => [coordKey(cell), []]));
    for (let i = 0; i < prefix.length; i++) {
        const cell = prefix[i];
        const key = coordKey(cell);
        if (!sets.cut.has(key)) continue;
        const entry = i === 0 ? 'start' : moveToken(prefix[i - 1], cell, portalMap);
        const exit = i === prefix.length - 1 ? 'end' : moveToken(cell, prefix[i + 1], portalMap);
        visitsByCell.get(key).push({
            entry,
            exit,
            entryRegion: i === 0 ? 'start' : cellRegion(prefix[i - 1], sets),
            exitRegion: i === prefix.length - 1 ? 'end' : cellRegion(prefix[i + 1], sets),
        });
    }
    return sets.cutCells.map(cell => {
        const visits = visitsByCell.get(coordKey(cell)).sort(compareVisit);
        return {
            cell,
            used: visits.length > 0,
            visits,
        };
    });
}

function crossingPortalState(prefix, sets, level, portalMap) {
    const used = new Map();
    for (let i = 1; i < prefix.length; i++) {
        const transition = portalMap.get(stableJson([prefix[i - 1], prefix[i]]));
        if (!transition) continue;
        const pairKey = stableJson(transition.ordered);
        const from = rawCoordinate(prefix[i - 1]);
        const state = coordKey(from) === coordKey(transition.ordered[0]) ? 'first-to-second' : 'second-to-first';
        used.set(pairKey, state);
    }

    return portalPairs(level)
        .map(pair => {
            const aRegion = cellRegion(pair.a, sets);
            const bRegion = cellRegion(pair.b, sets);
            if (aRegion === bRegion || aRegion === 'other' || bRegion === 'other') return null;
            const pairKey = stableJson(pair.ordered);
            return {
                pair: pair.ordered,
                regions: [cellRegion(pair.ordered[0], sets), cellRegion(pair.ordered[1], sets)],
                state: used.get(pairKey) ?? 'unused',
            };
        })
        .filter(Boolean)
        .sort((a, b) => stableJson(a.pair).localeCompare(stableJson(b.pair)));
}

export function laneABoundaryKinematics({ levelId, interfaceGeometry, prefix, level }) {
    if (!levelId) throw new Error('Lane-A C1 levelId is required');
    if (!Array.isArray(prefix) || prefix.length === 0) throw new Error('Lane-A C1 prefix must be non-empty');
    const normalizedPrefix = prefix.map(rawCoordinate);
    const sets = interfaceSets(interfaceGeometry);
    const portalMap = portalTransitionMap(level);
    const endpointSide = cellRegion(normalizedPrefix[normalizedPrefix.length - 1], sets);
    if (!['gate', 'remainder', 'cut'].includes(endpointSide)) {
        throw new Error(`Lane-A prefix endpoint is outside interface partition: ${endpointSide}`);
    }
    const events = crossingEvents(normalizedPrefix, sets, portalMap);
    const incidence = cutIncidence(normalizedPrefix, sets, portalMap);
    const cutVisitCount = incidence.reduce((sum, cell) => sum + cell.visits.length, 0);
    if (!events.length && cutVisitCount === 0) {
        throw new Error('Lane-A C1 frozen case has neither a side-transition event nor cut-cell incidence');
    }

    return {
        schemaVersion: 2,
        levelId: String(levelId),
        cutCells: sets.cutCells,
        endpointSide,
        cutIncidence: incidence,
        crossingEvents: events,
        crossingPortalState: crossingPortalState(normalizedPrefix, sets, level, portalMap),
    };
}

export function laneABoundaryKinematicsSignature(input) {
    return JSON.stringify(laneABoundaryKinematics(input));
}
