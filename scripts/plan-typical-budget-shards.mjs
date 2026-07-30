#!/usr/bin/env node
/**
 * Shard planner for .github/workflows/solver-typical-budget-baseline.yml.
 *
 * Emits the workflow's job matrix as one line of JSON: a contiguous, gap-free, overlap-free split
 * of BOTH stress corpora across N shards. Exists as a script rather than inline workflow bash for
 * two reasons:
 *
 *  1. Corpus-1 (102 levels) is SMALLER than the shard count (240), so most shards legitimately get
 *     zero corpus-1 levels. The floor-split formula handles that correctly but produces empty
 *     ranges (end < start) that inline bash would silently turn into `pos:2-1` — a selector that
 *     either errors or, worse, selects something unintended. Here an empty range is an explicit
 *     `c1: null` the workflow tests with `if:`.
 *  2. The shard id is zero-padded ONCE, here, and travels through the matrix as a string. The
 *     existing solver-stress-refresh.yml derives its padding twice (printf in one step, a raw
 *     matrix value in another); when those two diverged, 9 of 20 shards uploaded zero bytes and
 *     the refresh silently combined partial results. One source, no divergence.
 *
 * Split formula per corpus: shard i of N covers [floor((i-1)*L/N)+1, floor(i*L/N)], which
 * partitions 1..L exactly for any L and N (including L < N, where some shards get nothing).
 *
 * Usage: node scripts/plan-typical-budget-shards.mjs [--shards=240] [--corpus1-levels=102]
 *                                                    [--corpus2-levels=1700] [--pretty]
 * Level counts default to the real corpora on disk, so a resized corpus needs no edit here.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = new URL('..', import.meta.url).pathname;

/** Contiguous floor split: returns [start, end] 1-based inclusive, or null when this shard gets none. */
export function shardRange(shardIndex, shardCount, levelCount) {
    const start = Math.floor(((shardIndex - 1) * levelCount) / shardCount) + 1;
    const end = Math.floor((shardIndex * levelCount) / shardCount);
    return end < start ? null : [start, end];
}

export function planShards(shardCount, corpus1Levels, corpus2Levels) {
    const width = String(shardCount).length;
    const out = [];
    for (let i = 1; i <= shardCount; i++) {
        const c1 = shardRange(i, shardCount, corpus1Levels);
        const c2 = shardRange(i, shardCount, corpus2Levels);
        out.push({
            shard: String(i).padStart(width, '0'),
            c1start: c1 ? c1[0] : 0, c1end: c1 ? c1[1] : 0, c1: c1 ? 'yes' : '',
            c2start: c2 ? c2[0] : 0, c2end: c2 ? c2[1] : 0, c2: c2 ? 'yes' : '',
        });
    }
    return out;
}

function countLevels(relPath) {
    const parsed = JSON.parse(readFileSync(path.join(root, relPath), 'utf8'));
    return (Array.isArray(parsed) ? parsed : parsed.levels).length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const argMap = new Map(process.argv.slice(2).filter(a => a.includes('=')).map(a => {
        const [k, ...v] = a.split('='); return [k, v.join('=')];
    }));
    const shardCount = Number(argMap.get('--shards') || 240);
    const c1 = Number(argMap.get('--corpus1-levels') || countLevels('data/stress/stress-levels.json'));
    const c2 = Number(argMap.get('--corpus2-levels') || countLevels('data/stress/stress-levels-random.json'));
    const plan = planShards(shardCount, c1, c2);

    // Sanity-check the partition before it can drive 240 jobs: a silent gap would mean levels never
    // solved but still counted as "refreshed", which is exactly the failure the combined report
    // cannot detect on its own.
    for (const [name, total, sk, ek] of [['corpus-1', c1, 'c1start', 'c1end'], ['corpus-2', c2, 'c2start', 'c2end']]) {
        let covered = 0, prevEnd = 0;
        for (const s of plan) {
            if (!s[sk]) continue;
            if (s[sk] !== prevEnd + 1) throw new Error(`${name}: shard ${s.shard} starts at ${s[sk]}, expected ${prevEnd + 1} — gap or overlap in the split`);
            covered += s[ek] - s[sk] + 1;
            prevEnd = s[ek];
        }
        if (covered !== total || prevEnd !== total) throw new Error(`${name}: split covers ${covered}/${total} levels (last end ${prevEnd})`);
    }

    if (process.argv.includes('--pretty')) {
        const c1Shards = plan.filter(s => s.c1).length, c2Shards = plan.filter(s => s.c2).length;
        console.log(`${shardCount} shards | corpus-1 ${c1} levels across ${c1Shards} shards | corpus-2 ${c2} levels across ${c2Shards} shards`);
        console.log(`per-shard corpus-2 sizes: ${[...new Set(plan.filter(s => s.c2).map(s => s.c2end - s.c2start + 1))].sort((a, b) => a - b).join('/')}`);
    } else {
        process.stdout.write(JSON.stringify(plan));
    }
}
