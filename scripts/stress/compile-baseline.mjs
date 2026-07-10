#!/usr/bin/env node
/**
 * Compiles the official regression baseline for the full 450-level stress Corpus 1
 * (data/stress/stress-levels.json) by stitching together two independently-run sources
 * that between them already cover every level, instead of re-solving anything:
 *
 *   - reports/stress/benchmark-latest.json — the original 150 hypothesis-driven levels
 *     (S-prefixed ids), solved sequentially via `npm run stress:benchmark` (official numbers).
 *   - logs/solver-randoms-baseline/batch-*.json — the run that discovered which of the
 *     2000-level random corpus were solvable (R-prefixed ids); the solved subset of that
 *     run (300 levels) was migrated into Corpus 1. These batches ran with `--parallel`
 *     (6-25 way), so their per-level timing is CPU-contention-inflated — see the
 *     "caveats" field on the compiled output. Only the *solved* entries are pulled in,
 *     since those are exactly Corpus 1's migrated 300 (the corresponding 1700 unsolved
 *     entries are not part of Corpus 1 and are excluded).
 *
 * Every level's result record keeps the shared schema both source tools already emit
 * (ok/refereeValid/elapsedMs/nodesExpanded/attemptCount/winningStrategy/attempts/...) plus a
 * `baselineSource` tag so a future diff can tell which timing numbers are trustworthy.
 *
 * Re-run this whenever either source is refreshed (e.g. once an official sequential
 * benchmark exists for the full 450, it should replace the random-batches subset here).
 *
 * Pure JS — runs under plain node:
 *   node scripts/stress/compile-baseline.mjs [--corpus=…] [--official=…] [--random-batches=…]
 *       [--out=logs/stress-corpus1-450-baseline.json]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels.json';
const OFFICIAL_FILE = args.get('--official') || 'reports/stress/benchmark-latest.json';
const RANDOM_BATCHES_DIR = args.get('--random-batches') || 'logs/solver-randoms-baseline';
const OUT_FILE = args.get('--out') || 'logs/stress-corpus1-450-baseline.json';

const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));

const corpus = readJson(CORPUS_FILE);
const corpusIds = new Set(corpus.levels.map(l => l.id));

const official = readJson(OFFICIAL_FILE);
const officialLevels = official.levels
    .filter(lv => corpusIds.has(lv.id))
    .map(lv => ({ ...lv, baselineSource: 'sequential-official' }));

const batchFiles = readdirSync(path.resolve(ROOT, RANDOM_BATCHES_DIR))
    .filter(f => /^batch-\d+\.json$/.test(f))
    .sort();

const randomLevels = [];
const seenIds = new Set(officialLevels.map(lv => lv.id));
for (const file of batchFiles) {
    const batch = readJson(path.join(RANDOM_BATCHES_DIR, file));
    for (const lv of batch.levels) {
        if (!lv.ok || !corpusIds.has(lv.id) || seenIds.has(lv.id)) continue;
        seenIds.add(lv.id);
        randomLevels.push({ ...lv, baselineSource: 'parallel-migrated', sourceBatch: file, sourceParallel: batch.parallel ?? 1 });
    }
}

const combined = [...officialLevels, ...randomLevels];
const missing = [...corpusIds].filter(id => !seenIds.has(id));
const idOrder = (id) => {
    const m = /^([A-Z]+)(\d+)$/.exec(id);
    return m ? [m[1], Number(m[2])] : [id, 0];
};
combined.sort((a, b) => {
    const [pa, na] = idOrder(a.id), [pb, nb] = idOrder(b.id);
    return pa === pb ? na - nb : pa.localeCompare(pb);
});

const solved = combined.filter(lv => lv.ok).length;

const output = {
    description: 'Compiled (not freshly re-solved) baseline for the full 450-level stress Corpus 1 — ' +
        'stitches the sequential-official 150-level benchmark with the parallel run that found the ' +
        '300 migrated random-corpus solves. See "sources" for provenance and the timing caveat.',
    compiledAt: new Date().toISOString(),
    corpus: CORPUS_FILE,
    corpusTotal: corpus.levels.length,
    total: combined.length,
    solved,
    missing,
    sources: [
        {
            name: 'sequential-official',
            file: OFFICIAL_FILE,
            levels: officialLevels.length,
            engine: 'sequential (official stress:benchmark run)',
            parallel: 1,
            budgetMs: official.budgetMs,
            timestamp: official.timestamp,
            commitSha: official.commitSha,
            timingTrustworthy: true,
        },
        {
            name: 'parallel-migrated',
            files: batchFiles.map(f => path.join(RANDOM_BATCHES_DIR, f)),
            levels: randomLevels.length,
            engine: 'stress:benchmark --parallel (across-level worker threads)',
            parallelObserved: [...new Set(randomLevels.map(lv => lv.sourceParallel))],
            budgetMs: 20000,
            timingTrustworthy: false,
            caveat: 'These levels were solved under --parallel=6 (batch-001 ran at --parallel=25). ' +
                'Per-level elapsedMs is CPU-contention-inflated — the corresponding batch files show ' +
                'many FAILED levels running 2x-17x over the nominal 20000ms budget under this contention ' +
                '(observed up to ~338,870ms). ok/refereeValid/nodesExpanded/winningStrategy are trustworthy ' +
                'correctness signals; elapsedMs here must not be compared against the sequential-official ' +
                'subset or treated as an official timing number.',
        },
    ],
    levels: combined,
};

if (missing.length > 0) {
    console.error(`WARNING: ${missing.length} corpus level(s) not found solved in either source: ${missing.join(', ')}`);
}
console.log(`Compiled baseline: ${combined.length}/${corpus.levels.length} corpus levels covered ` +
    `(${officialLevels.length} sequential-official + ${randomLevels.length} parallel-migrated), ${solved} solved.`);

writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify(output, null, 2) + '\n');
console.log(`Wrote ${OUT_FILE}`);
