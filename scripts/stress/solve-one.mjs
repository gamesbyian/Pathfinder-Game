#!/usr/bin/env node
/**
 * Solves exactly one corpus level and prints a single JSON line to stdout — nothing else, so a
 * parent process can parse it directly. Used by retry-isolated.mjs (docs/solver-dev-tooling-plan.md
 * tail item "automatic isolated retry on failure") to re-verify a suspicious failure in a FRESH
 * process, ruling out any in-process contamination (module-level caches, GC pressure from prior
 * levels, timer drift) before it's reported as a genuine regression.
 *
 * Run via the esbuild wrapper (imports the TS solver):
 *   node scripts/run-bundled.mjs scripts/stress/solve-one.mjs
 *       --corpus=<file> --id=<levelId> [--budget-ms=20000]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const CORPUS_FILE = args.get('--corpus');
const LEVEL_ID = args.get('--id');
const BUDGET_MS = Number(args.get('--budget-ms') || 20000);

if (!CORPUS_FILE || !LEVEL_ID) {
    console.error('Usage: solve-one.mjs --corpus=<file> --id=<levelId> [--budget-ms=20000]');
    process.exit(2);
}

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.js');
const Solver = createSolver();

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const entry = corpus.levels.find(l => l.id === LEVEL_ID);
if (!entry) {
    process.stdout.write(JSON.stringify({ id: LEVEL_ID, status: 'error', ok: false, error: `not found in ${CORPUS_FILE}` }) + '\n');
    process.exit(0);
}
const { id, stressMeta, ...raw } = entry;
void id; void stressMeta;

let result;
try {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const t0 = Date.now();
    result = await Solver.solve(level, { timeBudgetMs: BUDGET_MS });
    const elapsedMs = Date.now() - t0;
    const ok = !!result.ok;
    let refereeValid = null;
    if (ok && Array.isArray(result.solution)) {
        refereeValid = Solver.validateCandidatePath(level, result.solution).ok;
    }
    process.stdout.write(JSON.stringify({
        id: LEVEL_ID, status: result.status, ok, refereeValid, elapsedMs,
        nodesExpanded: result.nodesExpanded ?? null,
    }) + '\n');
} catch (err) {
    process.stdout.write(JSON.stringify({ id: LEVEL_ID, status: 'error', ok: false, error: err?.message }) + '\n');
}
