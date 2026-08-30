#!/usr/bin/env node
/**
 * Multi-level driver for prune-gap-probe.mjs — the CP-SAT-oracle-labelled-branch atlas that
 * offline-replay-harness.mjs scores probes against currently covers only 16 levels (~623
 * branches, all produced by hand-run single-level invocations). Growing it to a meaningful slice
 * of the ~2000-level corpus is exactly the kind of job CLAUDE.md says to shard on GitHub Actions
 * (each level's CP-SAT calls can run tens of seconds, and a real sweep needs many levels) — see
 * .github/workflows/atlas-sweep.yml, which shards this the same way method-probe-sweep.yml shards
 * scripts/method-probe.mjs.
 *
 * DELIBERATELY A THIN WRAPPER, NOT A REFACTOR: prune-gap-probe.mjs stays completely untouched and
 * independently runnable exactly as before (minimal-diff — no reason to risk a working, already-
 * validated CP-SAT comparison script for the sake of code reuse here). This driver just spawns it
 * once per level via child_process and lets IT write its own `reports/stress/prune-gap-<id>.json`
 * — so running this against a new slice of the corpus grows the SAME atlas
 * offline-replay-harness.mjs already reads (no new format, no separate merge step needed).
 *
 * Requires python3 + ortools (cpsat-reference-probe.py's dependency) on PATH.
 *
 * TWO SELECTION MODES (mutually exclusive):
 *   --levels=pos:1-85          Raw corpus positions, unfiltered -- the original mode. Wastes
 *                              shard time on hint-less/portal/filter/flipper levels that can
 *                              never produce a labelled branch (see atlas-eligibility.mjs's doc
 *                              for why, and docs/solver-offline-replay-harness.md's Part 5 for the
 *                              real numbers that motivated the mode below).
 *   --shard-index=N --shard-count=M   Filters the corpus to CP-SAT-eligible levels FIRST (has a
 *                              stored hint, no portals/filters/flipping filters), then takes every
 *                              M-th one starting at index N-1 (round-robin, not a contiguous
 *                              range) -- so every shard gets an even share of levels that can
 *                              actually produce signal, and any positional clustering in the
 *                              corpus can't concentrate all the "good" or all the "dud" levels
 *                              onto one shard. This is the mode .github/workflows/atlas-sweep.yml
 *                              uses.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/atlas-sweep.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json --shard-index=1 --shard-count=20 --every=6 \
 *     --oracle-limit=45 --out-dir=reports/stress --summary-out=logs/atlas-sweep/shard-01-summary.md
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readLevelsWithHints, selectLevelsBySpec } from '../level-data-io.mjs';
import { selectEligibleAtlasLevels, selectShardByRoundRobin } from './lib/atlas-eligibility.mjs';

const root = (() => {
    let d = path.dirname(fileURLToPath(import.meta.url));
    while (!existsSync(path.join(d, 'package.json')) && path.dirname(d) !== d) d = path.dirname(d);
    return d;
})();

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const LEVEL_SPEC = arg('levels', null);
const SHARD_INDEX = arg('shard-index', null);
const SHARD_COUNT = arg('shard-count', null);
const EVERY = arg('every', '6');
const ORACLE_LIMIT = arg('oracle-limit', '45');
const OUT_DIR = arg('out-dir', 'reports/stress');
const SUMMARY_OUT_FILE = arg('summary-out', null);

if (LEVEL_SPEC && (SHARD_INDEX || SHARD_COUNT)) {
    console.error('--levels is mutually exclusive with --shard-index/--shard-count.');
    process.exit(1);
}
if ((SHARD_INDEX === null) !== (SHARD_COUNT === null)) {
    console.error('--shard-index and --shard-count must be given together.');
    process.exit(1);
}

const corpusLevels = readLevelsWithHints(path.join(root, CORPUS_FILE));
let levels;
if (SHARD_INDEX !== null) {
    const eligible = selectEligibleAtlasLevels(corpusLevels);
    levels = selectShardByRoundRobin(eligible, Number(SHARD_INDEX), Number(SHARD_COUNT));
    console.log(`atlas-sweep: ${eligible.length}/${corpusLevels.length} corpus level(s) are CP-SAT-eligible (hint-bearing, no portals/filters/flippers); shard ${SHARD_INDEX}/${SHARD_COUNT} gets ${levels.length} of them.`);
} else {
    levels = LEVEL_SPEC ? selectLevelsBySpec(corpusLevels, LEVEL_SPEC) : corpusLevels;
}
console.log(`atlas-sweep: ${levels.length} level(s), corpus=${CORPUS_FILE}, every=${EVERY}, oracle-limit=${ORACLE_LIMIT}s`);

const results = [];
function writeSummary() {
    if (!SUMMARY_OUT_FILE) return;
    const abs = path.resolve(root, SUMMARY_OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    const lines = ['# atlas-sweep shard summary', ''];
    for (const r of results) lines.push(`- ${r.id}: ${r.status}${r.tally ? ` (dead ${r.tally.deadPruned + r.tally.deadPassed}, gap ${r.tally.deadPassed}, unsound ${r.tally.alivePruned})` : ''}`);
    writeFileSync(abs, lines.join('\n') + '\n');
}

for (let i = 0; i < levels.length; i++) {
    const raw = levels[i];
    const id = raw.id;
    if (!id) { results.push({ id: `(pos ${i + 1}, no id)`, status: 'skipped-no-id' }); writeSummary(); continue; }
    if (!(raw.hintRecords || [])[0]?.path) { results.push({ id, status: 'skipped-no-hint' }); writeSummary(); continue; }

    const outFile = path.join(OUT_DIR, `prune-gap-${id}.json`);
    const absOut = path.resolve(root, outFile);
    mkdirSync(path.dirname(absOut), { recursive: true });
    console.log(`  [${i + 1}/${levels.length}] ${id}...`);
    try {
        execFileSync('node', [
            path.join(root, 'scripts/run-bundled.mjs'), path.join(root, 'scripts/stress/prune-gap-probe.mjs'), '--',
            `--level=${id}`, `--every=${EVERY}`, `--oracle-limit=${ORACLE_LIMIT}`, `--out=${outFile}`,
        ], { cwd: root, stdio: 'inherit', timeout: 30 * 60 * 1000 });
        const written = JSON.parse(readFileSync(absOut, 'utf8'));
        results.push({ id, status: 'ok', tally: written.tally });
    } catch (err) {
        results.push({ id, status: `error: ${err.message?.slice(0, 200)}` });
    }
    writeSummary();
}

console.log(`\natlas-sweep done: ${results.filter(r => r.status === 'ok').length}/${levels.length} level(s) produced an atlas file under ${OUT_DIR}.`);
