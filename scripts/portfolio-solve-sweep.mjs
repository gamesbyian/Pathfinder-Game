#!/usr/bin/env node
/**
 * Run ONLY the fast portfolio scheduler experiment (no separate legacy solve) across a level
 * range, to see what portfolio mode can solve on its own — used for probing currently-unsolved
 * stress-corpus levels, where a redundant legacy comparison run would double the cost for no
 * benefit (see docs/fast-portfolio-scheduler-plan.md / reports/portfolio/portfolio-scheduler-decision.md
 * for the comparison-oriented sibling tool, scripts/portfolio-scheduler-report.mjs).
 *
 * `solvedBeforeFallback: true` means a portfolio pass (1/2/3/conditional) found the solution —
 * i.e. something other than a plain full-budget legacy-equivalent search. `solvedBeforeFallback:
 * false` with `ok: true` means only the fallback phase (a fresh full-budget legacy-equivalent
 * solve) found it, which is not a portfolio-specific result.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- --corpus=data/stress/stress-levels-random.json --levels=1-1700 --budget-ms=30000 --out=reports/portfolio/corpus2-sweep.json --summary-out=reports/portfolio/corpus2-sweep-summary.md
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { PORTFOLIO_EXPERIMENT } from '../data/config/portfolio-experiment.js';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));

const root = new URL('..', import.meta.url).pathname;
const budgetMs = Number(argMap.get('--budget-ms') || 30000);
const outFile = argMap.get('--out') || 'reports/portfolio/solve-sweep.json';
const summaryOutFile = argMap.get('--summary-out') || outFile.replace(/\.json$/u, '-summary.md');
const corpusPath = argMap.get('--corpus') || path.join(root, 'data', 'levels.json');

function levelsFrom(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.levels)) return parsed.levels;
    if (Array.isArray(parsed?.data?.levels)) return parsed.data.levels;
    return [];
}

function parseLevelSpec(spec) {
    if (!spec || spec === 'all') return null;
    const set = new Set();
    for (const part of spec.split(',')) {
        const t = part.trim();
        if (!t) continue;
        if (t.includes('-')) {
            const [a, b] = t.split('-').map(Number);
            for (let i = Math.min(a, b); i <= Math.max(a, b); i++) set.add(i);
        } else {
            const n = Number(t);
            if (n > 0) set.add(n);
        }
    }
    return set;
}

function csvSet(value, fallback) {
    if (!value) return new Set(fallback);
    return new Set(value.split(',').map(s => s.trim()).filter(Boolean));
}

function experimentFromArgs() {
    return {
        pass1Ms: Number(argMap.get('--pass1-ms') || PORTFOLIO_EXPERIMENT.pass1Ms),
        pass2Ms: Number(argMap.get('--pass2-ms') || PORTFOLIO_EXPERIMENT.pass2Ms),
        pass3Ms: Number(argMap.get('--pass3-ms') || PORTFOLIO_EXPERIMENT.pass3Ms),
        pass2Configs: csvSet(argMap.get('--pass2-configs'), PORTFOLIO_EXPERIMENT.pass2Configs),
        pass3Configs: csvSet(argMap.get('--pass3-configs'), PORTFOLIO_EXPERIMENT.pass3Configs),
        conditionalPasses: PORTFOLIO_EXPERIMENT.conditionalPasses,
    };
}

function attemptConfigKey(attempt) {
    const family = attempt?.beamWidth ? 'beam' : 'dfs';
    const template = attempt?.template ? `/${attempt.template}` : '';
    const beam = attempt?.beamWidth ? `@beam${attempt.beamWidth}` : '';
    const diverse = attempt?.diverseBeam ? '(diverse)' : '';
    const repair = attempt?.repair ? ':repair' : '';
    const biased = attempt?.repairMustTurnBiased ? '(mustTurnBiased)' : '';
    return `${family}:${attempt?.profile ?? 'unknown'}${template}${beam}${diverse}${repair}${biased}`;
}

function winningAttempt(result, phase = null) {
    return (Array.isArray(result?.attempts) ? result.attempts : []).find(a => a?.ok && (!phase || a.schedulerPhase === phase)) ?? null;
}

function passForWin(result) {
    const winner = winningAttempt(result, 'portfolio');
    return Number.isFinite(Number(winner?.passNumber)) ? Number(winner.passNumber) : null;
}

installBrowserStubs();
const { createSolver } = await import('../modules/Solver.js');
const Solver = createSolver();
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const rawLevels = levelsFrom(corpus);
const levelFilter = parseLevelSpec(argMap.get('--levels'));
const targets = levelFilter
    ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
    : Array.from({ length: rawLevels.length }, (_, i) => i + 1);
const commit = (() => { try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; } })();
const portfolioExperiment = experimentFromArgs();

const levels = [];
const newFinds = [];
let solvedCount = 0;
let solvedBeforeFallbackCount = 0;
let fallbackOnlyCount = 0;
let unsolvedCount = 0;
const passCounts = { pass1: 0, pass2: 0, pass3: 0, conditional: 0, fallback: 0, unsolved: 0 };

console.log(`portfolio-solve-sweep: corpus=${path.relative(root, corpusPath)} levels=${targets.length} budget=${budgetMs}ms`);
for (const [i, levelNumber] of targets.entries()) {
    const raw = rawLevels[levelNumber - 1];
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    const result = await Solver.solve(level, { timeBudgetMs: budgetMs, schedulerMode: 'portfolio-experiment', portfolioExperiment });

    const pass = passForWin(result);
    const solvedBeforeFallback = !!result?.portfolio?.solvedBeforeFallback;
    const solvedByFallback = !!result?.ok && !solvedBeforeFallback;
    const winner = winningAttempt(result, 'portfolio') ?? winningAttempt(result, 'fallback');

    if (result.ok) solvedCount += 1;
    if (solvedBeforeFallback) solvedBeforeFallbackCount += 1;
    if (solvedByFallback) fallbackOnlyCount += 1;
    if (!result.ok) unsolvedCount += 1;
    if (pass === 1) passCounts.pass1 += 1;
    else if (pass === 2) passCounts.pass2 += 1;
    else if (pass === 3) passCounts.pass3 += 1;
    else if (pass && pass > 3) passCounts.conditional += 1;
    else if (solvedByFallback) passCounts.fallback += 1;
    else passCounts.unsolved += 1;

    const row = {
        level: levelNumber,
        id: raw?.id ?? null,
        ok: !!result.ok,
        status: result.status,
        totalMs: result.totalMs,
        nodesExpanded: result.nodesExpanded,
        solvedBeforeFallback,
        pass,
        winningConfig: winner ? (winner.configKey ?? attemptConfigKey(winner)) : null,
        gateKey: winner?.gateKey ?? null,
        solution: result.solution ?? null,
    };
    levels.push(row);
    if (solvedBeforeFallback) newFinds.push(row);
    console.log(`  [${i + 1}/${targets.length}] L${levelNumber}${row.id ? ` (${row.id})` : ''} ok=${row.ok ? '✓' : '✗'}${pass ? ` pass${pass}` : solvedByFallback ? ' fallback' : ''}${solvedBeforeFallback ? ' <-- PORTFOLIO FIND' : ''}`);
}

const summary = {
    generatedAt: new Date().toISOString(),
    commit,
    corpus: path.relative(root, corpusPath),
    budgetMs,
    portfolioExperiment: {
        pass1Ms: portfolioExperiment.pass1Ms,
        pass2Ms: portfolioExperiment.pass2Ms,
        pass3Ms: portfolioExperiment.pass3Ms,
        pass2Configs: [...portfolioExperiment.pass2Configs],
        pass3Configs: [...portfolioExperiment.pass3Configs],
        conditionalPasses: (portfolioExperiment.conditionalPasses ?? []).map(pass2 => ({
            passNumber: pass2.passNumber, capMs: pass2.capMs, configs: [...pass2.configs], when: pass2.when,
        })),
    },
    levelsRun: levels.length,
    solvedCount,
    solvedBeforeFallbackCount,
    fallbackOnlyCount,
    unsolvedCount,
    passDistribution: passCounts,
    newFinds: newFinds.map(f => ({ level: f.level, id: f.id, pass: f.pass, winningConfig: f.winningConfig, gateKey: f.gateKey, totalMs: f.totalMs })),
};

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ summary, levels }, null, 2) + '\n');
const md = [
    '# Portfolio solve-only sweep',
    '',
    `Generated: ${summary.generatedAt}`,
    `Commit: ${summary.commit}`,
    `Corpus: ${summary.corpus}`,
    `Budget: ${summary.budgetMs}ms`,
    `Levels run: ${summary.levelsRun}`,
    '',
    `- Solved (any phase): ${solvedCount}`,
    `- Solved before fallback (portfolio-tier find): ${solvedBeforeFallbackCount}`,
    `- Solved by fallback only (equivalent to plain legacy): ${fallbackOnlyCount}`,
    `- Unsolved: ${unsolvedCount}`,
    '',
    '## Pass distribution',
    '',
    `- Pass 1: ${passCounts.pass1}`,
    `- Pass 2: ${passCounts.pass2}`,
    `- Pass 3: ${passCounts.pass3}`,
    `- Conditional: ${passCounts.conditional}`,
    `- Fallback: ${passCounts.fallback}`,
    `- Unsolved: ${passCounts.unsolved}`,
    '',
    '## Portfolio-tier finds (solvedBeforeFallback)',
    '',
    newFinds.length === 0 ? '- None' : newFinds.map(f => `- Level ${f.level}${f.id ? ` (${f.id})` : ''}: pass ${f.pass}, ${f.winningConfig}, gate=${f.gateKey}`).join('\n'),
    '',
].join('\n');
writeFileSync(summaryOutFile, md);
console.log(`Result: solved=${solvedCount}/${levels.length}, solvedBeforeFallback=${solvedBeforeFallbackCount}, fallbackOnly=${fallbackOnlyCount}, unsolved=${unsolvedCount}`);
console.log(`Wrote ${outFile}`);
console.log(`Wrote ${summaryOutFile}`);
