#!/usr/bin/env node
// A/B for STRATEGY_REPAIR_ELITE_PREFIX_DFS (repair-search.ts's elitePrefixDfsRepair — bounded
// deterministic completion DFS from several points scattered across the elite pool, triggered on
// stagnation). Same methodology as this session's other A/Bs: node-budget-pinned, non-binding wall
// clock, each level's real getAttemptConfigs()-selected repair config(s), not hand-picked.
//
// SCRATCH TOOL — run via:
//   node scripts/run-bundled.mjs scripts/stress/elite-prefix-dfs-ab.mjs [corpusFile] [sampleSize] [nodeBudget]
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

/** Pure flip-record projection, split out from main() so it can be unit-tested without a real solve. */
export function buildFlipRecord(id, onResult, offResult, nodesOn, nodesOff, repairConfig) {
    return {
        id: id ?? '(no id)', solvedOn: !!onResult.path, solvedOff: !!offResult.path, nodesOn, nodesOff,
        scoringProfile: repairConfig.scoringProfileId,
    };
}

async function main() {
    installBrowserStubs();
    const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
    const Solver = createSolver();
    const { prepLevel, getAttemptConfigs, runAttempt, normalizeAblationConfig } = SOLVER_TESTING_API;

    const ROOT = fileURLToPath(new URL('..', import.meta.url));
    const CORPUS_FILE = process.argv[2] || 'data/stress/stress-levels-random.json';
    const SAMPLE_SIZE = process.argv[3] ? Number(process.argv[3]) : 100;
    const NODE_BUDGET = process.argv[4] ? Number(process.argv[4]) : 3000000;
    const ONLY_IDS = process.argv[5] ? new Set(process.argv[5].split(',')) : null;
    const WALL_MS = 300000; // generous, non-binding

    const corpus = JSON.parse(readFileSync(path.join(ROOT, CORPUS_FILE), 'utf8'));
    const levels = Array.isArray(corpus) ? corpus : corpus.levels;

    const OFF_CFG = normalizeAblationConfig({ STRATEGY_REPAIR_ELITE_PREFIX_DFS: false });

    // Sample: every level whose real attempt-config ladder includes at least one repair config,
    // natural corpus order (mixed difficulty), capped at SAMPLE_SIZE. If ONLY_IDS is set, restrict to
    // those specific level ids regardless of order/count.
    const candidates = [];
    for (const entry of levels) {
        if (!ONLY_IDS && candidates.length >= SAMPLE_SIZE) break;
        const { id, stressMeta: _stressMeta, ...raw } = entry;
        if (ONLY_IDS && !ONLY_IDS.has(id)) continue;
        try {
            const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
            const configs = getAttemptConfigs(level);
            const repairConfig = configs.find(c => c.repair);
            if (repairConfig) candidates.push({ id, raw, level, repairConfig });
        } catch { /* skip malformed */ }
    }

    let solvedOn = 0, solvedOff = 0;
    let totalNodesOn = 0, totalNodesOff = 0;
    const flips = [];
    let i = 0;

    for (const { id, level, repairConfig } of candidates) {
        i++;
        const prepOn = prepLevel(level);
        const prepOff = prepLevel(level);
        prepOff._cfg = OFF_CFG;
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
        if (!!onResult.path !== !!offResult.path) {
            flips.push(buildFlipRecord(id, onResult, offResult, nodesOn, nodesOff, repairConfig));
        }
        if (i % 10 === 0) console.log(`  ...${i}/${candidates.length} (solvedOn=${solvedOn} solvedOff=${solvedOff} flips=${flips.length})`);
    }

    console.log(`Corpus: ${CORPUS_FILE}, repair-exercising candidates: ${candidates.length}`);
    console.log(`Node budget/attempt: ${NODE_BUDGET}, wall budget: ${WALL_MS}ms`);
    console.log(`Solved ON (elitePrefixDfs default):  ${solvedOn}/${candidates.length}`);
    console.log(`Solved OFF (STRATEGY_REPAIR_ELITE_PREFIX_DFS: false): ${solvedOff}/${candidates.length}`);
    console.log(`Total nodesExpanded ON:  ${totalNodesOn}`);
    console.log(`Total nodesExpanded OFF: ${totalNodesOff}`);
    console.log(`Solved-status flips: ${flips.length}`);
    if (flips.length > 0) console.log(JSON.stringify(flips, null, 2));
}

// Only run as a CLI, not when buildFlipRecord is imported for a unit test (matches
// scripts/run-bundled.mjs's own CLI-vs-import guard convention).
if (import.meta.url === `file://${process.argv[1]}`) await main();
