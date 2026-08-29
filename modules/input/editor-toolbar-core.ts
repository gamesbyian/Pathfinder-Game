// Pure decision logic extracted from editor-toolbar-controller (DOM-free, unit-tested):
// the grid-resize feasibility/shift planner and the false-goal-trigger-search retry budget.

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
 * False-goal-trigger-search retry budget: double the previous limit (or the base budget), floored at 10s and
 * capped at 480s. (TEMP 2026-03-29: ceiling raised from 120000ms; revert target is 120000ms.)
 */
export function computeFalseGoalTriggerRetryBudget(prevTimeLimit: number | undefined | null, budgetMs: number): number {
    return Math.min(480000, Math.max((prevTimeLimit || budgetMs) * 2, 10000));
}

export interface FalseGoalTriggerSearchOutcome {
    status?: string;
    timedOut?: boolean;
    gatesCompleted?: number;
    totalGates?: number;
}

export interface TrapReportDecision {
    message: string;
    tone: 'info' | 'warning';
    /** true → the search was incomplete (timed out); pressing Trap Spots again re-runs it
     *  with an escalated budget (computeFalseGoalTriggerRetryBudget) — no confirmation prompt. */
    offerRetry: boolean;
}

/**
 * Decide the user-facing outcome of a trap-spot search: message wording and severity.
 * An incomplete sweep is ALWAYS surfaced — even when spots were found — so a partial
 * result is never shown as if it were complete.
 */
export function decideFalseGoalTriggerReport(res: FalseGoalTriggerSearchOutcome, foundCount: number): TrapReportDecision {
    const s = (n: number) => (n === 1 ? '' : 's');
    if (res.status === 'aborted') {
        return {
            message: foundCount > 0
                ? `Search cancelled — ${foundCount} spot${s(foundCount)} found so far (incomplete).`
                : 'Search cancelled.',
            tone: 'warning',
            offerRetry: false,
        };
    }
    if (!res.timedOut) {
        return foundCount > 0
            ? { message: `Found ${foundCount} spot${s(foundCount)}.`, tone: 'info', offerRetry: false }
            : { message: 'No valid trap spots — no path can end on any empty cell at these settings.', tone: 'warning', offerRetry: false };
    }
    // gatesCompleted counts gates whose DFS ran to exhaustion (fully proven), not gates
    // attempted — so say "fully swept", or "0/2 gates" next to "Found 36 spots" reads
    // like the search never ran.
    return {
        message: foundCount > 0
            ? `Found ${foundCount} spot${s(foundCount)} so far, but time ran out with only ${res.gatesCompleted} of ${res.totalGates} gate${s(res.totalGates ?? 0)} fully swept — press Trap Spots again to search deeper.`
            : `Time ran out with ${res.gatesCompleted} of ${res.totalGates} gate${s(res.totalGates ?? 0)} fully swept and no spots found yet — press Trap Spots again to search deeper.`,
        tone: 'warning',
        offerRetry: true,
    };
}

export interface AnchorRect { top: number; bottom: number; left: number; width: number; }

/**
 * Place the palette variant popup relative to its anchor button: centered above it,
 * flipping below when there's no headroom, clamped to the viewport with a margin.
 */
export function computeVariantPopupPosition(
    anchor: AnchorRect,
    popupW: number,
    popupH: number,
    viewportW: number,
    margin = 8,
): { top: number; left: number } {
    let top = anchor.top - popupH - margin;
    let left = anchor.left + anchor.width / 2 - popupW / 2;
    if (top < margin) top = anchor.bottom + margin;
    if (left < margin) left = margin;
    if (left + popupW > viewportW - margin) left = viewportW - popupW - margin;
    return { top, left };
}
