#!/usr/bin/env node
// Validation tool for STRATEGY_REPAIR_ELITE_PREFIX_DFS_RETRY (orchestration.ts): does giving
// elitePrefixDfsRepair a FRESH, additive node budget in a separate repairSearchFromGate call --
// only after the ordinary (flag-off) repair fallback loop already failed at its own protected
// budget -- recover any level the ordinary loop alone can't solve? Directly simulates the tier's
// own two-call mechanism without paying for the full solveLevel() ladder (main loop, probe, the
// three sibling promoted retry tiers) on every level, which makes this dramatically cheaper than
// driving the same question through Solver.solve() end-to-end.
//
// Targets the SAME 20-level closest-miss sample elite-prefix-dfs-ab.mjs's own report
// (reports/2026-08-07-repair-elite-prefix-dfs.md) used, since that is the one population this
// mechanism is already known to have SOME effect on (a confirmed badness-improvement feedback
// loop, though never a confirmed extra solve).
//
// SCRATCH-ADJACENT TOOL — reusable, not scratch-deleted, same convention as elite-prefix-dfs-ab.mjs.
// Shardable: pass a subset of ids via idsCsv and a distinct outJsonFile per shard (see
// .github/workflows/solver-elite-prefix-dfs-retry-validate.yml's matrix, which runs each shard as
// its own parallel job rather than one long sequential run).
// Run locally via:
//   node scripts/run-bundled.mjs scripts/stress/elite-prefix-dfs-retry-validate.mjs [protectedNodeBudget] [retryNodeBudget] [corpusFile] [idsCsv] [outJsonFile]
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

    // Ordinary repair fallback loop, unaffected (flag off, protected budget) — what the ordinary
    // loop in solveLevel() already does today, before this tier ever runs.
    const prepOff = prepLevel(level);
    prepOff._cfg = OFF_CFG;
    prepOff._metrics = { nodesExpanded: 0 };
    const t0 = Date.now();
    const offResult = await runAttempt(gateKey, level, prepOff, repairConfig, WALL_MS, Date.now(), null, PROTECTED_NODE_BUDGET);
    const offMs = Date.now() - t0;
    const offSolved = !!offResult.path;
    if (offSolved) protectedSolved++;

    let retrySolved = false, retryMs = 0, retryNodes = 0, validNote = '';
    if (!offSolved) {
        retryAttempted++;
        // This tier's own mechanism: a FRESH, separate call, flag on, fresh additional budget.
        const prepOn = prepLevel(level);
        prepOn._cfg = ON_CFG;
        prepOn._metrics = { nodesExpanded: 0 };
        const t1 = Date.now();
        const onResult = await runAttempt(gateKey, level, prepOn, repairConfig, WALL_MS, Date.now(), null, RETRY_NODE_BUDGET);
        retryMs = Date.now() - t1;
        retryNodes = prepOn._metrics.nodesExpanded;
        retrySolved = !!onResult.path;
        if (retrySolved) {
            const valid = Solver.validateCandidatePath(level, onResult.path);
            if (valid.ok) {
                retryRecovered++;
                recovered.push(id);
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
    rows.push({
        id, offSolved, offNodes: prepOff._metrics.nodesExpanded, offMs,
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
        protectedSolved, total: IDS.length, retryAttempted, retryRecovered, recovered, invalid, rows,
    }, null, 2));
}

if (invalid.length > 0) process.exitCode = 1;
