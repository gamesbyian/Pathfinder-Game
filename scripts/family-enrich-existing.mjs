#!/usr/bin/env node
/**
 * Retroactive hint-extraction pass over family corpora that predate hint-workbench integration:
 * the 2026-08-06 fragile-robust census (data/families/family-<id>-{lm,sym}.json, 1854 files, one
 * pair per one of its 927 corpus-2 ids) ran family-generate + portfolio-solve-sweep --save-hints
 * only -- no hint-workbench enumeration pass, since that integration didn't exist yet. This finds
 * every existing family-*.json under data/families/ (flat, i.e. NOT one of the new per-corpus
 * subdirectories, which already get hint-workbench as part of collect-variant-family-dataset-shard.mjs) and
 * runs hint-workbench.mjs --preset=enumerate-targeted --write-levels on each -- no regeneration,
 * no re-solving, purely additional-solution discovery on data that already exists.
 *
 * Usage: node scripts/family-enrich-existing.mjs [--glob-dir=data/families] [--wall-ms=6000]
 *   [--progress=<log file>] [--summary=<jsonl file>] [--max-wall-ms=<self-throttle ms>]
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const GLOB_DIR = args.get('--glob-dir') || 'data/families';
const WALL_MS = args.get('--wall-ms') || '6000';
const PROGRESS = args.get('--progress') || 'logs/family-census/enrich-existing.log';
const SUMMARY = args.get('--summary') || 'logs/family-census/enrich-existing-summary.jsonl';
const MAX_WALL_MS = Number(args.get('--max-wall-ms') || 3_000_000_000); // effectively unbounded by default

mkdirSync(path.dirname(PROGRESS), { recursive: true });
const startedAt = Date.now();
const nowStamp = () => new Date().toISOString().slice(11, 19);
const log = (line) => appendFileSync(PROGRESS, line + '\n');
const summarize = (obj) => appendFileSync(SUMMARY, JSON.stringify(obj) + '\n');

// Flat family files only: family-<id>-<abbr>.json directly under GLOB_DIR, not inside a
// per-corpus subdirectory (those already get hint-workbench in the main shard-run script) and not
// a -manifest.json sidecar.
const files = readdirSync(GLOB_DIR, { withFileTypes: true })
    .filter((d) => d.isFile() && /^family-[A-Za-z]\d+-[a-z]+\.json$/.test(d.name))
    .map((d) => d.name)
    .sort();

log(`[${nowStamp()}] ENRICH START ${files.length} existing family file(s) in ${GLOB_DIR}`);
console.log(`Found ${files.length} pre-existing flat family file(s) to enrich.`);

let stoppedEarly = false;
let processed = 0;
for (const file of files) {
    if (Date.now() - startedAt > MAX_WALL_MS) { stoppedEarly = true; break; }
    const fullPath = path.join(GLOB_DIR, file);
    let variantCount;
    try {
        variantCount = JSON.parse(readFileSync(fullPath, 'utf8')).length;
    } catch {
        log(`[${nowStamp()}] SKIP ${file} (unreadable)`);
        continue;
    }
    if (!variantCount) continue;
    try {
        execFileSync('node', ['scripts/run-bundled.mjs', 'scripts/hint-workbench.mjs', '--',
            `--levels-json=${fullPath}`, `--levels=pos:1-${variantCount}`,
            '--preset=enumerate-targeted', `--wall-ms=${WALL_MS}`, '--write-levels', '--yes=true'],
            { timeout: 90_000, killSignal: 'SIGKILL', stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
        log(`[${nowStamp()}] OK ${file} (${variantCount} variant(s))`);
        summarize({ file, variantCount, ok: true });
    } catch (err) {
        log(`[${nowStamp()}] FAILED ${file}: ${err.message}`);
        summarize({ file, variantCount, ok: false });
    }
    processed++;
}

log(`[${nowStamp()}] ENRICH END${stoppedEarly ? ' (stopped early: wall-clock budget)' : ''} -- processed ${processed}/${files.length}`);
console.log(`Processed ${processed}/${files.length} file(s)${stoppedEarly ? ' (stopped early)' : ''}.`);
