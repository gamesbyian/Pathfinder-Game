// Pure decision logic extracted from editor-toolbar-controller (DOM-free, unit-tested):
// the grid-resize feasibility/shift planner and the trap-search retry budget.

export interface GridBounds { minX: number; maxX: number; minY: number; maxY: number; }
export interface Coord { x: number; y: number; }

export type GridResizePlan =
    | { ok: false; reason: 'limit' | 'blocking' | 'mustcross-edge'; message: string }
    | { ok: true; newSize: number; shiftX: number; shiftY: number; pathOutOfBounds: boolean };

const MIN_GRID = 6;
const MAX_GRID = 15;

/**
 * Decide whether a square grid can be resized by `delta`, and how. Mirrors the editor's
 * changeGridSize feasibility checks exactly:
 *  - reject outside [6, 15];
 *  - reject a shrink that can't fit the occupied bounds ('blocking');
 *  - compute the shift needed to keep occupied content in-bounds;
 *  - reject a shrink that would push a must-cross cell onto the new edge;
 *  - report whether the current path would fall out of the new bounds (→ caller clears it).
 *
 * @param size            current grid width (== height; grids are square here)
 * @param delta           +1 / -1
 * @param bounds          occupied-cell bounds, or null when the grid is empty
 * @param mustCrossCoords must-cross cells in 0-indexed grid coords
 * @param pathCoords      current path cells in 0-indexed grid coords
 */
export function planGridResize(
    size: number,
    delta: number,
    bounds: GridBounds | null,
    mustCrossCoords: Coord[],
    pathCoords: Coord[],
): GridResizePlan {
    const newSize = size + delta;
    if (newSize < MIN_GRID || newSize > MAX_GRID) {
        return { ok: false, reason: 'limit', message: 'Size limit reached' };
    }
    let shiftX = 0, shiftY = 0;
    if (bounds) {
        const width  = bounds.maxX - bounds.minX + 1;
        const height = bounds.maxY - bounds.minY + 1;
        if (newSize < width || newSize < height) {
            return { ok: false, reason: 'blocking', message: 'Cannot shrink: items blocking' };
        }
        if (bounds.maxX >= newSize) shiftX = newSize - 1 - bounds.maxX;
        if (bounds.maxY >= newSize) shiftY = newSize - 1 - bounds.maxY;
    }
    if (delta < 0 && mustCrossCoords.some((p) => {
        const nx = p.x + shiftX;
        const ny = p.y + shiftY;
        return nx === 0 || nx === newSize - 1 || ny === 0 || ny === newSize - 1;
    })) {
        return { ok: false, reason: 'mustcross-edge', message: 'Cannot shrink: MustCross near edge' };
    }
    const pathOutOfBounds = pathCoords.some((p) => p.x < 0 || p.y < 0 || p.x >= newSize || p.y >= newSize);
    return { ok: true, newSize, shiftX, shiftY, pathOutOfBounds };
}

/**
 * Trap-search retry budget: double the previous limit (or the base budget), floored at 10s and
 * capped at 480s. (TEMP 2026-03-29: ceiling raised from 120000ms; revert target is 120000ms.)
 */
export function computeTrapRetryBudget(prevTimeLimit: number | undefined | null, budgetMs: number): number {
    return Math.min(480000, Math.max((prevTimeLimit || budgetMs) * 2, 10000));
}
