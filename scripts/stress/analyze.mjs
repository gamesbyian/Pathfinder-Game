#!/usr/bin/env node
/**
 * Stress-corpus batch analysis.
 *
 * Joins the corpus metadata (data/stress/stress-levels.json) with the solver benchmark
 * (reports/stress/benchmark-latest.json) and produces the per-batch report used to
 * decide whether each generation theory should be expanded, refined, or discarded,
 * plus corpus-wide highlights and a recommended regression set.
 *
 * Pure JS — runs under plain node:
 *   node scripts/stress/analyze.mjs [--corpus=…] [--benchmark=…]
 *       [--out-md=reports/stress/batch-analysis.md] [--out-json=reports/stress/batch-analysis.json]
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { pearson, spearman } from './features.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels.json';
const BENCH_FILE = args.get('--benchmark') || 'reports/stress/benchmark-latest.json';
const OUT_MD = args.get('--out-md') || 'reports/stress/batch-analysis.md';
const OUT_JSON = args.get('--out-json') || 'reports/stress/batch-analysis.json';

const quantile = (sorted, q) => {
    if (sorted.length === 0) return null;
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo));
};
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const round3 = (v) => v === null ? null : Number(v.toFixed(3));

function main() {
    const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
    const bench = JSON.parse(readFileSync(path.resolve(ROOT, BENCH_FILE), 'utf8'));
    const budget = bench.budgetMs;
    const benchById = new Map(bench.levels.map(r => [r.id, r]));

    const rows = corpus.levels.map(lvl => {
        const b = benchById.get(lvl.id);
        const m = lvl.stressMeta;
        if (!b) return null;
        const elapsed = b.elapsedMs ?? budget;
        // Actual challenge in [0,1]: normalized log-time; unsolved levels saturate at 1.
        const actualChallenge = b.ok ? Math.min(1, Math.log1p(elapsed) / Math.log1p(budget)) : 1;
        return {
            id: lvl.id,
            batch: m.generationBatch,
            grid: `${lvl.grid.w}x${lvl.grid.h}`,
            reqLen: lvl.reqLen, reqInt: lvl.reqInt,
            routingRegime: m.routingRegime,
            featureTags: m.featureTags,
            novelty: m.noveltyScore,
            complexity: m.structuralComplexity,
            predicted: m.predictedSolverChallenge,
            confidence: m.predictionConfidence,
            solved: !!b.ok,
            status: b.status,
            refereeValid: b.refereeValid,
            elapsedMs: elapsed,
            nodesExpanded: b.nodesExpanded,
            attemptCount: b.attemptCount,
            winningStrategy: b.winningStrategy,
            failedStrategyCount: (b.failedStrategies || []).length,
            actualChallenge: round3(actualChallenge),
            predictionError: round3(Math.abs(m.predictedSolverChallenge - actualChallenge)),
        };
    }).filter(Boolean);

    // ── Per-batch aggregation ────────────────────────────────────────────────
    const batches = {};
    for (const r of rows) (batches[r.batch] = batches[r.batch] || []).push(r);

    const globalTimes = rows.map(r => r.elapsedMs).sort((a, b) => a - b);
    const globalMedian = quantile(globalTimes, 0.5);

    const batchReports = Object.entries(batches).sort().map(([letter, rs]) => {
        const times = rs.map(r => r.elapsedMs).sort((a, b) => a - b);
        const solvedRows = rs.filter(r => r.solved);
        const timeouts = rs.filter(r => r.status === 'timeout' || !r.solved);
        const nodes = rs.map(r => r.nodesExpanded).filter(Number.isFinite);
        const predAcc = {
            pearson: round3(pearson(rs.map(r => r.predicted), rs.map(r => r.actualChallenge))),
            spearman: round3(spearman(rs.map(r => r.predicted), rs.map(r => r.actualChallenge))),
            meanAbsError: round3(mean(rs.map(r => r.predictionError))),
        };
        const byTime = [...rs].sort((a, b) => b.elapsedMs - a.elapsedMs);
        const strongest = byTime.filter(r => !r.solved).concat(byTime.filter(r => r.solved)).slice(0, 3);
        const weakest = [...rs].filter(r => r.solved).sort((a, b) => a.elapsedMs - b.elapsedMs).slice(0, 3);
        const solveRate = solvedRows.length / rs.length;
        const timeoutRate = timeouts.length / rs.length;
        const medianRuntime = quantile(times, 0.5);
        // Verdict heuristic: a theory earns "expand" by hurting the solver
        // (timeouts or well-above-global median), "discard" by being uniformly easy.
        const verdict = timeoutRate >= 0.12 || medianRuntime > globalMedian * 3 ? 'expand'
            : timeoutRate > 0 || medianRuntime > globalMedian * 1.5 ? 'refine'
            : 'discard-or-rework';
        return {
            batch: letter,
            name: corpus.batches[letter]?.name,
            theory: corpus.batches[letter]?.theory,
            levelCount: rs.length,
            solveRate: round3(solveRate),
            timeoutRate: round3(timeoutRate),
            medianRuntimeMs: medianRuntime,
            p95RuntimeMs: quantile(times, 0.95),
            maxRuntimeMs: times[times.length - 1],
            avgNodesExpanded: nodes.length ? Math.round(mean(nodes)) : null,
            avgNovelty: round3(mean(rs.map(r => r.novelty))),
            avgStructuralComplexity: round3(mean(rs.map(r => r.complexity))),
            avgPredictedChallenge: round3(mean(rs.map(r => r.predicted))),
            avgActualChallenge: round3(mean(rs.map(r => r.actualChallenge))),
            predictionAccuracy: predAcc,
            strongestSolverFailures: strongest.map(fmtShort),
            weakestSolverFailures: weakest.map(fmtShort),
            verdict,
        };
    });

    // ── Corpus-wide highlights ───────────────────────────────────────────────
    const cxSorted = rows.map(r => r.complexity).sort((a, b) => a - b);
    const cxLow = cxSorted[Math.floor(cxSorted.length * 0.33)];
    const cxHigh = cxSorted[Math.floor(cxSorted.length * 0.67)];
    const hard = (r) => !r.solved || r.elapsedMs > globalMedian * 4;
    const easy = (r) => r.solved && r.elapsedMs <= globalMedian;

    const hostile = rows.filter(r => !r.solved)
        .concat(rows.filter(r => r.solved).sort((a, b) => b.elapsedMs - a.elapsedMs))
        .slice(0, 10);
    const highlights = {
        mostNovel: [...rows].sort((a, b) => b.novelty - a.novelty).slice(0, 8).map(fmtShort),
        mostSolverHostile: hostile.map(fmtShort),
        simplestButHardest: rows.filter(r => r.complexity <= cxLow && hard(r))
            .sort((a, b) => b.elapsedMs - a.elapsedMs).slice(0, 8).map(fmtShort),
        mostComplexButEasiest: rows.filter(r => r.complexity >= cxHigh && easy(r))
            .sort((a, b) => a.elapsedMs - b.elapsedMs).slice(0, 8).map(fmtShort),
        largestPredictionErrors: [...rows].sort((a, b) => b.predictionError - a.predictionError)
            .slice(0, 8).map(r => ({ ...fmtShort(r), predicted: r.predicted, actual: r.actualChallenge })),
        refereeAnomalies: rows.filter(r => r.refereeValid === false).map(fmtShort),
    };

    // ── Regression-set recommendation ────────────────────────────────────────
    const regression = new Map();
    const addReg = (r, reason) => {
        if (!regression.has(r.id)) regression.set(r.id, { id: r.id, batch: r.batch, reasons: [] });
        regression.get(r.id).reasons.push(reason);
    };
    for (const r of rows.filter(r => !r.solved)) addReg(r, 'unsolved within budget');
    for (const r of rows.filter(r => r.refereeValid === false)) addReg(r, 'solver path fails PLAY referee');
    for (const r of [...rows].filter(r => r.solved).sort((a, b) => b.elapsedMs - a.elapsedMs).slice(0, 8))
        addReg(r, `slow solve (${r.elapsedMs}ms)`);
    for (const r of highlights.simplestButHardest.slice(0, 4)) addReg(rows.find(x => x.id === r.id), 'deceptively simple');
    // Every unsolved level is always retained (they enter the map first); the cap
    // only trims the softer slow/deceptive additions.
    const regressionSet = [...regression.values()].slice(0, Math.max(24, rows.filter(r => !r.solved).length));

    const report = {
        generatedAt: new Date().toISOString(),
        corpus: CORPUS_FILE,
        benchmark: BENCH_FILE,
        budgetMs: budget,
        totals: {
            levels: rows.length,
            solved: rows.filter(r => r.solved).length,
            unsolved: rows.filter(r => !r.solved).length,
            globalMedianRuntimeMs: globalMedian,
        },
        batches: batchReports,
        highlights,
        recommendedRegressionSet: regressionSet,
    };

    mkdirSync(path.dirname(path.resolve(ROOT, OUT_JSON)), { recursive: true });
    writeFileSync(path.resolve(ROOT, OUT_JSON), JSON.stringify(report, null, 1));
    writeFileSync(path.resolve(ROOT, OUT_MD), renderMarkdown(report, corpus));
    console.log(`Batch analysis → ${OUT_MD} (+ ${OUT_JSON})`);
    for (const b of batchReports)
        console.log(`  ${b.batch} ${b.name}: solve ${Math.round(b.solveRate * 100)}%  median ${b.medianRuntimeMs}ms  p95 ${b.p95RuntimeMs}ms  verdict=${b.verdict}`);
}

function fmtShort(r) {
    return {
        id: r.id, batch: r.batch, grid: r.grid, reqLen: r.reqLen, reqInt: r.reqInt,
        solved: r.solved, elapsedMs: r.elapsedMs, complexity: r.complexity, novelty: r.novelty,
        winningStrategy: r.winningStrategy,
    };
}

function renderMarkdown(report, corpus) {
    const lines = [];
    const push = (s = '') => lines.push(s);
    push('# Stress-corpus batch analysis');
    push();
    push(`Generated ${report.generatedAt} — corpus \`${report.corpus}\` (generator v${corpus.generatorVersion}), benchmark \`${report.benchmark}\` at ${report.budgetMs}ms budget.`);
    push();
    push(`**Totals:** ${report.totals.levels} levels · ${report.totals.solved} solved · ${report.totals.unsolved} unsolved · global median runtime ${report.totals.globalMedianRuntimeMs}ms.`);
    push();
    push('## Per-batch results');
    push();
    push('| Batch | Theory | N | Solve | Timeout | Median | p95 | Max | Avg nodes | Novelty | Complexity | Pred. | Actual | Spearman | Verdict |');
    push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const b of report.batches) {
        push(`| ${b.batch} | ${b.name} | ${b.levelCount} | ${pc(b.solveRate)} | ${pc(b.timeoutRate)} | ${b.medianRuntimeMs}ms | ${b.p95RuntimeMs}ms | ${b.maxRuntimeMs}ms | ${b.avgNodesExpanded ?? '—'} | ${b.avgNovelty} | ${b.avgStructuralComplexity} | ${b.avgPredictedChallenge} | ${b.avgActualChallenge} | ${b.predictionAccuracy.spearman} | **${b.verdict}** |`);
    }
    push();
    for (const b of report.batches) {
        push(`### Batch ${b.batch} — ${b.name}`);
        push();
        push(`> ${b.theory}`);
        push();
        push(`Prediction accuracy: Pearson ${b.predictionAccuracy.pearson}, Spearman ${b.predictionAccuracy.spearman}, mean |error| ${b.predictionAccuracy.meanAbsError}.`);
        push();
        push(`Strongest solver failures: ${listIds(b.strongestSolverFailures)}.`);
        push(`Weakest (solver shrugged): ${listIds(b.weakestSolverFailures)}.`);
        push();
    }
    push('## Highlights');
    push();
    section(push, 'Most novel', report.highlights.mostNovel);
    section(push, 'Most solver-hostile', report.highlights.mostSolverHostile);
    section(push, 'Simplest but hardest', report.highlights.simplestButHardest);
    section(push, 'Most complex but easiest', report.highlights.mostComplexButEasiest);
    push('### Largest prediction errors');
    push();
    for (const r of report.highlights.largestPredictionErrors)
        push(`- **${r.id}** (${r.batch}) predicted ${r.predicted} vs actual ${r.actual} — ${r.solved ? `${r.elapsedMs}ms` : 'unsolved'}`);
    push();
    if (report.highlights.refereeAnomalies.length > 0) {
        section(push, 'Referee anomalies (solver path fails PLAY rules — hazard traversal findings)', report.highlights.refereeAnomalies);
    }
    push('## Recommended permanent regression set');
    push();
    for (const r of report.recommendedRegressionSet)
        push(`- **${r.id}** (${r.batch}): ${r.reasons.join('; ')}`);
    push();
    return lines.join('\n');
}

const pc = (v) => `${Math.round(v * 100)}%`;
const listIds = (arr) => arr.length ? arr.map(r => `${r.id} (${r.solved ? `${r.elapsedMs}ms` : 'unsolved'})`).join(', ') : '—';

function section(push, title, rows) {
    push(`### ${title}`);
    push();
    if (rows.length === 0) { push('_none_'); push(); return; }
    push('| Level | Batch | Grid | reqLen | reqInt | Solved | Time | Complexity | Novelty | Winning strategy |');
    push('|---|---|---|---|---|---|---|---|---|---|');
    for (const r of rows)
        push(`| ${r.id} | ${r.batch} | ${r.grid} | ${r.reqLen} | ${r.reqInt} | ${r.solved ? '✓' : '✗'} | ${r.elapsedMs}ms | ${r.complexity} | ${r.novelty} | ${r.winningStrategy ?? '—'} |`);
    push();
}

main();
