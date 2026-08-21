import { PACK, UNPACK }     from './cell-key.js';
import { resolvePortal }    from './portal-utils.js';
import { isValidMove }      from './move-rules.js';
import { MoveContext }      from './move-context.js';
import { turnDirection }    from './geometry.js';
import type { NormalizedLevel } from './types.js';

// Validates a candidate path against a level, normalising coordinates as needed.
// Returns { ok: true, path: [...keys] } or { ok: false, reason: '...' }.
/** @param pathCoordsOrKeys raw nodes (keys, [x,y], or {x,y}) */
export function validateCandidatePath(
    level: NormalizedLevel,
    pathCoordsOrKeys: any[],
): { ok: true; path: number[] } | { ok: false; reason: string } {
    if (!Array.isArray(pathCoordsOrKeys) || pathCoordsOrKeys.length < 2)
        return { ok: false, reason: 'Path must contain at least 2 nodes.' };

    const toKey = (node: any): number => {
        if (typeof node === 'number') return node;
        if (Array.isArray(node) && node.length >= 2)
            return PACK(Number(node[0]) - 1, Number(node[1]) - 1);
        // {x,y} objects are always already 0-indexed — unlike [x,y] pairs (1-indexed wire
        // format), there is no ambiguous convention to guess here. A bounds-based heuristic
        // previously tried to infer 1- vs 0-indexing from whether the coordinate overflowed the
        // grid, but that guess is wrong exactly at the boundary: on an 8x8 grid, {x:8,y:8} is a
        // valid 1-indexed corner, yet 8 is not `> w`, so the heuristic left it un-shifted and
        // rejected a legitimate path. Representation determines indexing; it is never inferred.
        if (node && typeof node === 'object' && Number.isFinite(node.x) && Number.isFinite(node.y))
            return PACK(Number(node.x), Number(node.y));
        return NaN;
    };

    const path = pathCoordsOrKeys.map(toKey);
    if (path.some(k => !Number.isFinite(k)))
        return { ok: false, reason: 'Invalid path coordinate format.' };
    if (!level.gateKeys.includes(path[0]))
        return { ok: false, reason: 'Path must start on a gate.' };

    const counts = new Map<number, number>();
    // Per-cell axis-usage ({h,v}): which horizontal/vertical edges through a cell the path has
    // already traversed. This is the map isValidMove's edge-reuse check actually reads — so the
    // referee enforces the no-edge-reuse rule (it previously got a visit-COUNT map and silently
    // skipped that check). Mirrors the `mark` discipline in runtime/path-state.js.
    const axisUsage = new Map<number, { h: boolean; v: boolean }>();
    const markAxis = (k: number, ax: number) => {
        const e = axisUsage.get(k) || { h: false, v: false };
        if (ax === 1) e.h = true; else e.v = true;
        axisUsage.set(k, e);
    };
    const jumpSet = new Set<number>();
    const turnsAtCell = new Map<number, string>();  // key → 'cw'|'ccw'|'both'
    let intersections = 0;
    let flipCount     = 0;
    const crossedSet = new Map<number, number>();
    counts.set(path[0], 1);

    for (let i = 1; i < path.length; i++) {
        const prev = path[i - 1];
        const cur  = path[i];

        if (i >= 2 && level?.flippingFilterMap?.has(prev)) {
            const entry = UNPACK(path[i - 2]);
            const pivot = UNPACK(prev);
            const exit  = UNPACK(cur);
            const entryAxis = (entry.y === pivot.y) ? 1 : 2;
            const exitAxis  = (pivot.y === exit.y)  ? 1 : 2;
            if (entryAxis !== exitAxis)
                return { ok: false, reason: `Invalid turn on flipping filter at step ${i + 1}.` };
        }

        const armedFalseGoals = new Set(level.falseGoalKeys || []);
        const stepState = {
            mode:                   0, // PLAY = 0
            path:                   path.slice(0, i),
            visitedCounts:          counts,
            cellUsage:              axisUsage,
            intersections,
            isPortalJump:           jumpSet,
            armedFalseGoals,
            flipCount,
            crossedFlippingFilters: crossedSet,
        };
        if (!isValidMove(cur, stepState, level, MoveContext.PLAY))
            return { ok: false, reason: `Invalid move at step ${i + 1}.` };

        const portal = resolvePortal(level, prev);
        if (portal && portal.dest === cur) {
            jumpSet.add(i);
            const c = counts.get(cur) || 0;
            if (c > 0 && cur !== level.goalKey && !level.gateKeys.includes(cur)) intersections++;
            counts.set(cur, c + 1);
            if (level.flippingFilterMap.has(cur) && !crossedSet.has(cur)) {
                crossedSet.set(cur, flipCount);
                flipCount++;
            }
            continue;
        }

        const c = counts.get(cur) || 0;
        if (c > 0 && cur !== level.goalKey && !level.gateKeys.includes(cur)) intersections++;
        counts.set(cur, c + 1);
        // Mark the traversed edge on both endpoints (regular, non-portal move).
        const moveAxis = (((cur >>> 16) & 0xFFFF) === ((prev >>> 16) & 0xFFFF)) ? 1 : 2;
        markAxis(prev, moveAxis);
        markAxis(cur, moveAxis);
        if (level.flippingFilterMap.has(cur) && !crossedSet.has(cur)) {
            crossedSet.set(cur, flipCount);
            flipCount++;
        }

        // Detect turn at prev when both this step and the previous are regular (non-portal) moves.
        if (i >= 2 && !jumpSet.has(i - 1)) {
            const dir = turnDirection(path[i - 2], prev, cur);
            if (dir) {
                const ex = turnsAtCell.get(prev);
                turnsAtCell.set(prev, !ex ? dir : ex !== dir ? 'both' : ex);
            }
        }
    }

    const last = path[path.length - 1];
    if (last !== level.goalKey)
        return { ok: false, reason: 'Path does not end on the goal.' };
    const nonPortalSteps = path.length - 1 - jumpSet.size;
    if (level.reqLen && nonPortalSteps !== level.reqLen)
        return { ok: false, reason: `Path length ${nonPortalSteps} does not match required ${level.reqLen}.` };
    if (level.reqInt !== undefined && level.reqInt !== null && intersections !== level.reqInt)
        return { ok: false, reason: `Intersections ${intersections} do not match required ${level.reqInt}.` };

    // Must-pass: every required cell visited at least once
    for (const mpKey of (level.mustPassKeys || [])) {
        if (!((counts.get(mpKey) ?? 0) > 0))
            return { ok: false, reason: `Must-pass cell not visited.` };
    }

    // Must-cross: every required cell visited at least twice
    for (const mcKey of (level.mustCrossKeys || [])) {
        if ((counts.get(mcKey) || 0) < 2)
            return { ok: false, reason: `Must-cross cell visited fewer than twice.` };
    }

    // Surround: all valid (in-bounds, non-blocked) 8-neighbors of each surround landmark must be visited
    const surroundKeys = level.surroundKeys;
    if (surroundKeys && surroundKeys.length > 0) {
        const { w, h } = level.grid;
        const _dx8 = [0, 1, 1, 1, 0, -1, -1, -1];
        const _dy8 = [-1, -1, 0, 1, 1, 1, 0, -1];
        for (const sk of surroundKeys) {
            const sx = sk & 0xFFFF, sy = (sk >>> 16) & 0xFFFF;
            for (let d = 0; d < 8; d++) {
                const nx = sx + _dx8[d], ny = sy + _dy8[d];
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const nk = ((ny << 16) | nx) >>> 0;
                if (level.blockSet.has(nk) || level.gooseSet.has(nk)) continue;
                if (!((counts.get(nk) ?? 0) > 0))
                    return { ok: false, reason: `Surround constraint not satisfied: neighbor at (${nx + 1},${ny + 1}) not visited.` };
            }
        }
    }

    // Must-turn: each must-turn cell must have had a turn of the required direction
    const mustPassTurnDirs = level.mustPassTurnDirs;
    if (mustPassTurnDirs && mustPassTurnDirs.size > 0) {
        for (const [k, req] of mustPassTurnDirs) {
            const t = turnsAtCell.get(k);
            if (!t)
                return { ok: false, reason: `Must-turn constraint not satisfied: no turn at required cell.` };
            if (req !== 'either' && t !== req && t !== 'both')
                return { ok: false, reason: `Must-turn constraint not satisfied: need ${req} turn, got ${t}.` };
        }
    }

    // Adjacent-turn: each adj-turn landmark must have a required turn at one of its 8 adjacent cells
    const adjacentTurnKeys = level.adjacentTurnKeys;
    if (adjacentTurnKeys && adjacentTurnKeys.length > 0) {
        const { w, h } = level.grid;
        const _dx8 = [0, 1, 1, 1, 0, -1, -1, -1];
        const _dy8 = [-1, -1, 0, 1, 1, 1, 0, -1];
        for (let oi = 0; oi < adjacentTurnKeys.length; oi++) {
            const atk = adjacentTurnKeys[oi];
            const req = (level.adjacentTurnDirs || [])[oi] || 'either';
            const ax = atk & 0xFFFF, ay = (atk >>> 16) & 0xFFFF;
            let satisfied = false;
            for (let d = 0; d < 8 && !satisfied; d++) {
                const nx = ax + _dx8[d], ny = ay + _dy8[d];
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const nk = ((ny << 16) | nx) >>> 0;
                const t = turnsAtCell.get(nk);
                if (!t) continue;
                if (req === 'either' || t === req || t === 'both') satisfied = true;
            }
            if (!satisfied)
                return { ok: false, reason: `Adjacent-turn constraint not satisfied.` };
        }
    }

    return { ok: true, path };
}
