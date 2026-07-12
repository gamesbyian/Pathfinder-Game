#!/usr/bin/env node
/**
 * Ranks levels in a compiled baseline / benchmark-shaped result file by how promising they look
 * for solver work, using only telemetry already recorded per attempt (nodesExpanded/timedOut/
 * bestBadness/finalBadness — modules/solver/orchestration.ts) — never invokes the solver itself
 * (docs/solver-dev-tooling-plan.md Component D).
 *
 * Default view (--status=unsolved): ranks by "closest miss first" — the lowest per-level badness
 * (min of bestBadness/finalBadness across all of a level's attempts; repair's bestBadness is a
 * tracked best-ever minimum, DFS/beam's finalBadness a one-shot timeout snapshot — see
 * orchestration.ts's Attempt interface for why these aren't directly comparable in general, but
 * both are "distance from a valid solution," so min-across-attempts is still a reasonable
 * per-level summary), tiebroken by nodesExpanded descending (a proxy for "this one is genuinely
 * combinatorially hard," not just under-explored).
 *
 * Deliberately a simple, documented heuristic, not a learned ranker — at ~2000 levels total a
 * hand-auditable rule is sufficient and stays inspectable; a trained model would be
 * over-engineering for this corpus size.
 *
 * Exports levelBadness() for reuse (e.g. scripts/stress/curate-dev-benchmark.mjs) — guarded main()
 * below (matches import-published-levels.mjs's convention) so importing it never has the side
 * effect of reading a file or exiting the process.
 *
 * Pure JS — runs under plain node:
 *   node scripts/stress/rank-levels.mjs --in=logs/stress-corpus2-1700-baseline.json
 *       [--status=unsolved|solved|all] [--top=30] [--out=<file>]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

export function levelBadness(level) {
    let best = Infinity;
    for (const a of level.attempts || []) {
        const b = a.bestBadness ?? a.finalBadness;
        if (Number.isFinite(b) && b < best) best = b;
    }
    return Number.isFinite(best) ? best : null;
}

function main() {
    const ROOT = process.cwd();
    const args = new Map(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => {
        const [k, ...v] = a.split('=');
        return [k, v.join('=')];
    }));
    const IN_FILE = args.get('--in');
    const STATUS = args.get('--status') || 'unsolved';
    const TOP_N = Number(args.get('--top') || 30);
    const OUT_FILE = args.get('--out') || null;

    if (!IN_FILE) {
        console.error('Usage: rank-levels.mjs --in=<benchmark-shaped file> [--status=unsolved|solved|all] [--top=N] [--out=<file>]');
        process.exit(2);
    }

    const data = JSON.parse(readFileSync(path.resolve(ROOT, IN_FILE), 'utf8'));

    const filtered = data.levels.filter(lv => {
        if (STATUS === 'all') return true;
        return STATUS === 'solved' ? !!lv.ok : !lv.ok;
    });

    const ranked = filtered.map(lv => ({
        id: lv.id,
        ok: lv.ok,
        status: lv.status,
        badness: levelBadness(lv),
        nodesExpanded: lv.nodesExpanded ?? null,
        elapsedMs: lv.elapsedMs ?? null,
        attemptCount: lv.attemptCount ?? (lv.attempts || []).length,
    }));

    ranked.sort((a, b) => {
        // No badness signal at all sorts last (nothing to prioritize from) rather than first/zero.
        const ba = a.badness ?? Infinity, bb = b.badness ?? Infinity;
        if (ba !== bb) return ba - bb;
        return (b.nodesExpanded ?? 0) - (a.nodesExpanded ?? 0);
    });

    console.log(`Ranked ${ranked.length} ${STATUS} level(s) from ${IN_FILE}.`);
    console.log(`\nTop ${Math.min(TOP_N, ranked.length)} (closest miss first):`);
    for (const r of ranked.slice(0, TOP_N)) {
        console.log(`  ${r.id}  badness=${r.badness ?? '?'}  nodes=${r.nodesExpanded ?? '?'}  ` +
            `elapsed=${r.elapsedMs ?? '?'}ms  attempts=${r.attemptCount}  status=${r.status}`);
    }
    console.log(`\nIds only (for --levels=): ${ranked.slice(0, TOP_N).map(r => r.id).join(',')}`);

    if (OUT_FILE) {
        writeFileSync(path.resolve(ROOT, OUT_FILE), JSON.stringify({ source: IN_FILE, status: STATUS, ranked }, null, 2) + '\n');
        console.log(`\nWrote ${OUT_FILE}`);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
