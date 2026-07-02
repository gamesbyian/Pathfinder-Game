// Packed-integer coordinate encoding for the level grid.
// Every level structure stores cell positions as packed keys rather than {x,y} objects.
// Grid coordinates are 0-based internally; raw level data uses 1-based coordinates.

/** A grid cell encoded as a single integer `(y << 16) | x` (0-based). */
export type PackedKey = number;

export const PACK = (x: number, y: number): PackedKey => (y << 16) | x;

export const UNPACK = (k: PackedKey): { x: number; y: number } => ({ x: k & 0xFFFF, y: k >> 16 });

/**
 * Chessboard parity of a cell: `(x + y) & 1`. Each orthogonal step flips it, so parity is
 * the basis for the solver's parity pruning and gate pre-filtering. Computed directly from
 * the packed key to avoid an UNPACK allocation on the hot search path.
 */
export const keyParity = (k: PackedKey): number => ((k & 0xFFFF) + ((k >>> 16) & 0xFFFF)) & 1;

export const inBounds = (x: number, y: number, w: number, h: number): boolean =>
    x >= 0 && x < w && y >= 0 && y < h;
