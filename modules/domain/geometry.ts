// Grid geometry: coordinate transforms, axis transforms.
// These values must stay in sync with APP.Core.AXIS (H=1, V=2) and
// the 8 level-variant orientations used throughout the app.

const AXIS_H = 1;
const AXIS_V = 2;

/**
 * Map a base-orientation point to its position under one of the 8 variant orientations.
 * @param variant 0–7 @param W grid width @param H grid height
 */
export function transformPoint(x: number, y: number, variant: number, W: number, H: number): { tx: number; ty: number } {
    switch (variant) {
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
 * @param variant 0–7 @param W grid width @param H grid height
 */
export function inverseTransformPoint(tx: number, ty: number, variant: number, W: number, H: number): { x: number; y: number } {
    switch (variant) {
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
 * Map an axis (H=1, V=2) through a variant orientation (some variants swap H↔V).
 * @param variant 0–7
 */
export function transformAxis(axis: number, variant: number): number {
    const swaps = [1, 3, 6, 7];
    if (swaps.includes(variant)) {
        if (axis === AXIS_H) return AXIS_V;
        if (axis === AXIS_V) return AXIS_H;
    }
    return axis;
}
