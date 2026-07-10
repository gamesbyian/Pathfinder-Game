// Shared Solver cell-key and axis encoding primitives.
// Kept tiny and dependency-free so solver support modules can share the same
// packed-coordinate contract without importing the full solver implementation.

export const PACK = (x: number, y: number): number => ((y << 16) | x) >>> 0;

// Max PACK key for a 15x15 grid = PACK(14,14) = (14<<16)|14 = 917518.
// Use 1<<20 = 1048576 to cover all current grid sizes safely.
export const KEY_SPACE = 1 << 20;

export const AXIS_H = 1; // horizontal move (dx != 0)
export const AXIS_V = 2; // vertical move (dy != 0)
export const AXIS_NONE = 0;

// Fixed 4-neighbor direction order shared between prep.ts (which builds each cell's static
// adjacency into a fixed-stride flat array, one slot per direction) and search-state.ts
// (which reads it) — the two must agree on direction-index-to-axis so the axis a move used
// can be derived from its slot index alone, instead of storing it as separate data per slot.
export const NEIGHBOR_DX = [1, -1, 0, 0];
export const NEIGHBOR_DY = [0, 0, 1, -1];
export const NEIGHBOR_AXIS = [AXIS_H, AXIS_H, AXIS_V, AXIS_V];

/** Count set bits in a 32-bit integer. */
export function popcount(n: number): number {
    let c = 0;
    for (let x = n; x; x >>>= 1) c += x & 1;
    return c;
}
