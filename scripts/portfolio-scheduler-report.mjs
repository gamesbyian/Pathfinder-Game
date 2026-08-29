#!/usr/bin/env node
/**
 * Compare the legacy solver ladder with the opt-in fast portfolio scheduler experiment.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/portfolio-scheduler-report.mjs -- --levels=pos:1-25 --budget-ms=30000 --out=reports/portfolio-scheduler-report.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';
import { LEGACY_LATENCY_PORTFOLIO_EXPERIMENT } from '../modules/solver/legacy-latency-portfolio-experiment.js';
import { parseLevelPositions } from './level-data-io.mjs';
import { attemptConfigKey, attemptRecord, canonicalAttemptConfigKey } from './portfolio-solve-sweep-lib.mjs';
import { normalizeAttemptIdentityKey } from '../modules/solver/attempt-identity.mjs';

const args = process.argv.slice(2);
const argMap = new Map(args.filter(a => a.startsWith('--') && a.includes('=')).map(a => { const [k, ...v] = a.split('='); return [k, v.join('=')]; }));
const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')));

const root = new URL('..', import.meta.url).pathname;
const budgetMs = Number(argMap.get('--budget-ms') || 30000);
const outFile = argMap.get('--out') || 'reports/portfolio-scheduler-report.json';
const summaryOutFile = argMap.get('--summary-out') || outFile.replace(/\.json$/u, '-summary.md');
const corpusPath = argMap.get('--corpus') || path.join(root, 'data', 'levels.json');
const stopOnMismatch = flags.has('--stop-on-mismatch');


function levelsFrom(parsed) {
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.levels)) return parsed.levels;
    if (Array.isArray(parsed?.data?.levels)) return parsed.data.levels;
    return [];
}


function csvSet(value, fallback) {
    const raw = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [...fallback];
    return new Set(raw.map(normalizeAttemptIdentityKey));
}

function experimentFromArgs() {
    return {
        pass1Ms: Number(argMap.get('--pass1-ms') || LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass1Ms),
        pass2Ms: Number(argMap.get('--pass2-ms') || LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass2Ms),
        pass3Ms: Number(argMap.get('--pass3-ms') || LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass3Ms),
        pass2Configs: csvSet(argMap.get('--pass2-configs'), LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass2Configs),
        pass3Configs: csvSet(argMap.get('--pass3-configs'), LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.pass3Configs),
        conditionalPasses: LEGACY_LATENCY_PORTFOLIO_EXPERIMENT.conditionalPasses,
    };
}

function round(value, places = 3) {
    if (!Number.isFinite(value)) return null;
    const m = 10 ** places;
    return Math.round(value * m) / m;
}

function winningAttempt(result, phase = null) {
    return (Array.isArray(result?.attempts) ? result.attempts : []).find(a => a?.ok && (!phase || a.schedulerPhase === phase)) ?? null;
}

function passForPortfolioWin(result) {
    const winner = winningAttempt(result, 'portfolio');
    return Number.isFinite(Number(winner?.passNumber)) ? Number(winner.passNumber) : null;
}

function sumAttempts(result, predicate = () => true) {
    return (Array.isArray(result?.attempts) ? result.attempts : [])
        .filter(predicate)
        .reduce((sum, attempt) => sum + (Number(attempt?.elapsedMs) || 0), 0);
}

function summarizeRuntime(result, mode) {
    if (mode === 'portfolio') {
        const breakdown = result?.legacyLatencyPortfolioExperiment?.runtimeBreakdown;
        if (breakdown) return breakdown;
        const fallbackSearchMs = sumAttempts(result, a => a?.schedulerPhase === 'fallback');
        const portfolioAttemptSearchMs = sumAttempts(result, a => a?.schedulerPhase === 'portfolio');
        return {
            prepMs: null,
            portfolioAttemptSearchMs,
            schedulerOverheadMs: null,
            fallbackSearchMs,
            totalMs: result?.totalMs ?? null,
        };
    }
    const attemptSearchMs = sumAttempts(result);
    return {
        prepMs: null,
        attemptSearchMs,
        schedulerOverheadMs: Number.isFinite(Number(result?.totalMs)) ? Math.max(0, Number(result.totalMs) - attemptSearchMs) : null,
        totalMs: result?.totalMs ?? null,
    };
}


function formatMs(value) {
    return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}ms` : 'n/a';
}

function formatReportMarkdown(summary) {
    const retention = summary.solveRetention;
    const passes = summary.passDistribution;
    const runtime = summary.runtimeBreakdown;
    const restart = summary.restartDuplication;
    const lines = [
        '# Portfolio Scheduler Comparison Report',
        '',
        `Generated: ${summary.generatedAt}`,
        `Commit: ${summary.commit}`,
        `Corpus: ${summary.corpus}`,
        `Budget: ${summary.budgetMs}ms`,
        `Evidence class: ${summary.evidenceClass} (equal-work decision-bearing: ${summary.decisionBearingForEqualWork ? 'yes' : 'no'})`,
        `Levels run: ${summary.levelsRun}`,
        '',
        '## Experiment definition',
        '',
        `- Pass 1 cap: ${summary.legacyLatencyPortfolioExperiment.pass1Ms}ms`,
        `- Pass 2 cap: ${summary.legacyLatencyPortfolioExperiment.pass2Ms}ms`,
        `- Pass 3 cap: ${summary.legacyLatencyPortfolioExperiment.pass3Ms}ms`,
        `- Pass 2 configs: ${summary.legacyLatencyPortfolioExperiment.pass2Configs.join(', ') || '(none)'}`,
        `- Pass 3 configs: ${summary.legacyLatencyPortfolioExperiment.pass3Configs.join(', ') || '(none)'}`,
        `- Conditional passes: ${summary.legacyLatencyPortfolioExperiment.conditionalPasses.length ? summary.legacyLatencyPortfolioExperiment.conditionalPasses.map(p => `pass ${p.passNumber} @ ${p.capMs}ms (${p.configs.join(', ')})`).join('; ') : '(none)'}`,
        '',
        '## Solve retention',
        '',
        `- Legacy solved: ${retention.legacySolvedCount}`,
        `- Portfolio before fallback solved: ${retention.portfolioBeforeFallbackSolvedCount}`,
        `- Portfolio + fallback solved: ${retention.portfolioFallbackSolvedCount}`,
        `- Fallback-only solved: ${retention.fallbackOnlySolvedCount}`,
        `- Unsolved in portfolio+fallback: ${retention.unsolvedCount}`,
        `- Retained all legacy solves: ${retention.retainedAllLegacySolves ? 'yes' : 'no'}`,
        '',
        '## Pass distribution',
        '',
        `- Pass 1: ${passes.pass1}`,
        `- Pass 2: ${passes.pass2}`,
        `- Pass 3: ${passes.pass3}`,
        `- Conditional: ${passes.conditional}`,
        `- Fallback: ${passes.fallback}`,
        `- Unsolved: ${passes.unsolved}`,
        '',
        '## Runtime breakdown',
        '',
        `- Legacy total: ${formatMs(runtime.legacyTotalMs)}`,
        `- Portfolio total: ${formatMs(runtime.portfolioTotalMs)}`,
        `- Portfolio prep: ${formatMs(runtime.portfolioPrepMs)}`,
        `- Portfolio attempt search: ${formatMs(runtime.portfolioAttemptSearchMs)}`,
        `- Portfolio scheduler overhead: ${formatMs(runtime.portfolioSchedulerOverheadMs)}`,
        `- Fallback search: ${formatMs(runtime.fallbackSearchMs)}`,
        `- Total runtime delta: ${formatMs(runtime.totalRuntimeDeltaMs)}`,
        `- Runtime ratio: ${runtime.totalRuntimeRatio ?? 'n/a'}`,
        '',
        '## Restart duplication',
        '',
        `- Repeated attempt elapsed time: ${formatMs(restart.repeatedAttemptElapsedMs)}`,
        `- Repeated-prefix node upper bound: ${restart.repeatedPrefixNodeUpperBound}`,
        `- Configs with repeated work: ${Object.keys(restart.repeatedWorkByConfig).length}`,
        `- Config-gate slices with repeated work: ${Object.keys(restart.repeatedWorkByConfigGate).length}`,
        '',
        '## Late and fallback-only wins',
        '',
    ];
    if (summary.lateAndFallbackOnlyWins.length === 0) {
        lines.push('- None');
    } else {
        for (const win of summary.lateAndFallbackOnlyWins) {
            lines.push(`- Level ${win.level}: ${win.phase}, ${win.winningConfig}, gate=${win.gateKey}`);
        }
    }
    lines.push('');
    return `${lines.join('\n')}\n`;
}

function addMapCount(map, key, amount = 1) {
    map.set(key, (map.get(key) ?? 0) + amount);
}

installBrowserStubs();
const { createSolver } = await import('../modules/solver.js');
const Solver = createSolver();
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const rawLevels = levelsFrom(corpus);
const levelFilter = parseLevelPositions(argMap.get('--levels'));
const targets = levelFilter
    ? [...levelFilter].filter(n => n >= 1 && n <= rawLevels.length).sort((a, b) => a - b)
    : Array.from({ length: rawLevels.length }, (_, i) => i + 1);
const commit = (() => { try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; } })();
const legacyLatencyPortfolioExperiment = experimentFromArgs();

const passSolved = { pass1: 0, pass2: 0, pass3: 0, conditional: 0, fallback: 0, unsolved: 0 };
const repeatedByConfig = new Map();
const repeatedByConfigGate = new Map();
const lateAndFallbackOnlyWins = [];
const levels = [];
let legacySolvedCount = 0;
let portfolioBeforeFallbackSolvedCount = 0;
let portfolioFallbackSolvedCount = 0;
let fallbackOnlySolvedCount = 0;
let unsolvedCount = 0;
let totalRepeatedAttemptElapsedMs = 0;
let totalRepeatedPrefixNodeUpperBound = 0;
let legacyRuntimeMs = 0;
let portfolioRuntimeMs = 0;
let portfolioAttemptSearchMs = 0;
let fallbackSearchMs = 0;
let schedulerOverheadMs = 0;
let prepMs = 0;

console.log(`portfolio-scheduler-report: corpus=${path.relative(root, corpusPath)} levels=${targets.length} budget=${budgetMs}ms`);
for (const [i, levelNumber] of targets.entries()) {
    const raw = rawLevels[levelNumber - 1];
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw', levelNumber });
    const legacy = await Solver.solveLevel(level, { timeBudgetMs: budgetMs });
    const portfolio = await Solver.solveLevel(level, { timeBudgetMs: budgetMs, schedulerMode: 'legacy-latency-portfolio-experiment', legacyLatencyPortfolioExperiment });

    const portfolioPass = passForPortfolioWin(portfolio);
    const solvedBeforeFallback = !!portfolio?.legacyLatencyPortfolioExperiment?.solvedBeforeFallback;
    const solvedByFallback = !!portfolio?.ok && !solvedBeforeFallback;
    const legacyWinner = winningAttempt(legacy);
    const portfolioWinner = winningAttempt(portfolio, 'portfolio') ?? winningAttempt(portfolio, 'fallback');
    const portfolioAttempts = (portfolio.attempts ?? []).filter(a => a?.schedulerPhase === 'portfolio');
    const repeatedAttempts = portfolioAttempts.filter(a => a?.restart);
    for (const attempt of repeatedAttempts) {
        const config = canonicalAttemptConfigKey(attempt);
        addMapCount(repeatedByConfig, config, Number(attempt.elapsedMs) || 0);
        addMapCount(repeatedByConfigGate, `${config}#${attempt.gateKey}`, Number(attempt.elapsedMs) || 0);
    }

    if (legacy.ok) legacySolvedCount += 1;
    if (solvedBeforeFallback) portfolioBeforeFallbackSolvedCount += 1;
    if (portfolio.ok) portfolioFallbackSolvedCount += 1;
    if (solvedByFallback) fallbackOnlySolvedCount += 1;
    if (!portfolio.ok) unsolvedCount += 1;
    if (portfolioPass === 1) passSolved.pass1 += 1;
    else if (portfolioPass === 2) passSolved.pass2 += 1;
    else if (portfolioPass === 3) passSolved.pass3 += 1;
    else if (portfolioPass && portfolioPass > 3) passSolved.conditional += 1;
    else if (solvedByFallback) passSolved.fallback += 1;
    else passSolved.unsolved += 1;

    const portfolioRuntime = summarizeRuntime(portfolio, 'portfolio');
    const legacyRuntime = summarizeRuntime(legacy, 'legacy');
    legacyRuntimeMs += Number(legacyRuntime.totalMs) || 0;
    portfolioRuntimeMs += Number(portfolioRuntime.totalMs) || 0;
    portfolioAttemptSearchMs += Number(portfolioRuntime.portfolioAttemptSearchMs) || 0;
    fallbackSearchMs += Number(portfolioRuntime.fallbackSearchMs) || 0;
    schedulerOverheadMs += Number(portfolioRuntime.schedulerOverheadMs) || 0;
    prepMs += Number(portfolioRuntime.prepMs) || 0;
    totalRepeatedAttemptElapsedMs += Number(portfolio?.legacyLatencyPortfolioExperiment?.repeatedAttemptElapsedMs) || 0;
    totalRepeatedPrefixNodeUpperBound += Number(portfolio?.legacyLatencyPortfolioExperiment?.repeatedPrefixNodeUpperBound) || 0;

    if (solvedByFallback || (portfolioPass && portfolioPass > 1)) {
        lateAndFallbackOnlyWins.push({
            level: levelNumber,
            phase: solvedByFallback ? 'fallback' : `pass${portfolioPass}`,
            winningConfig: canonicalAttemptConfigKey(portfolioWinner),
            gateKey: portfolioWinner?.gateKey ?? null,
            fallbackWinningAttemptElapsedMs: solvedByFallback ? portfolioWinner?.elapsedMs ?? null : null,
            fallbackCumulativeElapsedMs: solvedByFallback ? portfolio.totalMs : null,
            // Use the canonical projection: this diagnostic used to be another hand-maintained
            // Attempt whitelist and silently lagged every newly-added outcome/dispatch field.
            passAttemptsAlreadyTried: portfolioAttempts.map(attemptRecord),
            featureSummary: {
                reqLen: level.reqLen,
                reqInt: level.reqInt,
                gates: level.gateKeys?.length ?? 0,
                mustPass: level.mustPassKeys?.length ?? 0,
                mustCross: level.mustCrossKeys?.length ?? 0,
                mustTurn: level.mustPassTurnDirs?.size ?? 0,
                portals: level.portalMap?.size ?? 0,
                filters: level.filterMap?.size ?? 0,
                flippingFilters: level.flippingFilterMap?.size ?? 0,
            },
        });
    }

    const row = {
        level: levelNumber,
        legacy: { ok: !!legacy.ok, status: legacy.status, totalMs: legacy.totalMs, nodesExpanded: legacy.nodesExpanded, winningConfig: legacyWinner ? attemptConfigKey(legacyWinner) : null, runtime: legacyRuntime },
        portfolio: {
            ok: !!portfolio.ok,
            status: portfolio.status,
            totalMs: portfolio.totalMs,
            nodesExpanded: portfolio.nodesExpanded,
            solvedBeforeFallback,
            pass: portfolioPass,
            fallbackAttemptCount: portfolio?.legacyLatencyPortfolioExperiment?.fallbackAttemptCount ?? 0,
            repeatedAttemptElapsedMs: portfolio?.legacyLatencyPortfolioExperiment?.repeatedAttemptElapsedMs ?? 0,
            repeatedPrefixNodeUpperBound: portfolio?.legacyLatencyPortfolioExperiment?.repeatedPrefixNodeUpperBound ?? 0,
            winningConfig: portfolioWinner ? (canonicalAttemptConfigKey(portfolioWinner)) : null,
            runtime: portfolioRuntime,
        },
    };
    levels.push(row);
    const mismatch = legacy.ok !== portfolio.ok;
    console.log(`  [${i + 1}/${targets.length}] L${levelNumber} legacy=${legacy.ok ? '✓' : '✗'} portfolio=${portfolio.ok ? '✓' : '✗'}${portfolioPass ? ` pass${portfolioPass}` : solvedByFallback ? ' fallback' : ''}${mismatch ? ' MISMATCH' : ''}`);
    if (mismatch && stopOnMismatch) break;
}

const summary = {
    generatedAt: new Date().toISOString(),
    evidenceClass: 'legacy-wall-clock-scheduler-experiment',
    decisionBearingForEqualWork: false,
    commit,
    corpus: path.relative(root, corpusPath),
    budgetMs,
    legacyLatencyPortfolioExperiment: {
        pass1Ms: legacyLatencyPortfolioExperiment.pass1Ms,
        pass2Ms: legacyLatencyPortfolioExperiment.pass2Ms,
        pass3Ms: legacyLatencyPortfolioExperiment.pass3Ms,
        pass2Configs: [...legacyLatencyPortfolioExperiment.pass2Configs],
        pass3Configs: [...legacyLatencyPortfolioExperiment.pass3Configs],
        conditionalPasses: (legacyLatencyPortfolioExperiment.conditionalPasses ?? []).map(pass => ({
            passNumber: pass.passNumber,
            capMs: pass.capMs,
            configs: [...pass.configs],
            when: pass.when,
        })),
    },
    levelsRun: levels.length,
    solveRetention: {
        legacySolvedCount,
        portfolioBeforeFallbackSolvedCount,
        portfolioFallbackSolvedCount,
        fallbackOnlySolvedCount,
        unsolvedCount,
        retainedAllLegacySolves: levels.every(row => !row.legacy.ok || row.portfolio.ok),
    },
    passDistribution: passSolved,
    runtimeBreakdown: {
        legacyTotalMs: legacyRuntimeMs,
        portfolioTotalMs: portfolioRuntimeMs,
        portfolioPrepMs: prepMs,
        portfolioAttemptSearchMs,
        portfolioSchedulerOverheadMs: schedulerOverheadMs,
        fallbackSearchMs,
        totalRuntimeDeltaMs: portfolioRuntimeMs - legacyRuntimeMs,
        totalRuntimeRatio: legacyRuntimeMs > 0 ? round(portfolioRuntimeMs / legacyRuntimeMs) : null,
    },
    restartDuplication: {
        repeatedAttemptElapsedMs: totalRepeatedAttemptElapsedMs,
        repeatedPrefixNodeUpperBound: totalRepeatedPrefixNodeUpperBound,
        repeatedWorkByConfig: Object.fromEntries([...repeatedByConfig.entries()].sort((a, b) => b[1] - a[1])),
        repeatedWorkByConfigGate: Object.fromEntries([...repeatedByConfigGate.entries()].sort((a, b) => b[1] - a[1])),
    },
    lateAndFallbackOnlyWins,
};

mkdirSync(path.dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ summary, levels }, null, 2) + '\n');
writeFileSync(summaryOutFile, formatReportMarkdown(summary));
console.log(`Result: legacy=${legacySolvedCount}/${levels.length}, portfolio-before-fallback=${portfolioBeforeFallbackSolvedCount}, portfolio+fallback=${portfolioFallbackSolvedCount}, fallback-only=${fallbackOnlySolvedCount}, unsolved=${unsolvedCount}`);
console.log(`Wrote ${outFile}`);
console.log(`Wrote ${summaryOutFile}`);
if (!summary.solveRetention.retainedAllLegacySolves) process.exitCode = 1;
