#!/usr/bin/env node
/**
 * Stress-corpus regression runner.
 *
 * Solves the pinned regression set (data/stress/regression-set.json) against the current
 * solver and compares outcomes to the recorded baseline expectations:
 *
 *   expected solved   → must still solve (a miss is a REGRESSION; exit 1)
 *   expected unsolved → known-hard target (a solve is an IMPROVEMENT; update the
 *                       pin file's expectation in the same commit as the solver change)
 *
 * Run via the esbuild wrapper:
 *   node scripts/run-bundled.mjs scripts/stress/regression.mjs
 *       [--set=data/stress/regression-set.json] [--corpus=data/stress/stress-levels.json]
 *       [--budget-ms=<pin file's budget>] [--no-retry] [--update-baselines]
 *
 * A level that flips expected-solved -> unsolved is re-solved once in a FRESH child process
 * (retry-isolated.mjs) before being reported as a genuine regression — this repo's own history
 * shows CPU-throttled sandboxes make wall-clock-edge outcomes noisy, and a fresh process also
 * rules out same-process contamination from levels already solved earlier in this run. A level
 * that still fails on retry is a REGRESSION (exit 1); one that solves on retry is reported as
 * FLAKY_PASS_AFTER_RETRY — not a regression, but not silently swept under the rug either. Disable
 * with --no-retry for a strict single-shot read (e.g. when hunting the flakiness itself).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { retryLevelIsolated } from './retry-isolated.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const SET_FILE = args.get('--set') || 'data/stress/regression-set.json';
const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels.json';
const RETRY_ON_FAILURE = !args.has('--no-retry');
const UPDATE_BASELINES = args.has('--update-baselines');

installBrowserStubs();
const { createSolver } = await import('../../modules/Solver.js');
const Solver = createSolver();

const pin = JSON.parse(readFileSync(path.resolve(ROOT, SET_FILE), 'utf8'));
const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const byId = new Map(corpus.levels.map(l => [l.id, l]));
const budgetMs = Number(args.get('--budget-ms') || pin.budgetMs || 20000);

console.log(`Stress regression set: ${pin.levels.length} levels (${pin.levels.filter(l => l.expected === 'unsolved').length} known-hard), budget ${budgetMs}ms.`);

let regressions = 0, improvements = 0, held = 0, knownHard = 0, flakyPassedOnRetry = 0;
const measurements = new Map();

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
    const winner = (result.attempts || []).find(a => a.ok);
    measurements.set(entry.id, {
        solvedNow,
        elapsed,
        strategy: winner ? (winner.template ? `${winner.profile}/${winner.template}` : winner.profile) : null,
    });

    if (entry.expected === 'solved' && !solvedNow) {
        if (RETRY_ON_FAILURE) {
            const retry = retryLevelIsolated({ corpusFile: CORPUS_FILE, levelId: entry.id, budgetMs });
            if (retry.ok && retry.refereeValid !== false) {
                flakyPassedOnRetry++;
                console.log(`  ${entry.id} [${entry.batch}] ~ FLAKY_PASS_AFTER_RETRY — first attempt ${result.status} at ${elapsed}ms, fresh-process retry solved in ${retry.elapsedMs}ms; not counted as a regression, but investigate the flakiness`);
                continue;
            }
        }
        regressions++;
        console.log(`  ${entry.id} [${entry.batch}] ✗ REGRESSION — was ${entry.baselineMs}ms (${entry.baselineStrategy}), now ${result.status} at ${elapsed}ms` +
            (RETRY_ON_FAILURE ? ' (confirmed on fresh-process retry)' : ''));
    } else if (entry.expected === 'unsolved' && solvedNow) {
        improvements++;
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

console.log(`\nHeld: ${held}  known-hard: ${knownHard}  improvements: ${improvements}  flaky-passed-on-retry: ${flakyPassedOnRetry}  regressions: ${regressions}`);
if (regressions > 0) {
    console.error('Solver regression against the pinned stress set.');
    process.exit(1);
}

if (UPDATE_BASELINES) {
    if (improvements > 0 || flakyPassedOnRetry > 0) {
        console.error(`Refusing to update ${SET_FILE}: resolve expectation improvements/flaky retries explicitly first.`);
        process.exit(1);
    }
    for (const entry of pin.levels) {
        const measurement = measurements.get(entry.id);
        if (!measurement || entry.expected !== 'solved' || !measurement.solvedNow) continue;
        entry.baselineMs = measurement.elapsed;
        entry.baselineStrategy = measurement.strategy;
    }
    pin.pinnedAt = new Date().toISOString();
    pin.sourceBenchmark = {
        timestamp: pin.pinnedAt,
        commitSha: process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
        budgetMs,
        command: `npm run stress:regression -- --update-baselines${args.has('--budget-ms') ? ` --budget-ms=${budgetMs}` : ''}`,
    };
    writeFileSync(path.resolve(ROOT, SET_FILE), `${JSON.stringify(pin)}\n`);
    console.log(`Updated solved baselines in ${SET_FILE}; expectations and known-hard pins were left unchanged.`);
}
