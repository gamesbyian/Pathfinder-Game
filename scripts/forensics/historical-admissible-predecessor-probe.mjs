#!/usr/bin/env node
/**
 * One-shot forensic probe for the historical P0 predecessor-dependent admissible-order anomaly.
 * Run only in the detached e5034e8 worktree after patch-historical-admissible-observer.mjs adds the
 * observation callback to the already-computed production ranking.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.includes('=')).map(arg => {
    const [key, ...value] = arg.split('=');
    return [key, value.join('=')];
}));
const ROOT = process.cwd();
const CORPUS_FILE = args.get('--corpus') || 'data/stress/stress-levels-random.json';
const LEVEL_ID = args.get('--level') || 'R02088';
const TIME_BUDGET_MS = Number(args.get('--budget-ms') || 600000);
const NODE_BUDGET = Number(args.get('--node-budget') || 100000000);
const TRACE_LIMIT = Number(args.get('--trace-limit') || 4096);
const OUT_FILE = args.get('--out') || 'logs/p0-admissible-predecessor-forensic.json';

installBrowserStubs();
const { createSolver, SOLVER_TESTING_API } = await import('../../modules/Solver.js');
const { runAttemptSearch } = await import('../../modules/solver/attempt-dispatch.js');
const Solver = createSolver();
const { prepLevel, runAttempt, attemptConfigKey } = SOLVER_TESTING_API;

const corpus = JSON.parse(readFileSync(path.resolve(ROOT, CORPUS_FILE), 'utf8'));
const corpusLevels = Array.isArray(corpus) ? corpus : corpus.levels;
const entry = corpusLevels.find(level => level.id === LEVEL_ID);
if (!entry) throw new Error(`${LEVEL_ID} not found in ${CORPUS_FILE}`);
const { id: _id, stressMeta: _stressMeta, ...raw } = entry;

let activeContext = null;
globalThis.__PF_ADMISSIBLE_FORENSIC_OBSERVER = record => {
    if (!activeContext) return;
    activeContext.observedEvents++;
    if (activeContext.events.length >= activeContext.maxEvents) return;
    activeContext.events.push({
        depth: record.depth,
        fromKey: record.fromKey,
        candidates: [...record.candidates],
        activeOrder: record.ranked.map(row => row.key),
        ranked: record.ranked,
    });
};

function finiteOrNull(value) {
    return Number.isFinite(value) ? value : null;
}

function prepSnapshot(prep) {
    const workUnits = prep._workMeter?.units ?? null;
    const workCap = prep._workCap ?? null;
    const strictWorkCap = prep._strictWorkCap ?? null;
    return {
        workUnits,
        workCap,
        availableWork: Number.isFinite(workCap) && Number.isFinite(workUnits) ? workCap - workUnits : null,
        strictWorkCap,
        strictAvailableWork: Number.isFinite(strictWorkCap) && Number.isFinite(workUnits) ? strictWorkCap - workUnits : null,
        cumulativeNodesExpanded: prep._metrics?.nodesExpanded ?? null,
        cfgPresent: !!prep._cfg,
        forcedFirstStepKey: prep._forcedFirstStepKey ?? null,
        forcedPortalExitKey: prep._forcedPortalExitKey ?? null,
        mpCachePresent: !!prep._mpLowerBoundCache,
        mcCachePresent: !!prep._mcLowerBoundCache,
    };
}

function newContext({ configKey, gateKey, budgetMs, nodeBudget, prep, maxEvents = TRACE_LIMIT, cachesCleared = false }) {
    return {
        configKey,
        gateKey,
        budgetMs,
        nodeBudget: finiteOrNull(nodeBudget),
        before: prepSnapshot(prep),
        cachesCleared,
        observedEvents: 0,
        maxEvents,
        events: [],
    };
}

function finishContext(context, prep, path) {
    context.ok = !!path;
    context.after = prepSnapshot(prep);
    context.truncated = context.observedEvents > context.events.length;
}

function compactAttempt(context) {
    return {
        configKey: context.configKey,
        gateKey: context.gateKey,
        budgetMs: context.budgetMs,
        nodeBudget: context.nodeBudget,
        before: context.before,
        after: context.after,
        ok: context.ok,
        cachesCleared: context.cachesCleared,
        observedEvents: context.observedEvents,
        firstEvent: context.events[0] ?? null,
    };
}

function eventSignature(event) {
    return JSON.stringify([event.depth, event.fromKey, event.candidates, event.activeOrder]);
}

function compareTraces(left, right) {
    const shared = Math.min(left.events.length, right.events.length);
    let commonEventPrefix = 0;
    while (commonEventPrefix < shared && eventSignature(left.events[commonEventPrefix]) === eventSignature(right.events[commonEventPrefix])) {
        commonEventPrefix++;
    }
    let firstDivergence = null;
    if (commonEventPrefix < shared) {
        const a = left.events[commonEventPrefix], b = right.events[commonEventPrefix];
        const sameLocation = a.depth === b.depth && a.fromKey === b.fromKey;
        const sameCandidates = sameLocation && JSON.stringify(a.candidates) === JSON.stringify(b.candidates);
        firstDivergence = {
            retainedIndex: commonEventPrefix,
            reason: sameCandidates ? 'ordering' : sameLocation ? 'candidate-set' : 'traversal-context',
            left: a,
            right: b,
        };
    } else if (left.events.length !== right.events.length) {
        firstDivergence = { retainedIndex: commonEventPrefix, reason: 'trace-length', left: left.events[commonEventPrefix] ?? null, right: right.events[commonEventPrefix] ?? null };
    }
    return {
        commonEventPrefix,
        firstDivergence,
        censored: left.truncated || right.truncated,
        left: { observed: left.observedEvents, retained: left.events.length, truncated: left.truncated },
        right: { observed: right.observedEvents, retained: right.events.length, truncated: right.truncated },
    };
}

async function runFullLadder({ targetKey = null, targetGate = null, clearTargetCaches = false } = {}) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const admissibleAttempts = [];
    let winningRuntime = null;
    const dispatch = async (...dispatchArgs) => {
        const [attemptConfig, gateKey, _level, prep, _profile, budgetMs, _startTime, _yieldFn, nodeBudget] = dispatchArgs;
        if (!attemptConfig.admissibleOrder) return runAttemptSearch(...dispatchArgs);
        const configKey = attemptConfigKey(attemptConfig);
        const isTarget = targetKey === null || (configKey === targetKey && gateKey === targetGate);
        const shouldClear = clearTargetCaches && isTarget;
        if (shouldClear) {
            prep._mpLowerBoundCache = undefined;
            prep._mcLowerBoundCache = undefined;
        }
        const context = newContext({ configKey, gateKey, budgetMs, nodeBudget, prep,
            maxEvents: targetKey === null || isTarget ? TRACE_LIMIT : 1, cachesCleared: shouldClear });
        activeContext = context;
        let result;
        try { result = await runAttemptSearch(...dispatchArgs); }
        finally { activeContext = null; }
        finishContext(context, prep, result);
        admissibleAttempts.push(context);
        if (result) winningRuntime = { context, attemptConfig, gateKey };
        return result;
    };
    const result = await Solver.solve(level, {
        timeBudgetMs: TIME_BUDGET_MS,
        nodeBudget: NODE_BUDGET,
        attemptBudgetTelemetry: true,
        attemptSearchForTesting: dispatch,
    });
    return { result, admissibleAttempts, winningRuntime };
}

async function runFreshMatched(winnerRuntime) {
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    prep._forcedFirstStepKey = winnerRuntime.context.before.forcedFirstStepKey;
    prep._forcedPortalExitKey = winnerRuntime.context.before.forcedPortalExitKey;
    prep._attemptBudgetTelemetry = true;

    const availableWork = winnerRuntime.context.before.availableWork;
    if (Number.isFinite(availableWork)) prep._workCap = prep._workMeter.units + availableWork;
    const strictAvailableWork = winnerRuntime.context.before.strictAvailableWork;
    if (Number.isFinite(strictAvailableWork)) prep._strictWorkCap = prep._workMeter.units + strictAvailableWork;

    const context = newContext({
        configKey: winnerRuntime.context.configKey,
        gateKey: winnerRuntime.gateKey,
        budgetMs: winnerRuntime.context.budgetMs,
        nodeBudget: winnerRuntime.context.nodeBudget ?? Infinity,
        prep,
    });
    activeContext = context;
    let attempt;
    try {
        attempt = await runAttempt(winnerRuntime.gateKey, level, prep, winnerRuntime.attemptConfig,
            winnerRuntime.context.budgetMs, Date.now(), null, winnerRuntime.context.nodeBudget ?? Infinity);
    } finally { activeContext = null; }
    finishContext(context, prep, attempt.path);
    return { context, attempt: attempt.attempt };
}

function resourceContract(preceded, fresh) {
    const fields = ['availableWork', 'strictAvailableWork', 'cfgPresent', 'forcedFirstStepKey', 'forcedPortalExitKey'];
    const differences = [];
    if (preceded.budgetMs !== fresh.budgetMs) differences.push({ field: 'budgetMs', preceded: preceded.budgetMs, fresh: fresh.budgetMs });
    if (preceded.nodeBudget !== fresh.nodeBudget) differences.push({ field: 'nodeBudget', preceded: preceded.nodeBudget, fresh: fresh.nodeBudget });
    for (const field of fields) if (preceded.before[field] !== fresh.before[field]) differences.push({ field, preceded: preceded.before[field], fresh: fresh.before[field] });
    return {
        matchedEffectiveContract: differences.length === 0,
        differences,
        note: 'cumulativeNodesExpanded/workUnits are recorded as history but are not required to be equal when the effective remaining caps are matched',
    };
}

const baseline = await runFullLadder();
const winnerRuntime = baseline.winningRuntime;
if (!baseline.result.ok || !winnerRuntime) {
    const output = {
        schemaVersion: 1,
        status: 'historical-baseline-did-not-reproduce-admissible-win',
        provenance: { commit: 'e5034e8c433eb32ab6d1882d80271dc277b91b0f', corpus: CORPUS_FILE, levelId: LEVEL_ID, timeBudgetMs: TIME_BUDGET_MS, nodeBudget: NODE_BUDGET },
        fullResult: { ok: baseline.result.ok, status: baseline.result.status, nodesExpanded: baseline.result.nodesExpanded, workSpent: baseline.result.workSpent },
        admissibleAttempts: baseline.admissibleAttempts.map(compactAttempt),
    };
    mkdirSync(path.dirname(path.resolve(ROOT, OUT_FILE)), { recursive: true });
    writeFileSync(path.resolve(ROOT, OUT_FILE), `${JSON.stringify(output, null, 2)}\n`);
    console.log(JSON.stringify({ status: output.status, ok: baseline.result.ok, admissibleAttempts: baseline.admissibleAttempts.length }));
    process.exit(0);
}

const fresh = await runFreshMatched(winnerRuntime);
const contract = resourceContract(winnerRuntime.context, fresh.context);
const traceComparison = compareTraces(winnerRuntime.context, fresh.context);
const initialOrderingDiffers = traceComparison.firstDivergence?.retainedIndex === 0
    && traceComparison.firstDivergence.reason === 'ordering';

let cacheCleared = null;
if (contract.matchedEffectiveContract && initialOrderingDiffers) {
    const replay = await runFullLadder({
        targetKey: winnerRuntime.context.configKey,
        targetGate: winnerRuntime.gateKey,
        clearTargetCaches: true,
    });
    const target = replay.admissibleAttempts.find(attempt => attempt.configKey === winnerRuntime.context.configKey
        && attempt.gateKey === winnerRuntime.gateKey && attempt.cachesCleared) ?? null;
    cacheCleared = {
        fullResult: { ok: replay.result.ok, status: replay.result.status, nodesExpanded: replay.result.nodesExpanded, workSpent: replay.result.workSpent },
        target: target ? compactAttempt(target) : null,
        versusBaseline: target ? compareTraces(winnerRuntime.context, target) : null,
        versusFresh: target ? compareTraces(target, fresh.context) : null,
    };
}

let diagnosis;
if (!contract.matchedEffectiveContract) diagnosis = 'resource-context-mismatch';
else if (initialOrderingDiffers) {
    const cacheMatchesFresh = cacheCleared?.versusFresh?.firstDivergence === null
        || (cacheCleared?.versusFresh?.commonEventPrefix ?? 0) > 0;
    diagnosis = cacheMatchesFresh ? 'warm-memo-state-implicated-at-initial-order' : 'initial-order-divergence-not-localized-by-cache-clear';
} else if (traceComparison.firstDivergence) diagnosis = 'later-deterministic-trace-divergence';
else diagnosis = traceComparison.censored ? 'no-divergence-observed-within-trace-bound' : 'matched-retained-trace-despite-outcome-difference';

const output = {
    schemaVersion: 1,
    metricClass: 'operationalSimilarityForensic',
    diagnosis,
    provenance: {
        commit: 'e5034e8c433eb32ab6d1882d80271dc277b91b0f',
        corpus: CORPUS_FILE,
        levelId: LEVEL_ID,
        timeBudgetMs: TIME_BUDGET_MS,
        nodeBudget: NODE_BUDGET,
        traceLimit: TRACE_LIMIT,
        selection: 'R02088 exact historical admissible-order reverse-oracle case from committed diagnosis',
    },
    baseline: {
        fullResult: { ok: baseline.result.ok, status: baseline.result.status, nodesExpanded: baseline.result.nodesExpanded, workSpent: baseline.result.workSpent },
        target: { ...compactAttempt(winnerRuntime.context), events: winnerRuntime.context.events },
        admissibleAttempts: baseline.admissibleAttempts.map(compactAttempt),
    },
    freshMatched: { ...compactAttempt(fresh.context), attempt: fresh.attempt, events: fresh.context.events },
    resourceContract: contract,
    traceComparison,
    cacheClearedPrecededReplay: cacheCleared,
};
mkdirSync(path.dirname(path.resolve(ROOT, OUT_FILE)), { recursive: true });
writeFileSync(path.resolve(ROOT, OUT_FILE), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({
    diagnosis,
    target: winnerRuntime.context.configKey,
    gateKey: winnerRuntime.gateKey,
    baselineOk: winnerRuntime.context.ok,
    freshOk: fresh.context.ok,
    commonEventPrefix: traceComparison.commonEventPrefix,
    firstDivergence: traceComparison.firstDivergence?.reason ?? null,
    contractMatched: contract.matchedEffectiveContract,
    cacheClearRan: !!cacheCleared,
}));
