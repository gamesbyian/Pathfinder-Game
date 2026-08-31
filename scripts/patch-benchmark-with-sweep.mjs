#!/usr/bin/env node
/**
 * Overlays a targeted subset-sweep's per-level rows (e.g. the high-budget unsolved-only sweep) onto
 * an existing full-coverage benchmark.mjs-shaped report, by id, and rewrites the summary counters
 * to match. Needed because compile-baseline.mjs's --verify only patches its batch-derived fallback
 * bucket (for ids the --official file doesn't cover) -- once an --official file already covers the
 * whole corpus (as reports/stress/solver-corpus2-latest.json does), --verify has nothing left to
 * override. Producing a patched "official" file first, then feeding IT to compile-baseline.mjs,
 * reuses that tool's real extension point instead of fighting the --verify bucket it doesn't apply to.
 *
 * Usage:
 *   node scripts/patch-benchmark-with-sweep.mjs --base=reports/stress/solver-corpus2-latest.json \
 *       --sweep=reports/stress/highbudget-unsolved-sweep-corpus2-2026-07-24.json \
 *       --out=reports/stress/benchmark-latest-random-patched-2026-07-24.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const basePath = args.get('--base');
const sweepPath = args.get('--sweep');
const outPath = args.get('--out');
if (!basePath || !sweepPath || !outPath) {
    console.error('Usage: node scripts/patch-benchmark-with-sweep.mjs --base=<file> --sweep=<file> --out=<file>');
    process.exit(2);
}

const root = process.cwd();
const readJson = (p) => JSON.parse(readFileSync(path.resolve(root, p), 'utf8'));

const base = readJson(basePath);
const sweep = readJson(sweepPath);

const sweepById = new Map(sweep.levels.map(lv => [lv.id, lv]));
let overridden = 0;
const overriddenIds = [];
const patchedLevels = base.levels.map(lv => {
    const sweepRow = sweepById.get(lv.id);
    if (!sweepRow) return lv;
    overridden++;
    overriddenIds.push(lv.id);
    return { ...sweepRow, baselineSource: 'verified', sourcePatch: sweepPath };
});

const solved = patchedLevels.filter(lv => lv.ok).length;
const patched = {
    ...base,
    levels: patchedLevels,
    solved,
    failed: patchedLevels.length - solved,
    patchedFrom: basePath,
    patchedWith: sweepPath,
    patchedAt: new Date().toISOString(),
    patchedOverriddenCount: overridden,
};

writeFileSync(path.resolve(root, outPath), JSON.stringify(patched, null, 1));
console.log(`Patched ${overridden} level(s) from ${sweepPath} onto ${basePath} -> ${outPath}`);
console.log(`New solved count: ${solved}/${patchedLevels.length} (was ${base.solved}/${base.total ?? base.levels.length})`);
console.log(`Overridden ids: ${overriddenIds.join(', ')}`);
