/**
 * @fileoverview Type contracts and runtime validators for raw and normalized level shapes.
 *
 * "Raw" = the wire format stored in data/levels.json and Firestore (1-indexed coords, plain arrays).
 * "Normalized" = the internal representation after parseRawLevel (0-indexed, packed keys, Sets/Maps).
 */

import { baseLandmarkRole } from './landmark-rules.js';

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
    /** Permanent, content-independent identity (e.g. "P00042"), assigned once and never
     *  reused/recomputed — see docs/archive/level-id-unification-plan.md. Absent on a level that hasn't
     *  yet graduated into a git-committed corpus (an editor draft, a Firestore `published_levels`
     *  staging doc not yet pulled in by `levels:import-published`). Distinct from `EngineLevel.id`
     *  (a number — the level's array position, an unrelated pre-existing concept) and from the
     *  wire `levelId` field `denormalizeLevel` derives from that position; this field survives
     *  reordering/editing, those don't. */
    id?: string;
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
    /** Mirror of `RawLevel.id` — the level's permanent string identity, or `null` when it hasn't
     *  been assigned one yet. Named distinctly from `id` (that field is the array position passed
     *  into parseRawLevel, an unrelated legacy concept) precisely so the two can never be confused
     *  at a call site. */
    persistentId: string | null;
    grid: { w: number; h: number };
    requiredLength: number;
    requiredIntersections: number;
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
    /** Append-only origin/modification history — see domain/level-provenance-types.ts. Explicit
     *  null (not omitted) for a level with no known provenance (e.g. very old data pre-dating
     *  this schema), never silently absent. */
    provenance?: import('./level-provenance-types.js').LevelProvenance | null;
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
        // The packed-key arrays reserve KEY_SPACE for at most rows 0..14: PACK(0, 16) already
        // equals KEY_SPACE, and fixed solver queues are sized for the documented 15x15 envelope.
        // A larger raw level would cause out-of-range typed-array access, not merely run slower.
        if (isPositiveInt(raw.grid.w) && raw.grid.w > 15) errors.push('grid.w must not exceed 15');
        if (isPositiveInt(raw.grid.h) && raw.grid.h > 15) errors.push('grid.h must not exceed 15');
        // Every real (human-authored, published) level is square — no rectangular level has ever
        // shipped. Not previously enforced here, which is how the stress generators' independent
        // w/h draws (scripts/stress/generate.mjs, generate-random.mjs) went unnoticed.
        if (isPositiveInt(raw.grid.w) && isPositiveInt(raw.grid.h) && raw.grid.w !== raw.grid.h) {
            errors.push(`grid must be square (w === h); got ${raw.grid.w}×${raw.grid.h}`);
        }
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

    // Mechanic cardinality: solver/prep.ts builds each mechanic's initial bitmask as
    // `(1 << n) - 1`, which is only correct for n <= 30 — `1 << 31` is JS's int32 sign bit
    // (-2147483648), not +2^31, so the formula misfires one object earlier than the "31-bit mask"
    // intuition suggests. mustPass/mustCross stay safe only because of the documented 4-object
    // design maximum; surround/mustTurn/adjacentTurn have no such maximum, so nothing else stops a
    // level from silently miscomputing its own win-condition bitmask. See
    // docs/mechanic-state-contracts.md's "Cardinality risk" section for the full derivation.
    const MAX_MECHANIC_CARDINALITY = 30;
    const landmarkRoleCounts: Record<string, number> = { mustPass: 0, mustTurn: 0, surround: 0, adjacentTurn: 0 };
    (raw.landmarks || []).forEach((lm: any) => {
        if (!lm || !lm.role) return;
        const role = baseLandmarkRole(String(lm.role));
        if (role in landmarkRoleCounts) landmarkRoleCounts[role]++;
    });
    const checkCardinality = (label: string, count: number) => {
        if (count > MAX_MECHANIC_CARDINALITY) {
            errors.push(`${label} count (${count}) exceeds the maximum of ${MAX_MECHANIC_CARDINALITY} — its solver bitmask encoding is unsound beyond this bound (see docs/mechanic-state-contracts.md's "Cardinality risk")`);
        }
    };
    // buildWireLevelData deliberately re-declares a mustPass/mustTurn landmark's own cell in
    // `mustPass` alongside its `landmarks` entry (see the occupancy-check comment below) — the
    // landmark and its derived mustPass entry are the SAME cell, not two. Summing raw.mustPass.length
    // with the landmark role counts double-counts every such cell; count distinct cells instead.
    const mustPassCardinalityKeys = new Set<string>();
    (Array.isArray(raw.mustPass) ? raw.mustPass : []).forEach((m: any) => {
        if (m && typeof m.x === 'number' && typeof m.y === 'number') mustPassCardinalityKeys.add(`${m.x},${m.y}`);
    });
    (raw.landmarks || []).forEach((lm: any) => {
        if (!lm || typeof lm.x !== 'number' || typeof lm.y !== 'number' || !lm.role) return;
        const role = baseLandmarkRole(String(lm.role));
        if (role === 'mustPass' || role === 'mustTurn') mustPassCardinalityKeys.add(`${lm.x},${lm.y}`);
    });
    checkCardinality('mustPass (including mustTurn-role landmarks, which are also must-pass cells)',
        mustPassCardinalityKeys.size);
    checkCardinality('mustCross', Array.isArray(raw.mustCross) ? raw.mustCross.length : 0);
    checkCardinality('surround landmarks', landmarkRoleCounts.surround);
    checkCardinality('mustTurn landmarks', landmarkRoleCounts.mustTurn);
    checkCardinality('adjacentTurn landmarks', landmarkRoleCounts.adjacentTurn);

    // Flipping filters use one bit per object in flipperUsedMask. Unlike the initial-mask
    // mechanics above there is no `(1 << n) - 1` constructor, so all 32 int32 bits are usable;
    // the 33rd filter is not. JavaScript shifts mask their count to five bits (`1 << 32` is
    // `1 << 0`), which would alias filters 0 and 32 and make using either one mark both as spent.
    const flippingFilterCount = Array.isArray(raw.flippingFilters) ? raw.flippingFilters.length : 0;
    if (flippingFilterCount > 32) {
        errors.push(`flippingFilters count (${flippingFilterCount}) exceeds the maximum of 32 — its solver bitmask aliases object indices beyond this bound`);
    }

    // Optional scalar metadata (non-fatal format checks)
    if (raw.id !== undefined && (typeof raw.id !== 'string' || raw.id.length === 0)) {
        errors.push('id must be a non-empty string');
    }
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
    //
    // One legitimate exception: a landmark's own derived block/mustPass cell. denormalizeLevel's
    // wire output (buildWireLevelData, the real editor/submission export path — see
    // level-codec-roundtrip.test.ts's "buildWireLevelData round-trip preserves landmark
    // mechanics") intentionally re-declares an impassable landmark's cell in `blocks` (and a
    // mustPass/mustTurn landmark's cell in `mustPass`) alongside its own `landmarks` entry — the
    // landmark and its derived block/mustPass are the SAME conceptual object, not two objects
    // contending for one cell, the same reasoning domain/level-fingerprint.ts's
    // landmarkDerivedCoordSets already applies when excluding these exact coordinates from its
    // own blocks/mustPass comparison buckets. This was never exercised until a real player
    // submitted a landmark level through the in-game editor (2026-07-15) — every landmark level
    // in the corpus before that was hand-authored JSON that never introduced the redundant entry
    // in the first place, so validateRawLevel's occupancy check had no way to be exercised against
    // buildWireLevelData's actual output until then. A block/mustPass at a landmark cell with a
    // MISMATCHED role (e.g. a block declared at a mustTurn landmark's cell) is still a real
    // conflict and is not exempted.
    const landmarkDerivedBlocks = new Set<string>();
    const landmarkDerivedMustPass = new Set<string>();
    (raw.landmarks || []).forEach((lm: any) => {
        if (!lm || typeof lm.x !== 'number' || typeof lm.y !== 'number' || !lm.role) return;
        const key = `${lm.x},${lm.y}`;
        const role = baseLandmarkRole(String(lm.role));
        if (role === 'mustPass' || role === 'mustTurn') landmarkDerivedMustPass.add(key);
        else landmarkDerivedBlocks.add(key);
    });

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
    (raw.blocks || []).forEach((b: any) => {
        if (b && typeof b.x === 'number' && typeof b.y === 'number' && landmarkDerivedBlocks.has(`${b.x},${b.y}`)) return;
        claim('block', b?.x, b?.y);
    });
    (raw.geese || []).forEach((g: any) => claim('goose', g?.x, g?.y));
    (raw.mustPass || []).forEach((m: any) => {
        if (m && typeof m.x === 'number' && typeof m.y === 'number' && landmarkDerivedMustPass.has(`${m.x},${m.y}`)) return;
        claim('mustPass', m?.x, m?.y);
    });
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
