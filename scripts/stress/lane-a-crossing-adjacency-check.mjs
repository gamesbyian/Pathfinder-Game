#!/usr/bin/env node
/**
 * Lane A: classifies each frozen crossing prefix (lane-a-frozen-prefix-population.mjs) by whether
 * its gate-side -> remainder-side transition happens over a single grid-adjacent step, or over a
 * non-adjacent recorded waypoint pair (a multi-cell macro-move run or a portal jump, both legal
 * single "moves" in the solver's own path representation -- see
 * reports/2026-09-18-lane-a-local-exact-labeling-pipeline-validation-001.md for why non-adjacent
 * consecutive waypoints are expected, not a bug).
 *
 * Zero new solver compute: pure re-analysis of the already-frozen population and geometry
 * artifacts. This informs the C1 "incoming/outgoing direction / heading continuity" contract layer
 * (docs/solver-separator-dynamic-interface-contract-preflight.md): if a large share of crossings are
 * non-adjacent, a C1 encoding cannot assume a simple single-step heading at the crossing point and
 * must account for portal-jump boundary state explicitly, as the preflight's own C1 spec already
 * anticipates ("portal-jump boundary state only when the crossing itself requires it").
 *
 * Usage:
 *   node scripts/stress/lane-a-crossing-adjacency-check.mjs -- \
 *     --population=reports/stress/lane-a-frozen-prefix-population-2026-09-18.json \
 *     --geometry=reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };

const POPULATION_FILE = arg('population', 'reports/stress/lane-a-frozen-prefix-population-2026-09-18.json');
const GEOMETRY_FILE = arg('geometry', 'reports/stress/class5-separator-decomposition-census-2026-09-18-with-geometry.json');

const readJson = (file) => JSON.parse(readFileSync(path.resolve(ROOT, file), 'utf8'));

function unpackXY(key) {
    return [key & 0xffff, key >>> 16];
}

const population = readJson(POPULATION_FILE);
const geometry = readJson(GEOMETRY_FILE);
const geometryByLevel = new Map(geometry.levels.map((l) => [l.id, l]));

let adjacentCrossings = 0;
let nonAdjacentCrossings = 0;
let noCleanTransition = 0;
const nonAdjacentByLevel = new Map();

for (const row of population.crossingRows) {
    const level = geometryByLevel.get(row.levelId);
    const iface = level.interfaces.find((i) => i.target === row.interfaceTarget && i.targetKey === row.interfaceTargetKey);
    const gateSet = new Set(iface.gateSideCells);
    const remSet = new Set(iface.remainderSideCells);
    const prefix = row.prefix;

    let lastSide = null;
    let transitionIndex = -1;
    for (let i = 0; i < prefix.length; i++) {
        const cell = prefix[i];
        const side = gateSet.has(cell) ? 'gate' : remSet.has(cell) ? 'rem' : null;
        if (side && lastSide && side !== lastSide) { transitionIndex = i; break; }
        if (side) lastSide = side;
    }
    if (transitionIndex === -1) { noCleanTransition++; continue; }

    const [ax, ay] = unpackXY(prefix[transitionIndex - 1]);
    const [bx, by] = unpackXY(prefix[transitionIndex]);
    const manhattanDistance = Math.abs(ax - bx) + Math.abs(ay - by);
    if (manhattanDistance === 1) {
        adjacentCrossings++;
    } else {
        nonAdjacentCrossings++;
        nonAdjacentByLevel.set(row.levelId, (nonAdjacentByLevel.get(row.levelId) ?? 0) + 1);
    }
}

const total = population.crossingRows.length;
const summary = {
    totalCrossingRows: total,
    adjacentCrossings,
    nonAdjacentCrossings,
    noCleanTransition,
    adjacentRate: adjacentCrossings / total,
    nonAdjacentRate: nonAdjacentCrossings / total,
    levelsWithAnyNonAdjacentCrossing: nonAdjacentByLevel.size,
};
console.log(JSON.stringify(summary, null, 2));
