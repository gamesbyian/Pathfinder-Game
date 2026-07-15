#!/usr/bin/env node
/**
 * Solve-only sweep across a level range — no paired legacy comparison call — used for probing
 * currently-unsolved stress-corpus levels, where the paired-comparison sibling tool
 * (scripts/portfolio-scheduler-report.mjs) would double the cost for no benefit (see
 * docs/fast-portfolio-scheduler-plan.md / reports/portfolio/portfolio-scheduler-decision.md).
 *
 * Two use cases, both supported by the same script:
 *  1. Probing the portfolio-scheduler idea itself (`--scheduler-mode=portfolio-experiment`,
 *     the default): `solvedBeforeFallback: true` means a portfolio pass (1/2/3/conditional)
 *     found the solution — i.e. something other than a plain full-budget legacy-equivalent
 *     search. `solvedBeforeFallback: false` with `ok: true` means only the embedded fallback
 *     phase (a fresh full-budget legacy-equivalent solve) found it, not a portfolio-specific
 *     result.
 *  2. General fast batch testing of a NEW solver feature/heuristic against the unsolved corpora
 *     (`--scheduler-mode=legacy`): the portfolio scheduler is not itself a speed mechanism (see
 *     docs/solver-architecture.md's verdict — every measured variant is slower than legacy), so
 *     for this use case prefer plain legacy mode plus `--node-budget`/`--repair-budget-fraction`
 *     below to bound cost, rather than the portfolio tiers.
 *
 * Cost knobs, learned from an earlier run that took ~21 minutes on one repair-gated stress level
 * (see docs/solver-architecture.md's cost-gotcha note): any level matching attempts.ts's
 * needsRepairFallback (mustCross>=2 & mustPass>=3, or very-high-reqInt) grants the solver's
 * repair fallback REPAIR_EXTRA_BUDGET_FRACTION (6x, orchestration.ts) EXTRA wall-clock budget on
 * top of --budget-ms when nothing else solves it — the dominant cost driver when sweeping the
 * unsolved corpora, since that structural cluster is a large share of what's still unsolved.
 *   --node-budget=<n>            deterministic, machine-speed-independent cap (orchestration.ts's
 *                                 SolveOpts.nodeBudget) — prefer this over a smaller --budget-ms
 *                                 alone for a fast, reproducible dev-loop signal that doesn't
 *                                 depend on CPU contention.
 *   --repair-budget-fraction=<n> overrides REPAIR_EXTRA_BUDGET_FRACTION for this run only (via
 *                                 the REPAIR_BUDGET_FRACTION_OVERRIDE ablation flag) — e.g. `1`
 *                                 caps the repair fallback's extra budget at 1x --budget-ms
 *                                 instead of 6x, bounding the worst case directly. Only affects
 *                                 legacy-path solves (plain legacy mode, and portfolio's embedded
 *                                 fallback phase) — portfolio's own pass1/2/3/conditional tiers
 *                                 are wall-clock-capped by design (see the plan doc) and don't
 *                                 use this fraction at all.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/portfolio-solve-sweep.mjs -- --corpus=data/stress/stress-levels-random.json --levels=1-1700 --scheduler-mode=legacy --budget-ms=15000 --repair-budget-fraction=1.5 --node-budget=4000000 --out=reports/portfolio/corpus2-sweep.json --summary-out=reports/portfolio/corpus2-sweep-summary.md --save-hints
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
const schedulerMode = argMap.get('--scheduler-mode') === 'legacy' ? 'legacy' : 'portfolio-experiment';
const nodeBudget = argMap.has('--node-budget') ? Number(argMap.get('--node-budget')) : undefined;
const repairBudgetFraction = argMap.has('--repair-budget-fraction') ? Number(argMap.get('--repair-budget-fraction')) : undefined;

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

const solveOpts = { timeBudgetMs: budgetMs, schedulerMode };
if (schedulerMode === 'portfolio-experiment') solveOpts.portfolioExperiment = portfolioExperiment;
if (Number.isFinite(nodeBudget)) solveOpts.nodeBudget = nodeBudget;
if (Number.isFinite(repairBudgetFraction)) solveOpts.ablation = { REPAIR_BUDGET_FRACTION_OVERRIDE: repairBudgetFraction };

const levels = [];
const newFinds = [];
let solvedCount = 0;
let solvedBeforeFallbackCount = 0;
let fallbackOnlyCount = 0;
let unsolvedCount = 0;
let hintsAppended = 0;
const passCounts = { pass1: 0, pass2: 0, pass3: 0, conditional: 0, fallback: 0, legacy: 0, unsolved: 0 };

console.log(`portfolio-solve-sweep: corpus=${path.relative(root, corpusPath)} levels=${targets.length} scheduler-mode=${schedulerMode} budget=${budgetMs}ms${Number.isFinite(nodeBudget) ? ` node-budget=${nodeBudget}` : ''}${Number.isFinite(repairBudgetFraction) ? ` repair-budget-fraction=${repairBudgetFraction}` : ''} save-hints=${saveHints}`);
for (const [i, levelNumber] of targets.entries()) {
    const raw = rawLevels[levelNumber - 1];
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    const result = await Solver.solve(level, solveOpts);

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
    else if (solvedByFallback) passCounts[schedulerMode === 'legacy' ? 'legacy' : 'fallback'] += 1;
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
    const phaseLabel = pass ? `pass${pass}` : (solvedByFallback ? (schedulerMode === 'legacy' ? 'legacy' : 'fallback') : '');
    console.log(`  [${i + 1}/${targets.length}] L${levelNumber}${row.id ? ` (${row.id})` : ''} ok=${row.ok ? '✓' : '✗'}${phaseLabel ? ` ${phaseLabel}` : ''}${solvedBeforeFallback ? ' <-- PORTFOLIO FIND' : ''}${hintAppended ? ' [hint saved]' : ''}`);
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
    schedulerMode,
    budgetMs,
    nodeBudget: Number.isFinite(nodeBudget) ? nodeBudget : null,
    repairBudgetFraction: Number.isFinite(repairBudgetFraction) ? repairBudgetFraction : null,
    portfolioExperiment: schedulerMode === 'portfolio-experiment' ? {
        pass1Ms: portfolioExperiment.pass1Ms,
        pass2Ms: portfolioExperiment.pass2Ms,
        pass3Ms: portfolioExperiment.pass3Ms,
        pass2Configs: [...portfolioExperiment.pass2Configs],
        pass3Configs: [...portfolioExperiment.pass3Configs],
        conditionalPasses: (portfolioExperiment.conditionalPasses ?? []).map(pass2 => ({
            passNumber: pass2.passNumber, capMs: pass2.capMs, configs: [...pass2.configs], when: pass2.when,
        })),
    } : null,
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
    `Scheduler mode: ${summary.schedulerMode}`,
    `Budget: ${summary.budgetMs}ms`,
    `Node budget: ${summary.nodeBudget ?? '(none)'}`,
    `Repair budget fraction override: ${summary.repairBudgetFraction ?? '(default, 6x)'}`,
    `Levels run: ${summary.levelsRun}`,
    '',
    `- Solved (any phase): ${solvedCount}`,
    `- Solved before fallback (portfolio-tier find): ${solvedBeforeFallbackCount}`,
    `- Solved by fallback/legacy path only: ${fallbackOnlyCount}`,
    `- Unsolved: ${unsolvedCount}`,
    `- Hints saved: ${saveHints ? `yes (${hintsAppended} level(s), ${hintWriteResult?.hintFilesChanged ?? 0} hint file(s) changed)` : 'no (pass --save-hints)'}`,
    '',
    '## Pass distribution',
    '',
    `- Pass 1: ${passCounts.pass1}`,
    `- Pass 2: ${passCounts.pass2}`,
    `- Pass 3: ${passCounts.pass3}`,
    `- Conditional: ${passCounts.conditional}`,
    `- Fallback (portfolio mode's embedded legacy-equivalent phase): ${passCounts.fallback}`,
    `- Legacy (plain legacy-mode solve): ${passCounts.legacy}`,
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
