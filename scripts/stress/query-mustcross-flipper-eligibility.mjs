#!/usr/bin/env node
/**
 * Feature-only eligibility query for attempts.ts's isMustCrossFlipperHeavy predicate (must-cross-
 * heavy archetype AND mustPass >= POLICY.OBJECTIVE_HEAVY_MUSTPASS AND flippers >=
 * POLICY.FLIPPER_HEAVY), the routing gate STRATEGY_MUSTCROSS_FLIPPER_WIDE_BEAM_EXPOSURE extends.
 *
 * Structural-feature-only: computes normalizeRawLevel()+detectArchetype() on each row and counts
 * against the exact same field values attempts.ts's extractFeatures() reads (mustPassKeys.length,
 * flippingFilterMap.size). It never runs the solver, so it is safe to use before a decision-bearing
 * A/B — per docs/solver-evaluation-evidence.md, a feature-only pilot may measure yield/eligibility
 * to size a sample as long as the treatment's solve outcome remains unseen.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/query-mustcross-flipper-eligibility.mjs -- \
 *     --corpus=tmp/topology-pilot-2026082801.json [--out=logs/.../eligibility.ids.txt]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

// run-bundled.mjs bundles the entry into .solver-tools/ (ONE level under the repo root — see
// select-archetype-sample.mjs's own header comment), so ROOT is one `..` from the running file's
// own directory, not two.
const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

const argMap = new Map();
for (const arg of process.argv.slice(2)) {
    const eq = arg.indexOf('=');
    if (arg.startsWith('--') && eq > 0) argMap.set(arg.slice(0, eq), arg.slice(eq + 1));
}
const corpusFile = argMap.get('--corpus');
if (!corpusFile) { console.error('--corpus is required'); process.exit(2); }
const outFile = argMap.get('--out');

// Mirrors modules/solver/attempts.ts's POLICY.OBJECTIVE_HEAVY_MUSTPASS / POLICY.FLIPPER_HEAVY.
// Not imported directly (POLICY is not part of the frozen SOLVER_TESTING_API surface); kept in
// sync by the same values attempts.test.ts pins.
const OBJECTIVE_HEAVY_MUSTPASS = 3;
const FLIPPER_HEAVY = 2;

installBrowserStubs();
const { SOLVER_TESTING_API } = await import('../../modules/solver.js');
const { normalizeRawLevel, detectArchetype } = SOLVER_TESTING_API;

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, corpusFile), 'utf8'));
const levels = Array.isArray(corpus) ? corpus : corpus.levels;

const archCounts = new Map();
const rows = [];
levels.forEach((raw, i) => {
    const level = normalizeRawLevel(raw, i + 1);
    const arch = detectArchetype(level);
    archCounts.set(arch, (archCounts.get(arch) ?? 0) + 1);
    const mustPass = level.mustPassKeys.length;
    const flippers = level.flippingFilterMap?.size ?? 0;
    const eligible = arch === 'must-cross-heavy' && mustPass >= OBJECTIVE_HEAVY_MUSTPASS && flippers >= FLIPPER_HEAVY;
    rows.push({ id: raw.id, pos: i + 1, arch, mustPass, flippers, mustCross: level.mustCrossKeys.length, reqInt: level.reqInt, eligible });
});

const eligible = rows.filter(r => r.eligible);
console.log(`Archetype distribution across ${levels.length} levels: ${[...archCounts.entries()].map(([a, c]) => `${a}=${c}`).join(', ')}`);
console.log(`must-cross-heavy: ${archCounts.get('must-cross-heavy') ?? 0} / ${levels.length}`);
console.log(`isMustCrossFlipperHeavy eligible (must-cross-heavy AND mustPass>=${OBJECTIVE_HEAVY_MUSTPASS} AND flippers>=${FLIPPER_HEAVY}): ${eligible.length} / ${levels.length} (${(100 * eligible.length / levels.length).toFixed(1)}%)`);

if (outFile) {
    const outPath = path.resolve(ROOT, outFile);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, rows.map(r => `${r.id}\t${r.arch}\tmustPass=${r.mustPass}\tflippers=${r.flippers}\teligible=${r.eligible}`).join('\n') + '\n');
    console.log(`Wrote ${rows.length} rows (id/archetype/features, for review only) to ${outFile}`);
}
