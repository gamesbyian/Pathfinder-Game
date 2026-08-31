import { PACK, UNPACK } from '../domain/cell-key.js';
import { remapLevelKeys } from '../domain/level-codec.js';

/** Mutate a working editor level by shifting every packed coordinate key. */
export function shiftLevelCoords(level: any, dx: number, dy: number) {
    if (dx === 0 && dy === 0) return;
    const shift = (key: number) => {
        const point = UNPACK(key);
        return PACK(point.x + dx, point.y + dy);
    };
    remapLevelKeys(level, shift);
    level.hints = [];
}

/**
 * Mutate a working editor level through a coordinate map, including grid size, directional axes,
 * and reflection chirality. Surrounding navigation/UI state remains controller-owned.
 */
export function applyCoordMapToLevel(
    level: any,
    coordMap: (x: number, y: number) => { x: number; y: number },
    newW: number,
    newH: number,
    axisMap: (axis: any) => any,
    reflect = false,
) {
    const mapKey = (key: number) => {
        const point = UNPACK(key);
        const mapped = coordMap(point.x, point.y);
        return PACK(mapped.x, mapped.y);
    };
    remapLevelKeys(level, mapKey, { axisMap, reflect });
    level.grid.w = newW;
    level.grid.h = newH;
    level.hints = [];
}
