#!/usr/bin/env node
/**
 * Generates data/level-heatmaps.json — a companion file to data/levels.json
 * that records, per level, how often each grid cell is used across every
 * saved hint path (verified solution).
 *
 * Usage:
 *   node scripts/generate-level-heatmaps.mjs
 *   node scripts/generate-level-heatmaps.mjs --output=data/level-heatmaps.json
 *
 * Exports buildLevelHeatmap() and collectObjectCells() so other scripts
 * (e.g. level-heatmap-report.mjs) can reuse the same logic without
 * re-reading the generated file.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url).pathname;

// Local re-implementation of modules/domain/cell-key.js UNPACK to keep this
// script dependency-free from the browser-facing module graph.
const UNPACK = (k) => ({ x: k & 0xFFFF, y: k >>> 16 });

/**
 * Collects every grid cell occupied by a non-path game object (gates, goal,
 * blocks, must-pass/cross, filters, portals, geese, landmarks, ...) as a Set
 * of "x,y" strings in the same 1-indexed coordinate space as raw level JSON.
 */
export function collectObjectCells(raw) {
    const cells = new Set();
    const add = (x, y) => cells.add(`${x},${y}`);
    (raw.gates || []).forEach(g => add(g.x, g.y));
    if (raw.goal) add(raw.goal.x, raw.goal.y);
    (raw.falseGoals || []).forEach(g => add(g.x, g.y));
    (raw.blocks || []).forEach(b => add(b.x, b.y));
    (raw.mustPass || []).forEach(m => add(m.x, m.y));
    (raw.mustCross || []).forEach(m => add(m.x, m.y));
    (raw.filters || []).forEach(f => add(f.x, f.y));
    (raw.flippingFilters || []).forEach(f => add(f.x, f.y));
    (raw.portals || []).forEach(p => { add(p.x1, p.y1); add(p.x2, p.y2); });
    (raw.geese || []).forEach(g => add(g.x, g.y));
    (raw.landmarks || []).forEach(lm => add(lm.x, lm.y));
    return cells;
}

/**
 * Builds the per-cell heat data for one level from its saved hint paths.
 * Hint cells are packed 0-indexed keys; output matrices are 0-indexed
 * (row = y, col = x) but represent the same 1-indexed grid as levels.json
 * (cell (x,y) in wire coordinates lives at heatmap[y-1][x-1]).
 *
 * - heatmap:     # of distinct saved hint paths that visit each cell at least once
 * - visitTotals: cumulative visits across all hints (counts revisits within a path)
 */
export function buildLevelHeatmap(raw) {
    const w = raw.grid.w, h = raw.grid.h;
    const heatmap = Array.from({ length: h }, () => new Array(w).fill(0));
    const visitTotals = Array.from({ length: h }, () => new Array(w).fill(0));
    const hints = raw.hints || [];
    for (const hint of hints) {
        const seen = new Set();
        for (const key of hint) {
            const { x: x0, y: y0 } = UNPACK(key);
            if (x0 < 0 || x0 >= w || y0 < 0 || y0 >= h) continue;
            visitTotals[y0][x0] += 1;
            if (!seen.has(key)) {
                heatmap[y0][x0] += 1;
                seen.add(key);
            }
        }
    }
    return { heatmap, visitTotals, hintCount: hints.length };
}

function loadRawLevels() {
    const filePath = path.join(ROOT, 'data', 'levels.json');
    const levels = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!Array.isArray(levels) || levels.length === 0) throw new Error('data/levels.json is empty or not an array');
    return levels;
}

// Compact single-line array formatting for numeric matrices — JSON.stringify's
// pretty-printer would otherwise put one number per line (15336 cells x 2 matrices).
function formatMatrix(matrix, indent) {
    const pad = ' '.repeat(indent);
    const rowPad = ' '.repeat(indent + 2);
    const rows = matrix.map(row => `${rowPad}${JSON.stringify(row)}`);
    return `[\n${rows.join(',\n')}\n${pad}]`;
}

export function buildOutput(rawLevels) {
    const levels = rawLevels.map((raw, i) => {
        const { heatmap, visitTotals, hintCount } = buildLevelHeatmap(raw);
        return {
            level: i + 1,
            grid: { w: raw.grid.w, h: raw.grid.h },
            hintCount,
            heatmap,
            visitTotals
        };
    });
    return {
        generatedAt: new Date().toISOString(),
        source: 'data/levels.json',
        description: 'Per-level visitation heat maps derived from saved hint paths (verified solutions). '
            + 'Coordinates are 1-indexed to match data/levels.json: heatmap[row][col] is grid cell '
            + '(x=col+1, y=row+1). heatmap = # of distinct hint paths visiting the cell at least once; '
            + 'visitTotals = cumulative visits across all hints (counts in-path revisits/intersections).',
        levels
    };
}

export function serialize(output) {
    const placeholders = new Map();
    let counter = 0;
    const withPlaceholders = {
        ...output,
        levels: output.levels.map(lvl => {
            const heatmapToken = `__MATRIX_${counter++}__`;
            const visitTotalsToken = `__MATRIX_${counter++}__`;
            placeholders.set(heatmapToken, formatMatrix(lvl.heatmap, 8));
            placeholders.set(visitTotalsToken, formatMatrix(lvl.visitTotals, 8));
            return { ...lvl, heatmap: heatmapToken, visitTotals: visitTotalsToken };
        })
    };
    let json = JSON.stringify(withPlaceholders, null, 2);
    for (const [token, replacement] of placeholders) {
        json = json.replace(`"${token}"`, replacement);
    }
    return json;
}

// Builds and writes the full heatmaps file from a raw levels array — shared by this
// script's CLI entrypoint and by other scripts (e.g. import-published-levels.mjs) that
// need to regenerate heatmaps after appending levels. `outputPath` may be relative
// (resolved against the repo root) or absolute.
export function writeHeatmapsFile(rawLevels, outputPath) {
    const output = buildOutput(rawLevels);
    const json = serialize(output);
    const resolvedOutput = path.isAbsolute(outputPath) ? outputPath : path.join(ROOT, outputPath);
    writeFileSync(resolvedOutput, json + '\n');
    return output;
}

function main() {
    const args = process.argv.slice(2);
    const argMap = new Map(args.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
    const outputPath = argMap.get('--output') || path.join('data', 'level-heatmaps.json');

    const output = writeHeatmapsFile(loadRawLevels(), outputPath);
    console.log(`Wrote heatmaps for ${output.levels.length} levels to ${outputPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
