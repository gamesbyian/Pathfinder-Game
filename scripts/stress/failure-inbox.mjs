#!/usr/bin/env node
/**
 * Failure inbox / promotion pipeline (docs/solver-dev-tooling-plan.md tail item "failure inbox"):
 * a queue (data/stress/failure-inbox.json) that accumulates interesting findings surfaced by
 * diff-baseline.mjs — hard regressions and slowdowns — so they don't get lost as an undifferentiated
 * blob inside a one-off report file. Nothing is auto-promoted: a human reviews the inbox and either
 * promotes an entry into a pinned regression set (with a fresh single-level baseline solve) or
 * dismisses it as not worth pinning.
 *
 * Flow: solver-blind corpus -> diff-baseline finds something -> failure-inbox queues it ->
 * human reviews -> promote into regression-set.json (or a per-corpus counterpart) | dismiss.
 *
 * Plain JS, no TS imports (promotion's one-off "get a current baseline" solve shells out to a
 * fresh process via retry-isolated.mjs, same as diff-baseline.mjs's --retry-failures).
 *
 * Subcommands (exactly one required):
 *   --add-from=<diff-baseline --out= file> --corpus=<corpusFile> [--kind=hardRegressions,slowdowns]
 *       [--inbox=data/stress/failure-inbox.json]
 *   --list [--inbox=data/stress/failure-inbox.json]
 *   --promote=<id> --to=<pinFile> --corpus=<corpusFile> [--budget-ms=20000]
 *       [--inbox=data/stress/failure-inbox.json]
 *   --dismiss=<id> [--inbox=data/stress/failure-inbox.json]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { retryLevelIsolated } from './retry-isolated.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const INBOX_FILE = args.get('--inbox') || 'data/stress/failure-inbox.json';

const readJson = (p) => JSON.parse(readFileSync(path.resolve(ROOT, p), 'utf8'));
const writeJson = (p, obj) => writeFileSync(path.resolve(ROOT, p), JSON.stringify(obj, null, 2) + '\n');

function loadInbox() {
    if (!existsSync(path.resolve(ROOT, INBOX_FILE))) {
        return { description: 'Queue of newly-discovered, not-yet-triaged solver findings.', entries: [] };
    }
    return readJson(INBOX_FILE);
}

if (args.has('--add-from')) {
    const DIFF_FILE = args.get('--add-from');
    const CORPUS_FILE = args.get('--corpus');
    if (!CORPUS_FILE) { console.error('--add-from requires --corpus=<file> (needed later for promotion).'); process.exit(2); }
    const kinds = (args.get('--kind') || 'hardRegressions,slowdowns').split(',').map(s => s.trim());
    const diff = readJson(DIFF_FILE);
    const inbox = loadInbox();
    const existingIds = new Set(inbox.entries.map(e => e.id));
    let added = 0;
    for (const kind of kinds) {
        for (const detail of diff[kind] || []) {
            if (existingIds.has(detail.id)) continue;
            inbox.entries.push({
                id: detail.id, kind, corpus: CORPUS_FILE,
                discoveredAt: new Date().toISOString(), sourceDiff: DIFF_FILE, detail,
            });
            existingIds.add(detail.id);
            added++;
        }
    }
    writeJson(INBOX_FILE, inbox);
    console.log(`Added ${added} new entr${added === 1 ? 'y' : 'ies'} to ${INBOX_FILE} (${inbox.entries.length} total pending).`);
    process.exit(0);
}

if (args.has('--list')) {
    const inbox = loadInbox();
    console.log(`${inbox.entries.length} pending entr${inbox.entries.length === 1 ? 'y' : 'ies'} in ${INBOX_FILE}:`);
    for (const e of inbox.entries) {
        console.log(`  ${e.id}  [${e.kind}]  corpus=${e.corpus}  discovered=${e.discoveredAt}`);
    }
    process.exit(0);
}

if (args.has('--dismiss')) {
    const id = args.get('--dismiss');
    const inbox = loadInbox();
    const before = inbox.entries.length;
    inbox.entries = inbox.entries.filter(e => e.id !== id);
    if (inbox.entries.length === before) { console.error(`${id} not found in ${INBOX_FILE}.`); process.exit(2); }
    writeJson(INBOX_FILE, inbox);
    console.log(`Dismissed ${id} (not promoted). ${inbox.entries.length} entr${inbox.entries.length === 1 ? 'y' : 'ies'} remaining.`);
    process.exit(0);
}

if (args.has('--promote')) {
    const id = args.get('--promote');
    const TO_FILE = args.get('--to');
    const CORPUS_FILE = args.get('--corpus');
    const budgetMs = Number(args.get('--budget-ms') || 20000);
    if (!TO_FILE || !CORPUS_FILE) { console.error('--promote requires --to=<pinFile> --corpus=<corpusFile>.'); process.exit(2); }

    const inbox = loadInbox();
    const entry = inbox.entries.find(e => e.id === id);
    if (!entry) { console.error(`${id} not found in ${INBOX_FILE}.`); process.exit(2); }

    console.log(`Re-solving ${id} fresh (isolated process) to record a current baseline...`);
    const fresh = retryLevelIsolated({ corpusFile: CORPUS_FILE, levelId: id, budgetMs, root: ROOT });
    if (fresh.error) { console.error(`Fresh solve failed: ${fresh.error}`); process.exit(1); }
    const solvedNow = fresh.ok && fresh.refereeValid !== false;

    const pinFile = existsSync(path.resolve(ROOT, TO_FILE))
        ? readJson(TO_FILE)
        : { description: `Pinned solver regression set (promoted from ${INBOX_FILE}).`, pinnedAt: new Date().toISOString(), budgetMs, levels: [] };
    if (pinFile.levels.some(l => l.id === id)) { console.error(`${id} is already pinned in ${TO_FILE}.`); process.exit(2); }

    pinFile.levels.push({
        id, batch: 'inbox', reasons: [`promoted from failure inbox (${entry.kind}, discovered ${entry.discoveredAt})`],
        expected: solvedNow ? 'solved' : 'unsolved', baselineMs: fresh.elapsedMs ?? null, baselineStrategy: null,
    });
    writeJson(TO_FILE, pinFile);

    inbox.entries = inbox.entries.filter(e => e.id !== id);
    writeJson(INBOX_FILE, inbox);

    console.log(`Promoted ${id} into ${TO_FILE} as expected=${solvedNow ? 'solved' : 'unsolved'} (baseline ${fresh.elapsedMs}ms, status ${fresh.status}). Removed from inbox.`);
    process.exit(0);
}

console.error('Usage: failure-inbox.mjs --add-from=<diff-baseline out file> --corpus=<file> [--kind=hardRegressions,slowdowns] | ' +
    '--list | --promote=<id> --to=<pinFile> --corpus=<file> [--budget-ms=20000] | --dismiss=<id> [--inbox=<file>]');
process.exit(2);
