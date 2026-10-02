#!/usr/bin/env node
/**
 * Dose-response probe for the promoted dead-last portal tier (STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY,
 * node ceiling PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY_NODE_BUDGET = 50M, entry-relative). The tier re-runs the main
 * ladder with STRATEGY_PORTAL_COARSE_STATE_MERGE on after every earlier tier failed. This emulates that body with existing
 * knobs: a main-ladder-only solve (disableExtraBudgetPasses) with the portal merge on at a given node budget. One run at a
 * large budget yields the whole dose curve: a level solved after n nodes is solved at any dose >= n. Control winners (levels
 * the tier already solved at 50M in the production run) validate the emulation.
 *
 * Usage: node --import tsx scripts/stress/portal-dead-last-dose-probe.mjs --corpus=<corpus.json> --ids-file=<ids> --node-budget=200000000 --out=<jsonl> [--shard=i/n]
 * Output is append-only JSONL, one row per level, so an interrupted run resumes by skipping completed ids.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { readLevelCorpusDocumentWithHints } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => { const [k, ...r] = x.split('='); return [k, r.join('=')]; }));
const corpus = args.get('--corpus');
const idsFile = args.get('--ids-file');
const nodeBudget = Number(args.get('--node-budget') ?? 200000000);
const out = args.get('--out');
const [shardIndex, shardCount] = (args.get('--shard') ?? '0/1').split('/').map(Number);
if (!corpus || !idsFile || !out) throw new Error('--corpus, --ids-file and --out are required');
const ids = readFileSync(idsFile, 'utf8').split(/[\s,]+/).filter(Boolean).filter((_, i) => i % shardCount === shardIndex);
const done = new Set(existsSync(out) ? readFileSync(out, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l).id) : []);

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.ts');
const { defaultConfig } = await import('../../modules/solver/ablation-config.ts');
const Solver = createSolver();
const byId = new Map(readLevelCorpusDocumentWithHints(corpus).levels.map(l => [String(l.id), l]));
const ablation = { ...defaultConfig(), STRATEGY_PORTAL_COARSE_STATE_MERGE: true, STRATEGY_PORTAL_COARSE_STATE_MERGE_DEAD_LAST_RETRY: false };

for (const id of ids) {
    if (done.has(id)) continue;
    const raw = byId.get(id);
    if (!raw) throw new Error(`level not found: ${id}`);
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const t0 = Date.now();
    const result = await Solver.solveLevel(level, {
        nodeBudget, baseWorkBudget: Math.round(nodeBudget * 1.34), timeBudgetMs: 86400000, schedulerMode: 'production',
        disableExtraBudgetPasses: true, ablation,
    });
    const solved = !!(result.ok && Array.isArray(result.solution));
    const valid = solved ? Solver.validateCandidatePath(level, result.solution).ok : null;
    const row = { id, solved, refereeValid: valid, status: result.status, nodesExpanded: result.nodesExpanded ?? null, workSpent: result.workSpent ?? null,
        portals: level.portalMap.size, ms: Date.now() - t0, nodeBudget };
    appendFileSync(out, JSON.stringify(row) + '\n');
    console.error(`${id}: solved=${solved} nodes=${row.nodesExpanded} portals=${row.portals} ${(row.ms / 1000).toFixed(0)}s`);
}
