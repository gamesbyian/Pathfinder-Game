// @ts-check
// Pure level-structure validation for the Pathfinder editor.
// AXIS_H/AXIS_V must stay in sync with APP.Core.H (=1) and APP.Core.V (=2).

import { PACK, UNPACK, inBounds } from './cell-key.js';

const _DX8 = [0, 1, 1, 1, 0, -1, -1, -1];
const _DY8 = [-1, -1, 0, 1, 1, 1, 0, -1];
import { resolvePortal }          from './portal-utils.js';

const AXIS_H = 1;
const AXIS_V = 2;

// Returns { ok: boolean, reasons: string[] }.
// pendingPortal: the half-placed portal key (if any) from editor state — null means none.
/**
 * @param {any} l  the editor working level (structurally a normalized level)
 * @param {{ allowGateLess?: boolean }} [opts]
 * @param {number|null} [pendingPortal]
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function validateLevelDetailed(l, opts = {}, pendingPortal = null) {
    /** @type {string[]} */
    const reasons = [];
    if (!l) return { ok: false, reasons: ['Level missing'] };
    const allowGateLess = !!opts.allowGateLess;
    const { w, h } = l.grid;

    /** @param {number} k */
    const inGrid = (k) => { const p = UNPACK(k); return inBounds(p.x, p.y, w, h); };
    /** @param {string} label @param {number} key */
    const addOOB = (label, key) => {
        const p = UNPACK(key);
        reasons.push(`Out of bounds: ${label} (${p.x + 1},${p.y + 1})`);
    };
    const gateSet = new Set(l.gateKeys);

    // Count orthogonal neighbours reachable by the path.
    // A flipping filter not adjacent to this cell can be crossed first,
    // flipping all others — so it exempts adjacent blocking flipping filters.
    /** @param {number} cx @param {number} cy @param {boolean} [gatesBlock] */
    const accessibleSides = (cx, cy, gatesBlock = false) => {
        const adjKeys = new Set([[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy]) => PACK(cx+dx, cy+dy)));
        const hasFreeFlip = Array.from(l.flippingFilterMap.keys()).some((/** @type {number} */ fk) => !adjKeys.has(fk));
        let n = 0;
        for (const [dx, dy, horiz] of /** @type {[number, number, boolean][]} */ ([[1,0,true],[-1,0,true],[0,1,false],[0,-1,false]])) {
            const nx = cx + dx, ny = cy + dy;
            if (!inBounds(nx, ny, w, h)) continue;
            const nk = PACK(nx, ny);
            if (l.blockSet.has(nk) || l.gooseSet.has(nk) || l.falseGoalKeys.has(nk)) continue;
            if (gatesBlock && gateSet.has(nk)) continue;
            const ba = horiz ? AXIS_V : AXIS_H;
            if (l.filterMap.get(nk) === ba) continue;
            if (!hasFreeFlip && l.flippingFilterMap.get(nk) === ba) continue;
            n++;
        }
        return n;
    };

    if (!allowGateLess && (!Array.isArray(l.gateKeys) || l.gateKeys.length === 0))
        reasons.push('No gates');
    if (l.goalKey === -1 || l.goalKey === undefined) reasons.push('Goal missing');
    if (pendingPortal) reasons.push('Portal terminals incomplete');

    l.gateKeys.forEach((/** @type {number} */ k) => { if (!inGrid(k)) addOOB('gate', k); });
    if (l.goalKey !== -1 && l.goalKey !== undefined && !inGrid(l.goalKey)) addOOB('goal', l.goalKey);
    l.mustPassKeys.forEach((/** @type {number} */ k) => { if (!inGrid(k)) addOOB('mustPass', k); });
    l.mustCrossKeys.forEach((/** @type {number} */ k) => { if (!inGrid(k)) addOOB('mustCross', k); });
    l.gooseSet.forEach((/** @type {number} */ k)  => { if (!inGrid(k)) addOOB('goose', k); });
    l.blockSet.forEach((/** @type {number} */ k)  => { if (!inGrid(k)) addOOB('block', k); });

    let unpaired = false;
    l.portalMap.forEach((/** @type {any} */ v, /** @type {number} */ k) => {
        if (!l.portalMap.has(v.dest)) unpaired = true;
        if (!inGrid(k)) addOOB('portal', k);
        if (v.dest !== -1 && !inGrid(v.dest)) addOOB('portal', v.dest);
    });
    if (unpaired) reasons.push('Portal terminals incomplete');

    // MustCross structural checks
    // Pre-compute cells orthogonally adjacent to any mustCross key.
    const mustCrossAdjCells = new Set();
    for (const mk of l.mustCrossKeys) {
        if (!inGrid(mk)) continue;
        const mp = UNPACK(mk);
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]])
            mustCrossAdjCells.add(PACK(mp.x + dx, mp.y + dy));
    }
    // A flipping filter not adjacent to any mustCross can be crossed first,
    // potentially flipping the blocking ones before the path reaches them.
    const hasFreeFlipForMustCross = Array.from(l.flippingFilterMap.keys())
        .some(fk => !mustCrossAdjCells.has(fk));

    /** @param {number} key */
    const isDiagonalTurnObstacle = (key) => (
        l.blockSet.has(key) ||
        l.gooseSet.has(key) ||
        l.falseGoalKeys.has(key) ||
        l.filterMap.has(key) ||
        l.flippingFilterMap.has(key) ||
        l.portalMap.has(key) ||
        gateSet.has(key) ||
        l.goalKey === key
    );

    /** @param {{x:number,y:number}} p @param {number} sx @param {number} sy */
    const hasAlternateTurnSpaceAroundDiagonal = (p, sx, sy) => {
        // If the immediate diagonal is blocked, a route can still turn farther
        // out in the same row or column, provided at least one such cell is
        // inside the grid and not itself a routing obstacle.
        for (let x = p.x + (2 * sx); inBounds(x, p.y + sy, w, h); x += sx) {
            if (!isDiagonalTurnObstacle(PACK(x, p.y + sy))) return true;
        }
        for (let y = p.y + (2 * sy); inBounds(p.x + sx, y, w, h); y += sy) {
            if (!isDiagonalTurnObstacle(PACK(p.x + sx, y))) return true;
        }
        // The blocked diagonal isn't the only way to turn into its two orthogonal
        // neighbors: the row-side neighbor can still be approached from the opposite
        // diagonal across that row, and the column-side neighbor from the opposite
        // diagonal across that column — neither needs the blocked corner itself.
        const mirrorAcrossRow    = PACK(p.x - sx, p.y + sy);
        const mirrorAcrossColumn = PACK(p.x + sx, p.y - sy);
        if (inGrid(mirrorAcrossRow) && !isDiagonalTurnObstacle(mirrorAcrossRow)) return true;
        if (inGrid(mirrorAcrossColumn) && !isDiagonalTurnObstacle(mirrorAcrossColumn)) return true;
        return false;
    };

    for (const k of l.mustCrossKeys) {
        if (!inGrid(k)) continue;
        const p = UNPACK(k);
        if (l.blockSet.has(k))
            reasons.push(`MustCross overlaps block at (${p.x + 1},${p.y + 1})`);
        if (p.x === 0 || p.x === w - 1 || p.y === 0 || p.y === h - 1)
            reasons.push(`MustCross on grid edge at (${p.x + 1},${p.y + 1})`);
        const left  = PACK(p.x - 1, p.y), right = PACK(p.x + 1, p.y);
        const up    = PACK(p.x, p.y - 1), down  = PACK(p.x, p.y + 1);
        // Gate + goal flanking the MustCross on directly-opposite sides (collinear) is infeasible:
        // a MustCross needs one H pass AND one V pass, but the axis through the gate/goal pair can
        // never be crossed twice — a gate cell can't be re-entered mid-path and the goal is the
        // terminus. (Verified against SolverV2: such configs never solve, while a gate OR goal alone
        // on one side stays solvable — so both must be present and opposite to flag.)
        const flanks = (/** @type {number} */ a, /** @type {number} */ b) => (gateSet.has(a) && l.goalKey === b) || (gateSet.has(b) && l.goalKey === a);
        if (flanks(left, right) || flanks(up, down))
            reasons.push(`Gate and goal flank MustCross on opposite sides at (${p.x + 1},${p.y + 1})`);
        if ([left, right, up, down].some(nk => l.blockSet.has(nk)))
            reasons.push(`Block adjacent to MustCross at (${p.x + 1},${p.y + 1})`);
        if ([left, right, up, down].some(nk => l.gooseSet.has(nk)))
            reasons.push(`Goose adjacent to MustCross at (${p.x + 1},${p.y + 1})`);
        if ([left, right].some(nk => l.filterMap.get(nk) === AXIS_V))
            reasons.push(`Vertical filter blocks MustCross at (${p.x + 1},${p.y + 1})`);
        if ([up, down].some(nk => l.filterMap.get(nk) === AXIS_H))
            reasons.push(`Horizontal filter blocks MustCross at (${p.x + 1},${p.y + 1})`);
        if (!hasFreeFlipForMustCross) {
            if ([left, right].some(nk => l.flippingFilterMap.get(nk) === AXIS_V))
                reasons.push(`Flipping V-filter blocks MustCross at (${p.x + 1},${p.y + 1})`);
            if ([up, down].some(nk => l.flippingFilterMap.get(nk) === AXIS_H))
                reasons.push(`Flipping H-filter blocks MustCross at (${p.x + 1},${p.y + 1})`);
        }
        for (const [sx, sy] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
            const dk = PACK(p.x + sx, p.y + sy);
            if (!inGrid(dk) || !isDiagonalTurnObstacle(dk)) continue;
            if (!hasAlternateTurnSpaceAroundDiagonal(p, sx, sy))
                reasons.push(`Diagonal obstacle traps MustCross at (${p.x + 1},${p.y + 1})`);
        }
    }

    // Gate accessibility: needs at least one open orthogonal side to start.
    for (const gk of l.gateKeys) {
        if (!inGrid(gk)) continue;
        const p = UNPACK(gk);
        if (accessibleSides(p.x, p.y, true) === 0)
            reasons.push(`Gate completely surrounded at (${p.x + 1},${p.y + 1})`);
    }

    // Goal accessibility: needs at least one open orthogonal side to enter.
    if (l.goalKey !== -1 && l.goalKey !== undefined && inGrid(l.goalKey)) {
        const p = UNPACK(l.goalKey);
        if (accessibleSides(p.x, p.y, true) === 0)
            reasons.push(`Goal completely surrounded at (${p.x + 1},${p.y + 1})`);
    }

    // MustPass accessibility: needs at least 2 open sides to enter and exit.
    for (const mk of l.mustPassKeys) {
        if (!inGrid(mk)) continue;
        const p = UNPACK(mk);
        if (accessibleSides(p.x, p.y) < 2)
            reasons.push(`MustPass blocked on 3+ sides at (${p.x + 1},${p.y + 1})`);
    }

    // Landmark validation
    if (l.landmarkMeta?.size > 0) {
        const impassableRoles = new Set(['surround', 'adjacentTurn', 'decorative']);
        l.landmarkMeta.forEach((/** @type {{role: string}} */ { role }, /** @type {number} */ k) => {
            if (!inGrid(k)) { addOOB('landmark', k); return; }
            if (impassableRoles.has(role)) {
                if (gateSet.has(k)) {
                    const p = UNPACK(k);
                    reasons.push(`Impassable landmark overlaps gate at (${p.x + 1},${p.y + 1})`);
                }
                if (l.goalKey === k) {
                    const p = UNPACK(k);
                    reasons.push(`Impassable landmark overlaps goal at (${p.x + 1},${p.y + 1})`);
                }
            }
        });

        // Surround: at least one in-bounds non-blocked neighbor must exist (otherwise unsatisfiable)
        for (const sk of (l.surroundKeys || [])) {
            if (!inGrid(sk)) continue;
            const sx = sk & 0xFFFF, sy = (sk >>> 16) & 0xFFFF;
            let accessible = 0;
            for (let d = 0; d < 8; d++) {
                const nx = sx + _DX8[d], ny = sy + _DY8[d];
                if (!inBounds(nx, ny, w, h)) continue;
                if (!l.blockSet.has(PACK(nx, ny))) accessible++;
            }
            if (accessible === 0) {
                const p = UNPACK(sk);
                reasons.push(`Surround landmark completely enclosed at (${p.x + 1},${p.y + 1})`);
            }
        }
    }

    // Connectivity: at least one gate must be reachable from the goal via BFS.
    /** @param {number} k */
    const barrier = (k) => l.blockSet.has(k);
    /** @param {number} startKey @returns {Set<number>} */
    const reachableFrom = (startKey) => {
        if (startKey === -1 || startKey === undefined || barrier(startKey)) return new Set();
        const q       = [startKey];
        const visited = new Set([startKey]);
        let head = 0;
        while (head < q.length) {
            const k = q[head++];
            const p = UNPACK(k);
            const nks = [[0,1],[0,-1],[1,0],[-1,0]]
                .map(([dx, dy]) => PACK(p.x + dx, p.y + dy));
            const portal = resolvePortal(l, k);
            if (portal && portal.dest !== -1) nks.push(portal.dest);
            for (const nk of nks) {
                const np = UNPACK(nk);
                if (inBounds(np.x, np.y, w, h) && !visited.has(nk) && !barrier(nk)) {
                    visited.add(nk);
                    q.push(nk);
                }
            }
        }
        return visited;
    };

    if (l.goalKey !== -1 && l.goalKey !== undefined &&
        !barrier(l.goalKey) &&
        Array.isArray(l.gateKeys) && l.gateKeys.length > 0) {
        const goalReach      = reachableFrom(l.goalKey);
        const hasConnectedGate = l.gateKeys.some((/** @type {number} */ gk) => goalReach.has(gk));
        if (!hasConnectedGate) reasons.push('Grid partitioned by barriers');
    }

    return { ok: reasons.length === 0, reasons: Array.from(new Set(reasons)) };
}
