#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { selectLevelsBySpec } from './level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--') && a.includes('=')).map(a => {
    const i = a.indexOf('=');
    return [a.slice(2, i), a.slice(i + 1)];
}));
const corpusFile = args.get('corpus');
const levelsSpec = args.get('levels') || 'all';
if (!corpusFile) throw new Error('--corpus=<path> is required');
const doc = JSON.parse(readFileSync(path.resolve(corpusFile), 'utf8'));
const rows = Array.isArray(doc) ? doc : doc.levels;
if (!Array.isArray(rows)) throw new Error('corpus must be an array or {levels:[...]}');
const selected = selectLevelsBySpec(rows, levelsSpec);
if (args.has('count')) {
    process.stdout.write(String(selected.length));
    process.exit(0);
}
const shard = Number(args.get('shard'));
const shards = Number(args.get('shards'));
if (!Number.isSafeInteger(shard) || !Number.isSafeInteger(shards) || shard < 1 || shards < 1 || shard > shards) {
    throw new Error('--shard and --shards must be positive integers with shard <= shards');
}
const start = Math.floor(((shard - 1) * selected.length) / shards);
const end = Math.floor((shard * selected.length) / shards);
const slice = selected.slice(start, end);
if (slice.some(row => typeof row?.id !== 'string' || !row.id)) throw new Error('selected rows must have string ids');
process.stdout.write(slice.map(row => row.id).join(','));
