#!/usr/bin/env node
/**
 * Empirically sweeps --parallel=1..N over a fixed level subset via benchmark.mjs and reports
 * wall-clock per worker count, so "how many workers is actually fastest in THIS sandbox" is a
 * measured finding instead of an assumption (docs/solver-dev-tooling-plan.md tail item "empirical
 * worker-count tuning") — the original regression-testing brainstorm's point #8 explicitly warns
 * against assuming more workers is better under CPU throttling, and against treating parallel
 * timings as official; this tool answers the "how many" question once per environment and leaves
 * the result to be recorded in a doc, not to be baked in as a hardcoded default.
 *
 * Deliberately reuses the real benchmark.mjs binary as a subprocess per N (not an in-process
 * refactor) so the sweep measures actual wall-clock startup + worker-pool overhead exactly as
 * `npm run stress:measure-solver -- --parallel=N` would incur it in practice.
 *
 * Run via plain node (spawns the bundled benchmark.mjs itself per N):
 *   node scripts/stress/tune-parallelism.mjs
 *       [--levels=data/stress/smoke-set-ids-or-a-comma-list] [--corpus=data/stress/stress-levels.json]
 *       [--max-n=4] [--budget-ms=20000] [--out=<file>]
 *
 * Default level subset: a fixed 16-level slice of the target corpus (first 16 ids) — small enough
 * to sweep N=1..4 in a few minutes, large enough that per-level noise averages out somewhat.
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels.json';
const BUDGET_MS = Number(args.get('--budget-ms') || 20000);
const MAX_N = Number(args.get('--max-n') || 4);
const OUT_FILE = args.get('--out') || null;

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const levelSpec = args.get('--levels') || corpus.levels.slice(0, 16).map(l => l.id).join(',');

console.log(`Tuning --parallel over levels [${levelSpec}] from ${CORPUS_FILE}, budget ${BUDGET_MS}ms, N=1..${MAX_N}.`);

const scratchDir = mkdtempSync(path.join(tmpdir(), 'tune-parallelism-'));
const results = [];

for (let n = 1; n <= MAX_N; n++) {
    const outFile = path.join(scratchDir, `n${n}.json`);
    const t0 = Date.now();
    try {
        // --engine=sequential pinned for every N: isolates the across-level --parallel factor from
        // the raced engine's OWN internal worker-thread pool (which defaults on and would otherwise
        // confound "how many across-level workers" with "how many attempt-racing workers").
        execFileSync(process.execPath, [
            path.resolve(ROOT, 'scripts/run-bundled.mjs'), path.resolve(ROOT, 'scripts/stress/benchmark.mjs'),
            `--corpus=${CORPUS_FILE}`, `--levels=${levelSpec}`, `--budget-ms=${BUDGET_MS}`,
            `--parallel=${n}`, '--engine=sequential', `--out=${outFile}`,
        ], { cwd: ROOT, stdio: 'ignore' });
    } catch {
        // benchmark.mjs still writes a partial/complete report even on non-zero exit; fall through.
    }
    const wallMs = Date.now() - t0;
    let solved = null, total = null;
    try {
        const report = JSON.parse(readFileSync(outFile, 'utf8'));
        solved = report.solved; total = report.total;
    } catch { /* leave null if the report couldn't be read */ }
    results.push({ parallel: n, wallMs, solved, total });
    console.log(`  N=${n}: ${wallMs}ms wall-clock (${solved ?? '?'}/${total ?? '?'} solved)`);
}

rmSync(scratchDir, { recursive: true, force: true });

const best = results.reduce((a, b) => (b.wallMs < a.wallMs ? b : a));
console.log(`\nFastest: N=${best.parallel} (${best.wallMs}ms). This is a measurement for THIS sandbox/run, not a permanent constant — ` +
    're-run if the environment\'s CPU allocation changes.');

if (OUT_FILE) {
    writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({
        corpus: CORPUS_FILE, levelSpec, budgetMs: BUDGET_MS, results, best: best.parallel,
    }, null, 2) + '\n');
    console.log(`Wrote ${OUT_FILE}`);
}
