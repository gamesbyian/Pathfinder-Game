#!/usr/bin/env node
/**
 * Phase-10 bounded level cleanup: apply the already-proven-safe sparse omission rule
 * (scripts/level-sparse-serialization-benchmark.mjs) to the real tracked level corpora.
 *
 * Mutation companion to the read-only benchmark. Reuses its exact candidate-building and
 * equivalence-proof functions rather than re-deriving the omission rule, and refuses to write
 * anything if even one level in a corpus fails the equivalence proof.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { stringifyCorpusJson } from './level-json-format.mjs';
import { sparseLevelCandidate, assertSparseLevelEquivalent } from './level-sparse-serialization-benchmark.mjs';

const CORPORA = [
    'data/levels.json',
    'data/stress/stress-levels.json',
    'data/stress/stress-levels-random.json',
    'data/stress/stress-levels-envelope.json',
];

export function applySparseLevelDocument(parsed) {
    const storageShape = Array.isArray(parsed) ? 'array' : 'object';
    const levels = storageShape === 'array' ? parsed : parsed?.levels;
    if (!Array.isArray(levels)) throw new Error('corpus must contain levels array');
    const sparseLevels = levels.map((level, index) => {
        const candidate = sparseLevelCandidate(level);
        assertSparseLevelEquivalent(level, candidate, index);
        return candidate;
    });
    return storageShape === 'array' ? sparseLevels : { ...parsed, levels: sparseLevels };
}

const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file://').href;
if (isMain) {
    const root = process.cwd();
    const results = [];
    for (const file of CORPORA) {
        const absolute = path.join(root, file);
        const parsed = JSON.parse(readFileSync(absolute, 'utf8'));
        const candidate = applySparseLevelDocument(parsed);
        const sourceText = stringifyCorpusJson(parsed);
        const targetText = stringifyCorpusJson(candidate);
        if (sourceText !== targetText) {
            writeFileSync(absolute, targetText);
        }
        results.push({
            file,
            changed: sourceText !== targetText,
            sourceBytes: Buffer.byteLength(sourceText),
            targetBytes: Buffer.byteLength(targetText),
        });
    }
    console.log(JSON.stringify({ schemaVersion: 1, kind: 'pathfinder-level-sparse-serialization-apply', results }, null, 2));
}
