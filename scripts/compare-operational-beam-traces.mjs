#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { compareBeamTraceBuckets } from './operational-similarity-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.includes('=')).map(arg => {
    const [key, ...value] = arg.split('='); return [key, value.join('=')];
}));
const leftFile = args.get('--left'), rightFile = args.get('--right'), outFile = args.get('--out');
if (!leftFile || !rightFile || !outFile) throw new Error('--left, --right, and --out are required');
const left = JSON.parse(readFileSync(leftFile, 'utf8'));
const right = JSON.parse(readFileSync(rightFile, 'utf8'));
const rightById = new Map(right.levels.map(level => [level.id, level]));
const levels = left.levels.filter(level => rightById.has(level.id)).map(leftLevel => {
    const rightLevel = rightById.get(leftLevel.id);
    const leftAttempt = leftLevel.attempts[0], rightAttempt = rightLevel.attempts[0];
    return { id: leftLevel.id,
        left: { configKey: leftAttempt.configKey, ok: leftLevel.ok, nodesExpanded: leftLevel.nodesExpanded },
        right: { configKey: rightAttempt.configKey, ok: rightLevel.ok, nodesExpanded: rightLevel.nodesExpanded },
        buckets: compareBeamTraceBuckets(leftAttempt.beamOperationalTrace.buckets,
            rightAttempt.beamOperationalTrace.buckets) };
});
const result = { schemaVersion: 1, metricClass: 'operationalSimilarity',
    provenance: { left: leftFile, right: rightFile }, levels };
writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Wrote ${outFile}: ${levels.length} matched level(s)`);
