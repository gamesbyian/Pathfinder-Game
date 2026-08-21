#!/usr/bin/env node
/**
 * Builds the mandatory corpus matrix for solver A/B workflows.
 *
 * The expensive Corpus 2 arm may provide a targeted sample, but Corpus 1 and the
 * published levels are always included in full. Keeping that policy here prevents
 * a new experiment from accidentally testing only the research corpus.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = new Map(process.argv.slice(2).map(value => {
    const [key, ...rest] = value.split('=');
    return [key, rest.join('=')];
}));
const sampleFile = args.get('--corpus2-sample');
const outputFile = args.get('--github-output') || process.env.GITHUB_OUTPUT;
const shardCount = Math.max(1, Number(args.get('--corpus2-shards') || 20));
if (!sampleFile || !outputFile) {
    throw new Error('Usage: plan-ab-corpus-shards.mjs --corpus2-sample=<file> [--corpus2-shards=20] [--github-output=<file>]');
}

const levelCount = file => {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed.levels;
    if (!Array.isArray(levels)) throw new Error(`${file}: expected an array or { levels: [] }`);
    return levels.length;
};
const tokens = readFileSync(sampleFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)
    .map(token => token.replace(/^pos:/, ''));
const shards = [];
for (let i = 0; i < shardCount; i++) {
    const slice = tokens.filter((_, index) => index % shardCount === i);
    if (slice.length) shards.push({
        idx: `corpus2-${String(i + 1).padStart(2, '0')}`,
        corpus: 'data/stress/stress-levels-random.json',
        corpus_key: 'corpus2',
        levels: `pos:${slice.join(',')}`,
    });
}
for (const [corpusKey, corpus] of [
    ['corpus1', 'data/stress/stress-levels.json'],
    ['published', 'data/levels.json'],
]) {
    const count = levelCount(corpus);
    shards.push({ idx: corpusKey, corpus_key: corpusKey, corpus, levels: `pos:1-${count}` });
}

const totalLevels = tokens.length + levelCount('data/stress/stress-levels.json') + levelCount('data/levels.json');
writeFileSync(outputFile, `shards=${JSON.stringify({ shard: shards })}\nshard_count=${shards.length}\ntotal_levels=${totalLevels}\n`, { flag: 'a' });
console.log(`Planned ${shards.length} shards covering ${totalLevels} levels across Corpus 2, Corpus 1, and published levels.`);
