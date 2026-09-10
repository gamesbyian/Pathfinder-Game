#!/usr/bin/env node
/**
 * Updates the high-budget-sweep runtime telemetry file (logs/solver-stress-refresh/
 * corpus2-runtime-telemetry.json) from a completed round's combined sweep report, via an
 * exponential moving average (EMA) per level id -- feeds scripts/plan-highbudget-shards.mjs's
 * weighted shard packing for the NEXT round.
 *
 * Only levels that hit the node-budget CEILING this round (nodesExpanded >= 95% of --node-budget)
 * are used: for those, elapsedMs scales roughly linearly with node-budget (same set of production
 * ladder tiers re-runs to exhaustion every time), so `elapsedMs / (nodeBudget/1e9)` -- "ms per
 * billion nodes" -- is a budget-independent throughput figure that predicts a DIFFERENT future
 * node-budget by simple scaling. A level that SOLVED this round stops early for a reason unrelated
 * to its at-cap throughput (and won't be a target again once solved), so it's excluded from the
 * EMA and its telemetry entry (if any, from a previous still-unsolved round) is dropped.
 *
 * Each entry now also carries a `configKey` (scripts/plan-highbudget-shards.mjs's
 * canonicalConfigKey(enableFlags, disableFlags)) recording which ablation flags were active when
 * the sample was taken. This workflow's only caller (solver-highbudget-unsolved-sweep.yml)
 * historically never varied flags, so every pre-existing entry implicitly means production-default
 * ('|') -- see classifyTelemetry()'s own comment for why treating a missing configKey that way is
 * precise, not a guess. Going forward, an incoming sample whose configKey differs from an entry's
 * stored one starts a FRESH EMA (does not blend against it): a flag that changes pruning/retry
 * behavior can change real per-node cost by an amount the old config's samples never measured, so
 * blending across configs would quietly contaminate the estimate for both.
 *
 * Usage:
 *   node scripts/update-highbudget-telemetry.mjs --sweep=<combined-report.json> \
 *       --node-budget=<n> --telemetry=<existing-telemetry.json-or-new-path> \
 *       [--enable-flags=<comma-separated>] [--disable-flags=<comma-separated>] \
 *       [--alpha=0.5] [--out=<path, defaults to --telemetry>]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { canonicalConfigKey } from './plan-highbudget-shards.mjs';

const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
    const [k, ...v] = a.split('=');
    return [k, v.join('=')];
}));
const sweepPath = args.get('--sweep');
const nodeBudget = Number(args.get('--node-budget'));
const telemetryPath = args.get('--telemetry');
const alpha = args.has('--alpha') ? Number(args.get('--alpha')) : 0.5;
const outPath = args.get('--out') || telemetryPath;
const configKey = canonicalConfigKey(args.get('--enable-flags'), args.get('--disable-flags'));

if (!sweepPath || !Number.isFinite(nodeBudget) || nodeBudget <= 0 || !telemetryPath) {
    console.error('Usage: node scripts/update-highbudget-telemetry.mjs --sweep=<file> --node-budget=<n> --telemetry=<file> [--alpha=0.5] [--out=<file>]');
    process.exit(2);
}

const root = process.cwd();
const sweep = JSON.parse(readFileSync(path.resolve(root, sweepPath), 'utf8'));
const telemetry = existsSync(path.resolve(root, telemetryPath))
    ? JSON.parse(readFileSync(path.resolve(root, telemetryPath), 'utf8'))
    : { alpha, levels: {} };
telemetry.levels ??= {};

const CAP_THRESHOLD = 0.95;
const nowIso = new Date().toISOString();

let cappedCount = 0;
let solvedRemoved = 0;
for (const lv of sweep.levels ?? []) {
    if (!lv.id) continue;
    if (lv.ok) {
        if (telemetry.levels[lv.id]) { delete telemetry.levels[lv.id]; solvedRemoved++; }
        continue;
    }
    const nodesExpanded = lv.nodesExpanded ?? 0;
    if (nodesExpanded < nodeBudget * CAP_THRESHOLD) continue; // didn't actually hit the ceiling -- not a reliable throughput sample
    const elapsedMs = lv.elapsedMs ?? 0;
    if (elapsedMs <= 0) continue;
    const sampleMsPerGiganode = elapsedMs / (nodeBudget / 1e9);
    const prev = telemetry.levels[lv.id];
    // A stored entry from a DIFFERENT config is not comparable evidence for this one -- start a
    // fresh EMA rather than blending, per this file's header comment.
    const prevConfigKey = prev?.configKey ?? '|';
    const sameConfig = prev && prevConfigKey === configKey;
    const ema = sameConfig ? alpha * sampleMsPerGiganode + (1 - alpha) * prev.emaMsPerGiganode : sampleMsPerGiganode;
    telemetry.levels[lv.id] = {
        emaMsPerGiganode: ema,
        samples: (sameConfig ? prev.samples : 0) + 1,
        configKey,
        lastElapsedMs: elapsedMs,
        lastNodeBudget: nodeBudget,
        lastNodesExpanded: nodesExpanded,
        lastUpdated: nowIso,
    };
    cappedCount++;
}

telemetry.alpha = alpha;
telemetry.updatedAt = nowIso;
telemetry.lastSweep = sweepPath;
telemetry.lastNodeBudget = nodeBudget;

writeFileSync(path.resolve(root, outPath), JSON.stringify(telemetry, null, 2) + '\n');
console.log(`Updated telemetry: ${cappedCount} capped-level sample(s) folded in (alpha=${alpha}), ${solvedRemoved} solved id(s) removed. ${Object.keys(telemetry.levels).length} id(s) now tracked. Wrote ${outPath}.`);
