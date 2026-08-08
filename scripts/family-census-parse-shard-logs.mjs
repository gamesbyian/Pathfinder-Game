#!/usr/bin/env node
/**
 * Recovery path for the 2026-08-07 shard-6 staging bug (family-fragile-robust-census.yml):
 * every shard's per-level logs/family-census/solve-<id>-{lm,sym}.json result files were dropped
 * from its uploaded artifact (git status collapsed the brand-new logs/family-census/ directory to
 * a single untracked-dir line, and the staging loop's plain `cp` on that "file" aborted the step
 * under `set -e`) -- but the shard's own plain-text progress log (shard-NN.log, copied by an
 * earlier, unaffected step) survived and contains every solve's "Result: solved=X/Y" line. This
 * parses those logs back into the same {id, lmSolved, lmTotal, symSolved, symTotal} shape
 * family-census-combine.mjs expects from the (now-missing) JSON files.
 *
 * Per id, the log has exactly two "Result: solved=X/Y" lines in order between its START/DONE
 * markers: the local-mutant sweep's, then the symmetry sweep's. A level whose generation failed
 * (no family file produced) has zero Result lines for that sweep and is recorded as null/null.
 *
 * Usage: node scripts/family-census-parse-shard-logs.mjs --in-dir=logs/family-census
 *   [--out=<file.json>]
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const IN_DIR = args.get('--in-dir') || 'logs/family-census';
const OUT = args.get('--out');

const START_RE = /^\[\d{2}:\d{2}:\d{2}\] START (\S+)/;
const DONE_RE = /^\[\d{2}:\d{2}:\d{2}\] DONE (\S+)/;
const RESULT_RE = /^Result: solved=(\d+)\/(\d+)/;

export function parseShardLog(text) {
    const rows = new Map();
    let currentId = null;
    let results = [];
    for (const line of text.split('\n')) {
        const startMatch = START_RE.exec(line);
        if (startMatch) {
            currentId = startMatch[1];
            results = [];
            continue;
        }
        const doneMatch = DONE_RE.exec(line);
        if (doneMatch) {
            const id = doneMatch[1];
            const [lm, sym] = results;
            rows.set(id, {
                id,
                lmSolved: lm ? lm.solved : null, lmTotal: lm ? lm.total : null,
                symSolved: sym ? sym.solved : null, symTotal: sym ? sym.total : null,
            });
            currentId = null;
            results = [];
            continue;
        }
        if (currentId) {
            const resultMatch = RESULT_RE.exec(line);
            if (resultMatch) results.push({ solved: Number(resultMatch[1]), total: Number(resultMatch[2]) });
        }
    }
    return rows;
}

function main() {
    const dir = path.resolve(process.cwd(), IN_DIR);
    const logFiles = readdirSync(dir).filter(f => /^shard-\d+\.log$/.test(f));
    const combined = new Map();
    for (const file of logFiles) {
        const text = readFileSync(path.join(dir, file), 'utf8');
        for (const [id, row] of parseShardLog(text)) combined.set(id, row);
    }
    const rows = [...combined.values()];
    console.log(`Parsed ${logFiles.length} shard log(s), ${rows.length} level(s) with a DONE marker.`);
    if (OUT) {
        writeFileSync(path.resolve(process.cwd(), OUT), JSON.stringify(rows, null, 2));
        console.log(`Wrote ${OUT}.`);
    }
    return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
