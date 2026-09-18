#!/usr/bin/env node
/**
 * Sizes Lane A's C0 signature-collision experiment (docs/solver-separator-dynamic-interface-
 * contract-preflight.md) from the already-frozen crossing population, deduplicating by the
 * interface's ACTUAL cut-cell identity rather than by (level, target label).
 *
 * WHY DEDUPLICATE. Two differently-named targets on the same level (e.g. `goal` and a `mustPass`
 * cell sitting behind the same chokepoint) can share identical `cutCells` -- the same geometric
 * interface -- and therefore the same crossing prefixes. Grouping by (level, target, targetKey), as
 * lane-a-frozen-prefix-population.mjs's own crossingRows are indexed, over-counts: testing the same
 * prefix under two target labels is not two independent C0 signature groups. This script groups by
 * (levelId, sorted cutCells) instead, which is the real C0 signature.
 *
 * Zero new solver compute: pure re-analysis of already-frozen artifacts.
 *
 * Usage:
 *   node scripts/stress/lane-a-c0-collision-population-size.mjs -- \
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
const MIN_GROUP_SIZE = Number(arg('min-group-size', '2'));

const readJson = (file) => JSON.parse(readFileSync(path.resolve(ROOT, file), 'utf8'));

const population = readJson(POPULATION_FILE);
const geometry = readJson(GEOMETRY_FILE);
const geometryByLevel = new Map(geometry.levels.map((l) => [l.id, l]));

const groupsByCutSignature = new Map();
for (const row of population.crossingRows) {
    const level = geometryByLevel.get(row.levelId);
    const iface = level.interfaces.find((i) => i.target === row.interfaceTarget && i.targetKey === row.interfaceTargetKey);
    const cutSignature = `${row.levelId}:${[...iface.cutCells].sort((a, b) => a - b).join(',')}`;
    if (!groupsByCutSignature.has(cutSignature)) groupsByCutSignature.set(cutSignature, new Map());
    groupsByCutSignature.get(cutSignature).set(row.caseId, row);
}

const groups = [...groupsByCutSignature.entries()].map(([signature, rows]) => ({
    signature, levelId: signature.split(':')[0], rows: [...rows.values()],
}));
const eligibleGroups = groups.filter((g) => g.rows.length >= MIN_GROUP_SIZE);
const totalQueries = eligibleGroups.reduce((sum, g) => sum + g.rows.length, 0);
const distinctLevels = new Set(eligibleGroups.map((g) => g.levelId));

const summary = {
    distinctGeometricCutsWithAnyCrossing: groups.length,
    distinctGeometricCutsEligible: eligibleGroups.length,
    minGroupSize: MIN_GROUP_SIZE,
    totalQueriesNeeded: totalQueries,
    distinctLevelsInEligiblePopulation: distinctLevels.size,
};
console.log(JSON.stringify(summary, null, 2));
