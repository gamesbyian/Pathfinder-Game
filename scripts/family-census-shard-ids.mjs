#!/usr/bin/env node
/**
 * Slices data/families/fragile-robust-census-manifest.json into N shards by index modulo,
 * for the family-fragile-robust-census.yml workflow. Prints one level id per line.
 *
 * Usage: node scripts/family-census-shard-ids.mjs --manifest=<file> --shard=<1-based> --shards=<n>
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const MANIFEST = args.get('--manifest') || 'data/families/fragile-robust-census-manifest.json';
const SHARD = Number(args.get('--shard'));
const SHARDS = Number(args.get('--shards'));
if (!Number.isInteger(SHARD) || !Number.isInteger(SHARDS) || SHARD < 1 || SHARD > SHARDS) {
    console.error('Usage: --manifest=<file> --shard=<1-based> --shards=<n>');
    process.exit(2);
}

const manifest = JSON.parse(readFileSync(path.resolve(process.cwd(), MANIFEST), 'utf8'));
manifest.forEach((entry, i) => {
    if (i % SHARDS === SHARD - 1) console.log(entry.id);
});
