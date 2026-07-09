#!/usr/bin/env node
/**
 * Stress-corpus solver benchmark.
 *
 * Runs the PRODUCTION solver over the stress corpus with the witness metadata
 * stripped (the solver never sees witnessSolution or any stressMeta), records
 * per-level runtime, node expansions, attempt ladders, winning/failed strategies,
 * and referee-validates every returned solution.
 *
 * Run via the esbuild wrapper (imports the TS solver):
 *   node scripts/run-bundled.mjs scripts/stress/benchmark.mjs
 *       [--corpus=stress/stress-levels.json] [--budget-ms=20000]
 *       [--out=stress/reports/benchmark-latest.json] [--levels=S001,S005|1-20]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const CORPUS_FILE = args.get('--corpus') || 'stress/stress-levels.json';
const BUDGET_MS = Number(args.get('--budget-ms') || 20000);
const OUT_FILE = args.get('--out') || 'stress/reports/benchmark-latest.json';
const LEVEL_SPEC = args.get('--levels') || null;

installBrowserStubs();
const { createSolver } = await import('../../modules/Solver.js');
const Solver = createSolver();

function selectLevels(levels) {
    if (!LEVEL_SPEC) return levels;
    const wanted = new Set();
    for (const part of LEVEL_SPEC.split(',')) {
        const t = part.trim();
        if (/^S\d+$/i.test(t)) { wanted.add(t.toUpperCase()); continue; }
        if (t.includes('-')) {
            const [a, b] = t.split('-').map(Number);
            for (let i = Math.min(a, b); i <= Math.max(a, b); i++) wanted.add(`S${String(i).padStart(3, '0')}`);
        } else if (Number.isFinite(Number(t))) wanted.add(`S${String(Number(t)).padStart(3, '0')}`);
    }
    return levels.filter(l => wanted.has(l.id));
}

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const levels = selectLevels(corpus.levels);
console.log(`Stress benchmark: ${levels.length} levels, budget ${BUDGET_MS}ms, corpus ${CORPUS_FILE} (v${corpus.generatorVersion}).`);

const results = [];
let solved = 0, failed = 0, errors = 0;
const runStart = Date.now();

for (const entry of levels) {
    // Strip everything the solver must not see: the id and the entire stressMeta
    // (which contains the hidden witness). What remains is plain wire format.
    const { id, stressMeta, ...raw } = entry;
    const batch = stressMeta?.generationBatch ?? '?';

    let level;
    try {
        level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    } catch (err) {
        results.push({ id, batch, status: 'error', error: `normalize: ${err?.message}` });
        errors++;
        continue;
    }

    const t0 = Date.now();
    let result;
    try {
        result = await Solver.solve(level, { timeBudgetMs: BUDGET_MS });
    } catch (err) {
        results.push({ id, batch, status: 'error', error: `solve: ${err?.message}`, elapsedMs: Date.now() - t0 });
        errors++;
        console.log(`  ${id} ERROR — ${err?.message}`);
        continue;
    }
    const elapsedMs = Date.now() - t0;
    const ok = !!result?.ok;
    ok ? solved++ : failed++;

    // Referee check: the solver's own solution must satisfy PLAY rules. The solver
    // intentionally ignores geese/false goals (MoveContext.SOLVER), so a refereeValid=false
    // on a hazard-padded level is a *finding*, not a bug in the benchmark.
    let refereeValid = null;
    if (ok && Array.isArray(result.solution)) {
        const check = Solver.validateCandidatePath(level, result.solution);
        refereeValid = check.ok;
    }

    const attempts = (result.attempts || []).map(a => ({
        gateKey: a.gateKey, profile: a.profile, template: a.template, beamWidth: a.beamWidth,
        ok: a.ok, elapsedMs: a.elapsedMs,
        ...(a.diverseBeam ? { diverseBeam: true } : {}),
        ...(a.repair ? { repair: true } : {}),
        ...(a.repairMustTurnBiased ? { repairMustTurnBiased: true } : {}),
    }));
    const winner = attempts.find(a => a.ok) || null;
    const label = a => `${a.profile}${a.template ? `/${a.template}` : ''}${a.beamWidth ? `@beam${a.beamWidth}` : '@dfs'}` +
        (a.diverseBeam ? '(diverse)' : '') + (a.repair ? (a.repairMustTurnBiased ? '(repair-biased)' : '(repair)') : '');
    results.push({
        id, batch,
        status: result.status,
        ok,
        refereeValid,
        elapsedMs,
        nodesExpanded: result.nodesExpanded ?? null,
        attemptCount: attempts.length,
        winningStrategy: winner ? label(winner) : null,
        failedStrategies: attempts.filter(a => !a.ok).map(label),
        attempts,
    });
    console.log(`  ${id} [${batch}] ${ok ? '✓' : '✗'} ${elapsedMs}ms ${ok ? (winner ? winner.profile : '?') : result.status}` +
        (refereeValid === false ? '  !! solver path fails PLAY referee' : ''));
}

const totalMs = Date.now() - runStart;
console.log(`\nDone: ${solved} solved, ${failed} failed, ${errors} errors / ${levels.length} — ${Math.round(totalMs / 1000)}s`);

const out = {
    timestamp: new Date().toISOString(),
    commitSha: getCommitSha(),
    corpus: CORPUS_FILE,
    corpusGeneratedAt: corpus.generatedAt,
    generatorVersion: corpus.generatorVersion,
    budgetMs: BUDGET_MS,
    witnessAccess: 'none — stressMeta stripped before prepareLevelForSolver',
    solved, failed, errors, total: levels.length, totalMs,
    levels: results,
};
mkdirSync(path.dirname(path.resolve(ROOT, OUT_FILE)), { recursive: true });
writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify(out, null, 1));
console.log(`Results → ${OUT_FILE}`);
