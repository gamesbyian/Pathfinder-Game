#!/usr/bin/env node
/**
 * Slices data/families/variant-family-dataset-manifest.json into N shards by index modulo, for the
 * collect-variant-family-dataset.yml workflow. Prints the shard's full manifest entries as a JSON
 * array (id, corpus, corpusPath, modes, group) -- unlike family-census-shard-ids.mjs's bare id
 * list, the shard script here needs per-level mode/group assignment, not just an id.
 *
 * Usage: node scripts/plan-variant-family-dataset-shard.mjs --manifest=<file> --shard=<1-based> --shards=<n>
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const MANIFEST = args.get('--manifest') || 'data/families/variant-family-dataset-manifest.json';
const SHARD = Number(args.get('--shard'));
const SHARDS = Number(args.get('--shards'));
if (!Number.isInteger(SHARD) || !Number.isInteger(SHARDS) || SHARD < 1 || SHARD > SHARDS) {
    console.error('Usage: --manifest=<file> --shard=<1-based> --shards=<n>');
    process.exit(2);
}

const manifest = JSON.parse(readFileSync(path.resolve(process.cwd(), MANIFEST), 'utf8'));
const slice = manifest.filter((_, i) => i % SHARDS === SHARD - 1);
process.stdout.write(JSON.stringify(slice));
