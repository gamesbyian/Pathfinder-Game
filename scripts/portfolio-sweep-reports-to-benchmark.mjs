#!/usr/bin/env node
/**
 * Combines N portfolio-solve-sweep.mjs report files (one per corpus-2 GH Actions batch — see
 * .github/workflows/README-solver-corpus2-batches.md) into ONE stress:benchmark.mjs-shaped report
 * file, so scripts/stress/rank-levels.mjs, scripts/stress/classify-stability.mjs, and
 * scripts/stress/curate-dev-benchmark.mjs can consume it unmodified.
 *
 * Why this is needed at all: portfolio-solve-sweep.mjs's own per-level row already carries every
 * field those three tools read (ok/id/status/elapsedMs/nodesExpanded/attemptCount/attempts/
 * failedStrategies/refereeValid — see portfolio-solve-sweep-lib.mjs's buildRow(), which mirrors
 * scripts/stress/benchmark.mjs's solveEntry() row-for-row since both call the identical
 * Solver.solve()). The only real mismatch is the top-level WRAPPER: portfolio-solve-sweep writes
 * `{summary: {budgetMs, ...}, levels: [...]}`, while the three consumer tools read `budgetMs` and
 * `levels` at the top level directly (stress:benchmark's own shape). This tool only flattens that
 * wrapper and concatenates `levels` across input files — no per-row remapping.
 *
 * Usage:
 *   node scripts/portfolio-sweep-reports-to-benchmark.mjs \
 *       --in=logs/solver-corpus2-batches/batch-01.json,logs/solver-corpus2-batches/batch-02.json,... \
 *       --out=reports/stress/benchmark-latest-random.json
 *   # or, to pick up every batch-*.json in a directory at once:
 *   node scripts/portfolio-sweep-reports-to-benchmark.mjs --in-dir=logs/solver-corpus2-batches --out=reports/stress/benchmark-latest-random.json
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
    if ((!inDir && !inList) || !outFile) {
        console.error('Usage: node scripts/portfolio-sweep-reports-to-benchmark.mjs (--in=<file1>,<file2>,... | --in-dir=<dir>) --out=<combined.json>');
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
        if (r.summary.corpus !== first.corpus) {
            throw new Error(`Mismatched corpus: ${reports[0].path} used ${first.corpus}, ${r.path} used ${r.summary.corpus}.`);
        }
        if (r.summary.schedulerMode !== first.schedulerMode) {
            throw new Error(`Mismatched schedulerMode: ${reports[0].path} used ${first.schedulerMode}, ${r.path} used ${r.summary.schedulerMode}.`);
        }
    }

    const seenIds = new Map();
    const levels = [];
    for (const r of reports) {
        for (const lv of r.levels) {
            if (lv.id && seenIds.has(lv.id)) {
                console.error(`Warning: duplicate level id ${lv.id} in both ${seenIds.get(lv.id)} and ${r.path} — keeping the later one.`);
                const idx = levels.findIndex(l => l.id === lv.id);
                if (idx >= 0) levels.splice(idx, 1);
            }
            if (lv.id) seenIds.set(lv.id, r.path);
            levels.push(lv);
        }
    }

    const solved = levels.filter(l => l.ok).length;
    const totalMs = levels.reduce((sum, l) => sum + (l.totalMs ?? l.elapsedMs ?? 0), 0);

    const combined = {
        timestamp: new Date().toISOString(),
        commitSha: reports.map(r => r.summary.commit).find(Boolean) ?? 'unknown',
        corpus: first.corpus,
        budgetMs: first.budgetMs,
        witnessAccess: 'none — see scripts/portfolio-solve-sweep.mjs (same Solver.solve() call as stress:benchmark.mjs)',
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
