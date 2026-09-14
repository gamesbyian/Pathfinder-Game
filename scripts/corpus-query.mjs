#!/usr/bin/env node
import { describeLevel, deterministicSample, filterLevelDescriptors, loadCorpus, summarizeDescriptors } from './corpus-query-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const number = name => { const raw = value(name); return raw == null ? null : Number(raw); };
const source = value('corpus') ?? 'stress2';
const { path, levels, metadata } = loadCorpus(process.cwd(), source);
const descriptors = levels.map((level, position) => describeLevel(level, {
    source,
    metadata,
    position,
    totalLevels: levels.length,
}));
const ids = (value('id') ?? value('ids') ?? '').split(',').filter(Boolean);
let matches = filterLevelDescriptors(descriptors, {
    ids,
    tag: value('tag'),
    mechanic: value('mechanic'),
    batch: value('batch'),
    origin: value('origin'),
    method: value('method'),
    action: value('action'),
    generatorVersion: value('generator-version'),
    corpusName: value('corpus-name'),
    selectionStratum: value('selection-stratum'),
    minReqLen: number('min-req-len'), maxReqLen: number('max-req-len'),
    minReqInt: number('min-req-int'), maxReqInt: number('max-req-int'),
});
const sampleSize = number('sample');
if (sampleSize != null) matches = deterministicSample(matches, sampleSize, value('seed') ?? 'pathfinder');

const hasFilter = ids.length || value('tag') || value('mechanic') || value('batch') || value('origin') ||
    value('method') || value('action') || value('generator-version') || value('corpus-name') || value('selection-stratum') || sampleSize != null ||
    number('min-req-len') != null || number('max-req-len') != null || number('min-req-int') != null || number('max-req-int') != null;

if (args.includes('--full')) {
    const selected = new Set(matches.map(item => item.id));
    console.log(JSON.stringify({ source: path, count: selected.size, metadata, levels: levels.filter(level => selected.has(level.id)) }, null, 2));
} else if (args.includes('--list') || hasFilter) {
    const limit = number('limit') ?? 50;
    console.log(JSON.stringify({ source: path, matched: matches.length, returned: Math.min(matches.length, limit), levels: matches.slice(0, limit) }, null, 2));
} else {
    console.log(JSON.stringify({ source: path, generationMetadata: metadata ? {
        corpusId: metadata.corpusId ?? null,
        corpusName: metadata.corpusName ?? null,
        generatorVersion: metadata.generatorVersion ?? null,
        generatedAt: metadata.generatedAt ?? null,
        masterSeed: metadata.masterSeed ?? null,
        appendHistory: metadata.appendHistory ?? null,
    } : null, ...summarizeDescriptors(descriptors) }, null, 2));
}
