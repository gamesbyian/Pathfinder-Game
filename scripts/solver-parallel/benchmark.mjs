#!/usr/bin/env node
/**
 * Stress-corpus benchmark using worker-thread attempt racing (scripts/solver-parallel/race.mjs's
 * createRacePool) instead of the production sequential solveLevel(). Mirrors
 * scripts/stress/benchmark.mjs's structure/output so the two are directly comparable, but this is
 * NOT the official benchmark: it measures a different (multi-core, Node-only) execution model
 * than what ships to players, so its numbers must never be committed as
 * reports/stress/benchmark-latest.json or used as a solver:bench regression baseline — see
 * docs/solver-architecture.md's "Parallel attempt racing" section.
 *
 * The worker pool is created ONCE for the whole run and shared across every level (see
 * createRacePool's doc comment) rather than spun up/torn down per level — this tool is now
 * equivalent to `stress:benchmark --engine=raced` with a raced-specific default output path;
 * kept as a separate entrypoint mainly for its distinct default --out and always-raced (no
 * --engine flag) behaviour. This is orthogonal to, and does not combine with, stress:benchmark's
 * own --parallel flag (which parallelizes ACROSS levels instead of within one level's attempt
 * ladder).
 *
 * Usage (via the esbuild wrapper — tsx runs the solver hot path ~5x slower):
 *   node scripts/run-bundled.mjs scripts/solver-parallel/benchmark.mjs
 *       [--corpus=data/stress/stress-levels.json] [--budget-ms=20000]
 *       [--out=reports/stress/benchmark-raced-latest.json] [--levels=S001,S005|id:1-20]
 *       [--pool-size=N]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createRacePool } from './race.mjs';
import { selectLevelsBySpec } from '../level-data-io.mjs';
import { attemptConfigKey } from '../portfolio-solve-sweep-lib.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels.json';
const BUDGET_MS = Number(args.get('--budget-ms') || 20000);
const OUT_FILE = args.get('--out') || 'reports/stress/benchmark-raced-latest.json';
const LEVEL_SPEC = args.get('--levels') || null;
const POOL_SIZE = args.get('--pool-size') ? Number(args.get('--pool-size')) : undefined;

installBrowserStubs();
const { createSolver } = await import('../../modules/Solver.js');
const Solver = createSolver();

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;
const levels = selectLevelsBySpec(corpusLevels, LEVEL_SPEC);
console.log(`Raced stress benchmark: ${levels.length} levels, budget ${BUDGET_MS}ms, corpus ${CORPUS_FILE} (v${corpus.generatorVersion}).`);
console.log('  !! this is a worker-thread-racing benchmark, NOT the official sequential solver:bench/stress:benchmark — never compare or commit as the official baseline.');

const results = [];
let solved = 0, failed = 0, errors = 0;
const runStart = Date.now();
const racePool = createRacePool({ poolSize: POOL_SIZE });

for (const entry of levels) {
    const { id, stressMeta, ...raw } = entry;
    const batch = stressMeta?.generationBatch ?? '?';

    const t0 = Date.now();
    let result;
    try {
        result = await racePool.solveLevel(raw, { timeBudgetMs: BUDGET_MS });
    } catch (err) {
        results.push({ id, batch, status: 'error', error: `solve: ${err?.message}`, elapsedMs: Date.now() - t0 });
        errors++;
        console.log(`  ${id} ERROR — ${err?.message}`);
        continue;
    }
    const elapsedMs = Date.now() - t0;
    const ok = !!result?.ok;
    ok ? solved++ : failed++;

    let refereeValid = null;
    if (ok && Array.isArray(result.solution)) {
        let level;
        try {
            level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
            refereeValid = Solver.validateCandidatePath(level, result.solution).ok;
        } catch { refereeValid = false; }
    }

    const winner = (result.attempts || []).find(a => a.ok) || null;
    const label = a => attemptConfigKey(a);
    results.push({
        id, batch,
        status: result.status,
        ok,
        refereeValid,
        elapsedMs,
        nodesExpanded: result.nodesExpanded ?? null,
        attemptCount: (result.attempts || []).length,
        winningStrategy: winner ? label(winner) : null,
        attempts: (result.attempts || []).map(a => ({ ...a, label: label(a) })),
    });
    console.log(`  ${id} [${batch}] ${ok ? '✓' : '✗'} ${elapsedMs}ms ${ok ? (winner ? winner.profile : '?') : result.status}` +
        (refereeValid === false ? '  !! solver path fails PLAY referee' : ''));
}

await racePool.shutdown();
const totalMs = Date.now() - runStart;
console.log(`\nDone: ${solved} solved, ${failed} failed, ${errors} errors / ${levels.length} — ${Math.round(totalMs / 1000)}s`);

const out = {
    timestamp: new Date().toISOString(),
    commitSha: getCommitSha(),
    corpus: CORPUS_FILE,
    corpusGeneratedAt: corpus.generatedAt,
    generatorVersion: corpus.generatorVersion,
    budgetMs: BUDGET_MS,
    engine: 'raced',
    engineWarning: 'worker-thread attempt racing — NOT the official sequential engine; timings are not comparable to stress:benchmark/solver:bench and must never be committed as their baseline',
    witnessAccess: 'none — stressMeta stripped before prepareLevelForSolver',
    solved, failed, errors, total: levels.length, totalMs,
    levels: results,
};
mkdirSync(path.dirname(path.resolve(ROOT, OUT_FILE)), { recursive: true });
writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify(out, null, 1));
console.log(`Results → ${OUT_FILE}`);
