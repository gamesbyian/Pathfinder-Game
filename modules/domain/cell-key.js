// Packed-integer coordinate encoding for the level grid.
// Every level structure stores cell positions as packed keys rather than {x,y} objects.
// Grid coordinates are 0-based internally; raw level data uses 1-based coordinates.

export const PACK = (x, y) => (y << 16) | x;
export const UNPACK = (k) => ({ x: k & 0xFFFF, y: k >> 16 });
export const inBounds = (x, y, w, h) => x >= 0 && x < w && y >= 0 && y < h;
