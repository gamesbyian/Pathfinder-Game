#!/usr/bin/env node
// Runs one shard of a build-technique-census-plan.mjs plan. Each cell independently runs its listed
// technique key(s) under one cumulative node budget via technique-census-cell.mjs. `--workers>1`
// uses the child-process pool for real CPU parallelism.
//
// Shards are read-only with respect to corpora/hints because a level may appear in multiple shards.
// New referee-valid solves stay in shard output; combine-technique-census-shards.mjs is the sole
// post-run writer. Results are persisted between cells and on termination signals.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createCellRunner } from './technique-census-cell.mjs';
import { runWorkerPool } from './solver-worker-pool.mjs';

const argv = process.argv.slice(2);
const args = new Map(argv.filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));

const PLAN_FILE = args.get('--plan');
if (!PLAN_FILE) { console.error('--plan=<path to plan.json from build-technique-census-plan.mjs> is required.'); process.exit(1); }
const SHARD = Number(args.get('--shard'));
const SHARDS = Number(args.get('--shards'));
if (!Number.isInteger(SHARD) || !Number.isInteger(SHARDS) || SHARD < 1 || SHARD > SHARDS) {
    console.error('--shard=<1-based index> --shards=<total count> are required, 1 <= shard <= shards.');
    process.exit(1);
}
const OUT_FILE = args.get('--out') || null;
const SUMMARY_OUT_FILE = args.get('--summary-out') || null;
const WORKERS = Math.max(1, Number(args.get('--workers') || 1));
// Explicit prior output only; never implicitly resume from --out.
const SKIP_EXISTING_FILE = args.get('--skip-existing') || null;

const plan = JSON.parse(readFileSync(path.resolve(PLAN_FILE), 'utf8'));
const total = plan.cells.length;
const start = Math.floor(((SHARD - 1) * total) / SHARDS);
const end = Math.floor((SHARD * total) / SHARDS);
const myCells = plan.cells.slice(start, end);

const alreadyDone = new Set();
if (SKIP_EXISTING_FILE && existsSync(SKIP_EXISTING_FILE)) {
    try {
        const prior = JSON.parse(readFileSync(SKIP_EXISTING_FILE, 'utf8'));
        for (const r of prior.results ?? []) alreadyDone.add(r.cellId);
    } catch { /* malformed/partial prior file — just don't skip anything */ }
}
const runCells = myCells.filter(c => !alreadyDone.has(c.cellId));

console.log(`technique-census shard ${SHARD}/${SHARDS}: ${myCells.length} cells (plan total ${total}), ${alreadyDone.size} already done, workers=${WORKERS}`);

const results = [];
if (OUT_FILE) mkdirSync(path.dirname(path.resolve(OUT_FILE)), { recursive: true });
function writeReport(partial) {
    if (!OUT_FILE) return;
    writeFileSync(path.resolve(OUT_FILE), JSON.stringify({
        shard: SHARD, shards: SHARDS, planFile: PLAN_FILE, workers: WORKERS, partial,
        budgetProtocol: plan.budgetProtocol ?? 'technique-local-node-depth',
        equalCostAcrossTechniques: plan.equalCostAcrossTechniques ?? false,
        results,
    }));
}

let handledSignal = false;
function onSignal() {
    if (handledSignal) return;
    handledSignal = true;
    console.log('technique-census: signal received, writing partial results and exiting.');
    writeReport(true);
    process.exit(0);
}
process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);

function logProgress(count, cellId, r) {
    if (count % 25 === 0 || count === runCells.length) {
        console.log(`  [${count}/${runCells.length}] ${cellId} ${r.ok ? 'SOLVED' : r.status}`);
    }
}

if (WORKERS === 1) {
    const { runCellSafe } = await createCellRunner();
    let count = 0;
    for (const cell of runCells) {
        const r = await runCellSafe(cell);
        results.push(r);
        count += 1;
        logProgress(count, cell.cellId, r);
        writeReport(true);
    }
} else {
    // Dynamic child-process scheduling avoids idle workers on heterogeneous cell costs.
    let count = 0;
    await runWorkerPool({
        workerScript: 'scripts/technique-census-worker.mjs',
        tasks: runCells,
        concurrency: WORKERS,
        onResult: (_index, r) => {
            results.push(r);
            count += 1;
            logProgress(count, r.cellId, r);
            // Completion order is intentionally irrelevant; cellId identifies coverage.
            writeReport(true);
        },
    });
}
writeReport(false);

const solved = results.filter(r => r.ok).length;
console.log(`Result: shard ${SHARD}/${SHARDS} solved=${solved}/${results.length} (of ${myCells.length} assigned, ${alreadyDone.size} pre-skipped)`);

if (SUMMARY_OUT_FILE) {
    const byTier = {};
    for (const r of results) { byTier[r.tier] ??= { total: 0, ok: 0 }; byTier[r.tier].total++; if (r.ok) byTier[r.tier].ok++; }
    const lines = [
        `# technique-census shard ${SHARD}/${SHARDS}`, '',
        `Plan: \`${PLAN_FILE}\` — ${myCells.length} cells assigned, ${alreadyDone.size} pre-skipped, ${results.length} run, workers=${WORKERS}.`,
        '', `**Solved: ${solved}/${results.length}**`, '',
        '| tier | ok | total |', '|---|---:|---:|',
        ...Object.entries(byTier).map(([t, v]) => `| ${t} | ${v.ok} | ${v.total} |`),
    ];
    mkdirSync(path.dirname(path.resolve(SUMMARY_OUT_FILE)), { recursive: true });
    writeFileSync(path.resolve(SUMMARY_OUT_FILE), lines.join('\n') + '\n');
}
