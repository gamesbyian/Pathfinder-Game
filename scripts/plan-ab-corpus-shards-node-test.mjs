#!/usr/bin/env node
/**
 * CLI smoke coverage for scripts/plan-ab-corpus-shards.mjs: Corpus 1 must be split into several
 * shards (not one monolithic job) and scheduled BEFORE the Corpus 2 shards, since GitHub Actions
 * starts matrix jobs in array order up to `max-parallel` -- a single slow Corpus 1 job placed
 * last is what made a real archetype-sample-ab.yml A/B run's Corpus 1 job start late and finish
 * last by a wide margin (see reports/2026-08-26-mustcross-flipper-wide-beam-exposure-development-ab.md's
 * underlying runs). Uses the real checked-in Corpus 1 / published corpora (the script reads their
 * paths directly, with no override flag) so this also catches a corpus-size change silently
 * breaking coverage.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function levelCount(relativePath) {
    const parsed = JSON.parse(readFileSync(path.join(ROOT, relativePath), 'utf8'));
    return (Array.isArray(parsed) ? parsed : parsed.levels).length;
}

function positionsCovered(shards, corpusKey) {
    const positions = new Set();
    for (const shard of shards) {
        if (shard.corpus_key !== corpusKey) continue;
        for (const token of shard.levels.replace(/^pos:/, '').split(',')) positions.add(Number(token));
    }
    return positions;
}

async function planShards(tempDir, sampleTokens, corpus2Shards) {
    const sampleFile = path.join(tempDir, 'sample.txt');
    const outFile = path.join(tempDir, `output-${sampleTokens.length}-${corpus2Shards}.txt`);
    await writeFile(sampleFile, sampleTokens.map(n => `pos:${n}`).join('\n'));
    await execFile('node', [
        'scripts/plan-ab-corpus-shards.mjs',
        `--corpus2-sample=${sampleFile}`,
        `--corpus2-shards=${corpus2Shards}`,
        `--github-output=${outFile}`,
    ], { cwd: ROOT });
    const output = await readFile(outFile, 'utf8');
    const shardsLine = output.split('\n').find(line => line.startsWith('shards='));
    const totalLevelsLine = output.split('\n').find(line => line.startsWith('total_levels='));
    return {
        shards: JSON.parse(shardsLine.slice('shards='.length)).shard,
        totalLevels: Number(totalLevelsLine.slice('total_levels='.length)),
    };
}

async function main() {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'plan-ab-corpus-shards-'));
    try {
        const corpus1Count = levelCount('data/stress/stress-levels.json');
        const publishedCount = levelCount('data/levels.json');
        const corpus2Sample = Array.from({ length: 300 }, (_, i) => i + 1);

        const { shards, totalLevels } = await planShards(tempDir, corpus2Sample, 60);

        assert.equal(totalLevels, corpus2Sample.length + corpus1Count + publishedCount, 'total_levels sums all three corpora');

        const corpus1Shards = shards.filter(s => s.corpus_key === 'corpus1');
        const publishedShards = shards.filter(s => s.corpus_key === 'published');

        assert.equal(corpus1Shards.length > 1, true, 'Corpus 1 must be split into more than one shard, not one monolithic job');
        // Same levels-per-shard density as Corpus 2 (300/60=5) applied to Corpus 1 (102 levels) -> ~20.
        assert.equal(corpus1Shards.length, Math.round(corpus1Count / (corpus2Sample.length / 60)), 'Corpus 1 shard count matches Corpus 2\'s realized levels-per-shard density');
        assert.equal(publishedShards.length, 1, 'published stays a single shard (not yet a measured bottleneck)');

        // The whole point: Corpus 1's shards must be scheduled first, since GitHub Actions starts
        // matrix jobs in array order up to max-parallel -- a slow corpus placed last starts late.
        const firstNonCorpus1Index = shards.findIndex(s => s.corpus_key !== 'corpus1');
        assert.equal(firstNonCorpus1Index, corpus1Shards.length, 'every Corpus 1 shard precedes every Corpus 2/published shard');

        assert.deepEqual(positionsCovered(shards, 'corpus1'), new Set(Array.from({ length: corpus1Count }, (_, i) => i + 1)), 'Corpus 1 shards cover every position exactly once, no gaps/overlaps');
        assert.deepEqual(positionsCovered(shards, 'corpus2'), new Set(corpus2Sample), 'Corpus 2 shards cover exactly the requested sample');
        assert.deepEqual(positionsCovered(shards, 'published'), new Set(Array.from({ length: publishedCount }, (_, i) => i + 1)), 'published shard covers every position');

        // Degenerate empty-sample dispatch must not fall back to one shard per Corpus 1 level.
        const empty = await planShards(tempDir, [], 60);
        const emptyCorpus1Shards = empty.shards.filter(s => s.corpus_key === 'corpus1');
        assert.equal(emptyCorpus1Shards.length, Math.min(60, corpus1Count), 'empty-sample fallback caps Corpus 1 shard count at the requested Corpus 2 shard count');
        assert.deepEqual(positionsCovered(empty.shards, 'corpus1'), new Set(Array.from({ length: corpus1Count }, (_, i) => i + 1)), 'empty-sample fallback still covers every Corpus 1 position');

        console.log('plan-ab-corpus-shards tests: all passed');
    } finally {
        await rm(tempDir, { recursive: true, force: true });
    }
}

main().catch(err => { console.error(err); process.exit(1); });
