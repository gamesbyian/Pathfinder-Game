// @ts-check
// Pure level serialization for the Pathfinder editor.
// Converts a normalized level object to the compact JSON-like string (wire format).

import { UNPACK }    from '../domain/cell-key.js';
import { expCoords } from '../domain/portal-utils.js';

/**
 * Serializes a normalized level to the wire format used in data/levels.json.
 * `reqLen`, `reqInt`, and `exportedHints` are passed explicitly (read from UI by the caller).
 * Returns a JSON-like string with no outer braces and no whitespace.
 * @param {any} level @param {number} reqLen @param {number} reqInt @param {any} exportedHints
 * @returns {string}
 */
export function serializeLevel(level, reqLen, reqInt, exportedHints) {
    const out = {
        grid:            level.grid,
        gates:           expCoords(level.gateKeys),
        goal:            { x: UNPACK(level.goalKey).x + 1, y: UNPACK(level.goalKey).y + 1 },
        falseGoals:      expCoords(level.falseGoalKeys),
        reqLen,
        reqInt,
        designerName:    level.designerName  || '',
        description:     level.description   || '',
        difficulty:      level.difficulty    ?? null,
        blocks:          expCoords(level.blockSet),
        mustPass:        expCoords(level.mustPassKeys),
        mustCross:       expCoords(level.mustCrossKeys),
        filters:         Array.from(level.filterMap.entries())
                             .map((/** @type {[number, any]} */ [k, axis]) => ({ x: UNPACK(k).x + 1, y: UNPACK(k).y + 1, axis })),
        flippingFilters: Array.from(level.flippingFilterMap.entries())
                             .map((/** @type {[number, any]} */ [k, axis]) => ({ x: UNPACK(k).x + 1, y: UNPACK(k).y + 1, axis })),
        portals:         level.portalVisuals.map((/** @type {any} */ pv) => ({
                             x1: UNPACK(pv.k1).x + 1, y1: UNPACK(pv.k1).y + 1,
                             x2: UNPACK(pv.k2).x + 1, y2: UNPACK(pv.k2).y + 1 })),
        geese:           expCoords(level.gooseSet),
        hints:           exportedHints,
    };
    return JSON.stringify(out).replace(/\"([^\"]+)\":/g, '$1:').replace(/\s/g, '').slice(1, -1);
}
