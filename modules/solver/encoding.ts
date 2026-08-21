// Shared dependency-free solver cell-key/axis primitives.
export const PACK = (x: number, y: number): number => ((y << 16) | x) >>> 0;

/** Covers all current <=15x15 packed grid keys. */
export const KEY_SPACE = 1 << 20;

export const AXIS_H = 1; // horizontal move
export const AXIS_V = 2; // vertical move
export const AXIS_NONE = 0;

/** Fixed neighbor order shared by prep/search-state; slot index determines move axis. */
export const NEIGHBOR_DX = [1, -1, 0, 0];
export const NEIGHBOR_DY = [0, 0, 1, -1];
export const NEIGHBOR_AXIS = [AXIS_H, AXIS_H, AXIS_V, AXIS_V];

/** Count set bits in a 32-bit integer. */
export function popcount(n: number): number {
    let c = 0;
    for (let x = n; x; x >>>= 1) c += x & 1;
    return c;
}
