#!/usr/bin/env node
// A/B for PRUNE_PORTAL_PARITY_ENVELOPE (prune-gauntlet.ts). Full Solver.solve() ladder (not an
// isolated attempt config) since this is a general search prune used by both dfsFromGate and
// repair's takePly, not a repair-only mechanism. Node-budget-pinned, non-binding wall clock.
//
// Explicitly neutralizes the OTHER opt-in-only ablation flags (STRATEGY_REPAIR_TURN_BIAS,
// STRATEGY_REPAIR_ELITE_PREFIX_DFS) in BOTH arms -- normalizeAblationConfig's Proxy reads any
// UNSET flag as true once the ablation object is non-null, regardless of that flag's own
// opt-in-vs-default-on convention, so a sparse `{PRUNE_PORTAL_PARITY_ENVELOPE: true}` object
// silently activates both of those too. Exactly the trap turnbias-churn-check.mjs's own header
// comment already documents; caught here only after a live run's node counts looked too uniform
// and cross-checking against solved levels showed unexpected "solved=false" results.
//
// SCRATCH TOOL — run via:
//   node scripts/run-bundled.mjs scripts/stress/portal-parity-envelope-ab.mjs [corpusFile] [nodeBudget] <id1,id2,...>
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver } = await import('../../modules/Solver.js');
const Solver = createSolver();

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CORPUS_FILE = process.argv[2] || 'data/stress/stress-levels-random.json';
const NODE_BUDGET = process.argv[3] ? Number(process.argv[3]) : 8000000;
const ONLY_IDS = new Set((process.argv[4] || '').split(',').filter(Boolean));
const WALL_MS = 86400000;

const corpus = JSON.parse(readFileSync(path.join(ROOT, CORPUS_FILE), 'utf8'));
const levels = Array.isArray(corpus) ? corpus : corpus.levels;

let solvedOn = 0, solvedOff = 0;
let totalNodesOn = 0, totalNodesOff = 0;
const results = [];
let i = 0;

for (const entry of levels) {
    const { id, stressMeta: _stressMeta, ...raw } = entry;
    if (!ONLY_IDS.has(id)) continue;
    i++;
    let level;
    try {
        level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    } catch (err) {
        console.error(`prep error on ${id}: ${err?.message ?? err}`);
        continue;
    }
    const NEUTRAL = { STRATEGY_REPAIR_TURN_BIAS: false, STRATEGY_REPAIR_ELITE_PREFIX_DFS: false };
    const onResult = await Solver.solve(level, { ablation: { ...NEUTRAL, PRUNE_PORTAL_PARITY_ENVELOPE: true }, nodeBudget: NODE_BUDGET, timeBudgetMs: WALL_MS, disableExtraBudgetPasses: true });
    const offResult = await Solver.solve(level, { ablation: { ...NEUTRAL, PRUNE_PORTAL_PARITY_ENVELOPE: false }, nodeBudget: NODE_BUDGET, timeBudgetMs: WALL_MS, disableExtraBudgetPasses: true });
    const nodesOn = onResult.attempts?.reduce((a, b) => a + (b.nodesExpanded || 0), 0) ?? 0;
    const nodesOff = offResult.attempts?.reduce((a, b) => a + (b.nodesExpanded || 0), 0) ?? 0;
    totalNodesOn += nodesOn;
    totalNodesOff += nodesOff;
    const onOk = !!onResult.ok, offOk = !!offResult.ok;
    if (onOk) solvedOn++;
    if (offOk) solvedOff++;
    results.push({ id, onOk, offOk, nodesOn, nodesOff });
    const flag = onOk !== offOk ? '  <-- FLIP' : '';
    console.log(`[${i}] ${id}: ON solved=${onOk} nodes=${nodesOn} | OFF solved=${offOk} nodes=${nodesOff}${flag}`);
}

console.log(`\nCorpus: ${CORPUS_FILE}, node budget: ${NODE_BUDGET}, levels: ${results.length}`);
console.log(`Solved ON (PRUNE_PORTAL_PARITY_ENVELOPE: true):  ${solvedOn}/${results.length}`);
console.log(`Solved OFF (false, current default):             ${solvedOff}/${results.length}`);
console.log(`Total nodesExpanded ON:  ${totalNodesOn}`);
console.log(`Total nodesExpanded OFF: ${totalNodesOff}`);
console.log(`Delta (OFF - ON): ${totalNodesOff - totalNodesOn} (${(100 * (totalNodesOff - totalNodesOn) / Math.max(1, totalNodesOff)).toFixed(2)}% fewer nodes with ON)`);
const flips = results.filter(r => r.onOk !== r.offOk);
console.log(`Solved-status flips: ${flips.length}`);
if (flips.length > 0) console.log(JSON.stringify(flips, null, 2));
const regressions = results.filter(r => r.offOk && !r.onOk);
console.log(`REGRESSIONS (solved OFF, unsolved ON -- must be 0 for this to be safe): ${regressions.length}`);
if (regressions.length > 0) console.log(JSON.stringify(regressions, null, 2));
