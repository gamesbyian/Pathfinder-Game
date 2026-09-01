#!/usr/bin/env node
/**
 * Multi-level driver for cpsat-hint-harvest.mjs's --forced-grid mode — sharding the harvest of
 * additional CP-SAT-found hints across the eligible pool CLAUDE.md's offline-replay-harness work grew
 * to 397 levels, minus whichever ones cpsat-hint-harvest.mjs has already been run against
 * (cpsat-branch-label-eligibility.mjs's selectUnharvestedCpsatLevels, checked by provenance, not hint presence).
 *
 * DELIBERATELY A THIN WRAPPER, NOT A REFACTOR — same rationale as collect-prune-gap-labels.mjs for
 * prune-gap-probe.mjs: cpsat-hint-harvest.mjs stays independently runnable and untouched by this
 * file's existence. This driver just spawns it once PER LEVEL (not once per shard with a
 * comma-joined level list) so a hang or crash on one level can't erase an entire shard's progress,
 * and so results persist between levels rather than only at the end (CLAUDE.md's batch-tool rule).
 *
 * Round-robin sharding matches collect-prune-gap-labels.mjs's own reasoning: level i (0-indexed within the
 * filtered, unharvested-eligible list) goes to shard (i % shardCount) + 1, guarding against any
 * positional clustering of slow (portal-heavy) vs. fast levels concentrating onto one shard.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/cpsat-hint-harvest-sweep.mjs -- \
 *     --shard-index=1 --shard-count=60 [--time-limit=120] [--combo-time-limit=40] \
 *     [--max-combos=16] [--summary-out=logs/cpsat-hint-harvest-sweep/shard-01-summary.md]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { readLevelsWithHints } from '../level-data-io.mjs';
import { selectUnharvestedCpsatLevels, selectShardByRoundRobin } from './lib/cpsat-branch-label-eligibility.mjs';

const root = (() => {
    let d = path.dirname(fileURLToPath(import.meta.url));
    while (!existsSync(path.join(d, 'package.json')) && path.dirname(d) !== d) d = path.dirname(d);
    return d;
})();

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h === undefined ? d : h.slice(n.length + 3); };
const CORPUS_FILE = arg('corpus', 'data/stress/stress-levels-random.json');
const SHARD_INDEX = Number(arg('shard-index', null));
const SHARD_COUNT = Number(arg('shard-count', null));
if (!SHARD_INDEX || !SHARD_COUNT) { console.error('--shard-index and --shard-count are required.'); process.exit(1); }
const TIME_LIMIT = arg('time-limit', '120');
const COMBO_TIME_LIMIT = arg('combo-time-limit', '40');
const MAX_COMBOS = arg('max-combos', '16');
const SUMMARY_OUT_FILE = arg('summary-out', null);

const corpusLevels = readLevelsWithHints(path.join(root, CORPUS_FILE));
const unharvested = selectUnharvestedCpsatLevels(corpusLevels);
const levels = selectShardByRoundRobin(unharvested, SHARD_INDEX, SHARD_COUNT);
console.log(`cpsat-hint-harvest-sweep: ${unharvested.length} unharvested-eligible level(s) corpus-wide; shard ${SHARD_INDEX}/${SHARD_COUNT} gets ${levels.length}.`);

const results = [];
function writeSummary() {
    if (!SUMMARY_OUT_FILE) return;
    const abs = path.resolve(root, SUMMARY_OUT_FILE);
    mkdirSync(path.dirname(abs), { recursive: true });
    const lines = ['# cpsat-hint-harvest-sweep shard summary', ''];
    for (const r of results) lines.push(`- ${r.id}: ${r.status}${r.added !== undefined ? ` (added ${r.added}, rediscovered ${r.rediscovered})` : ''}`);
    writeFileSync(abs, lines.join('\n') + '\n');
}

for (let i = 0; i < levels.length; i++) {
    const id = levels[i].id;
    console.log(`  [${i + 1}/${levels.length}] ${id}...`);
    try {
        const out = execFileSync('node', [
            path.join(root, 'scripts/run-bundled.mjs'), path.join(root, 'scripts/stress/cpsat-hint-harvest.mjs'), '--',
            `--corpus=${CORPUS_FILE}`, `--levels=${id}`, `--time-limit=${TIME_LIMIT}`, '--forced-grid',
            `--combo-time-limit=${COMBO_TIME_LIMIT}`, `--max-combos=${MAX_COMBOS}`, '--save-hints',
        ], { cwd: root, encoding: 'utf8', timeout: 60 * 60 * 1000 });
        process.stdout.write(out);
        const m = /hints: (\d+) new path\(s\), (\d+) rediscovery/.exec(out);
        results.push({ id, status: 'ok', added: m ? Number(m[1]) : 0, rediscovered: m ? Number(m[2]) : 0 });
    } catch (err) {
        console.log(`    error: ${err.message?.slice(0, 300)}`);
        results.push({ id, status: `error: ${err.message?.slice(0, 200)}` });
    }
    writeSummary();
}

const totalAdded = results.reduce((s, r) => s + (r.added || 0), 0);
console.log(`\ncpsat-hint-harvest-sweep done: ${levels.length} level(s) attempted, ${totalAdded} new hint(s) added.`);
