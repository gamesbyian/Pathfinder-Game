#!/usr/bin/env node
import { describeLevel, deterministicSample, filterLevelDescriptors, loadCorpus, summarizeDescriptors } from './corpus-query-lib.mjs';

const args = process.argv.slice(2);
const value = name => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const number = name => { const raw = value(name); return raw == null ? null : Number(raw); };
const source = value('corpus') ?? 'stress2';
const { path, levels } = loadCorpus(process.cwd(), source);
const descriptors = levels.map(describeLevel);
const ids = (value('id') ?? value('ids') ?? '').split(',').filter(Boolean);
let matches = filterLevelDescriptors(descriptors, {
    ids,
    tag: value('tag'),
    mechanic: value('mechanic'),
    minReqLen: number('min-req-len'), maxReqLen: number('max-req-len'),
    minReqInt: number('min-req-int'), maxReqInt: number('max-req-int'),
});
const sampleSize = number('sample');
if (sampleSize != null) matches = deterministicSample(matches, sampleSize, value('seed') ?? 'pathfinder');

if (args.includes('--full')) {
    const selected = new Set(matches.map(item => item.id));
    console.log(JSON.stringify({ source: path, count: selected.size, levels: levels.filter(level => selected.has(level.id)) }, null, 2));
} else if (args.includes('--list') || ids.length || value('tag') || value('mechanic') || sampleSize != null ||
    number('min-req-len') != null || number('max-req-len') != null || number('min-req-int') != null || number('max-req-int') != null) {
    const limit = number('limit') ?? 50;
    console.log(JSON.stringify({ source: path, matched: matches.length, returned: Math.min(matches.length, limit), levels: matches.slice(0, limit) }, null, 2));
} else {
    console.log(JSON.stringify({ source: path, ...summarizeDescriptors(descriptors) }, null, 2));
}
