// @ts-check
// Shared SolverV2 cell-key and axis encoding primitives.
// Kept tiny and dependency-free so solver support modules can share the same
// packed-coordinate contract without importing the full solver implementation.

/** @type {(x: number, y: number) => number} */
export const PACK = (x, y) => ((y << 16) | x) >>> 0;

// Max PACK key for a 15x15 grid = PACK(14,14) = (14<<16)|14 = 917518.
// Use 1<<20 = 1048576 to cover all current grid sizes safely.
export const KEY_SPACE = 1 << 20;

export const AXIS_H = 1; // horizontal move (dx != 0)
export const AXIS_V = 2; // vertical move (dy != 0)
export const AXIS_NONE = 0;

/** Count set bits in a 32-bit integer. @param {number} n @returns {number} */
export function popcount(n) {
    let c = 0;
    for (let x = n; x; x >>>= 1) c += x & 1;
    return c;
}
