import { UNPACK } from './cell-key.js';

/**
 * Builds a per-cell visitation heat map across a list of hint paths.
 * Each path contributes at most 1 to a cell's count (in-path revisits are
 * deduped) so count/pathList.length is always a clean [0,1] intensity.
 * @param pathList paths as arrays of packed keys
 * @returns packed key → number of paths visiting it
 */
export function buildPathListHeatmap(pathList: number[][] = []): Map<number, number> {
    const heatmap = new Map<number, number>();
    for (const path of pathList) {
        const seen = new Set<number>();
        for (const key of path) {
            if (seen.has(key)) continue;
            seen.add(key);
            heatmap.set(key, (heatmap.get(key) || 0) + 1);
        }
    }
    return heatmap;
}

/** Converts a heat map into renderable cells with normalized intensity. */
export function heatmapToCells(heatmap: Map<number, number>, pathCount: number): { x: number; y: number; intensity: number }[] {
    if (!heatmap || !pathCount) return [];
    const cells: { x: number; y: number; intensity: number }[] = [];
    for (const [key, count] of heatmap) {
        const { x, y } = UNPACK(key);
        cells.push({ x, y, intensity: count / pathCount });
    }
    return cells;
}
