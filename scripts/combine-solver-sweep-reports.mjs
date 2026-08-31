#!/usr/bin/env node
/**
 * Combines N portfolio-solve-sweep.mjs report files (one per corpus-2 GH Actions batch — see
 * .github/workflows/README-solver-corpus2-batches.md) into ONE scripts/stress/benchmark.mjs-shaped report
 * file, so scripts/stress/rank-levels.mjs, scripts/stress/classify-stability.mjs, and
 * scripts/stress/curate-dev-benchmark.mjs can consume it unmodified.
 *
 * Why this is needed at all: portfolio-solve-sweep.mjs's own per-level row already carries every
 * field those three tools read (ok/id/status/elapsedMs/nodesExpanded/attemptCount/attempts/
 * failedStrategies/refereeValid — see portfolio-solve-sweep-lib.mjs's buildRow(), which mirrors
 * scripts/stress/benchmark.mjs's solveEntry() row-for-row since both call the identical
 * Solver.solve()). The only real mismatch is the top-level WRAPPER: portfolio-solve-sweep writes
 * `{summary: {budgetMs, ...}, levels: [...]}`, while the three consumer tools read `budgetMs` and
 * `levels` at the top level directly (stress:measure-solver's own shape). This tool only flattens that
 * wrapper and concatenates `levels` across input files — no per-row remapping.
 *
 * Usage:
 *   node scripts/combine-solver-sweep-reports.mjs \
 *       --in=logs/solver-corpus2-batches/batch-01.json,logs/solver-corpus2-batches/batch-02.json,... \
 *       --out=reports/stress/solver-corpus2-latest.json
 *   # or, to pick up every batch-*.json in a directory at once:
 *   node scripts/combine-solver-sweep-reports.mjs --in-dir=logs/solver-corpus2-batches --out=reports/stress/solver-corpus2-latest.json
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function main() {
    const ROOT = process.cwd();
    const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
        const [k, ...v] = a.split('=');
        return [k, v.join('=')];
    }));

    const inDir = args.get('--in-dir');
    const inList = args.get('--in');
    const outFile = args.get('--out');
    const allowMixedCorpora = args.has('--allow-mixed-corpora');
    if ((!inDir && !inList) || !outFile) {
        console.error('Usage: node scripts/combine-solver-sweep-reports.mjs (--in=<file1>,<file2>,... | --in-dir=<dir>) --out=<combined.json>');
        process.exit(2);
    }

    const inputPaths = inDir
        ? readdirSync(path.resolve(ROOT, inDir)).filter(n => n.endsWith('.json')).map(n => path.join(inDir, n)).sort()
        : inList.split(',').map(s => s.trim()).filter(Boolean);

    if (inputPaths.length === 0) {
        console.error('No input files found.');
        process.exit(2);
    }

    const reports = inputPaths.map(p => {
        const abs = path.resolve(ROOT, p);
        const parsed = JSON.parse(readFileSync(abs, 'utf8'));
        if (!parsed?.summary || !Array.isArray(parsed?.levels)) {
            throw new Error(`${p}: does not look like a portfolio-solve-sweep report ({summary, levels} expected)`);
        }
        return { path: p, ...parsed };
    });

    // budgetMs/corpus/schedulerMode must agree across all batches, or downstream badness/stability
    // ratios (which divide by a single budgetMs) would silently mix apples and oranges.
    const first = reports[0].summary;
    for (const r of reports.slice(1)) {
        if (r.summary.budgetMs !== first.budgetMs) {
            throw new Error(`Mismatched budgetMs: ${reports[0].path} used ${first.budgetMs}ms, ${r.path} used ${r.summary.budgetMs}ms.`);
        }
        if (!allowMixedCorpora && r.summary.corpus !== first.corpus) {
            throw new Error(`Mismatched corpus: ${reports[0].path} used ${first.corpus}, ${r.path} used ${r.summary.corpus}.`);
        }
        if (r.summary.schedulerMode !== first.schedulerMode) {
            throw new Error(`Mismatched schedulerMode: ${reports[0].path} used ${first.schedulerMode}, ${r.path} used ${r.summary.schedulerMode}.`);
        }
    }

    const seenIds = new Map();
    const seenPositions = new Map();
    const levels = [];
    for (const r of reports) {
        for (const lv of r.levels) {
            const identityPrefix = allowMixedCorpora ? `${r.summary.corpus}:` : '';
            const idKey = lv.id ? identityPrefix + lv.id : null;
            const positionKey = Number.isFinite(lv.level) ? identityPrefix + lv.level : null;
            if (idKey && seenIds.has(idKey)) {
                throw new Error(`Duplicate level id ${lv.id} in both ${seenIds.get(idKey)} and ${r.path}; batch ranges or inputs overlap.`);
            }
            if (positionKey && seenPositions.has(positionKey)) {
                throw new Error(`Duplicate level position ${lv.level} in both ${seenPositions.get(positionKey)} and ${r.path}; batch ranges or inputs overlap.`);
            }
            if (idKey) seenIds.set(idKey, r.path);
            if (positionKey) seenPositions.set(positionKey, r.path);
            levels.push(allowMixedCorpora ? { corpus: r.summary.corpus, ...lv } : lv);
        }
    }

    const solved = levels.filter(l => l.ok).length;
    const totalMs = levels.reduce((sum, l) => sum + (l.totalMs ?? l.elapsedMs ?? 0), 0);

    // Carry the NODE-budget context through. Every shard report records nodeBudget/
    // repairBudgetFraction/adaptiveBudget, but the combined report -- which is what becomes an
    // official baseline `source` and what every later analysis actually reads -- used to drop all
    // three, keeping only budgetMs. A combined report's per-attempt nodesExpanded was therefore
    // uninterpretable: no way to tell whether an attempt exhausted its allowance or was nowhere near
    // it, and no way to compare two sweeps' costs. Unlike budgetMs this is NOT a hard mismatch
    // error: solver-highbudget-unsolved-sweep.yml deliberately shards with weighted per-shard node
    // budgets, so disagreement is legitimate -- record the distinct values instead of collapsing to
    // the first shard's (which would misreport the other 239).
    const distinct = (field) => [...new Set(reports.map(r => r.summary[field]).filter(v => v !== undefined && v !== null))];
    const nodeBudgets = distinct('nodeBudget');
    // Same treatment for the WORK budget, which is the machine-independent one: two sweeps' costs
    // are only comparable when this matches. Recorded, not enforced, for the same weighted-shard
    // reason as nodeBudget above.
    const workBudgets = distinct('workBudget');
    const repairFractions = distinct('repairBudgetFraction');
    const adaptive = reports.map(r => r.summary.adaptiveBudget).filter(Boolean);

    const combined = {
        timestamp: new Date().toISOString(),
        commitSha: reports.map(r => r.summary.commit).find(Boolean) ?? 'unknown',
        corpus: allowMixedCorpora ? [...new Set(reports.map(r => r.summary.corpus))] : first.corpus,
        budgetMs: first.budgetMs,
        nodeBudget: nodeBudgets.length === 1 ? nodeBudgets[0] : (nodeBudgets.length === 0 ? null : nodeBudgets),
        workBudget: workBudgets.length === 1 ? workBudgets[0] : (workBudgets.length === 0 ? null : workBudgets),
        ...(repairFractions.length ? { repairBudgetFraction: repairFractions.length === 1 ? repairFractions[0] : repairFractions } : {}),
        ...(adaptive.length ? { adaptiveBudget: adaptive[0], adaptiveBudgetShards: adaptive.length } : {}),
        witnessAccess: 'none — see scripts/portfolio-solve-sweep.mjs (same Solver.solve() call as scripts/stress/benchmark.mjs)',
        engine: `legacy-scheduler (portfolio-solve-sweep, combined from ${reports.length} batch report(s))`,
        sourceReports: inputPaths,
        solved,
        failed: levels.length - solved,
        errors: 0,
        completed: levels.length,
        total: levels.length,
        totalMs,
        levels,
    };

    writeFileSync(path.resolve(ROOT, outFile), JSON.stringify(combined, null, 1));
    console.log(`Combined ${reports.length} report(s), ${levels.length} level(s) (${solved} solved) → ${outFile}`);
}

main();
