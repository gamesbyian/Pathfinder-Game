#!/usr/bin/env node
/**
 * Stress-corpus regression runner.
 *
 * Solves the pinned regression set (stress/regression-set.json) against the current
 * solver and compares outcomes to the recorded baseline expectations:
 *
 *   expected solved   → must still solve (a miss is a REGRESSION; exit 1)
 *   expected unsolved → known-hard target (a solve is an IMPROVEMENT; update the
 *                       pin file's expectation in the same commit as the solver change)
 *
 * Run via the esbuild wrapper:
 *   node scripts/run-bundled.mjs scripts/stress/regression.mjs
 *       [--set=stress/regression-set.json] [--corpus=stress/stress-levels.json]
 *       [--budget-ms=<pin file's budget>]
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
const SET_FILE = args.get('--set') || 'stress/regression-set.json';
const CORPUS_FILE = args.get('--corpus') || 'stress/stress-levels.json';

installBrowserStubs();
const { createSolver } = await import('../../modules/Solver.js');
const Solver = createSolver();

const pin = JSON.parse(readFileSync(path.resolve(ROOT, SET_FILE), 'utf8'));
const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const byId = new Map(corpus.levels.map(l => [l.id, l]));
const budgetMs = Number(args.get('--budget-ms') || pin.budgetMs || 20000);

console.log(`Stress regression set: ${pin.levels.length} levels (${pin.levels.filter(l => l.expected === 'unsolved').length} known-hard), budget ${budgetMs}ms.`);

let regressions = 0, improvements = 0, held = 0, knownHard = 0;

for (const entry of pin.levels) {
    const lvl = byId.get(entry.id);
    if (!lvl) {
        console.log(`  ${entry.id} MISSING from corpus — treat as regression-set drift`);
        regressions++;
        continue;
    }
    const { id, stressMeta, ...raw } = lvl; // witness stays hidden from the solver
    void id; void stressMeta;
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const t0 = Date.now();
    const result = await Solver.solve(level, { timeBudgetMs: budgetMs });
    const elapsed = Date.now() - t0;
    const solvedNow = !!result?.ok;

    if (entry.expected === 'solved' && !solvedNow) {
        regressions++;
        console.log(`  ${entry.id} [${entry.batch}] ✗ REGRESSION — was ${entry.baselineMs}ms (${entry.baselineStrategy}), now ${result.status} at ${elapsed}ms`);
    } else if (entry.expected === 'unsolved' && solvedNow) {
        improvements++;
        const winner = (result.attempts || []).find(a => a.ok);
        console.log(`  ${entry.id} [${entry.batch}] ★ IMPROVEMENT — known-hard now solved in ${elapsed}ms (${winner?.profile ?? '?'}); update ${SET_FILE}`);
    } else if (entry.expected === 'solved') {
        held++;
        const drift = entry.baselineMs > 0 ? elapsed / entry.baselineMs : 1;
        console.log(`  ${entry.id} [${entry.batch}] ✓ ${elapsed}ms (baseline ${entry.baselineMs}ms${drift > 3 ? ' — >3x slower, watch this' : ''})`);
    } else {
        knownHard++;
        console.log(`  ${entry.id} [${entry.batch}] · still known-hard (${result.status})`);
    }
}

console.log(`\nHeld: ${held}  known-hard: ${knownHard}  improvements: ${improvements}  regressions: ${regressions}`);
if (regressions > 0) {
    console.error('Solver regression against the pinned stress set.');
    process.exit(1);
}
