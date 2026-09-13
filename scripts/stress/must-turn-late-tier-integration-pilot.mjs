#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.js');
const Solver = createSolver();

const TARGET_IDS = ['R02768', 'R02180'];
const CORPUS_FILE = 'data/stress/stress-levels-random.json';
const arg = name => process.argv.slice(2).find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const outPath = arg('out') ?? 'tmp/must-turn-late-tier-integration-pilot.json';
const rawDoc = JSON.parse(readFileSync(CORPUS_FILE, 'utf8'));
const entries = Array.isArray(rawDoc) ? rawDoc : rawDoc.levels;

const rows = [];
let failed = false;
for (const id of TARGET_IDS) {
    const entry = entries.find(level => level.id === id);
    if (!entry) throw new Error(`${id} not found in ${CORPUS_FILE}`);
    const { id: _id, stressMeta: _stressMeta, ...raw } = entry;
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const startedAt = Date.now();
    const result = await Solver.solveLevel(level, {
        timeBudgetMs: 300_000,
        nodeBudget: 50_000_000,
        lifecycleTelemetry: true,
        ablation: { STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY: true },
    });
    const elapsedMs = Date.now() - startedAt;
    const attempts = result.attempts ?? [];
    const plainIndex = attempts.findIndex(attempt => attempt.stageId === 'late-repair-search');
    const childIndex = attempts.findIndex(attempt => attempt.stageId === 'late-repair-must-turn-biased-retry');
    const plain = plainIndex >= 0 ? attempts[plainIndex] : null;
    const child = childIndex >= 0 ? attempts[childIndex] : null;
    const refereeValid = result.ok && Array.isArray(result.solution)
        ? Solver.validateCandidatePath(level, result.solution).ok
        : false;
    const contract = {
        plainParticipated: plainIndex >= 0,
        plainFailed: plain?.ok === false,
        childParticipatedAfterPlain: childIndex > plainIndex && plainIndex >= 0,
        childIsExactTreatment: child?.repair === true && child?.repairMustTurnBiased === true,
        childSolved: child?.ok === true,
        solveRefereeValid: refereeValid,
    };
    const ok = Object.values(contract).every(Boolean);
    failed ||= !ok;
    rows.push({
        id,
        ok,
        resultOk: result.ok,
        resultStatus: result.status,
        elapsedMs,
        nodesExpanded: result.nodesExpanded ?? null,
        contract,
        plain: plain ? {
            outcome: plain.outcome,
            nodesExpanded: plain.nodesExpanded ?? null,
            allocatedNodeCeiling: plain.allocatedNodeCeiling ?? null,
            workSpent: plain.workSpent ?? null,
        } : null,
        child: child ? {
            outcome: child.outcome,
            nodesExpanded: child.nodesExpanded ?? null,
            allocatedNodeCeiling: child.allocatedNodeCeiling ?? null,
            workSpent: child.workSpent ?? null,
            randomSeed: child.randomSeed ?? null,
        } : null,
        lateStageSequence: attempts
            .map((attempt, index) => ({ index, stageId: attempt.stageId, ok: attempt.ok, outcome: attempt.outcome,
                repair: attempt.repair === true, repairMustTurnBiased: attempt.repairMustTurnBiased === true,
                nodesExpanded: attempt.nodesExpanded ?? null }))
            .filter(attempt => attempt.stageId === 'late-repair-search'
                || attempt.stageId === 'late-repair-must-turn-biased-retry'
                || attempt.stageId === 'guidance-goal-distance-retry'
                || attempt.stageId === 'late-repair-multiseed-retry'),
    });
    process.stdout.write(`${id}: ${ok ? 'PASS' : 'FAIL'} plain=${plain?.outcome ?? 'missing'} child=${child?.outcome ?? 'missing'} childNodes=${child?.nodesExpanded ?? 'n/a'} referee=${refereeValid}\n`);
}

const output = {
    schemaVersion: 1,
    purpose: 'real-orchestration proof for default-off additive 7M late must-turn-biased repair tier',
    sourceCommit: process.env.GITHUB_SHA ?? null,
    corpus: 'corpus2',
    targets: TARGET_IDS,
    opts: { timeBudgetMs: 300_000, nodeBudget: 50_000_000, lifecycleTelemetry: true,
        enabledFeature: 'STRATEGY_REPAIR_LATE_MUSTTURN_BIASED_RETRY' },
    rows,
};
mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`result=${outPath}\n`);
if (failed) process.exitCode = 1;
