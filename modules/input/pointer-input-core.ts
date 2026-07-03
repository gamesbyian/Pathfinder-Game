// Pure decision logic extracted from pointer-input-controller (DOM-free, unit-tested):
// what a pointer-down on the grid should DO, given the current state — the controller
// gathers inputs from the event/state and applies the returned decision.
import { UNPACK } from '../domain/cell-key.js';

export type EditorCellAction =
    | { action: 'pickup' }
    | { action: 'place' }
    | { action: 'empty-click'; nextEmptyClickCount: number; showPencilHint: boolean };

/**
 * Editor/review pointer-down on a grid cell (pencil mode off): pick up an occupant,
 * place the selected tool, or count an empty click (two in a row hints at the pencil).
 */
export function decideEditorCellAction(
    { hasOccupant, hasSelectedTool, emptyClickCount }:
        { hasOccupant: boolean; hasSelectedTool: boolean; emptyClickCount: number },
): EditorCellAction {
    if (hasOccupant) return { action: 'pickup' };
    if (hasSelectedTool) return { action: 'place' };
    const next = emptyClickCount + 1;
    return { action: 'empty-click', nextEmptyClickCount: next, showPencilHint: next >= 2 };
}

/**
 * Pencil mode: should a tap reverse the path's drawing direction? Reversal makes sense
 * when the player grabs the path nearer its tail than its head — either by tapping a cell
 * in the first half of the path, or by tapping empty space closer to the tail end.
 */
export function shouldReversePencilPath(path: number[], tapKey: number, tapCoord: { x: number; y: number }): boolean {
    if (path.length === 0) return false;
    const idx = path.indexOf(tapKey);
    if (idx !== -1) return idx < path.length / 2;
    const headP = UNPACK(path[path.length - 1]);
    const tailP = UNPACK(path[0]);
    const distHead = Math.abs(tapCoord.x - headP.x) + Math.abs(tapCoord.y - headP.y);
    const distTail = Math.abs(tapCoord.x - tailP.x) + Math.abs(tapCoord.y - tailP.y);
    return distTail < distHead;
}

/**
 * Which gate should a path-start tap activate? The tapped cell itself when it is a gate;
 * otherwise the nearest gate sharing the tap's row or column (so a tap "toward" a gate
 * starts there and the first drag step heads for the tap). Null when no gate qualifies.
 */
export function findNearestAxisGate(gateKeys: number[], tapKey: number, tapCoord: { x: number; y: number }): number | null {
    if (gateKeys.includes(tapKey)) return tapKey;
    let bestGate: number | null = null;
    let minDist = Infinity;
    for (const gk of gateKeys) {
        const gp = UNPACK(gk);
        if (tapCoord.x !== gp.x && tapCoord.y !== gp.y) continue;
        const dist = Math.abs(tapCoord.x - gp.x) + Math.abs(tapCoord.y - gp.y);
        if (dist > 0 && dist < minDist) { minDist = dist; bestGate = gk; }
    }
    return bestGate;
}
