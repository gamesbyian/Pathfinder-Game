#!/usr/bin/env node
/**
 * Enforces the one-record-per-line formatting invariant documented in CLAUDE.md's Repository
 * Layout section, for two families of file:
 *   - the 3 real level corpora (published, stress-corpus-1, stress-corpus-2), one LEVEL per line;
 *   - every hint artifact (data/hints/, data/stress/hints/, data/stress/hints-random/), one HINT
 *     per line.
 * Both must be byte-identical to what stringifyCorpusJson (scripts/level-json-format.mjs) would
 * produce from their parsed contents — levels via its default recordsField='levels', hints via
 * recordsField='hints'. Every writer of these files (scripts/level-data-io.mjs's
 * writeLevelsWithHints/stringifyHints, the two stress generators, scripts/backfill-level-
 * provenance.mjs) already goes through that serializer — this check guards against a future
 * writer reformatting a file by hand or via a different JSON.stringify call, which would blow up
 * per-record diffs back to many lines per level/hint.
 *
 * Fails with exit code 1 if any corpus or hint file's on-disk bytes don't match.
 */
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import { stringifyCorpusJson } from './level-json-format.mjs';
import { listHintFiles, hintFilePathFor } from './level-data-io.mjs';

const root = new URL('..', import.meta.url).pathname;

const CORPORA = [
    { file: path.join(root, 'data', 'levels.json'), label: 'published' },
    { file: path.join(root, 'data', 'stress', 'stress-levels.json'), label: 'stress-corpus-1' },
    { file: path.join(root, 'data', 'stress', 'stress-levels-random.json'), label: 'stress-corpus-2' },
];

const failures = [];
let hintFilesChecked = 0;

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

    for (const hintFileName of listHintFiles(file)) {
        const levelNumber = Number.parseInt(hintFileName, 10);
        const hintFile = hintFilePathFor(file, levelNumber);
        const hintRaw = fs.readFileSync(hintFile, 'utf8');
        const hintParsed = JSON.parse(hintRaw);
        const hintExpected = stringifyCorpusJson(hintParsed, 'hints');
        hintFilesChecked++;
        if (hintRaw !== hintExpected) {
            failures.push(`${label} hints (${hintFile}): not in canonical one-line-per-hint format`);
        }
    }
}

if (failures.length > 0) {
    console.error(`${failures.length} file(s) are misformatted:`);
    for (const f of failures) console.error(`  - ${f}`);
    console.error('Re-run the writer that produced this file (writeLevelsWithHints / the stress generators / backfill-level-provenance.mjs), or re-serialize with stringifyCorpusJson from scripts/level-json-format.mjs.');
    process.exit(1);
}

console.log(`All ${CORPORA.length} corpora and ${hintFilesChecked} hint file(s) are in canonical one-record-per-line format.`);
