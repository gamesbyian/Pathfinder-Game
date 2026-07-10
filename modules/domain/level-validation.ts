// Pure level-structure validation for the Pathfinder editor.
// AXIS_H/AXIS_V must stay in sync with APP.Core.H (=1) and APP.Core.V (=2).

import { PACK, UNPACK, inBounds } from './cell-key.js';
import { resolvePortal } from './portal-utils.js';

const _DX8 = [0, 1, 1, 1, 0, -1, -1, -1];
const _DY8 = [-1, -1, 0, 1, 1, 1, 0, -1];

const AXIS_H = 1;
const AXIS_V = 2;

// Returns { ok: boolean, reasons: string[] }.
// pendingPortal: the half-placed portal key (if any) from editor state — null means none.
/**
 * FAST EDITOR HEURISTIC — NOT a solvability oracle. This checks cheap local structural
 * invariants (bounds, gate/goal presence, obviously-boxed-in cells, adjacent-filter axis traps)
 * by inspecting only a handful of nearby cells. It cannot reason about routes through the rest of
 * the grid, so it both false-positives and false-negatives relative to true solvability. The
 * **solver** (`Solver.ts` / `solverApi.solve`) is the ground truth for "is this level solvable";
 * treat a "not ok" here as an editor hint, and confirm with the solver when it matters. (History:
 * docs/history/development-journal.md, "MustCross Diagonal-Trap Validation Fix".)
 *
 * @param l  the editor working level (structurally a normalized level)
 */
export function validateLevelDetailed(
    l: any,
    opts: { allowGateLess?: boolean } = {},
    pendingPortal: number | null = null,
): { ok: boolean; reasons: string[] } {
    const reasons: string[] = [];
    if (!l) return { ok: false, reasons: ['Level missing'] };
    const allowGateLess = !!opts.allowGateLess;
    const { w, h } = l.grid;

    const inGrid = (k: number) => { const p = UNPACK(k); return inBounds(p.x, p.y, w, h); };
    const addOOB = (label: string, key: number) => {
        const p = UNPACK(key);
        reasons.push(`Out of bounds: ${label} (${p.x + 1},${p.y + 1})`);
    };
    const gateSet = new Set<number>(l.gateKeys);

    // Cross-object occupancy: every cell holds at most one object — an absolute invariant of
    // the game model (mirrors editor-occupancy.ts's getOccupant/placeOccupant one-object-per-cell
    // guard, which only applies to levels built through the editor's click UI). This is the
    // normalized-level counterpart of validateRawLevel's raw-wire-format check in level-schema.ts
    // — that one is the hard gate every level passes through regardless of authoring path; this
    // one gives the same signal to the editor's live feedback and (via generate.mjs/
    // generate-random.mjs's `structural = validateLevelDetailed(normalized)` gate) the stress
    // generator, as a second, independent check on the in-memory representation.
    {
        const occupancy = new Map<number, string>();
        const claim = (label: string, k: number): void => {
            const existing = occupancy.get(k);
            if (existing && existing !== label) {
                const p = UNPACK(k);
                reasons.push(`${label} at (${p.x + 1},${p.y + 1}) overlaps existing ${existing} — each cell may hold only one object`);
            } else {
                occupancy.set(k, label);
            }
        };
        l.gateKeys.forEach((k: number) => claim('gate', k));
        if (l.goalKey !== -1 && l.goalKey !== undefined) claim('goal', l.goalKey);
        (l.falseGoalKeys || new Set()).forEach((k: number) => claim('falseGoal', k));
        (l.landmarkMeta || new Map()).forEach((_v: unknown, k: number) => claim('landmark', k));
        l.blockSet.forEach((k: number) => claim('block', k));
        l.gooseSet.forEach((k: number) => claim('goose', k));
        (l.mustPassKeys || []).forEach((k: number) => claim('mustPass', k));
        (l.mustCrossKeys || []).forEach((k: number) => claim('mustCross', k));
        l.filterMap.forEach((_v: unknown, k: number) => claim('filter', k));
        l.flippingFilterMap.forEach((_v: unknown, k: number) => claim('flippingFilter', k));
        const visitedPortalKeys = new Set<number>();
        let portalPairIdx = 0;
        (l.portalMap || new Map()).forEach((v: { dest: number }, k: number) => {
            if (visitedPortalKeys.has(k)) return;
            visitedPortalKeys.add(k);
            claim(`portal[${portalPairIdx}]`, k);
            if (typeof v?.dest === 'number' && v.dest !== -1 && !visitedPortalKeys.has(v.dest)) {
                visitedPortalKeys.add(v.dest);
                claim(`portal[${portalPairIdx}]`, v.dest);
            }
            portalPairIdx++;
        });
    }

    // Count orthogonal neighbours reachable by the path.
    // A flipping filter not adjacent to this cell can be crossed first,
    // flipping all others — so it exempts adjacent blocking flipping filters.
    const accessibleSides = (cx: number, cy: number, gatesBlock = false) => {
        const adjKeys = new Set([[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => PACK(cx + dx, cy + dy)));
        const hasFreeFlip = Array.from(l.flippingFilterMap.keys()).some((fk: any) => !adjKeys.has(fk));
        let n = 0;
        for (const [dx, dy, horiz] of [[1, 0, true], [-1, 0, true], [0, 1, false], [0, -1, false]] as [number, number, boolean][]) {
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

    l.gateKeys.forEach((k: number) => { if (!inGrid(k)) addOOB('gate', k); });
    if (l.goalKey !== -1 && l.goalKey !== undefined && !inGrid(l.goalKey)) addOOB('goal', l.goalKey);
    l.mustPassKeys.forEach((k: number) => { if (!inGrid(k)) addOOB('mustPass', k); });
    l.mustCrossKeys.forEach((k: number) => { if (!inGrid(k)) addOOB('mustCross', k); });
    l.gooseSet.forEach((k: number)  => { if (!inGrid(k)) addOOB('goose', k); });
    l.blockSet.forEach((k: number)  => { if (!inGrid(k)) addOOB('block', k); });

    let unpaired = false;
    l.portalMap.forEach((v: any, k: number) => {
        if (!l.portalMap.has(v.dest)) unpaired = true;
        if (!inGrid(k)) addOOB('portal', k);
        if (v.dest !== -1 && !inGrid(v.dest)) addOOB('portal', v.dest);
    });
    if (unpaired) reasons.push('Portal terminals incomplete');

    // MustCross structural checks
    // Pre-compute cells orthogonally adjacent to any mustCross key.
    const mustCrossAdjCells = new Set<number>();
    for (const mk of l.mustCrossKeys) {
        if (!inGrid(mk)) continue;
        const mp = UNPACK(mk);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
            mustCrossAdjCells.add(PACK(mp.x + dx, mp.y + dy));
    }
    // A flipping filter not adjacent to any mustCross can be crossed first,
    // potentially flipping the blocking ones before the path reaches them.
    const hasFreeFlipForMustCross = Array.from(l.flippingFilterMap.keys())
        .some((fk: any) => !mustCrossAdjCells.has(fk));

    const isDiagonalTurnObstacle = (key: number) => (
        l.blockSet.has(key) ||
        l.gooseSet.has(key) ||
        l.falseGoalKeys.has(key) ||
        l.filterMap.has(key) ||
        l.flippingFilterMap.has(key) ||
        l.portalMap.has(key) ||
        gateSet.has(key) ||
        l.goalKey === key
    );

    const hasAlternateTurnSpaceAroundDiagonal = (p: { x: number; y: number }, sx: number, sy: number) => {
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
        // terminus. (Verified against Solver: such configs never solve, while a gate OR goal alone
        // on one side stays solvable — so both must be present and opposite to flag.)
        const flanks = (a: number, b: number) => (gateSet.has(a) && l.goalKey === b) || (gateSet.has(b) && l.goalKey === a);
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
        for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
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
        l.landmarkMeta.forEach(({ role }: { role: string }, k: number) => {
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
    const barrier = (k: number) => l.blockSet.has(k);
    const reachableFrom = (startKey: number): Set<number> => {
        if (startKey === -1 || startKey === undefined || barrier(startKey)) return new Set<number>();
        const q       = [startKey];
        const visited = new Set<number>([startKey]);
        let head = 0;
        while (head < q.length) {
            const k = q[head++];
            const p = UNPACK(k);
            const nks = [[0, 1], [0, -1], [1, 0], [-1, 0]]
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
        const hasConnectedGate = l.gateKeys.some((gk: number) => goalReach.has(gk));
        if (!hasConnectedGate) reasons.push('Grid partitioned by barriers');
    }

    return { ok: reasons.length === 0, reasons: Array.from(new Set(reasons)) };
}
