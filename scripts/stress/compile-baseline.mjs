#!/usr/bin/env node
/**
 * Compiles a regression baseline from already-run logs, without re-solving anything. Two modes:
 *
 *   --mode=corpus1 (default) — the full 450-level stress Corpus 1 (data/stress/stress-levels.json),
 *     stitching two sources that between them cover every level:
 *       - reports/stress/benchmark-latest.json — the original 150 hypothesis-driven levels
 *         (S-prefixed ids), solved sequentially via `npm run stress:benchmark` (official numbers).
 *       - logs/solver-randoms-baseline/batch-*.json — the run that discovered which of the
 *         2000-level random corpus were solvable (R-prefixed ids); the solved subset (300 levels)
 *         was migrated into Corpus 1. Only the *solved* entries are pulled in here.
 *
 *   --mode=corpus2 — the 1700-level stress Corpus 2 (data/stress/stress-levels-random.json,
 *     the unsolved/timeout subset left behind after the 300-level migration above). Every one of
 *     its ids is expected to appear in the SAME batch-*.json files with ok:false (if the 300
 *     solved ones had been left in they'd have been migrated instead) — this mode pulls in every
 *     matching entry regardless of ok, and warns loudly if any turns up ok:true (that would mean
 *     the corpus file and the batch logs have drifted out of sync with each other since the
 *     migration, not a solver finding). There is no "official" counterpart for Corpus 2 yet, so
 *     this mode has only the one source.
 *
 * Both modes' batch-derived entries ran under `--parallel` (6-25 way; batch-001 at 25), so their
 * per-level timing is CPU-contention-inflated on top of the (separate, by-design) repair-budget
 * stacking effect — see the "caveats" field on the compiled output; only mode=corpus1's
 * sequential-official subset has trustworthy timing.
 *
 * Every level's result record keeps the shared schema both source tools already emit
 * (ok/refereeValid/elapsedMs/nodesExpanded/attemptCount/winningStrategy/attempts/...) plus a
 * `baselineSource` tag so a future diff can tell which timing numbers are trustworthy.
 *
 * Re-run this whenever either source is refreshed (e.g. once an official sequential
 * benchmark exists for the full 450, it should replace the random-batches subset in corpus1 mode).
 *
 * --verify=<file1>,<file2>,… (optional): benchmark.mjs-shaped result files layered on top of the
 * batch-derived data afterward, by id, later files winning ties — for folding in spot-check
 * re-verifications (e.g. a lower-contention/--parallel=2 re-run of a handful of ids) without
 * hand-editing the compiled baseline or waiting for a full corpus re-run. Each override is tagged
 * baselineSource='verified' plus its own provenance (sourceFile/sourceParallel/sourceTimestamp) so
 * it's still traceable which run corrected which id and why.
 *
 * Pure JS — runs under plain node:
 *   node scripts/stress/compile-baseline.mjs [--mode=corpus1|corpus2] [--corpus=…] [--official=…]
 *       [--random-batches=…] [--verify=file1,file2] [--out=…]
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const MODE = args.get('--mode') || 'corpus1';
const CORPUS_FILE = args.get('--corpus') || (MODE === 'corpus2' ? 'data/stress/stress-levels-random.json' : 'data/stress/stress-levels.json');
const OFFICIAL_FILE = args.get('--official') || 'reports/stress/benchmark-latest.json';
const RANDOM_BATCHES_DIR = args.get('--random-batches') || 'logs/solver-randoms-baseline';
const OUT_FILE = args.get('--out') || (MODE === 'corpus2' ? 'logs/stress-corpus2-1700-baseline.json' : 'logs/stress-corpus1-450-baseline.json');
const VERIFY_FILES = (args.get('--verify') || '').split(',').map(s => s.trim()).filter(Boolean);

const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));

const corpus = readJson(CORPUS_FILE);
const corpusIds = new Set(corpus.levels.map(l => l.id));

const officialLevels = MODE === 'corpus1'
    ? readJson(OFFICIAL_FILE).levels.filter(lv => corpusIds.has(lv.id)).map(lv => ({ ...lv, baselineSource: 'sequential-official' }))
    : [];
const official = MODE === 'corpus1' ? readJson(OFFICIAL_FILE) : null;

const batchFiles = readdirSync(path.resolve(ROOT, RANDOM_BATCHES_DIR))
    .filter(f => /^batch-\d+\.json$/.test(f))
    .sort();

const batchSourceName = MODE === 'corpus2' ? 'parallel-known-unsolved' : 'parallel-migrated';
const randomLevels = [];
const unexpectedSolved = [];
const seenIds = new Set(officialLevels.map(lv => lv.id));
for (const file of batchFiles) {
    const batch = readJson(path.join(RANDOM_BATCHES_DIR, file));
    for (const lv of batch.levels) {
        if (!corpusIds.has(lv.id) || seenIds.has(lv.id)) continue;
        if (MODE === 'corpus1' && !lv.ok) continue; // corpus1 only wants the migrated (solved) subset
        if (MODE === 'corpus2' && lv.ok) { unexpectedSolved.push(lv.id); continue; } // see file doc
        seenIds.add(lv.id);
        randomLevels.push({ ...lv, baselineSource: batchSourceName, sourceBatch: file, sourceParallel: batch.parallel ?? 1 });
    }
}
if (unexpectedSolved.length > 0) {
    console.error(`WARNING: ${unexpectedSolved.length} corpus2 level(s) found ok:true in the batch logs ` +
        `(should have been migrated to corpus1 instead — corpus file / batch logs are out of sync): ${unexpectedSolved.join(', ')}`);
}

const randomById = new Map(randomLevels.map(lv => [lv.id, lv]));
const verifiedOverrides = [];
for (const file of VERIFY_FILES) {
    const verify = readJson(file);
    for (const lv of verify.levels) {
        if (!corpusIds.has(lv.id) || !randomById.has(lv.id)) continue;
        randomById.set(lv.id, {
            ...lv, baselineSource: 'verified',
            sourceFile: file, sourceParallel: verify.parallel ?? 1, sourceTimestamp: verify.timestamp ?? null,
        });
        verifiedOverrides.push(lv.id);
    }
}
const finalRandomLevels = [...randomById.values()];

const combined = [...officialLevels, ...finalRandomLevels];
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

const contentionCaveat = (parallelDesc) =>
    `These levels were solved under ${parallelDesc}, and their elapsedMs cannot be compared against ` +
    'a sequential-official run or treated as an official timing number, for two independent reasons: ' +
    '(1) by design, not a bug — a repair-eligible level (needsRepairFallback) gets 1-2 repair configs ' +
    '(an extra must-turn-biased pass when the level has must-turn cells), each with its OWN fresh clock ' +
    "and its own full timeBudgetMs*REPAIR_EXTRA_BUDGET_FRACTION (6.0, orchestration.ts) allotment ON TOP " +
    "of the main loop's 1x share — up to ~13x timeBudgetMs total, confirmed by reading orchestration.ts/" +
    'attempts.ts, reproducible even at --parallel=1 with zero contention; (2) this subset additionally ran ' +
    'under real worker-thread contention on top of that, adding further, less predictable wall-clock ' +
    'inflation. ok/refereeValid/nodesExpanded/winningStrategy remain trustworthy correctness signals ' +
    'regardless of either effect.';

const batchSource = {
    name: batchSourceName,
    files: batchFiles.map(f => path.join(RANDOM_BATCHES_DIR, f)),
    levels: randomLevels.length,
    engine: 'stress:benchmark --parallel (across-level worker threads)',
    parallelObserved: [...new Set(randomLevels.map(lv => lv.sourceParallel))],
    budgetMs: 20000,
    timingTrustworthy: false,
    caveat: contentionCaveat('--parallel=6 (batch-001 ran at --parallel=25)'),
};
const verifiedSource = verifiedOverrides.length > 0 ? {
    name: 'verified',
    files: VERIFY_FILES,
    levels: verifiedOverrides.length,
    overriddenIds: verifiedOverrides,
    engine: 'stress:benchmark, lower --parallel spot-check re-verification',
    timingTrustworthy: false,
    caveat: 'Spot-check re-runs of specific ids at reduced contention (still not fully official/sequential) ' +
        'to correct the batch source above where its higher --parallel level may have produced a false ' +
        'timeout. Overrides the batch entry for these ids only; every other id is untouched.',
} : null;

const output = MODE === 'corpus2' ? {
    description: 'Compiled (not freshly re-solved) known-unsolved baseline for the 1700-level stress ' +
        'Corpus 2 (the solver-blind random corpus, minus the 300 levels migrated to Corpus 1). Every ' +
        'entry here is ok:false as of the same run that discovered those 300 solves — this is a starting ' +
        'point to diff future solver attempts against (an id flipping to ok:true is a genuine new solve), ' +
        'not a "regression" baseline in the corpus1 sense, since nothing here is expected to already pass.',
    compiledAt: new Date().toISOString(),
    corpus: CORPUS_FILE,
    corpusTotal: corpus.levels.length,
    total: combined.length,
    solved,
    missing,
    unexpectedSolvedInBatchLogs: unexpectedSolved,
    sources: verifiedSource ? [batchSource, verifiedSource] : [batchSource],
    levels: combined,
} : {
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
        batchSource,
        ...(verifiedSource ? [verifiedSource] : []),
    ],
    levels: combined,
};

if (missing.length > 0) {
    console.error(`WARNING: ${missing.length} corpus level(s) not found in any source: ${missing.join(', ')}`);
}
console.log(`Compiled ${MODE} baseline: ${combined.length}/${corpus.levels.length} corpus levels covered ` +
    (MODE === 'corpus2'
        ? `(${randomLevels.length} ${batchSourceName})`
        : `(${officialLevels.length} sequential-official + ${randomLevels.length} ${batchSourceName})`) +
    `, ${solved} solved` +
    (verifiedOverrides.length > 0 ? ` (${verifiedOverrides.length} overridden by --verify: ${verifiedOverrides.join(', ')})` : '') +
    '.');

writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify(output, null, 2) + '\n');
console.log(`Wrote ${OUT_FILE}`);
