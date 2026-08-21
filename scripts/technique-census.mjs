#!/usr/bin/env node
/**
 * technique-census: shard runner.
 *
 * Executes one shard's slice of a plan produced by scripts/build-technique-census-plan.mjs — for
 * each cell (one or two technique keys against one level, optionally with an ablation toggle), runs
 * EVERY listed technique key as its own independent attempt sharing the cell's node budget
 * cumulatively (same semantics as method-probe.mjs's `--only=A,B`), records the outcome, and writes
 * results incrementally. Per-cell execution logic lives in technique-census-cell.mjs, shared with
 * the worker-pool entry (technique-census-worker.mjs) so a cell's outcome never depends on which
 * path ran it.
 *
 * --workers=N (default 1): N=1 runs sequentially in-process (simplest path, used for small/local
 * runs and this script's own dev iteration). N>1 uses scripts/solver-worker-pool.mjs's OS-level
 * child_process pool (real parallelism across CPU cores, not just Promise interleaving) — the same
 * mechanism level-blind-capability-sweep.mjs already uses for cross-level parallelism, matching
 * solver-stress-refresh.yml's own `corpus2_workers` convention. On a 2-vCPU GitHub-hosted runner,
 * --workers=2 is the natural fit.
 *
 * READ-ONLY with respect to git-tracked data. Deliberately never writes to the data/hints tree or any
 * corpus file, and never calls hintCapture — a level can appear in cells assigned to DIFFERENT
 * shards across different tiers (T1/T2/T3/T4 shard the flat CELL list, not the level list), so two
 * shards could otherwise race to rewrite the same level's hint file. Every genuinely new, referee-
 * valid solve this shard finds is instead recorded in its own `--out` artifact (full solution path +
 * the attempt records provenanceFromSolveResult needs) for the COMBINE step — the only place that
 * writes to git-tracked corpus/hint files, run once, after every shard has finished, entirely
 * side-stepping the concurrency hazard. See scripts/combine-technique-census-shards.mjs.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/technique-census.mjs -- \
 *     --plan=/path/to/plan.json --shard=1 --shards=60 --workers=2 \
 *     --out=logs/technique-census-shards/shard-01.json \
 *     --summary-out=logs/technique-census-shards/shard-01-summary.md
 */
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
// --skip-existing=<path>: a PRIOR shard output at this exact path (e.g. a resumed run after a kill)
// — cellIds already present there are skipped. Never auto-resumes from --out itself (same
// discipline as stress:benchmark's --skip-existing-dir / portfolio-solve-sweep.mjs's --resume, per
// docs/solver-architecture.md's "Two requirements for any batch tool" — pointing --skip-existing at
// a genuinely different prior-run path is what recovers a partial run; re-running with the same
// --out just starts over).
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
    writeFileSync(path.resolve(OUT_FILE), JSON.stringify({ shard: SHARD, shards: SHARDS, planFile: PLAN_FILE, workers: WORKERS, partial, results }));
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
    // Sequential, in-process — simplest path, no child_process/bundling overhead. Used for small
    // runs, local dev iteration, and as the fallback WORKERS=1 always resolves to regardless of
    // platform core count.
    const { runCellSafe } = await createCellRunner();
    let count = 0;
    for (const cell of runCells) {
        const r = await runCellSafe(cell);
        results.push(r);
        count += 1;
        logProgress(count, cell.cellId, r);
        // Report/persist between cells, not only at the end — CLAUDE.md's batch-tool requirement.
        writeReport(true);
    }
} else {
    // OS-level parallelism across WORKERS child processes (solver-worker-pool.mjs) — tasks are
    // dispatched on-demand (a worker that finishes a cheap cell immediately gets the next one, not a
    // fixed static split), so the heterogeneous cell costs this census produces (a beam config that
    // exhausts in under a second next to a dfs/ida/repair config that runs 35+ seconds to the node
    // cap) don't leave a worker idle waiting on a static partition.
    let count = 0;
    await runWorkerPool({
        workerScript: 'scripts/technique-census-worker.mjs',
        tasks: runCells,
        concurrency: WORKERS,
        onResult: (_index, r) => {
            results.push(r);
            count += 1;
            logProgress(count, r.cellId, r);
            // Report/persist between cells, not only at the end — results arrive in COMPLETION
            // order (not task order) under the pool, which is fine: this file's own row order was
            // never meaningful, only which cellIds have been recorded.
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
