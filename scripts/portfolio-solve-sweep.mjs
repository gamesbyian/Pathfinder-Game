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
 *   node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- --corpus=data/stress/stress-levels-random.json --levels=1-1700 --budget-ms=30000 --out=reports/portfolio/corpus2-sweep.json --summary-out=reports/portfolio/corpus2-sweep-summary.md --save-hints
 *
 * --save-hints persists every solved level's path into the corpus's hint corpus (data/stress/hints{,-random}/<id>.json)
 * with a proper HintProvenanceEntry, via the same modules/solver/hint-provenance.ts + scripts/level-data-io.mjs
 * machinery scripts/hint-workbench.mjs uses — so a solve found here is a real discovery event, not a
 * throwaway report row. Omit it for a dry-run report only.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { PORTFOLIO_EXPERIMENT } from '../data/config/portfolio-experiment.js';
import { readLevelsWithHints, writeLevelsWithHints } from './level-data-io.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const root = new URL('..', import.meta.url).pathname;
const budgetMs = Number(argMap.get('--budget-ms') || 30000);
const outFile = argMap.get('--out') || 'reports/portfolio/solve-sweep.json';
const summaryOutFile = argMap.get('--summary-out') || outFile.replace(/\.json$/u, '-summary.md');
const corpusPath = argMap.get('--corpus') || path.join(root, 'data', 'levels.json');
const saveHints = flags.has('--save-hints');

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
const { provenanceFromSolveResult } = await import('../modules/solver/hint-provenance.js');
const { toHint, mergeHints, hintPaths } = await import('../modules/domain/hint-types.js');
const Solver = createSolver();
// readLevelsWithHints attaches .hints/.hintRecords per level from the on-disk hint artifact
// (harmless when --save-hints is unset — we just don't write anything back).
const rawLevels = readLevelsWithHints(corpusPath);
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
let hintsAppended = 0;
const passCounts = { pass1: 0, pass2: 0, pass3: 0, conditional: 0, fallback: 0, unsolved: 0 };

console.log(`portfolio-solve-sweep: corpus=${path.relative(root, corpusPath)} levels=${targets.length} budget=${budgetMs}ms save-hints=${saveHints}`);
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

    let hintAppended = false;
    if (saveHints && result.ok && Array.isArray(result.solution) && result.solution.length > 0) {
        const provenance = provenanceFromSolveResult(result, {
            solverVersion: commit,
            budgetMs,
            usedExistingHints: false,
            randomSeed: null,
            levelRevision: null,
        });
        const before = (raw.hintRecords ?? []).length;
        raw.hintRecords = mergeHints(raw.hintRecords ?? [], [toHint(result.solution, [provenance])]);
        raw.hints = hintPaths(raw.hintRecords);
        hintAppended = raw.hintRecords.length !== before || (raw.hintRecords.find(h => h.path.join(',') === result.solution.join(','))?.provenance.length ?? 0) > 1;
        if (hintAppended) hintsAppended += 1;
    }

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
        hintAppended,
    };
    levels.push(row);
    if (solvedBeforeFallback) newFinds.push(row);
    console.log(`  [${i + 1}/${targets.length}] L${levelNumber}${row.id ? ` (${row.id})` : ''} ok=${row.ok ? '✓' : '✗'}${pass ? ` pass${pass}` : solvedByFallback ? ' fallback' : ''}${solvedBeforeFallback ? ' <-- PORTFOLIO FIND' : ''}${hintAppended ? ' [hint saved]' : ''}`);
}

let hintWriteResult = null;
if (saveHints) {
    hintWriteResult = writeLevelsWithHints(corpusPath, rawLevels);
    console.log(`Hints: appended to ${hintsAppended} level(s); ${hintWriteResult.hintFilesChanged} hint file(s) changed on disk.`);
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
    saveHints,
    hintsAppended,
    hintFilesChanged: hintWriteResult?.hintFilesChanged ?? 0,
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
    `- Hints saved: ${saveHints ? `yes (${hintsAppended} level(s), ${hintWriteResult?.hintFilesChanged ?? 0} hint file(s) changed)` : 'no (pass --save-hints)'}`,
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
