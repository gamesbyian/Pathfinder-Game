#!/usr/bin/env node
/**
 * Compiles a regression baseline from already-run logs, without re-solving anything. Two modes:
 *
 *   --mode=corpus1 (default) — the current stress Corpus 1 (data/stress/stress-levels.json),
 *     stitching whichever of these sources exist and cover a given id (official wins ties):
 *       - reports/stress/benchmark-latest.json (or --official=<file>) — an official
 *         `npm run stress:measure-solver` run against the corpus. NOT assumed to be sequential/
 *         trustworthy-timing just because it's "the official file" — the compiled output reads
 *         the run's own self-reported `engine`/`parallel` fields and only tags it
 *         'sequential-official' (timingTrustworthy:true) when they say so; otherwise it's tagged
 *         'official-contended' (timingTrustworthy:false, same as the batch-derived source below).
 *         As of 2026-07-18, solver-stress-refresh.yml's corpus-1 job runs with `--parallel=N` for
 *         speed, so its official file is normally in the untrustworthy-timing category now — see
 *         that workflow's README for the tradeoff.
 *       - logs/solver-randoms-baseline/batch-*.json — the run that discovered which of the
 *         original 2000-level random corpus were solvable (R-prefixed ids); the solved subset
 *         was migrated into Corpus 1. Only the *solved* entries are pulled in here.
 *
 *   --mode=corpus2 — the current stress Corpus 2 (data/stress/stress-levels-random.json). Same
 *     two-source stitch as corpus1: pass --official=<file> once a real solver run against the
 *     corpus exists (there wasn't one until 2026-07-11's square-grid cleanup regenerated a large
 *     fraction of this corpus, at which point a fresh official run became the only way to cover
 *     the brand-new levels — the old batch-*.json logs only know about ids that existed before
 *     that regeneration). Without --official, falls back to the pre-2026-07-11 behavior: every id
 *     is expected to appear in batch-*.json with ok:false (if it had solved it would have been
 *     migrated to Corpus 1 instead) — pulls in every matching entry regardless of ok, and warns
 *     loudly if any turns up ok:true (corpus file and batch logs out of sync, not a solver finding).
 *
 * Both modes' batch-derived entries ran under `--parallel` (6-25 way; batch-001 at 25), so their
 * per-level timing is CPU-contention-inflated on top of the (separate, by-design) repair-budget
 * stacking effect — see the "caveats" field on the compiled output. Check each compiled output's
 * own `sources[].timingTrustworthy` rather than assuming which subset (if any) has trustworthy
 * timing this time; as of 2026-07-18 that's no longer always mode=corpus1's official subset (see
 * above).
 *
 * Every level's result record keeps the shared schema both source tools already emit
 * (ok/refereeValid/elapsedMs/nodesExpanded/attemptCount/winningStrategy/attempts/...) plus a
 * `baselineSource` tag so a future diff can tell which timing numbers are trustworthy.
 *
 * Re-run this whenever either source is refreshed — an official sequential benchmark's entries
 * always take precedence over the batch-derived ones for the same id, in either mode.
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
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
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
// Deliberately no level-count in the default filename (it was "-450-"/"-1700-" before, and
// silently went stale in both docs and the filename itself the moment either corpus was resized
// by the 2026-07-11 square-grid cleanup) — the current count belongs in the file's own content
// (corpusTotal/total) and whatever doc points at it, not baked into a name nobody renames.
const OUT_FILE = args.get('--out') || (MODE === 'corpus2' ? 'logs/stress-corpus2-baseline.json' : 'logs/stress-corpus1-baseline.json');
const VERIFY_FILES = (args.get('--verify') || '').split(',').map(s => s.trim()).filter(Boolean);

const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));

const corpus = readJson(CORPUS_FILE);
const corpusIds = new Set(corpus.levels.map(l => l.id));

// Not gated by MODE: whichever corpus's official benchmark file is passed via --official (or,
// for corpus1, the OFFICIAL_FILE default) is used if present. corpus2 originally had no official
// source at all ("There is no official counterpart for Corpus 2 yet" — see file doc); once one
// exists (a real stress:measure-solver run against the full corpus, not just batch-derived data), pass
// it via --official= and it's used exactly like corpus1's. corpusIds.has(lv.id) already keeps a
// corpus1-flavored default file from leaking irrelevant ids into a corpus2 compile, and vice versa.
//
// The "official" file is NOT trusted as sequential/trustworthy-timing by virtue of its path alone
// — that was a real gap (any file placed at OFFICIAL_FILE got labeled 'sequential-official'/
// timingTrustworthy:true unconditionally, regardless of how it was actually produced). Instead,
// read the run's own self-reported `engine`/`parallel` fields (stress:measure-solver's output always
// carries them — see that file's writeReport) and only claim trustworthy timing when the file
// actually says engine:'sequential' and no parallel>1. This matters concretely as of 2026-07-18:
// solver-stress-refresh.yml's corpus-1 job switched from --engine=sequential to --parallel=N for
// speed (see that workflow's README), so its official file is now contended by design and must be
// labeled accordingly, not silently miscategorized as the one trustworthy timing source it used to
// be.
const officialFileExists = existsSync(path.resolve(ROOT, OFFICIAL_FILE));
const official = officialFileExists ? readJson(OFFICIAL_FILE) : null;
const officialTimingTrustworthy = official ? (official.engine === 'sequential' && !(official.parallel > 1)) : false;
const officialBaselineSourceName = officialTimingTrustworthy ? 'sequential-official' : 'official-contended';
const officialLevels = official
    ? official.levels.filter(lv => corpusIds.has(lv.id)).map(lv => ({ ...lv, baselineSource: officialBaselineSourceName }))
    : [];

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
    engine: 'stress:measure-solver --parallel (across-level worker threads)',
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
    engine: 'stress:measure-solver, lower --parallel spot-check re-verification',
    timingTrustworthy: false,
    caveat: 'Spot-check re-runs of specific ids at reduced contention (still not fully official/sequential) ' +
        'to correct the batch source above where its higher --parallel level may have produced a false ' +
        'timeout. Overrides the batch entry for these ids only; every other id is untouched.',
} : null;

const officialSource = officialFileExists ? {
    name: officialBaselineSourceName,
    file: OFFICIAL_FILE,
    levels: officialLevels.length,
    engine: official.engine === 'sequential' ? 'sequential (official stress:measure-solver run)' : official.engine,
    parallel: official.parallel ?? 1,
    budgetMs: official.budgetMs,
    timestamp: official.timestamp,
    commitSha: official.commitSha,
    timingTrustworthy: officialTimingTrustworthy,
    ...(officialTimingTrustworthy ? {} : {
        caveat: official.parallelWarning || official.engineWarning
            || 'This official run was not produced by the exact single-threaded sequential engine (see its own engine/parallel fields) — ok/refereeValid/nodesExpanded remain trustworthy correctness signals, but elapsedMs is not comparable to a true sequential run.',
    }),
} : null;

const output = MODE === 'corpus2' ? {
    description: `Compiled (not freshly re-solved unless an official source is present — see "sources") ` +
        `known-unsolved baseline for the ${corpus.levels.length}-level stress Corpus 2 (the solver-blind ` +
        'random corpus, minus the levels migrated to Corpus 1). Entries without an official override are ' +
        'ok:false as of the batch run that discovered the migrated solves — this is a starting point to ' +
        'diff future solver attempts against (an id flipping to ok:true is a genuine new solve), not a ' +
        '"regression" baseline in the corpus1 sense, since nothing here is expected to already pass.',
    compiledAt: new Date().toISOString(),
    corpus: CORPUS_FILE,
    corpusTotal: corpus.levels.length,
    total: combined.length,
    solved,
    missing,
    unexpectedSolvedInBatchLogs: unexpectedSolved,
    sources: [...(officialSource ? [officialSource] : []), batchSource, ...(verifiedSource ? [verifiedSource] : [])],
    levels: combined,
} : {
    description: `Compiled (not freshly re-solved) baseline for the full ${corpus.levels.length}-level ` +
        `stress Corpus 1 — stitches the ${officialBaselineSourceName} benchmark with the parallel run ` +
        'that found any migrated random-corpus solves not already covered by it. See "sources" for ' +
        'provenance and the timing caveat (officialSource.timingTrustworthy tells you whether the ' +
        '"official" run itself has comparable timing this time — it is not always true, see its own ' +
        'engine/parallel fields).',
    compiledAt: new Date().toISOString(),
    corpus: CORPUS_FILE,
    corpusTotal: corpus.levels.length,
    total: combined.length,
    solved,
    missing,
    sources: [...(officialSource ? [officialSource] : []), batchSource, ...(verifiedSource ? [verifiedSource] : [])],
    levels: combined,
};

if (missing.length > 0) {
    console.error(`WARNING: ${missing.length} corpus level(s) not found in any source: ${missing.join(', ')}`);
}
console.log(`Compiled ${MODE} baseline: ${combined.length}/${corpus.levels.length} corpus levels covered ` +
    `(${officialLevels.length} ${officialBaselineSourceName} + ${randomLevels.length} ${batchSourceName})` +
    `, ${solved} solved` +
    (verifiedOverrides.length > 0 ? ` (${verifiedOverrides.length} overridden by --verify: ${verifiedOverrides.join(', ')})` : '') +
    '.');

writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify(output, null, 2) + '\n');
console.log(`Wrote ${OUT_FILE}`);
