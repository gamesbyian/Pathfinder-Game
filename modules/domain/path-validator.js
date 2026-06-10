import { PACK, UNPACK }     from './cell-key.js';
import { resolvePortal }    from './portal-utils.js';
import { isValidMove }      from './move-rules.js';
import { MoveContext }      from './move-context.js';

// Validates a candidate path against a level, normalising coordinates as needed.
// Returns { ok: true, path: [...keys] } or { ok: false, reason: '...' }.
export function validateCandidatePath(level, pathCoordsOrKeys) {
    if (!Array.isArray(pathCoordsOrKeys) || pathCoordsOrKeys.length < 2)
        return { ok: false, reason: 'Path must contain at least 2 nodes.' };

    const toKey = (node) => {
        if (typeof node === 'number') return node;
        if (Array.isArray(node) && node.length >= 2)
            return PACK(Number(node[0]) - 1, Number(node[1]) - 1);
        if (node && typeof node === 'object' && Number.isFinite(node.x) && Number.isFinite(node.y)) {
            const x = Number(node.x);
            const y = Number(node.y);
            if (x >= 1 && y >= 1 && (x > level.grid.w || y > level.grid.h))
                return PACK(x - 1, y - 1);
            return PACK(x, y);
        }
        return NaN;
    };

    const path = pathCoordsOrKeys.map(toKey);
    if (path.some(k => !Number.isFinite(k)))
        return { ok: false, reason: 'Invalid path coordinate format.' };
    if (!level.gateKeys.includes(path[0]))
        return { ok: false, reason: 'Path must start on a gate.' };

    const counts   = new Map();
    const usage    = new Map();
    const jumpSet  = new Set();
    let intersections = 0;
    let flipCount     = 0;
    const crossedSet  = new Map();
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
            cellUsage:              usage,
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
        const u = (usage.get(cur) || 0) + 1;
        usage.set(cur, u);
        if (level.flippingFilterMap.has(cur) && !crossedSet.has(cur)) {
            crossedSet.set(cur, flipCount);
            flipCount++;
        }
    }

    const last = path[path.length - 1];
    if (last !== level.goalKey)
        return { ok: false, reason: 'Path does not end on the goal.' };
    if (level.reqLen && path.length - 1 !== level.reqLen)
        return { ok: false, reason: `Path length ${path.length - 1} does not match required ${level.reqLen}.` };
    if (level.reqInt !== undefined && level.reqInt !== null && intersections !== level.reqInt)
        return { ok: false, reason: `Intersections ${intersections} do not match required ${level.reqInt}.` };

    return { ok: true, path };
}
