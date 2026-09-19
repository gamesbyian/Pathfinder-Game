#!/usr/bin/env node
/**
 * Longitudinal novelty and retrospective evidence-frontier audit for compact failure-response docs.
 *
 * Input order is chronology. This tool never guesses order from filenames or timestamps.
 *
 * Usage:
 *   node scripts/failure-response-novelty.mjs --in=old.json,newer.json,latest.json
 *   node scripts/failure-response-novelty.mjs --in=... --target-index=2 [--out=tmp/novelty.json]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { validateFailureResponseDocument } from './solver-failure-response-lib.mjs';
import {
    analyzeFailureResponseNovelty,
    auditFailurePhenotypesAtFrontier,
} from './failure-response-novelty-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const eq = arg.indexOf('=');
    return [arg.slice(2, eq), arg.slice(eq + 1)];
}));
const inputs = (args.get('in') ?? '').split(',').map(value => value.trim()).filter(Boolean);
const labels = (args.get('labels') ?? '').split(',').map(value => value.trim()).filter(Boolean);
const outFile = args.get('out') ?? null;
if (!inputs.length) {
    console.error('Usage: node scripts/failure-response-novelty.mjs --in=old.json,newer.json [--target-index=N] [--out=file]');
    process.exit(2);
}
const missing = inputs.filter(file => !existsSync(file));
if (missing.length) throw new Error(`missing input(s): ${missing.join(', ')}`);
if (labels.length && labels.length !== inputs.length) throw new Error('--labels must contain one label per input');

const documents = inputs.map(file => validateFailureResponseDocument(JSON.parse(readFileSync(file, 'utf8'))));
const chronologyLabels = labels.length ? labels : inputs;
const novelty = analyzeFailureResponseNovelty(documents, { labels: chronologyLabels });

let frontier = null;
if (args.has('target-index')) {
    const targetIndex = Number(args.get('target-index'));
    if (!Number.isInteger(targetIndex)) throw new Error('--target-index must be an integer');
    frontier = auditFailurePhenotypesAtFrontier(documents, targetIndex, { labels: chronologyLabels });
}

const result = {
    schemaVersion: 1,
    kind: 'pathfinder-failure-response-novelty-audit',
    chronology: {
        sourceFiles: inputs,
        labels: chronologyLabels,
        authority: 'explicit input order',
    },
    phenotypeSemantics: {
        independentUnit: 'parent level',
        excludes: ['exact parent identity', 'run/protocol/solver identity', 'work/nodes/badness magnitudes', 'timestamps'],
        includes: ['outcome', 'action/stage/config identity', 'censoring/reach/participation', 'categorical attempt sequence'],
        caution: 'Phenotype novelty is descriptive mechanism diversity, not statistical independence or causal discovery.',
    },
    novelty,
    frontier,
};

const json = JSON.stringify(result, null, 2) + '\n';
if (outFile) {
    writeFileSync(path.resolve(outFile), json);
    console.error(`failure-response-novelty: ${novelty.totalDistinctPhenotypes} phenotype(s) -> ${outFile}`);
} else {
    process.stdout.write(json);
}
