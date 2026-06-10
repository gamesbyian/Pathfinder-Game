// Grid geometry: coordinate transforms, axis transforms.
// These values must stay in sync with APP.Core.AXIS (H=1, V=2) and
// the 8 level-variant orientations used throughout the app.

const AXIS_H = 1;
const AXIS_V = 2;

export function transformPoint(x, y, variant, W, H) {
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

export function inverseTransformPoint(tx, ty, variant, W, H) {
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

export function transformAxis(axis, variant) {
    const swaps = [1, 3, 6, 7];
    if (swaps.includes(variant)) {
        if (axis === AXIS_H) return AXIS_V;
        if (axis === AXIS_V) return AXIS_H;
    }
    return axis;
}
