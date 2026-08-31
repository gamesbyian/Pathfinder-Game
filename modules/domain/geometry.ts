// Grid geometry: coordinate transforms, axis transforms, turn-direction transforms.
// These values must stay in sync with APP.Core.AXIS (H=1, V=2) and
// the 8 runtime orientations used throughout the app.

import { flipTurnDir } from './landmark-rules.js';
import type { TurnDir } from './level-schema.js';

const AXIS_H = 1;
const AXIS_V = 2;

/** Orientations 4–7 are reflections (mirror ∘ rotation); 0–3 are pure rotations. */
const REFLECTING_ORIENTATIONS = [4, 5, 6, 7];

/**
 * Map a base-orientation point to its position under one of the 8 orientations.
 * @param orientation 0–7 @param W grid width @param H grid height
 */
export function transformPoint(x: number, y: number, orientation: number, W: number, H: number): { tx: number; ty: number } {
    switch (orientation) {
        case 0: return { tx: x,         ty: y         };
        case 1: return { tx: H - 1 - y, ty: x         };
        case 2: return { tx: W - 1 - x, ty: H - 1 - y };
        case 3: return { tx: y,         ty: W - 1 - x };
        case 4: return { tx: W - 1 - x, ty: y         };
        case 5: return { tx: x,         ty: H - 1 - y };
        case 6: return { tx: y,         ty: x         };
        case 7: return { tx: H - 1 - y, ty: W - 1 - x };
        default: return { tx: x, ty: y };
    }
}

/**
 * Inverse of {@link transformPoint}: map a transformed point back to base orientation.
 * @param orientation 0–7 @param W grid width @param H grid height
 */
export function inverseTransformPoint(tx: number, ty: number, orientation: number, W: number, H: number): { x: number; y: number } {
    switch (orientation) {
        case 0: return { x: tx,         y: ty         };
        case 1: return { x: ty,         y: H - 1 - tx };
        case 2: return { x: W - 1 - tx, y: H - 1 - ty };
        case 3: return { x: W - 1 - ty, y: tx         };
        case 4: return { x: W - 1 - tx, y: ty         };
        case 5: return { x: tx,         y: H - 1 - ty };
        case 6: return { x: ty,         y: tx         };
        case 7: return { x: W - 1 - ty, y: H - 1 - tx };
        default: return { x: tx, y: ty };
    }
}

/**
 * Map an axis (H=1, V=2) through a orientation (some orientations swap H↔V).
 * @param orientation 0–7
 */
export function transformAxis(axis: number, orientation: number): number {
    const swaps = [1, 3, 6, 7];
    if (swaps.includes(orientation)) {
        if (axis === AXIS_H) return AXIS_V;
        if (axis === AXIS_V) return AXIS_H;
    }
    return axis;
}

/**
 * Map a base-orientation turn-direction requirement (cw/ccw/either) to how it must read under
 * one of the 8 orientations. The canonical level data is never rotated/mirrored at
 * runtime (only the display and click-input mapping are — see transformPoint); this is the
 * render-only counterpart to transformAxis, for the mustTurn/adjacentTurn landmark visual cue.
 * A reflection (orientations 4–7) reverses chirality, so cw↔ccw flip; a pure rotation (0–3)
 * preserves it, so the direction is shown unchanged.
 * @param orientation 0–7
 */
export function transformTurnDir(dir: TurnDir, orientation: number): TurnDir {
    return REFLECTING_ORIENTATIONS.includes(orientation) ? flipTurnDir(dir) : dir;
}

/**
 * Turn handedness for a path bending at `fromKey`, given the packed cell keys of the previous,
 * current, and next path nodes. Returns null when the three points are colinear (straight
 * continuation or an exact reversal) — not a turn. Sign of the cross product of the entry vector
 * (prev→from) and exit vector (from→target) determines handedness; y increases downward (screen/
 * canvas convention), so a positive cross product is visually clockwise.
 *
 * This is the single implementation of the turn-detection cross product shared by
 * runtime/path-state.ts (live gameplay), domain/path-validator.ts (the PLAY-context referee,
 * which scripts/validate-hint-paths.mjs and scripts/check-hint-validity.mjs both call rather than
 * reimplementing), and solver/search-state.ts (the DFS/beam search hot path) — previously five
 * independent copies of the same formula, which is exactly the kind of drift that let the game's
 * turn-direction vocabulary silently diverge before.
 */
export function turnDirection(prevKey: number, fromKey: number, targetKey: number): 'cw' | 'ccw' | null {
    const px = prevKey & 0xFFFF, py = (prevKey >>> 16) & 0xFFFF;
    const fx = fromKey & 0xFFFF, fy = (fromKey >>> 16) & 0xFFFF;
    const tx = targetKey & 0xFFFF, ty = (targetKey >>> 16) & 0xFFFF;
    const cross = (fx - px) * (ty - fy) - (fy - py) * (tx - fx);
    if (cross === 0) return null;
    return cross > 0 ? 'cw' : 'ccw';
}
