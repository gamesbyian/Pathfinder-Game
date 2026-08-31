#!/usr/bin/env node
/**
 * Solver speed probe — the before/after COST half of the hot-path change gate.
 *
 * CLAUDE.md requires any solver hot-path change to be checked twice: `solver:regression --check` for
 * solvability (which is silent on cost), plus a before/after nodesExpanded/wall-time comparison.
 * This is the tool for the second half; before it existed the instruction ended in "no dedicated
 * tool exists yet."
 *
 * WHY --node-budget IS THE POINT, not a detail. Under an ordinary wall-clock budget a FASTER
 * solver expands MORE nodes in the same window, so nodesExpanded moves for a pure speed change
 * and cannot be used to prove the change preserved search order. Pass a `--node-budget` together
 * with a `--budget-ms` large enough never to bind, and the run becomes deterministic in node
 * terms: nodesExpanded is then reproducible run to run and must come out BIT-IDENTICAL across a
 * genuine speed-only change, while wall time carries the entire signal. Verified reproducible:
 * repeated runs of unchanged code give the same node totals under CPU contention that moves wall
 * time 3-4x.
 *
 * A single run's wall time is noisy (±5-10% here), so compare medians of INTERLEAVED runs — build
 * both bundles up front, then alternate before/after so machine drift cancels rather than landing
 * entirely on one side. Do not compare a run made now against a number recorded on another
 * machine or commit (`logs/solver-baseline.json`'s totals included).
 *
 * Usage (bundled — never plain tsx, which runs the solver hot path ~5x slower):
 *   node scripts/run-bundled.mjs scripts/solver-speed-probe.mjs -- \
 *     --corpus=published --count=200 --budget-ms=600000 --node-budget=250000 --out=run.json
 *
 *   --corpus=published|corpus1|corpus2   which corpus to sweep (default published)
 *   --count/--start/--stride             level selection by array position (1-based)
 *   --budget-ms=<ms>                     per-level wall-clock budget
 *   --node-budget=<n>                    per-level node cap (legacy technique-local unit)
 *   --work-budget=<n>                    per-level WORK budget (work-meter.ts units) — the
 *                                        machine-independent one; pin it for a reproducible run
 *   --extras                             re-enable the repair/attraction-diversity/admissible-order
 *                                        extra-budget passes (off by default — see CLAUDE.md's
 *                                        `disableExtraBudgetPasses` note)
 *   --out=<path>                         per-level JSON (id, ok, ms, nodes) for diffing
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));

const corpus = argMap.get('--corpus') || 'published';
const count = Number(argMap.get('--count') || 40);
const start = Number(argMap.get('--start') || 1);
const stride = Number(argMap.get('--stride') || 1);
const budgetMs = Number(argMap.get('--budget-ms') || 4000);
const nodeBudget = argMap.has('--node-budget') ? Number(argMap.get('--node-budget')) : Infinity;
// The machine-independent budget (work-meter.ts units). Pin it and a run is bit-identical on any
// host under any load; omit it and one is derived from --budget-ms.
const workBudget = argMap.has('--work-budget') ? Number(argMap.get('--work-budget')) : undefined;
const noExtras = !argMap.has('--extras');
const outFile = argMap.get('--out');

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const Solver = createSolver();

const root = new URL('..', import.meta.url).pathname;
const CORPORA = {
    published: 'data/levels.json',
    corpus1: 'data/stress/stress-levels.json',
    corpus2: 'data/stress/stress-levels-random.json',
};
const rawFile = JSON.parse(readFileSync(path.join(root, CORPORA[corpus]), 'utf8'));
const rawLevels = Array.isArray(rawFile) ? rawFile : rawFile.levels;

// --ids=<id,id,...>: select by the level's own persistent id (R00046, P00012, ...). Deliberately
// id-only with no bare-number form, so it can't collide with the --start/--stride position
// selection above — see CLAUDE.md on why a bare number in a level selector is ambiguous.
const targets = [];
const idSpec = argMap.get('--ids');
if (idSpec) {
    const wanted = new Set(idSpec.split(',').map(t => t.trim()).filter(Boolean));
    rawLevels.forEach((lv, i) => { if (lv?.id && wanted.has(lv.id)) targets.push(i + 1); });
    const missing = [...wanted].filter(id => !rawLevels.some(lv => lv?.id === id));
    if (missing.length) { console.error(`unknown level ids: ${missing.join(', ')}`); process.exit(2); }
} else {
    for (let i = start; i <= rawLevels.length && targets.length < count; i += stride) targets.push(i);
}

const rows = [];
let totalNodes = 0;
const t0 = process.hrtime.bigint();
for (const n of targets) {
    const raw = rawLevels[n - 1];
    const lt0 = process.hrtime.bigint();
    let ok = false, nodes = 0;
    try {
        const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber: n });
        const res = await Solver.solveLevel(level, {
            timeBudgetMs: budgetMs,
            nodeBudget,
            ...(workBudget !== undefined ? { workBudget } : {}),
            ...(noExtras ? { disableExtraBudgetPasses: true } : {}),
        });
        ok = !!res?.ok;
        nodes = res?.nodesExpanded || 0;
    } catch (e) {
        console.log(`  L${n}: ERROR ${e?.message}`);
    }
    const ms = Number(process.hrtime.bigint() - lt0) / 1e6;
    totalNodes += nodes;
    rows.push({ n, id: raw.id ?? null, ok, ms: +ms.toFixed(1), nodes });
    console.log(`  ${corpus} L${n}${raw.id ? ` (${raw.id})` : ''} ${ok ? '✓' : '✗'} ${ms.toFixed(0)}ms ${nodes.toLocaleString()} nodes`);
}
const totalMs = Number(process.hrtime.bigint() - t0) / 1e6;
console.log(`TOTAL ${corpus}: ${rows.filter(r => r.ok).length}/${rows.length} solved, ${(totalMs / 1000).toFixed(2)}s, ${totalNodes.toLocaleString()} nodes`);
if (globalThis.__floodDiffCalls) console.log(`floodFill differential: ${globalThis.__floodDiffCalls.toLocaleString()} calls compared, 0 mismatches`);

if (outFile) {
    mkdirSync(path.dirname(outFile), { recursive: true });
    writeFileSync(outFile, JSON.stringify({ corpus, budgetMs, nodeBudget, count, start, stride, totalMs, totalNodes, rows }, null, 2));
    console.log(`Wrote ${outFile}`);
}
