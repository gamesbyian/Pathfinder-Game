// @ts-check
import { UNPACK } from './cell-key.js';

/**
 * Builds a per-cell visitation heat map across a list of hint paths.
 * Each path contributes at most 1 to a cell's count (in-path revisits are
 * deduped) so count/pathList.length is always a clean [0,1] intensity.
 * @param {number[][]} [pathList] paths as arrays of packed keys
 * @returns {Map<number, number>} packed key → number of paths visiting it
 */
export function buildPathListHeatmap(pathList = []) {
    /** @type {Map<number, number>} */
    const heatmap = new Map();
    for (const path of pathList) {
        /** @type {Set<number>} */
        const seen = new Set();
        for (const key of path) {
            if (seen.has(key)) continue;
            seen.add(key);
            heatmap.set(key, (heatmap.get(key) || 0) + 1);
        }
    }
    return heatmap;
}

/**
 * Converts a heat map into renderable cells with normalized intensity.
 * @param {Map<number, number>} heatmap @param {number} pathCount
 * @returns {{ x: number, y: number, intensity: number }[]}
 */
export function heatmapToCells(heatmap, pathCount) {
    if (!heatmap || !pathCount) return [];
    const cells = [];
    for (const [key, count] of heatmap) {
        const { x, y } = UNPACK(key);
        cells.push({ x, y, intensity: count / pathCount });
    }
    return cells;
}
