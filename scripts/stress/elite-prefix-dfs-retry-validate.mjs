#!/usr/bin/env node
// Validation tool for STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY (orchestration.ts): does giving
// elitePrefixDfsRepair a FRESH, additive node budget in a separate repairSearchFromGate call --
// only after the ordinary (flag-off) repair fallback loop already failed at its own protected
// budget -- recover any level the ordinary loop alone can't solve? Directly simulates the tier's
// own two-call mechanism without paying for the full solveLevel() ladder.
//
// IMPORTANT EVIDENCE RULE: every referee-valid solve is serialized with its path + attempt record.
// This is an isolated/direct-attempt experiment, not production-ladder capability, but a valid new
// path is still durable hint evidence and the workflow-level harvester records it with
// isolatedTechnique=true after the run finishes.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/solver.js');
const Solver = createSolver();
const { prepLevel, getAttemptConfigs, runAttempt, normalizeAblationConfig } = SOLVER_TESTING_API;

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const DEFAULT_IDS = [
    'R00440', 'R01397', 'R01698', 'R01860', 'R02003', 'R02022', 'R02088', 'R02123', 'R02220', 'R02239',
    'R00342', 'R00786', 'R00877', 'R00886', 'R00893', 'R01341', 'R02106', 'R02118', 'R02137', 'R02275',
];

const PROTECTED_NODE_BUDGET = process.argv[2] ? Number(process.argv[2]) : 15_000_000;
const RETRY_NODE_BUDGET = process.argv[3] ? Number(process.argv[3]) : 15_000_000;
const CORPUS_FILE = process.argv[4] || 'data/stress/stress-levels-random.json';
const IDS = process.argv[5] ? process.argv[5].split(',') : DEFAULT_IDS;
const OUT_JSON_FILE = process.argv[6] || null;
const WALL_MS = 300000; // generous, non-binding — node budget is the real ceiling

const corpus = JSON.parse(readFileSync(path.join(ROOT, CORPUS_FILE), 'utf8'));
const levels = Array.isArray(corpus) ? corpus : corpus.levels;
const byId = new Map();
for (const entry of levels) if (entry.id) byId.set(entry.id, entry);

const OFF_CFG = normalizeAblationConfig({ STRATEGY_REPAIR_ELITE_PREFIX_DFS: false });
const ON_CFG = normalizeAblationConfig({ STRATEGY_REPAIR_ELITE_PREFIX_DFS: true });

console.log(`Corpus: ${CORPUS_FILE}, targets: ${IDS.length}`);
console.log(`Protected (ordinary) node budget: ${PROTECTED_NODE_BUDGET}, retry node budget: ${RETRY_NODE_BUDGET}\n`);

let protectedSolved = 0;
let retryAttempted = 0;
let retryRecovered = 0;
const recovered = [];
const invalid = [];
const rows = [];

for (const id of IDS) {
    const entry = byId.get(id);
    if (!entry) { console.log(`${id}: NOT FOUND`); continue; }
    const { stressMeta: _stressMeta, ...raw } = entry;
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const configs = getAttemptConfigs(level);
    const repairConfig = configs.find(c => c.repair);
    if (!repairConfig) { console.log(`${id}: no repair config`); continue; }
    const gateKey = level.gateKeys[0];

    const prepOff = prepLevel(level);
    prepOff._cfg = OFF_CFG;
    prepOff._metrics = { nodesExpanded: 0 };
    const t0 = Date.now();
    const offResult = await runAttempt(gateKey, level, prepOff, repairConfig, WALL_MS, Date.now(), null, PROTECTED_NODE_BUDGET);
    const offMs = Date.now() - t0;
    const offSolved = !!offResult.path;
    if (offSolved) protectedSolved++;

    let retrySolved = false, retryMs = 0, retryNodes = 0, validNote = '';
    let retryPath = null, retryAttempt = null;
    if (!offSolved) {
        retryAttempted++;
        const prepOn = prepLevel(level);
        prepOn._cfg = ON_CFG;
        prepOn._metrics = { nodesExpanded: 0 };
        const t1 = Date.now();
        const onResult = await runAttempt(gateKey, level, prepOn, repairConfig, WALL_MS, Date.now(), null, RETRY_NODE_BUDGET);
        retryMs = Date.now() - t1;
        retryNodes = prepOn._metrics.nodesExpanded;
        retrySolved = !!onResult.path;
        retryAttempt = onResult.attempt ? { ...onResult.attempt, repairElitePrefixDfsRetry: true } : null;
        if (retrySolved) {
            const valid = Solver.validateCandidatePath(level, onResult.path);
            if (valid.ok) {
                retryRecovered++;
                recovered.push(id);
                retryPath = onResult.path;
                validNote = ' [REFEREE-VALID]';
            } else {
                invalid.push({ id, reason: valid.reason });
                validNote = ` [REFEREE-INVALID: ${valid.reason}]`;
            }
        }
    }

    const line = `${id}: protected=${offSolved ? 'SOLVED' : 'fail'} (${prepOff._metrics.nodesExpanded}n, ${offMs}ms)` +
        (offSolved ? '' : ` retry=${retrySolved ? 'SOLVED' : 'fail'} (${retryNodes}n, ${retryMs}ms)${validNote}`);
    console.log(line);

    const solution = offSolved ? offResult.path : retryPath;
    const winningAttempt = offSolved ? offResult.attempt : retryPath ? retryAttempt : null;
    rows.push({
        id, ok: !!solution, solution,
        attempts: winningAttempt ? [winningAttempt] : [],
        nodesExpanded: offSolved ? prepOff._metrics.nodesExpanded : retryNodes,
        totalMs: offSolved ? offMs : retryMs,
        offSolved, offNodes: prepOff._metrics.nodesExpanded, offMs,
        retryAttempted: !offSolved, retrySolved, retryNodes, retryMs,
        refereeInvalid: invalid.some(x => x.id === id),
    });
}

console.log(`\nProtected (ordinary loop) solved: ${protectedSolved}/${IDS.length}`);
console.log(`Retry attempted (protected failed): ${retryAttempted}`);
console.log(`Retry recovered (referee-valid): ${retryRecovered}`);
console.log(`Recovered ids: ${recovered.join(',') || '(none)'}`);
if (invalid.length > 0) {
    console.log(`REFEREE-INVALID solves (bug — must be zero): ${JSON.stringify(invalid)}`);
}

if (OUT_JSON_FILE) {
    writeFileSync(OUT_JSON_FILE, JSON.stringify({
        corpus: CORPUS_FILE,
        isolatedTechnique: true,
        protectedNodeBudget: PROTECTED_NODE_BUDGET,
        retryNodeBudget: RETRY_NODE_BUDGET,
        protectedSolved, total: IDS.length, retryAttempted, retryRecovered, recovered, invalid, rows,
    }, null, 2));
}

if (invalid.length > 0) process.exitCode = 1;
