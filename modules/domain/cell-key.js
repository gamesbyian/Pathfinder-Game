// @ts-check
// Packed-integer coordinate encoding for the level grid.
// Every level structure stores cell positions as packed keys rather than {x,y} objects.
// Grid coordinates are 0-based internally; raw level data uses 1-based coordinates.

/** A grid cell encoded as a single integer `(y << 16) | x` (0-based). @typedef {number} PackedKey */

/** @type {(x: number, y: number) => PackedKey} */
export const PACK = (x, y) => (y << 16) | x;
/** @type {(k: PackedKey) => { x: number, y: number }} */
export const UNPACK = (k) => ({ x: k & 0xFFFF, y: k >> 16 });
/** @type {(x: number, y: number, w: number, h: number) => boolean} */
export const inBounds = (x, y, w, h) => x >= 0 && x < w && y >= 0 && y < h;
