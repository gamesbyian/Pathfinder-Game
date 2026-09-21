#!/usr/bin/env node
/**
 * Production-inert forced-work prevalence probe.
 *
 * Question: on current hard levels, how much canonical beam expansion work is spent at parents
 * whose candidate set has exactly one survivor after ordinary hard pruning?
 *
 * This does not implement chain contraction. It observes the existing beam pipeline through
 * _beamResearchObserver.includeParentExpansionWork, so search behavior is unchanged apart from
 * research telemetry. The primary result is an oracle ceiling: even a perfect free mechanism
 * cannot remove more parent-expansion work than is currently spent at one-successor parents.
 *
 * Example:
 *   node scripts/run-bundled.mjs scripts/stress/forced-work-prevalence.mjs -- \
 *     --corpora=data/stress/stress-levels.json,data/stress/stress-levels-random.json \
 *     --levels=S00030,R00104 --profile=objectiveFirst --width=500 \
 *     --work-budget=5000000 --budget-ms=600000 --out=tmp/forced-work.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import {
    createForcedWorkCollector,
    summarizeForcedWork,
    summarizeForcedWorkAcrossRuns,
} from './forced-work-prevalence-lib.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};

function readLevelIds() {
    const explicit = String(arg('levels', '')).split(',').map(value => value.trim()).filter(Boolean);
    const file = arg('levels-file', null);
    if (!file) return explicit;
    const doc = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
    const fromFile = Array.isArray(doc) ? doc : (doc.levelIds ?? doc.ids ?? doc.levels);
    if (!Array.isArray(fromFile)) throw new Error('--levels-file must be a JSON array or object with levelIds/ids/levels array');
    const ids = fromFile.map(row => String(typeof row === 'object' ? row.id : row)).filter(Boolean);
    return [...explicit, ...ids];
}

function loadCorpusFiles(files) {
    const byId = new Map();
    for (const file of files) {
        const doc = JSON.parse(readFileSync(path.resolve(file), 'utf8'));
        const rows = Array.isArray(doc) ? doc : doc.levels;
        if (!Array.isArray(rows)) throw new Error(`corpus ${file} must be an array or {levels:[...]}`);
        for (const row of rows) {
            const id = String(row?.id ?? '');
            if (!id) continue;
            if (!byId.has(id)) byId.set(id, row);
        }
    }
    return byId;
}

export async function measureGate({ level, gateKey, profile, width, workBudget, budgetMs }) {
    const { prepLevel, beamSearchFromGate } = SOLVER_TESTING_API;
    const prep = prepLevel(level);
    prep._cfg = null;
    prep._metrics = { nodesExpanded: 0 };
    const startWork = prep._workMeter.units;
    prep._workCap = startWork + workBudget;

    const collector = createForcedWorkCollector();
    prep._beamResearchObserver = {
        includeParentExpansionWork: true,
        observe(record) { collector.observe(record); },
    };

    const out = {};
    const startedAt = Date.now();
    const result = await beamSearchFromGate(
        gateKey,
        level,
        prep,
        profile,
        budgetMs,
        startedAt,
        null,
        width,
        null,
        false,
        out,
        Infinity,
        undefined,
        undefined,
        true,
    );
    prep._beamResearchObserver = null;

    const snapshot = collector.snapshot();
    const workSpent = prep._workMeter.units - startWork;
    return {
        gateKey,
        status: result ? 'solved'
            : out.pausedContinuation ? 'work-budget-phase-boundary'
            : out.timedOut ? 'timed-out'
            : 'exhausted',
        workBudget,
        workSpent,
        workOvershoot: Math.max(0, workSpent - workBudget),
        nodesExpanded: prep._metrics.nodesExpanded,
        elapsedMs: Date.now() - startedAt,
        observedGeneratedRecords: snapshot.observedGeneratedRecords,
        summary: summarizeForcedWork(snapshot),
    };
}

async function main() {
    installBrowserStubs();
    const Solver = createSolver();

    const corpusFiles = String(arg('corpora', arg('corpus', 'data/stress/stress-levels-random.json')))
        .split(',').map(value => value.trim()).filter(Boolean);
    const levelIds = readLevelIds();
    const profileName = String(arg('profile', 'objectiveFirst'));
    const width = Number(arg('width', 500));
    const workBudget = Number(arg('work-budget', 5_000_000));
    const budgetMs = Number(arg('budget-ms', 600_000));
    const outFile = arg('out', null);

    if (!outFile) throw new Error('--out is required');
    if (!levelIds.length) throw new Error('--levels or --levels-file must select at least one level');
    if (new Set(levelIds).size !== levelIds.length) throw new Error('selected level ids contain duplicates');
    if (!Number.isInteger(width) || width < 1) throw new Error('--width must be a positive integer');
    if (!Number.isSafeInteger(workBudget) || workBudget < 1) throw new Error('--work-budget must be a positive safe integer');
    if (!Number.isFinite(budgetMs) || budgetMs <= 0) throw new Error('--budget-ms must be positive');

    const profile = SOLVER_TESTING_API.SCORING_PROFILES[profileName];
    if (!profile) throw new Error(`unknown scoring profile: ${profileName}`);

    const byId = loadCorpusFiles(corpusFiles);
    const missing = levelIds.filter(id => !byId.has(id));
    if (missing.length) throw new Error(`selected levels missing from corpora: ${missing.join(', ')}`);

    const parents = [];
    const allRuns = [];
    for (let i = 0; i < levelIds.length; i++) {
        const levelId = levelIds[i];
        const raw = byId.get(levelId);
        const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
        const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
        const gates = [];
        for (const gateKey of level.gateKeys) {
            const row = await measureGate({ level, gateKey, profile, width, workBudget, budgetMs });
            gates.push(row);
            allRuns.push({ levelId, ...row });
        }
        parents.push({ levelId, gates });
        const parentSummary = summarizeForcedWorkAcrossRuns(gates);
        console.log(`[${i + 1}/${levelIds.length}] ${levelId}: forced-work-share=${parentSummary.forcedExpansionWorkShare == null ? 'n/a' : (100 * parentSummary.forcedExpansionWorkShare).toFixed(2) + '%'} parents=${parentSummary.expandedParents}`);

        const partial = {
            schemaVersion: 1,
            kind: 'pathfinder-forced-work-prevalence',
            evidenceRole: 'development',
            premiseUse: 'oracle-ceiling-and-prevalence-only',
            protocol: { corpusFiles, levelIds, profile: profileName, width, workBudget, budgetMs },
            summary: summarizeForcedWorkAcrossRuns(allRuns),
            parents,
        };
        mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
        writeFileSync(path.resolve(outFile), `${JSON.stringify(partial, null, 2)}\n`);
    }

    const summary = summarizeForcedWorkAcrossRuns(allRuns);
    console.log(JSON.stringify({ out: outFile, ...summary }, null, 2));
}

if (process.argv[1]
    && ['forced-work-prevalence.mjs', 'forced-work-prevalence.bundle.mjs'].includes(path.basename(process.argv[1]))
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    await main();
}
