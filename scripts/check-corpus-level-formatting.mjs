#!/usr/bin/env node
/**
 * Enforces the one-line-per-level formatting invariant documented in CLAUDE.md's
 * Repository Layout section: each of the 3 real corpora (published, stress-corpus-1,
 * stress-corpus-2) must be byte-identical to what stringifyCorpusJson (scripts/
 * level-json-format.mjs) would produce from its parsed contents. Every writer of
 * these files (scripts/level-data-io.mjs's writeLevelsWithHints, the two stress
 * generators, scripts/backfill-level-provenance.mjs) already goes through that
 * serializer — this check guards against a future writer reformatting a file by
 * hand or via a different JSON.stringify call, which would blow up per-level diffs
 * back to multiple lines per level.
 *
 * Fails with exit code 1 if any corpus file's on-disk bytes don't match.
 */
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import { stringifyCorpusJson } from './level-json-format.mjs';

const root = new URL('..', import.meta.url).pathname;

const CORPORA = [
    { file: path.join(root, 'data', 'levels.json'), label: 'published' },
    { file: path.join(root, 'data', 'stress', 'stress-levels.json'), label: 'stress-corpus-1' },
    { file: path.join(root, 'data', 'stress', 'stress-levels-random.json'), label: 'stress-corpus-2' },
];

const failures = [];

for (const { file, label } of CORPORA) {
    if (!fs.existsSync(file)) {
        console.error(`${label}: expected corpus file not found at ${file}`);
        process.exit(1);
    }
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    const expected = stringifyCorpusJson(parsed);
    if (raw !== expected) {
        failures.push(`${label} (${file}): not in canonical one-line-per-level format`);
    }
}

if (failures.length > 0) {
    console.error(`${failures.length} of ${CORPORA.length} corpora are misformatted:`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error('Re-run the writer that produced this file (writeLevelsWithHints / the stress generators / backfill-level-provenance.mjs), or re-serialize with stringifyCorpusJson from scripts/level-json-format.mjs.');
    process.exit(1);
}

console.log(`All ${CORPORA.length} corpora are in canonical one-line-per-level format.`);
