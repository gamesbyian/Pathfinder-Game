#!/usr/bin/env node
/**
 * Tiny, deliberately-curated smoke suite (docs/solver-dev-tooling-plan.md Component A) — a
 * near-instant sanity check to run after any solver edit, before reaching for the much larger
 * `stress:regression` (24 levels) or `solver:bench` (156 levels) tiers. Every level in
 * data/stress/smoke-set.json was hand-picked for a specific reason (a mechanic it's the only/
 * cheapest carrier of, or a historical bug repro) — see that file's own `reasons` field per
 * level and docs/solver-dev-tooling-plan.md's Component A for the selection rationale. Do not
 * regenerate this set by random sampling; add/replace entries by the same deliberate reasoning.
 *
 * Deliberately spans TWO corpora, unlike stress:regression (single-corpus): published levels
 * (data/levels.json, matched by 1-based `levelNumber`) carry mechanics the stress corpora
 * exclude by design (regular filters, multi-gate) — see data/stress/README.md's "Second corpus"
 * section for why those are excluded there. Stress-corpus entries (data/stress/stress-levels.json,
 * matched by `id`) carry the repair-fallback / historical-bug-repro canaries.
 *
 * Same expected/regression semantics as scripts/stress/regression.mjs:
 *   expected=solved must stay solved (regression, exit 1) — this tier has no "known-hard"
 *   entries (unlike stress:regression), since the whole point is a suite that should always pass.
 *
 * Run via the esbuild wrapper:
 *   node scripts/run-bundled.mjs scripts/stress/smoke.mjs
 *       [--set=data/stress/smoke-set.json] [--budget-ms=<pin file's budgetMs>]
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { attemptConfigKey } from '../portfolio-solve-sweep-lib.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const SET_FILE = args.get('--set') || 'data/stress/smoke-set.json';

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.js');
const Solver = createSolver();

const pin = JSON.parse(readFileSync(path.resolve(ROOT, SET_FILE), 'utf8'));
const budgetMs = Number(args.get('--budget-ms') || pin.budgetMs || 10000);

const publishedLevels = JSON.parse(readFileSync(path.resolve(ROOT, 'data/levels.json'), 'utf8'));
const stressCorpus = JSON.parse(readFileSync(path.resolve(ROOT, 'data/stress/stress-levels.json'), 'utf8'));
const stressById = new Map(stressCorpus.levels.map(l => [l.id, l]));

console.log(`Smoke suite: ${pin.levels.length} levels, budget ${budgetMs}ms.`);

let regressions = 0, held = 0;

for (const entry of pin.levels) {
    let raw, levelNumber;
    if (entry.corpus === 'published') {
        levelNumber = entry.levelNumber;
        raw = publishedLevels[levelNumber - 1];
        if (!raw) { console.log(`  ${entry.id} MISSING from data/levels.json (levelNumber=${levelNumber})`); regressions++; continue; }
    } else {
        const stressLevel = stressById.get(entry.id);
        if (!stressLevel) { console.log(`  ${entry.id} MISSING from data/stress/stress-levels.json`); regressions++; continue; }
        const { id, stressMeta, ...rest } = stressLevel; // witness stays hidden from the solver
        void id; void stressMeta;
        raw = rest;
    }

    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    const t0 = Date.now();
    const result = await Solver.solveLevel(level, { timeBudgetMs: budgetMs });
    const elapsed = Date.now() - t0;
    const solvedNow = !!result?.ok;
    const winner = (result.attempts || []).find(a => a.ok);
    const strategy = winner ? attemptConfigKey(winner) : null;

    if (entry.expected === 'solved' && !solvedNow) {
        regressions++;
        console.log(`  ${entry.id} [${entry.mechanic}] ✗ REGRESSION — was ${entry.baselineMs}ms (${entry.baselineStrategy}), now ${result.status} at ${elapsed}ms`);
    } else {
        held++;
        const drift = entry.baselineMs > 0 ? elapsed / entry.baselineMs : 1;
        console.log(`  ${entry.id} [${entry.mechanic}] ✓ ${elapsed}ms via ${strategy}${drift > 3 ? '  !! >3x slower than pin, watch this' : ''}`);
    }
}

console.log(`\nHeld: ${held}  regressions: ${regressions}`);
if (regressions > 0) {
    console.error('Smoke-suite regression — a level that should always solve did not.');
    process.exit(1);
}
