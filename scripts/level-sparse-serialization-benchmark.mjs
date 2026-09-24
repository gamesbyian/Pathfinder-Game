#!/usr/bin/env node
/**
 * Phase-10 bounded level sparse-serialization benchmark.
 *
 * Read-only. Measures only omission rules already safe at the raw validator/normalizer boundary:
 * empty optional mechanic arrays may be absent. No provenance/sidecar interning and no scalar
 * default omission is attempted.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { stableStringify } from '../modules/canonical-json.mjs';
import { normalizeRawLevel } from '../modules/solver/normalization.js';
import { stringifyCorpusJson } from './level-json-format.mjs';

const CORPORA = [
    'data/levels.json',
    'data/stress/stress-levels.json',
    'data/stress/stress-levels-random.json',
    'data/stress/stress-levels-envelope.json',
];
const OPTIONAL_EMPTY_ARRAYS = [
    'blocks', 'geese', 'falseGoals', 'mustPass', 'mustCross',
    'landmarks', 'filters', 'flippingFilters', 'portals',
];

export function sparseLevelCandidate(level) {
    const out = { ...level };
    for (const field of OPTIONAL_EMPTY_ARRAYS) {
        if (Array.isArray(out[field]) && out[field].length === 0) delete out[field];
    }
    return out;
}

export function assertSparseLevelEquivalent(level, candidate, index = 0) {
    const before = normalizeRawLevel(level, index + 1);
    const after = normalizeRawLevel(candidate, index + 1);
    if (stableStringify(before) !== stableStringify(after)) {
        throw new Error('sparse level candidate changed normalized semantics at position ' + (index + 1));
    }
}

export function benchmarkSparseLevelDocument(parsed) {
    const storageShape = Array.isArray(parsed) ? 'array' : 'object';
    const levels = storageShape === 'array' ? parsed : parsed?.levels;
    if (!Array.isArray(levels)) throw new Error('corpus must contain levels array');
    const sparseLevels = levels.map((level, index) => {
        const candidate = sparseLevelCandidate(level);
        assertSparseLevelEquivalent(level, candidate, index);
        return candidate;
    });
    const candidate = storageShape === 'array' ? sparseLevels : { ...parsed, levels: sparseLevels };
    const sourceText = stringifyCorpusJson(parsed);
    const targetText = stringifyCorpusJson(candidate);
    const omitted = levels.reduce((total, level) =>
        total + OPTIONAL_EMPTY_ARRAYS.filter(field => Array.isArray(level?.[field]) && level[field].length === 0).length, 0);
    return {
        levels: levels.length,
        omittedEmptyArrays: omitted,
        sourceBytes: Buffer.byteLength(sourceText),
        targetBytes: Buffer.byteLength(targetText),
        reduction: Buffer.byteLength(sourceText) > 0
            ? 1 - Buffer.byteLength(targetText) / Buffer.byteLength(sourceText)
            : 0,
    };
}

export function benchmarkSparseLevelCorpora(root = process.cwd()) {
    const corpora = CORPORA.map(file => {
        const parsed = JSON.parse(readFileSync(path.join(root, file), 'utf8'));
        return { file, ...benchmarkSparseLevelDocument(parsed) };
    });
    const sourceBytes = corpora.reduce((n, row) => n + row.sourceBytes, 0);
    const targetBytes = corpora.reduce((n, row) => n + row.targetBytes, 0);
    return {
        schemaVersion: 1,
        kind: 'pathfinder-level-sparse-serialization-benchmark',
        omissionRules: {
            emptyOptionalArrays: [...OPTIONAL_EMPTY_ARRAYS],
            scalarDefaults: 'not benchmarked',
            provenanceInterning: 'deferred',
        },
        corpora,
        totals: {
            levels: corpora.reduce((n, row) => n + row.levels, 0),
            omittedEmptyArrays: corpora.reduce((n, row) => n + row.omittedEmptyArrays, 0),
            sourceBytes,
            targetBytes,
            reduction: sourceBytes > 0 ? 1 - targetBytes / sourceBytes : 0,
        },
        semanticEquality: 'normalized-level exact',
    };
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href;
if (isMain) {
    const outArg = process.argv.find(arg => arg.startsWith('--out='))?.slice(6);
    const report = benchmarkSparseLevelCorpora();
    const json = JSON.stringify(report, null, 2);
    if (outArg) writeFileSync(outArg, json + '\n');
    console.log(json);
}
