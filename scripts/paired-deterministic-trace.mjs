#!/usr/bin/env node
/**
 * Run two deterministic solver configs independently on the same level/gate under matched bounds,
 * capture the existing ordering observer's actual active ranking as a bounded decision-event stream,
 * and locate the first real trace divergence.
 *
 * This is diagnostic research tooling, not a solver/census path. Each arm receives a fresh PrepLevel;
 * use predecessor-conditioned tooling separately when the question is shared-prep lifetime state.
 * Beam and repair are intentionally rejected because their operational comparison needs native
 * frontier/restart fingerprints rather than a fake deterministic-tree metric.
 *
 * Example:
 *   node scripts/run-bundled.mjs scripts/paired-deterministic-trace.mjs -- \
 *     --corpus=data/stress/stress-levels-random.json --level=R00408 \
 *     --left='dfs|score=harvestThenFinish|bias=none' --right='dfs|score=portalFirstTransfer|bias=none' \
 *     --node-budget=200000 --trace-limit=4096 --out=/tmp/paired-trace.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { makeAttemptConfigKeyParser } from './attempt-config-key.mjs';
import { compareDeterministicDecisionTraces } from './operational-similarity-lib.mjs';
import { installBrowserStubs } from './test-lib/browser-stubs.mjs';

const ROOT = process.cwd();
const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const [key, ...value] = arg.split('=');
    return [key, value.join('=')];
}));

const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const LEVEL_ID = args.get('--level');
const LEFT_KEY = args.get('--left');
const RIGHT_KEY = args.get('--right');
const BUDGET_MS = Number(args.get('--budget-ms') || 8000);
const NODE_BUDGET = Number(args.get('--node-budget') || 200000);
const TRACE_LIMIT = Number(args.get('--trace-limit') || 4096);
const GATE_INDEX = Number(args.get('--gate-index') || 0);
const OUT_FILE = args.get('--out') || null;

if (!LEVEL_ID || !LEFT_KEY || !RIGHT_KEY) {
    console.error('--level, --left, and --right are required');
    process.exit(2);
}
for (const [label, value] of [['--budget-ms', BUDGET_MS], ['--node-budget', NODE_BUDGET], ['--trace-limit', TRACE_LIMIT]]) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be positive`);
}
if (!Number.isSafeInteger(TRACE_LIMIT)) throw new Error('--trace-limit must be a positive integer');
if (!Number.isSafeInteger(GATE_INDEX) || GATE_INDEX < 0) throw new Error('--gate-index must be a non-negative integer');

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../modules/solver.js');
const { STRUCTURAL_ORDERING_BIASES, SCORING_PROFILES } = await import('../modules/solver/policy.js');
const Solver = createSolver();
const { prepLevel, runAttempt, attemptConfigKey } = SOLVER_TESTING_API;
const parseAttemptConfigKey = makeAttemptConfigKeyParser({ STRUCTURAL_ORDERING_BIASES, SCORING_PROFILES, attemptConfigKey });

function parseDeterministicConfig(key) {
    const config = parseAttemptConfigKey(key);
    if (config.repair) throw new Error(`${key}: repair requires repair-native fingerprints, not deterministic trace comparison`);
    if (config.beamWidth) throw new Error(`${key}: beam requires frontier/retention comparison, not deterministic trace comparison`);
    return config;
}

const leftConfig = parseDeterministicConfig(LEFT_KEY);
const rightConfig = parseDeterministicConfig(RIGHT_KEY);
const leftKey = attemptConfigKey(leftConfig);
const rightKey = attemptConfigKey(rightConfig);
const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;
const entry = corpusLevels.find(level => level.id === LEVEL_ID);
if (!entry) throw new Error(`Level ${LEVEL_ID} not found in ${CORPUS_FILE}`);

function serializableNumber(value) {
    return Number.isFinite(value) ? value : String(value);
}

function activePolicyFor(config) {
    if (config.admissibleOrderNoTieBreak) return { id: 'active', scoringProfile: null };
    const profile = SCORING_PROFILES[config.scoringProfileId];
    if (!profile) throw new Error(`No scoring profile for ${config.scoringProfileId}`);
    return { id: 'active', scoringProfile: profile, orderingBias: config.orderingBias ?? null };
}

async function runArm(label, key, config) {
    const { id: _id, stressMeta: _stressMeta, ...raw } = entry;
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    if (GATE_INDEX >= level.gateKeys.length) throw new Error(`--gate-index=${GATE_INDEX} but level has ${level.gateKeys.length} gate(s)`);
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    prep._forcedFirstStepKey = null;
    prep._forcedPortalExitKey = null;

    const events = [];
    let observed = 0;
    prep._orderingResearchObserver = {
        policies: [activePolicyFor(config)],
        observe(record) {
            if (record.candidates.length < 2) return;
            observed++;
            if (events.length >= TRACE_LIMIT) return;
            const active = record.rankings.find(ranking => ranking.policyId === 'active');
            if (!active) throw new Error(`${label}: active ranking missing from ordering research record`);
            events.push({
                searchFamily: record.searchFamily,
                depth: record.depth,
                candidates: [...record.candidates],
                activeOrder: [...active.order],
                activeScores: active.scores.map(serializableNumber),
                ...(record.admissibleSlack ? { admissibleSlack: record.admissibleSlack.map(row => ({
                    key: row.key, slack: serializableNumber(row.slack),
                })) } : {}),
            });
        },
    };

    const gateKey = level.gateKeys[GATE_INDEX];
    const started = Date.now();
    const result = await runAttempt(gateKey, level, prep, config, BUDGET_MS, started, null, NODE_BUDGET);
    prep._orderingResearchObserver = null;
    return {
        label,
        configKey: key,
        gateIndex: GATE_INDEX,
        gateKey,
        ok: !!result.path,
        nodesExpanded: result.attempt?.nodesExpanded ?? prep._metrics.nodesExpanded,
        attempt: result.attempt,
        trace: { observed, retained: events.length, truncated: observed > events.length, events },
    };
}

const left = await runArm('left', leftKey, leftConfig);
const right = await runArm('right', rightKey, rightConfig);
const comparison = compareDeterministicDecisionTraces(left.trace, right.trace);
const output = {
    schemaVersion: 1,
    metricClass: 'operationalSimilarity',
    comparisonKind: 'paired-deterministic-decision-trace',
    provenance: {
        corpus: CORPUS_FILE,
        levelId: LEVEL_ID,
        gateIndex: GATE_INDEX,
        budgetMsPerArm: BUDGET_MS,
        nodeBudgetPerArm: NODE_BUDGET,
        traceLimitPerArm: TRACE_LIMIT,
        preparation: 'fresh-independent-per-arm',
    },
    left,
    right,
    comparison,
    caveat: 'Event-index alignment is causal only through the first mismatch. Post-divergence signature overlap is diagnostic overlap, not proof of state reconvergence.',
};

if (OUT_FILE) {
    const resolved = path.resolve(ROOT, OUT_FILE);
    mkdirSync(path.dirname(resolved), { recursive: true });
    writeFileSync(resolved, `${JSON.stringify(output, null, 2)}\n`);
    console.log(`Wrote ${OUT_FILE}: ${comparison.status}, common-prefix=${comparison.commonEventPrefix}`);
} else {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}
