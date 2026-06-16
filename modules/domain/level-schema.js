/**
 * @fileoverview JSDoc typedefs and runtime validators for raw and normalized level shapes.
 *
 * "Raw" = the wire format stored in data/levels.json and Firestore (1-indexed coords, plain arrays).
 * "Normalized" = the internal representation after parseRawLevel (0-indexed, packed keys, Sets/Maps).
 */

// ─── Raw level typedefs ──────────────────────────────────────────────────────

/**
 * @typedef {{ x: number, y: number }} RawCoord
 * 1-indexed grid coordinate.
 */

/**
 * @typedef {{ x1: number, y1: number, x2: number, y2: number, color?: string }} RawPortal
 * 1-indexed portal endpoint pair.
 */

/**
 * @typedef {{ x: number, y: number, axis: 1|2 }} RawFilter
 * axis=1 → horizontal-only, axis=2 → vertical-only.
 */

/**
 * Named thematic object placed on the grid with a specific mechanical role.
 * The same objectType (e.g. 'park') can play different roles in different levels.
 *
 * Passable roles  (path may enter the cell): mustPass, mustTurn, mustTurnLeft, mustTurnRight
 * Impassable roles (cell is blocked):        surround, adjacentTurn, adjacentTurnLeft,
 *                                             adjacentTurnRight, decorative
 *
 * Turn-direction field:
 *   mustTurn / adjacentTurn   →  'turn' is required ('either'|'left'|'right')
 *   mustTurnLeft / Right      →  direction encoded in role name; 'turn' ignored
 *   adjacentTurnLeft / Right  →  same
 *
 * @typedef {{
 *   x:          number,
 *   y:          number,
 *   objectType: string,
 *   role:       'surround'|'mustPass'|'mustTurn'|'mustTurnLeft'|'mustTurnRight'|
 *               'adjacentTurn'|'adjacentTurnLeft'|'adjacentTurnRight'|'decorative',
 *   turn?:      'either'|'left'|'right',
 * }} RawLandmark
 */

/**
 * @typedef {{
 *   grid:           { w: number, h: number },
 *   gates:          RawCoord[],
 *   goal:           RawCoord,
 *   reqLen:         number,
 *   reqInt:         number,
 *   blocks?:        RawCoord[],
 *   geese?:         RawCoord[],
 *   falseGoals?:    RawCoord[],
 *   mustPass?:      RawCoord[],
 *   mustCross?:     RawCoord[],
 *   landmarks?:     RawLandmark[],
 *   filters?:       RawFilter[],
 *   flippingFilters?: RawFilter[],
 *   portals?:       RawPortal[],
 *   hints?:         number[][],
 *   designerName?:  string,
 *   description?:   string,
 *   difficulty?:    number|null,
 * }} RawLevel
 */

// ─── Normalized level typedefs ────────────────────────────────────────────────

/**
 * @typedef {{
 *   id:                number|null,
 *   grid:              { w: number, h: number },
 *   reqLen:            number,
 *   reqInt:            number,
 *   goalKey:           number,
 *   gateKeys:          number[],
 *   blockSet:          Set<number>,
 *   gooseSet:          Set<number>,
 *   falseGoalKeys:     Set<number>,
 *   mustPassKeys:      number[],
 *   mustCrossKeys:     number[],
 *   surroundKeys:      number[],
 *   adjacentTurnKeys:  number[],
 *   adjacentTurnDirs:  Array<'either'|'left'|'right'>,
 *   mustPassTurnDirs:  Map<number, 'either'|'left'|'right'>,
 *   landmarkMeta:      Map<number, { objectType: string, role: string }>,
 *   portalMap:         Map<number, { dest: number }>,
 *   portalVisuals:     Array<{ k1: number, k2: number, color?: string }>,
 *   filterMap:         Map<number, 1|2>,
 *   flippingFilterMap: Map<number, 1|2>,
 *   hasParityBreaker:  boolean,
 *   hints:             number[][],
 *   designerName:      string,
 *   description:       string,
 *   difficulty:        number|null,
 * }} NormalizedLevel
 */

// ─── Raw level validation ─────────────────────────────────────────────────────

const isPositiveInt = (v) => Number.isInteger(v) && v > 0;
const isNonNegInt = (v) => Number.isInteger(v) && v >= 0;
const isCoord = (v) => v && typeof v === 'object' && isPositiveInt(v.x) && isPositiveInt(v.y);
const isInBounds = (coord, w, h) => coord.x >= 1 && coord.x <= w && coord.y >= 1 && coord.y <= h;

/**
 * Validates a raw level in wire format (1-indexed coordinates, plain arrays/objects).
 * Does not parse or normalize the level; use `parseRawLevel` for that.
 *
 * @param {unknown} raw
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateRawLevel(raw) {
    const errors = [];

    if (!raw || typeof raw !== 'object') {
        return { ok: false, errors: ['Level must be a non-null object'] };
    }

    // Grid
    if (!raw.grid || typeof raw.grid !== 'object') {
        errors.push('Missing grid object');
    } else {
        if (!isPositiveInt(raw.grid.w)) errors.push('grid.w must be a positive integer');
        if (!isPositiveInt(raw.grid.h)) errors.push('grid.h must be a positive integer');
    }

    const w = raw.grid?.w;
    const h = raw.grid?.h;
    const hasGrid = isPositiveInt(w) && isPositiveInt(h);

    // Goal
    if (!isCoord(raw.goal)) {
        errors.push('goal must be an object with positive integer x and y');
    } else if (hasGrid && !isInBounds(raw.goal, w, h)) {
        errors.push(`goal (${raw.goal.x},${raw.goal.y}) is out of grid bounds (${w}×${h})`);
    }

    // Gates
    if (!Array.isArray(raw.gates) || raw.gates.length === 0) {
        errors.push('gates must be a non-empty array');
    } else {
        raw.gates.forEach((g, i) => {
            if (!isCoord(g)) { errors.push(`gates[${i}] must have positive integer x and y`); return; }
            if (hasGrid && !isInBounds(g, w, h)) errors.push(`gates[${i}] (${g.x},${g.y}) out of bounds`);
        });
    }

    // Required numeric fields
    if (!isPositiveInt(raw.reqLen)) errors.push('reqLen must be a positive integer');
    if (!isNonNegInt(raw.reqInt)) errors.push('reqInt must be a non-negative integer');

    // Optional coord arrays
    const coordArrayFields = ['blocks', 'geese', 'falseGoals', 'mustPass', 'mustCross'];
    for (const field of coordArrayFields) {
        if (raw[field] === undefined || raw[field] === null) continue;
        if (!Array.isArray(raw[field])) { errors.push(`${field} must be an array`); continue; }
        raw[field].forEach((item, i) => {
            if (!isCoord(item)) { errors.push(`${field}[${i}] must have positive integer x and y`); return; }
            if (hasGrid && !isInBounds(item, w, h)) errors.push(`${field}[${i}] (${item.x},${item.y}) out of bounds`);
        });
    }

    // Filters / flipping filters
    for (const field of ['filters', 'flippingFilters']) {
        if (raw[field] === undefined || raw[field] === null) continue;
        if (!Array.isArray(raw[field])) { errors.push(`${field} must be an array`); continue; }
        raw[field].forEach((f, i) => {
            if (!isCoord(f)) { errors.push(`${field}[${i}] must have positive integer x and y`); return; }
            if (f.axis !== 1 && f.axis !== 2) errors.push(`${field}[${i}].axis must be 1 (H) or 2 (V)`);
            if (hasGrid && !isInBounds(f, w, h)) errors.push(`${field}[${i}] (${f.x},${f.y}) out of bounds`);
        });
    }

    // Portals
    if (raw.portals !== undefined && raw.portals !== null) {
        if (!Array.isArray(raw.portals)) {
            errors.push('portals must be an array');
        } else {
            raw.portals.forEach((p, i) => {
                if (!p || typeof p !== 'object') { errors.push(`portals[${i}] must be an object`); return; }
                if (!isPositiveInt(p.x1) || !isPositiveInt(p.y1)) errors.push(`portals[${i}] must have positive integer x1 and y1`);
                if (!isPositiveInt(p.x2) || !isPositiveInt(p.y2)) errors.push(`portals[${i}] must have positive integer x2 and y2`);
                if (hasGrid) {
                    if (isPositiveInt(p.x1) && isPositiveInt(p.y1) && !isInBounds({ x: p.x1, y: p.y1 }, w, h))
                        errors.push(`portals[${i}] endpoint 1 (${p.x1},${p.y1}) out of bounds`);
                    if (isPositiveInt(p.x2) && isPositiveInt(p.y2) && !isInBounds({ x: p.x2, y: p.y2 }, w, h))
                        errors.push(`portals[${i}] endpoint 2 (${p.x2},${p.y2}) out of bounds`);
                }
            });
        }
    }

    // Landmarks
    const _validRoles = new Set([
        'surround', 'mustPass', 'mustTurn', 'mustTurnLeft', 'mustTurnRight',
        'adjacentTurn', 'adjacentTurnLeft', 'adjacentTurnRight', 'decorative',
    ]);
    const _validTurnDirs = new Set(['either', 'left', 'right']);
    if (raw.landmarks !== undefined && raw.landmarks !== null) {
        if (!Array.isArray(raw.landmarks)) {
            errors.push('landmarks must be an array');
        } else {
            raw.landmarks.forEach((lm, i) => {
                if (!lm || typeof lm !== 'object') { errors.push(`landmarks[${i}] must be an object`); return; }
                if (!isCoord(lm)) { errors.push(`landmarks[${i}] must have positive integer x and y`); return; }
                if (hasGrid && !isInBounds(lm, w, h)) errors.push(`landmarks[${i}] (${lm.x},${lm.y}) out of bounds`);
                if (typeof lm.objectType !== 'string') errors.push(`landmarks[${i}].objectType must be a string`);
                if (!_validRoles.has(lm.role)) errors.push(`landmarks[${i}].role "${lm.role}" is not a valid role`);
                if (lm.turn !== undefined && !_validTurnDirs.has(lm.turn)) errors.push(`landmarks[${i}].turn must be 'either', 'left', or 'right'`);
            });
        }
    }

    // Optional scalar metadata (non-fatal format checks)
    if (raw.hints !== undefined && raw.hints !== null && !Array.isArray(raw.hints)) {
        errors.push('hints must be an array');
    }
    if (raw.designerName !== undefined && typeof raw.designerName !== 'string') {
        errors.push('designerName must be a string');
    }
    if (raw.description !== undefined && typeof raw.description !== 'string') {
        errors.push('description must be a string');
    }

    return { ok: errors.length === 0, errors };
}
