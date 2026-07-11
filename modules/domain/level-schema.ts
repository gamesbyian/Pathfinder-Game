/**
 * @fileoverview Type contracts and runtime validators for raw and normalized level shapes.
 *
 * "Raw" = the wire format stored in data/levels.json and Firestore (1-indexed coords, plain arrays).
 * "Normalized" = the internal representation after parseRawLevel (0-indexed, packed keys, Sets/Maps).
 */

// ─── Raw level types ─────────────────────────────────────────────────────────

/** 1-indexed grid coordinate. */
export interface RawCoord { x: number; y: number; }

/** 1-indexed portal endpoint pair. */
export interface RawPortal { x1: number; y1: number; x2: number; y2: number; color?: string; }

/** axis=1 → horizontal-only, axis=2 → vertical-only. */
export interface RawFilter { x: number; y: number; axis: 1 | 2; }

export type LandmarkRole =
    'surround' | 'mustPass' | 'mustTurn' | 'mustTurnCw' | 'mustTurnCcw' |
    'adjacentTurn' | 'adjacentTurnCw' | 'adjacentTurnCcw' | 'decorative';
/** Turn direction relative to the level's default (unrotated, unmirrored) orientation. */
export type TurnDir = 'either' | 'cw' | 'ccw';

/**
 * Named thematic object placed on the grid with a specific mechanical role.
 * The same objectType (e.g. 'park') can play different roles in different levels.
 *
 * Passable roles  (path may enter the cell): mustPass, mustTurn, mustTurnCw, mustTurnCcw
 * Impassable roles (cell is blocked):        surround, adjacentTurn, adjacentTurnCw,
 *                                             adjacentTurnCcw, decorative
 *
 * Turn-direction field:
 *   mustTurn / adjacentTurn   →  'turn' is required ('either'|'cw'|'ccw')
 *   mustTurnCw / Ccw          →  direction encoded in role name; 'turn' ignored
 *   adjacentTurnCw / Ccw      →  same
 */
export interface RawLandmark {
    x: number;
    y: number;
    objectType: string;
    role: LandmarkRole;
    turn?: TurnDir;
}

export interface RawLevel {
    grid: { w: number; h: number };
    gates: RawCoord[];
    goal: RawCoord;
    reqLen: number;
    reqInt: number;
    blocks?: RawCoord[];
    geese?: RawCoord[];
    falseGoals?: RawCoord[];
    mustPass?: RawCoord[];
    mustCross?: RawCoord[];
    landmarks?: RawLandmark[];
    filters?: RawFilter[];
    flippingFilters?: RawFilter[];
    portals?: RawPortal[];
    hints?: number[][];
    designerName?: string;
    description?: string;
    difficulty?: number | null;
}

// ─── Engine level type ──────────────────────────────────────────────────────────
// The full engine-level shape: what parseRawLevel/parseRawLevelDetailed produce and what the
// engine/state layer consumes. Distinct from the solver-focused `NormalizedLevel` in types.ts,
// which is a looser subset (many fields optional) tailored to the search core. The two are
// deliberately separate views of "a level"; keeping the names distinct stops edits to one from
// silently diverging from the other.

export interface EngineLevel {
    id: number | null;
    grid: { w: number; h: number };
    reqLen: number;
    reqInt: number;
    goalKey: number;
    gateKeys: number[];
    /** 1-based coordinate mirrors of goalKey/gateKeys — present on editor working copies
     *  (canonicalCloneLevel emits them); absent on freshly parsed levels. */
    goal?: RawCoord;
    gates?: RawCoord[];
    blockSet: Set<number>;
    gooseSet: Set<number>;
    falseGoalKeys: Set<number>;
    mustPassKeys: number[];
    mustCrossKeys: number[];
    surroundKeys: number[];
    adjacentTurnKeys: number[];
    adjacentTurnDirs: TurnDir[];
    mustPassTurnDirs: Map<number, TurnDir>;
    landmarkMeta: Map<number, { objectType: string; role: string }>;
    portalMap: Map<number, { dest: number }>;
    portalVisuals: Array<{ k1: number; k2: number; color?: string }>;
    filterMap: Map<number, 1 | 2>;
    flippingFilterMap: Map<number, 1 | 2>;
    hasParityBreaker: boolean;
    hints: number[][];
    /** Canonical Hint[] (path + provenance) mirror of `hints` — see domain/hint-types.ts. Present
     *  once a level's saved hints have been attached (editor load / review submission load);
     *  absent on a freshly parsed level before that happens. */
    hintRecords?: import('./hint-types.js').Hint[];
    designerName: string;
    description: string;
    difficulty: number | null;
}

// ─── Raw level validation ─────────────────────────────────────────────────────

const isPositiveInt = (v: any): boolean => Number.isInteger(v) && v > 0;
const isNonNegInt = (v: any): boolean => Number.isInteger(v) && v >= 0;
const isCoord = (v: any): boolean => v && typeof v === 'object' && isPositiveInt(v.x) && isPositiveInt(v.y);
const isInBounds = (coord: any, w: number, h: number): boolean => coord.x >= 1 && coord.x <= w && coord.y >= 1 && coord.y <= h;

/**
 * Validates a raw level in wire format (1-indexed coordinates, plain arrays/objects).
 * Does not parse or normalize the level; use `parseRawLevel` for that.
 *
 * @param raw  untrusted wire-format input (runtime-validation boundary)
 */
export function validateRawLevel(raw: any): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

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
        raw.gates.forEach((g: any, i: number) => {
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
            raw.portals.forEach((p: any, i: number) => {
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
        'surround', 'mustPass', 'mustTurn', 'mustTurnCw', 'mustTurnCcw',
        'adjacentTurn', 'adjacentTurnCw', 'adjacentTurnCcw', 'decorative',
    ]);
    const _validTurnDirs = new Set(['either', 'cw', 'ccw']);
    if (raw.landmarks !== undefined && raw.landmarks !== null) {
        if (!Array.isArray(raw.landmarks)) {
            errors.push('landmarks must be an array');
        } else {
            raw.landmarks.forEach((lm: any, i: number) => {
                if (!lm || typeof lm !== 'object') { errors.push(`landmarks[${i}] must be an object`); return; }
                if (!isCoord(lm)) { errors.push(`landmarks[${i}] must have positive integer x and y`); return; }
                if (hasGrid && !isInBounds(lm, w, h)) errors.push(`landmarks[${i}] (${lm.x},${lm.y}) out of bounds`);
                if (typeof lm.objectType !== 'string') errors.push(`landmarks[${i}].objectType must be a string`);
                if (!_validRoles.has(lm.role)) errors.push(`landmarks[${i}].role "${lm.role}" is not a valid role`);
                if (lm.turn !== undefined && !_validTurnDirs.has(lm.turn)) errors.push(`landmarks[${i}].turn must be 'either', 'cw', or 'ccw'`);
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

    // Cross-object occupancy: every cell holds at most one object (gate/goal/falseGoal/
    // landmark/block/goose/mustPass/mustCross/filter/flippingFilter/portal terminal) — this is
    // an absolute invariant of the game model, mirrored by the editor's one-object-per-cell
    // placement guard (getOccupant/placeOccupant in editor-occupancy.ts). That guard only runs
    // for levels drawn through the editor's click UI though; this check is the one gate every
    // level passes through regardless of how it was authored (editor export, hand-written JSON,
    // stress-test generation, Firestore import via levels:import-published) — added after a
    // generated stress-corpus level's portal destination silently coincided with the goal cell
    // and passed every other check (the witness-path referee only validates move legality along
    // the path, not object placement, so it had no way to catch this).
    const occupancy = new Map<string, string>();
    const claim = (label: string, x: any, y: any): void => {
        if (typeof x !== 'number' || typeof y !== 'number') return; // malformed coord flagged above
        const key = `${x},${y}`;
        const existing = occupancy.get(key);
        if (existing && existing !== label) {
            errors.push(`${label} at (${x},${y}) overlaps existing ${existing} — each cell may hold only one object`);
        } else {
            occupancy.set(key, label);
        }
    };
    (raw.gates || []).forEach((g: any) => claim('gate', g?.x, g?.y));
    if (raw.goal) claim('goal', raw.goal.x, raw.goal.y);
    (raw.falseGoals || []).forEach((f: any) => claim('falseGoal', f?.x, f?.y));
    (raw.landmarks || []).forEach((lm: any) => claim('landmark', lm?.x, lm?.y));
    (raw.blocks || []).forEach((b: any) => claim('block', b?.x, b?.y));
    (raw.geese || []).forEach((g: any) => claim('goose', g?.x, g?.y));
    (raw.mustPass || []).forEach((m: any) => claim('mustPass', m?.x, m?.y));
    (raw.mustCross || []).forEach((m: any) => claim('mustCross', m?.x, m?.y));
    (raw.filters || []).forEach((f: any) => claim('filter', f?.x, f?.y));
    (raw.flippingFilters || []).forEach((f: any) => claim('flippingFilter', f?.x, f?.y));
    (raw.portals || []).forEach((p: any, i: number) => {
        if (typeof p?.x1 === 'number' && typeof p?.y1 === 'number' &&
            typeof p?.x2 === 'number' && typeof p?.y2 === 'number' &&
            p.x1 === p.x2 && p.y1 === p.y2) {
            errors.push(`portals[${i}] endpoints must not coincide (${p.x1},${p.y1})`);
        }
        claim(`portal[${i}]`, p?.x1, p?.y1);
        claim(`portal[${i}]`, p?.x2, p?.y2);
    });

    return { ok: errors.length === 0, errors };
}
