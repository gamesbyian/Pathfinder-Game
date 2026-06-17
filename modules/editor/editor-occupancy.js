// Pure level-occupancy helpers for the Pathfinder editor.
// AXIS_H/AXIS_V must stay in sync with APP.Core.H (=1) and APP.Core.V (=2).

import { applyLandmark, removeLandmark } from '../domain/landmark-rules.js';

const AXIS_H = 1;
const AXIS_V = 2;

// Atomic editor toolType -> landmark definition. Each landmark variant is a
// first-class grid object exactly like 'block' or 'filterH', not a special
// compound string — this table is the only place that maps a tool button to
// its (objectType, role, turn).
const LANDMARK_TOOL_DEFS = {
    park:          { objectType: 'park',     role: 'surround' },
    market:        { objectType: 'market',   role: 'surround' },
    fountain:      { objectType: 'fountain', role: 'adjacentTurn' },
    fountainLeft:  { objectType: 'fountain', role: 'adjacentTurn', turn: 'left' },
    fountainRight: { objectType: 'fountain', role: 'adjacentTurn', turn: 'right' },
    lamppost:      { objectType: 'lamppost', role: 'adjacentTurn' },
    lamppostLeft:  { objectType: 'lamppost', role: 'adjacentTurn', turn: 'left' },
    lamppostRight: { objectType: 'lamppost', role: 'adjacentTurn', turn: 'right' },
    library:       { objectType: 'library',  role: 'mustTurn' },
    libraryLeft:   { objectType: 'library',  role: 'mustTurn', turn: 'left' },
    libraryRight:  { objectType: 'library',  role: 'mustTurn', turn: 'right' },
    statue:        { objectType: 'statue',   role: 'decorative' },
};

/**
 * Returns the occupant at `key`, or null if the cell is empty.
 * Result shape: { type: string, axis?: number, objectType?: string, role?: string } | null
 */
export function getOccupant(level, key) {
    if (level.gateKeys.includes(key))      return { type: 'gate' };
    if (level.goalKey === key)             return { type: 'goal' };
    if (level.falseGoalKeys.has(key))      return { type: 'falseGoal' };
    if (level.landmarkMeta?.has(key)) {
        const { objectType, role } = level.landmarkMeta.get(key);
        return { type: 'landmark', objectType, role };
    }
    if (level.blockSet.has(key))           return { type: 'block' };
    if (level.gooseSet.has(key))           return { type: 'goose' };
    if (level.mustPassKeys.includes(key))  return { type: 'mustPass' };
    if (level.mustCrossKeys.includes(key)) return { type: 'mustCross' };
    if (level.filterMap.has(key)) {
        const axis = level.filterMap.get(key);
        return { type: axis === AXIS_H ? 'filterH' : 'filterV', axis };
    }
    if (level.flippingFilterMap.has(key)) {
        const axis = level.flippingFilterMap.get(key);
        return { type: axis === AXIS_H ? 'flipH' : 'flipV', axis };
    }
    if (level.portalMap.has(key))          return { type: 'portal' };
    return null;
}

/**
 * Removes the occupant at `key` from `level`, mutating it in place.
 * `pendingPortal` is the caller's current editor.pendingPortal value.
 *
 * Returns { type, pendingPortal, message?, messageCls? } on success,
 * where `pendingPortal` is the NEW value to store in editor state.
 * Returns null if the cell was empty (no mutation performed).
 */
export function removeOccupant(level, key, pendingPortal) {
    if (level.gateKeys.includes(key)) {
        level.gateKeys = level.gateKeys.filter(gk => gk !== key);
        return { type: 'gate', pendingPortal };
    }
    if (level.goalKey === key) {
        level.goalKey = -1;
        return { type: 'goal', pendingPortal };
    }
    if (level.falseGoalKeys.has(key)) {
        level.falseGoalKeys.delete(key);
        return { type: 'falseGoal', pendingPortal };
    }
    if (level.landmarkMeta?.has(key)) {
        removeLandmark(level, key);
        return { type: 'landmark', pendingPortal };
    }
    if (level.blockSet.has(key)) {
        level.blockSet.delete(key);
        return { type: 'block', pendingPortal };
    }
    if (level.gooseSet.has(key)) {
        level.gooseSet.delete(key);
        return { type: 'goose', pendingPortal };
    }
    if (level.mustPassKeys.includes(key)) {
        level.mustPassKeys = level.mustPassKeys.filter(mk => mk !== key);
        return { type: 'mustPass', pendingPortal };
    }
    if (level.mustCrossKeys.includes(key)) {
        level.mustCrossKeys = level.mustCrossKeys.filter(mk => mk !== key);
        return { type: 'mustCross', pendingPortal };
    }
    if (level.filterMap.has(key)) {
        const axis = level.filterMap.get(key);
        level.filterMap.delete(key);
        return { type: axis === AXIS_H ? 'filterH' : 'filterV', pendingPortal };
    }
    if (level.flippingFilterMap.has(key)) {
        const axis = level.flippingFilterMap.get(key);
        level.flippingFilterMap.delete(key);
        return { type: axis === AXIS_H ? 'flipH' : 'flipV', pendingPortal };
    }
    if (level.portalMap.has(key)) {
        const port = level.portalMap.get(key);
        level.portalMap.delete(key);
        if (pendingPortal === key) {
            // Removing the unmatched first terminal — cancel pending
            return { type: 'portal', pendingPortal: null, message: 'Portal Cancelled', messageCls: 'text-slate-500' };
        }
        // Removing a terminal from a completed pair (or the dest=-1 half of an unmatched pair)
        level.portalVisuals = level.portalVisuals.filter(pv => pv.k1 !== key && pv.k2 !== key);
        const otherK = port.dest;
        if (otherK !== -1 && level.portalMap.has(otherK)) {
            level.portalMap.get(otherK).dest = -1;
            return {
                type: 'portal', pendingPortal: otherK,
                message: 'Portal unpaired! Place next terminal.', messageCls: 'text-fuchsia-600 font-bold'
            };
        }
        return { type: 'portal', pendingPortal };
    }
    return null;
}

/**
 * Places an object of `toolType` at `key` in `level`, mutating it in place on success.
 * `pendingPortal` is the caller's current editor.pendingPortal value.
 *
 * On success: returns { ok: true, type, pendingPortal, message?, messageCls? }
 *   where `pendingPortal` is the NEW value to store in editor state.
 * On rejection: returns { ok: false, reason, message?, messageCls? } with no mutation.
 *
 * reason values: 'no_tool' | 'pending_portal_guard' | 'occupied' | 'empty_cell' |
 *                'same_portal_key' | 'unknown_tool'
 *
 * For eraser on an occupied cell, delegates to removeOccupant and returns ok:true.
 */
export function placeOccupant(level, key, toolType, pendingPortal) {
    if (!toolType) {
        return { ok: false, reason: 'no_tool' };
    }
    if (pendingPortal && toolType !== 'portal' && toolType !== 'eraser') {
        return { ok: false, reason: 'pending_portal_guard', message: 'Finish portal pair first!', messageCls: 'text-red-600 font-bold' };
    }
    // Same-key portal: pendingPortal key is in the map but pairing with itself is a no-op.
    // Must be checked before the occupancy guard, which would fire first on a portal key.
    if (toolType === 'portal' && pendingPortal !== null && key === pendingPortal) {
        return { ok: false, reason: 'same_portal_key' };
    }

    const occupant = getOccupant(level, key);

    if (toolType === 'eraser') {
        if (!occupant) return { ok: false, reason: 'empty_cell' };
        const removed = removeOccupant(level, key, pendingPortal);
        if (!removed) return { ok: false, reason: 'empty_cell' };
        return { ok: true, ...removed };
    }

    if (occupant) {
        return { ok: false, reason: 'occupied', message: 'Occupied', messageCls: 'text-red-500' };
    }

    if (toolType === 'portal') {
        if (!pendingPortal) {
            level.portalMap.set(key, { dest: -1 });
            return { ok: true, type: 'portal', pendingPortal: key, message: 'Place second terminal.', messageCls: 'text-fuchsia-600 font-bold' };
        }
        if (key === pendingPortal) {
            return { ok: false, reason: 'same_portal_key' };
        }
        const k1 = pendingPortal;
        level.portalMap.set(k1, { dest: key });
        level.portalMap.set(key, { dest: k1 });
        level.portalVisuals.push({ k1, k2: key });
        return { ok: true, type: 'portal', pendingPortal: null, message: 'Portal paired.', messageCls: 'text-fuchsia-600 font-bold' };
    }

    const landmarkDef = LANDMARK_TOOL_DEFS[toolType];
    if (landmarkDef) {
        applyLandmark(level, key, landmarkDef.objectType, landmarkDef.role, landmarkDef.turn);
        return { ok: true, type: toolType, pendingPortal };
    }

    switch (toolType) {
        case 'gate':      level.gateKeys.push(key);                 break;
        case 'goal':      level.goalKey = key;                      break;
        case 'falseGoal': level.falseGoalKeys.add(key);             break;
        case 'block':     level.blockSet.add(key);                  break;
        case 'mustPass':  level.mustPassKeys.push(key);             break;
        case 'mustCross': level.mustCrossKeys.push(key);            break;
        case 'goose':     level.gooseSet.add(key);                  break;
        case 'filterH':   level.filterMap.set(key, AXIS_H);         break;
        case 'filterV':   level.filterMap.set(key, AXIS_V);         break;
        case 'flipH':     level.flippingFilterMap.set(key, AXIS_H); break;
        case 'flipV':     level.flippingFilterMap.set(key, AXIS_V); break;
        default:
            return { ok: false, reason: 'unknown_tool' };
    }
    return { ok: true, type: toolType, pendingPortal };
}
