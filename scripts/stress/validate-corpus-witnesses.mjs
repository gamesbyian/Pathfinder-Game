#!/usr/bin/env node
/**
 * Validate every entry in a level corpus against the wire schema, structural level validator,
 * and a known witness path. Intended as a quick integrity check for generated corpora before
 * benchmarking solver performance. Originally stress-corpus-only (a `{levels:[...]}` wrapper,
 * witness from `stressMeta.witnessSolution`); also accepts a bare-array corpus (data/levels.json's
 * own shape, and scripts/family-generate.mjs's sibling/cousin output) and falls back to the
 * entry's first stored hint (`.hints[0]` or `.hintRecords[0].path`) as the witness when
 * `stressMeta` isn't present — existing stress-corpus callers are unaffected since they always
 * have `stressMeta.witnessSolution`, which still takes priority when present.
 *
 * Usage:
 *   node scripts/run-bundled.mjs scripts/stress/validate-corpus-witnesses.mjs \
 *       [--corpus=data/stress/stress-levels-random.json]
 */
import path from 'node:path';
import process from 'node:process';

import { validateRawLevel } from '../../modules/domain/level-schema.js';
import { validateLevelDetailed } from '../../modules/domain/level-validation.js';
import { normalizeRawLevel } from '../../modules/solver/normalization.js';
import { validateWitnessOnRaw } from './witness.mjs';
import { readLevelsWithHints } from '../level-data-io.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const corpusFile = args.get('--corpus') || 'data/stress/stress-levels-random.json';

// readLevelsWithHints (not a bare JSON.parse) because .hints/.hintRecords never live inline in
// the on-disk levels.json at rest (see CLAUDE.md's split-hints architecture) — they're re-attached
// from the corpus's sibling hints/ directory. Stress-corpus callers are unaffected: stressMeta
// passes through untouched, and they still take priority in the witness fallback chain below.
const levels = readLevelsWithHints(path.resolve(ROOT, corpusFile));

let schemaOk = 0, structuralOk = 0, witnessOk = 0;
const failures = [];

for (const entry of levels) {
    const { id = '?', stressMeta, ...raw } = entry;
    const witness = stressMeta?.witnessSolution
        ?? (Array.isArray(entry.hints) && entry.hints[0])
        ?? entry.hintRecords?.[0]?.path
        ?? null;

    const schema = validateRawLevel(raw);
    if (schema.ok) schemaOk++;
    else failures.push({ id, stage: 'schema', reason: schema.reason || schema.reasons?.join('; ') || 'unknown schema failure' });

    let normalized = null;
    if (schema.ok) {
        try { normalized = normalizeRawLevel(raw, null); }
        catch (err) { failures.push({ id, stage: 'normalize', reason: err?.message || String(err) }); }
    }

    if (normalized) {
        const structural = validateLevelDetailed(normalized);
        if (structural.ok) structuralOk++;
        else failures.push({ id, stage: 'structural', reason: structural.reasons?.join('; ') || 'unknown structural failure' });
    }

    if (!Array.isArray(witness) || witness.length === 0) {
        failures.push({ id, stage: 'witness-present', reason: 'missing or empty stressMeta.witnessSolution' });
        continue;
    }

    const referee = validateWitnessOnRaw(raw, witness);
    if (referee.ok) witnessOk++;
    else failures.push({ id, stage: 'witness-referee', reason: referee.reason || 'unknown witness failure' });
}

console.log(`Corpus: ${corpusFile}`);
console.log(`Levels: ${levels.length}`);
console.log(`Schema-valid levels: ${schemaOk}/${levels.length}`);
console.log(`Structurally valid levels: ${structuralOk}/${levels.length}`);
console.log(`Witness-valid levels: ${witnessOk}/${levels.length}`);

if (failures.length > 0) {
    console.log(`Failures: ${failures.length}`);
    for (const failure of failures) console.log(`  ${failure.id} ${failure.stage}: ${failure.reason}`);
    process.exitCode = 1;
} else {
    console.log('All levels passed schema, structural, and witness validation.');
}
