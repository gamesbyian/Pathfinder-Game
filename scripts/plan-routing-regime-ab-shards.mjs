#!/usr/bin/env node
/**
 * Wraps plan-ab-corpus-shards.mjs's single-arm shard plan into the two-arm coordinated shard
 * matrix solver-routing-regime-sample-ab.yml's single dispatch needs: every position-based shard
 * is duplicated once per arm (control, treatment) so both arms search the exact same positions,
 * and the underlying corpus files are read once -- at this job's own checkout, the canonical
 * baseline_ref -- to resolve those positions to actual level ids. That id list becomes the
 * population BOTH arms are later validated against, so any corpus reordering between baseline_ref
 * and treatment_ref surfaces downstream as a population-integrity failure (missing/unexpected
 * ids) instead of silently comparing different levels under the same position numbers.
 *
 * Usage: node scripts/plan-routing-regime-ab-shards.mjs --base-output=<file> --ids-out=<file>
 *   [--github-output=<file>] [--corpus1-file=] [--corpus2-file=] [--published-file=]
 * --base-output must be a file plan-ab-corpus-shards.mjs already wrote its own
 * shards=/total_levels= GITHUB_OUTPUT-style lines into (via its own --github-output override).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  return new Map(argv.filter(a => a.startsWith('--')).map(a => {
    const eq = a.indexOf('=');
    return eq === -1 ? [a.slice(2), 'true'] : [a.slice(2, eq), a.slice(eq + 1)];
  }));
}

export function expandShardsByArm(baseShards) {
  return ['control', 'treatment'].flatMap(arm => baseShards.map(shard => ({ ...shard, idx: `${arm}-${shard.idx}`, arm })));
}

export function resolveExpectedIds(baseShards, levelsFor) {
  const expectedIds = [];
  for (const shard of baseShards) {
    const levels = levelsFor(shard.corpus_key);
    const positions = shard.levels.replace(/^pos:/, '').split(',').map(Number);
    for (const position of positions) {
      const level = levels[position - 1];
      if (!level) throw new Error(`${shard.corpus_key}: no level at position ${position}`);
      expectedIds.push(String(level.id));
    }
  }
  return expectedIds;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseOutputFile = args.get('base-output');
  const idsOut = args.get('ids-out');
  const githubOutput = args.get('github-output') || process.env.GITHUB_OUTPUT;
  if (!baseOutputFile || !idsOut || !githubOutput) {
    console.error('Usage: --base-output=<file> --ids-out=<file> [--github-output=<file>] [--corpus1-file=] [--corpus2-file=] [--published-file=]');
    process.exit(2);
  }
  const corpusFiles = {
    corpus1: args.get('corpus1-file') || 'data/stress/stress-levels.json',
    corpus2: args.get('corpus2-file') || 'data/stress/stress-levels-random.json',
    published: args.get('published-file') || 'data/levels.json',
  };
  const levelsByCorpus = new Map();
  const levelsFor = corpusKey => {
    if (!levelsByCorpus.has(corpusKey)) {
      const parsed = JSON.parse(readFileSync(corpusFiles[corpusKey], 'utf8'));
      levelsByCorpus.set(corpusKey, Array.isArray(parsed) ? parsed : parsed.levels);
    }
    return levelsByCorpus.get(corpusKey);
  };

  const raw = readFileSync(baseOutputFile, 'utf8');
  const shardsLine = raw.split('\n').find(line => line.startsWith('shards='));
  const totalLine = raw.split('\n').find(line => line.startsWith('total_levels='));
  if (!shardsLine || !totalLine) throw new Error(`${baseOutputFile}: missing shards=/total_levels= output lines`);
  const baseShards = JSON.parse(shardsLine.slice('shards='.length)).shard;
  const totalLevels = Number(totalLine.slice('total_levels='.length));

  const expectedIds = resolveExpectedIds(baseShards, levelsFor);
  writeFileSync(idsOut, `${expectedIds.join('\n')}\n`);

  const doubled = expandShardsByArm(baseShards);
  writeFileSync(githubOutput, `shards=${JSON.stringify({ shard: doubled })}\nshard_count=${doubled.length}\ntotal_levels=${totalLevels}\n`, { flag: 'a' });
  console.log(`Expanded ${baseShards.length} shard(s) covering ${totalLevels} level(s)/arm into ${doubled.length} shard(s) across both arms; resolved ${expectedIds.length} expected id(s).`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main();
}
