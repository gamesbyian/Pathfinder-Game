#!/usr/bin/env node
/**
 * Builds the mandatory corpus matrix for solver A/B workflows.
 *
 * The expensive Corpus 2 arm may provide a targeted sample, but Corpus 1 and the
 * published levels are always included in full. Keeping that policy here prevents
 * a new experiment from accidentally testing only the research corpus.
 *
 * Corpus 1 is split into shards the same round-robin way as the Corpus 2 sample, sized to
 * roughly the same levels-per-shard density, and its shards are placed FIRST in the matrix.
 * GitHub Actions starts matrix jobs in array order up to `max-parallel`; a single monolithic
 * Corpus 1 job placed after 60 Corpus 2 shards does not get a lane until several rounds of
 * those have already completed, and Corpus 1's per-level solve time is high enough (stress
 * levels, not published) that it then runs long on top of that late start — becoming, by a
 * wide margin, the last shard to finish and stretching the whole run's wall time well past
 * every other shard (observed: ~17-28 minutes solo vs. a few minutes each for the sharded
 * Corpus 2 population, see reports/2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md's
 * underlying runs). Splitting it into several shards and scheduling them first fixes both the
 * late start and the un-parallelized single-job runtime. Published levels are left as one
 * shard: they solve fast enough (well under two minutes observed) that neither problem applies
 * to them yet, but they use the same shardCorpus() helper so they can be split the same way if
 * that ever changes.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = new Map(process.argv.slice(2).map(value => {
    const [key, ...rest] = value.split('=');
    return [key, rest.join('=')];
}));
const sampleFile = args.get('--corpus2-sample');
const outputFile = args.get('--github-output') || process.env.GITHUB_OUTPUT;
const shardCount = Math.max(1, Number(args.get('--corpus2-shards') || 20));
const corpus1File = args.get('--corpus1-file') || 'data/stress/stress-levels.json';
const corpus2File = args.get('--corpus2-file') || 'data/stress/stress-levels-random.json';
const publishedFile = args.get('--published-file') || 'data/levels.json';
if (!sampleFile || !outputFile) {
    throw new Error('Usage: plan-ab-corpus-shards.mjs --corpus2-sample=<file> [--corpus2-shards=20] [--corpus1-file=<file>] [--corpus2-file=<file>] [--published-file=<file>] [--github-output=<file>]');
}

const levelCount = file => {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    const levels = Array.isArray(parsed) ? parsed : parsed.levels;
    if (!Array.isArray(levels)) throw new Error(`${file}: expected an array or { levels: [] }`);
    return levels.length;
};
const tokens = readFileSync(sampleFile, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)
    .map(token => token.replace(/^pos:/, ''));

/** Round-robin split `positionTokens` (1-based position strings) into up to `count` shards,
 *  named `${idx}-01`, `${idx}-02`, ... (or bare `idx` when count === 1, matching the historical
 *  single-shard corpus1/published naming so existing artifact-name patterns keep working). */
function shardCorpus(idx, corpus, corpusKey, positionTokens, count) {
    if (count <= 1) return [{ idx, corpus, corpus_key: corpusKey, levels: `pos:${positionTokens.join(',')}` }];
    const shards = [];
    for (let i = 0; i < count; i++) {
        const slice = positionTokens.filter((_, index) => index % count === i);
        if (slice.length) shards.push({
            idx: `${idx}-${String(i + 1).padStart(2, '0')}`,
            corpus, corpus_key: corpusKey,
            levels: `pos:${slice.join(',')}`,
        });
    }
    return shards;
}

const corpus1Count = levelCount(corpus1File);
// Same levels-per-shard density Corpus 2's sample is realizing, applied to Corpus 1 so a shard
// there costs about as much wall time as a Corpus 2 shard. Falls back to the requested Corpus 2
// shard count itself (capped at one shard per level) if the sample is empty -- a plain
// corpus1Count/levelsPerShard division would otherwise divide by a degenerate density and hand
// back one shard per level.
const corpus1ShardCount = tokens.length > 0
    ? Math.max(1, Math.round(corpus1Count / (tokens.length / shardCount)))
    : Math.max(1, Math.min(shardCount, corpus1Count));
const corpus1Tokens = Array.from({ length: corpus1Count }, (_, i) => String(i + 1));

const publishedCount = levelCount(publishedFile);

const shards = [
    ...shardCorpus('corpus1', corpus1File, 'corpus1', corpus1Tokens, corpus1ShardCount),
    ...shardCorpus('corpus2', corpus2File, 'corpus2', tokens, shardCount),
    ...shardCorpus('published', publishedFile, 'published', Array.from({ length: publishedCount }, (_, i) => String(i + 1)), 1),
];

const totalLevels = tokens.length + corpus1Count + publishedCount;
writeFileSync(outputFile, `shards=${JSON.stringify({ shard: shards })}\nshard_count=${shards.length}\ntotal_levels=${totalLevels}\n`, { flag: 'a' });
console.log(`Planned ${shards.length} shards covering ${totalLevels} levels across Corpus 2, Corpus 1 (${corpus1ShardCount} shard(s), scheduled first), and published levels.`);
