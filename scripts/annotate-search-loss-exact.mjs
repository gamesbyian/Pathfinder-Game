#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { SEARCH_LOSS_ANNOTATION_KIND, validateSearchLossAnnotation, validateSearchLossCapture } from './solver-search-loss-evidence-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const i = arg.indexOf('='); return [arg.slice(2, i), arg.slice(i + 1)];
}));
for (const key of ['capture', 'results', 'out', 'model']) if (!args.get(key)) throw new Error(`--${key}= is required`);
const capture = validateSearchLossCapture(JSON.parse(fs.readFileSync(args.get('capture'), 'utf8')));
const resultDocument = JSON.parse(fs.readFileSync(args.get('results'), 'utf8'));
const results = Array.isArray(resultDocument) ? resultDocument : resultDocument.results;
if (!Array.isArray(results)) throw new Error('exact results must be an array or {results:[]}');
const byCapsule = new Map(capture.capsules.map(row => [row.capsuleId, row]));
const annotations = results.map((row, index) => {
    const capsule = byCapsule.get(row.capsuleId);
    if (!capsule) throw new Error(`results[${index}] capsuleId is not in source capture`);
    const raw = String(row.value ?? row.label ?? row.status ?? '').toUpperCase();
    const value = raw === 'LIVE' ? 'LIVE' : raw === 'DEAD' ? 'DEAD'
        : raw === 'UNSUPPORTED' ? 'UNSUPPORTED' : 'UNKNOWN';
    if ((value === 'LIVE' || value === 'DEAD') && capsule.replayBasis !== 'replayable') {
        throw new Error(`results[${index}] definitive exact label requires a replayable capsule`);
    }
    return {
        capsuleId: row.capsuleId,
        annotationKind: 'exact-feasibility',
        support: value === 'UNSUPPORTED' ? 'UNSUPPORTED' : value === 'UNKNOWN' ? 'UNKNOWN' : 'SUPPORTED',
        value,
        producer: args.get('model'),
        modelVersion: row.modelVersion ?? null,
        cost: row.cost ?? null,
        refereeValid: typeof row.refereeValid === 'boolean' ? row.refereeValid : null,
        evidenceRefs: Array.isArray(row.evidenceRefs) ? row.evidenceRefs : [],
    };
}).sort((a, b) => a.capsuleId.localeCompare(b.capsuleId));
const output = validateSearchLossAnnotation({
    schemaVersion: 1, kind: SEARCH_LOSS_ANNOTATION_KIND, researchEnrichmentKind: 'exact',
    sourceCapture: args.get('capture'), populationIdentity: capture.population.populationIdentity,
    researchBlock: capture.population.researchBlock ?? null, annotations,
}, { capture });
fs.mkdirSync(path.dirname(args.get('out')), { recursive: true });
fs.writeFileSync(args.get('out'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`annotated ${annotations.length} search-loss capsule(s)`);
