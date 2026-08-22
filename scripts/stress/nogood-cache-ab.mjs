#!/usr/bin/env node
// A/B for STRATEGY_REPAIR_NOGOOD_CACHE (repair-search.ts's nogood-cache.ts). Same methodology as
// this session's other A/Bs: node-budget-pinned, non-binding wall clock, each level's real
// getAttemptConfigs()-selected repair config, not hand-picked.
//
// SCRATCH TOOL — run via:
//   node scripts/run-bundled.mjs scripts/stress/nogood-cache-ab.mjs [corpusFile] [nodeBudget] <id1,id2,...>
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
const Solver = createSolver();
const { prepLevel, getAttemptConfigs, runAttempt, normalizeAblationConfig } = SOLVER_TESTING_API;

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CORPUS_FILE = process.argv[2] || 'data/stress/stress-levels-random.json';
const NODE_BUDGET = process.argv[3] ? Number(process.argv[3]) : 15000000;
const ONLY_IDS = new Set((process.argv[4] || '').split(',').filter(Boolean));
const WALL_MS = 300000;

const corpus = JSON.parse(readFileSync(path.join(ROOT, CORPUS_FILE), 'utf8'));
const levels = Array.isArray(corpus) ? corpus : corpus.levels;

const OFF_CFG = normalizeAblationConfig({ STRATEGY_REPAIR_NOGOOD_CACHE: false });

let solvedOn = 0, solvedOff = 0;
let totalNodesOn = 0, totalNodesOff = 0;
const results = [];

for (const entry of levels) {
    const { id, stressMeta: _stressMeta, ...raw } = entry;
    if (!ONLY_IDS.has(id)) continue;
    let level, prepOn, prepOff, repairConfig;
    try {
        level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
        const configs = getAttemptConfigs(level);
        repairConfig = configs.find(c => c.repair);
        if (!repairConfig) { console.log(`${id}: no repair config, skipping`); continue; }
        prepOn = prepLevel(level);
        prepOff = prepLevel(level);
        prepOff._cfg = OFF_CFG;
    } catch (err) {
        console.error(`prep error on ${id}: ${err?.message ?? err}`);
        continue;
    }
    const gateKey = level.gateKeys[0];

    prepOn._metrics = { nodesExpanded: 0 };
    const onResult = await runAttempt(gateKey, level, prepOn, repairConfig, WALL_MS, Date.now(), null, NODE_BUDGET);
    prepOff._metrics = { nodesExpanded: 0 };
    const offResult = await runAttempt(gateKey, level, prepOff, repairConfig, WALL_MS, Date.now(), null, NODE_BUDGET);

    const nodesOn = prepOn._metrics.nodesExpanded;
    const nodesOff = prepOff._metrics.nodesExpanded;
    totalNodesOn += nodesOn;
    totalNodesOff += nodesOff;
    if (onResult.path) solvedOn++;
    if (offResult.path) solvedOff++;
    results.push({ id, solvedOn: !!onResult.path, solvedOff: !!offResult.path, nodesOn, nodesOff });
    console.log(`${id}: ON solved=${!!onResult.path} nodes=${nodesOn} | OFF solved=${!!offResult.path} nodes=${nodesOff}`);
}

console.log(`\nCorpus: ${CORPUS_FILE}, node budget: ${NODE_BUDGET}`);
console.log(`Solved ON (nogood cache default):  ${solvedOn}/${results.length}`);
console.log(`Solved OFF (STRATEGY_REPAIR_NOGOOD_CACHE: false): ${solvedOff}/${results.length}`);
console.log(`Total nodesExpanded ON:  ${totalNodesOn}`);
console.log(`Total nodesExpanded OFF: ${totalNodesOff}`);
console.log(`Delta (OFF - ON): ${totalNodesOff - totalNodesOn} (${(100 * (totalNodesOff - totalNodesOn) / Math.max(1, totalNodesOff)).toFixed(2)}% fewer nodes with cache ON)`);
const flips = results.filter(r => r.solvedOn !== r.solvedOff);
console.log(`Solved-status flips: ${flips.length}`);
if (flips.length > 0) console.log(JSON.stringify(flips, null, 2));
