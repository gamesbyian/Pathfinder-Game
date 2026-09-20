#!/usr/bin/env node
/**
 * Lane H1/H2 parity-invariant shadow probe.
 *
 * Runs the real sequential production solve ladder under a deterministic work budget while a
 * research-only observers read phase-conditioned distance and the reached set already computed by isConnected(). Solver decisions
 * are unchanged. A generous wall deadline is a safety cap only; any deadline-truncated row is
 * explicitly indeterminate rather than a negative.
 *
 * Usage:
 *   npm run solver:parity-capacity-shadow -- --work-budget=5000000 --budget-ms=600000
 *   npm run solver:parity-capacity-shadow -- --corpus=data/stress/stress-levels.json --levels=R00001,R00002 --work-budget=5000000
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

import { keyParity } from '../../modules/domain/cell-key.js';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { selectLevelsBySpec } from '../level-data-io.mjs';

const args = new Map(process.argv.slice(2).filter(x => x.startsWith('--')).map(x => {
    const [key, ...rest] = x.split('=');
    return [key, rest.join('=')];
}));
const required = key => {
    const value = args.get(key);
    if (value == null || value === '') throw new Error(`missing ${key}`);
    return value;
};

const corpusFile = args.get('--corpus') || 'data/stress/stress-levels.json';
const levelSpec = args.get('--levels') || null;
const workBudget = Number(required('--work-budget'));
const budgetMs = Number(args.get('--budget-ms') || 600000);
const outFile = args.get('--out') || 'reports/stress/parity-invariant-shadow/latest.json';
const maxExamplesPerLevel = Number(args.get('--max-examples-per-level') || 8);
if (!Number.isFinite(workBudget) || workBudget <= 0) throw new Error('--work-budget must be a positive number');
if (!Number.isFinite(budgetMs) || budgetMs <= 0) throw new Error('--budget-ms must be a positive number');

const getCommitSha = () => {
    if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
    try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'local'; }
};

const hasTwistPortal = level => {
    const seen = new Set();
    for (const [a, info] of level.portalMap) {
        const b = info.dest;
        const lo = Math.min(a, b), hi = Math.max(a, b);
        const id = `${lo}:${hi}`;
        if (seen.has(id)) continue;
        seen.add(id);
        if (keyParity(a) !== keyParity(b)) return true;
    }
    return false;
};

installBrowserStubs();
const { createSolver } = await import('../../modules/solver.js');
const Solver = createSolver();

const document = JSON.parse(readFileSync(path.resolve(corpusFile), 'utf8'));
const allLevels = Array.isArray(document) ? document : document.levels;
if (!Array.isArray(allLevels) || allLevels.length === 0) throw new Error(`empty corpus: ${corpusFile}`);
const selected = selectLevelsBySpec(allLevels, levelSpec);

const rows = [];
let totals = {
    selected: selected.length,
    eligibleNoTwist: 0,
    observerReached: 0,
    completedWithoutDeadline: 0,
    phaseEvaluations: 0,
    scalarDistanceRejects: 0,
    phaseDistanceRejects: 0,
    incrementalPhaseRejects: 0,
    capacityEvaluations: 0,
    scalarVolumeRejects: 0,
    parityCapacityRejects: 0,
    incrementalParityRejects: 0,
};

for (const entry of selected) {
    const { id, stressMeta, ...raw } = entry;
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const eligibleNoTwist = !hasTwistPortal(level);
    if (eligibleNoTwist) totals.eligibleNoTwist++;

    const counts = {
        phaseEvaluations: 0,
        scalarDistanceRejects: 0,
        phaseDistanceRejects: 0,
        incrementalPhaseRejects: 0,
        capacityEvaluations: 0,
        scalarVolumeRejects: 0,
        parityCapacityRejects: 0,
        incrementalParityRejects: 0,
    };
    const phaseExamples = [];
    const capacityExamples = [];
    const phaseObserver = {
        observe(record) {
            counts.phaseEvaluations++;
            if (record.scalarDistanceWouldReject) counts.scalarDistanceRejects++;
            if (record.phaseDistanceWouldReject) counts.phaseDistanceRejects++;
            if (record.incrementalPhaseReject) {
                counts.incrementalPhaseRejects++;
                if (phaseExamples.length < maxExamplesPerLevel) phaseExamples.push(record);
            }
        },
    };
    const capacityObserver = {
        observe(record) {
            counts.capacityEvaluations++;
            if (record.totalVolumeWouldReject) counts.scalarVolumeRejects++;
            if (record.parityCapacityWouldReject) counts.parityCapacityRejects++;
            if (record.incrementalParityReject) {
                counts.incrementalParityRejects++;
                if (capacityExamples.length < maxExamplesPerLevel) capacityExamples.push(record);
            }
        },
    };

    const started = Date.now();
    let result;
    try {
        result = await Solver.solveLevel(level, {
            timeBudgetMs: budgetMs,
            workBudget,
            strictTotalWorkBudget: true,
            parityCapacityObserver: capacityObserver,
            parityPhaseDistanceObserver: phaseObserver,
        });
    } catch (error) {
        rows.push({
            id: String(id ?? ''),
            eligibleNoTwist,
            status: 'error',
            error: error?.message ?? String(error),
            elapsedMs: Date.now() - started,
            ...counts,
            phaseExamples,
            capacityExamples,
        });
        continue;
    }

    if (counts.phaseEvaluations > 0 || counts.capacityEvaluations > 0) totals.observerReached++;
    if (!result.deadlineTruncated) totals.completedWithoutDeadline++;
    totals.phaseEvaluations += counts.phaseEvaluations;
    totals.scalarDistanceRejects += counts.scalarDistanceRejects;
    totals.phaseDistanceRejects += counts.phaseDistanceRejects;
    totals.incrementalPhaseRejects += counts.incrementalPhaseRejects;
    totals.capacityEvaluations += counts.capacityEvaluations;
    totals.scalarVolumeRejects += counts.scalarVolumeRejects;
    totals.parityCapacityRejects += counts.parityCapacityRejects;
    totals.incrementalParityRejects += counts.incrementalParityRejects;

    rows.push({
        id: String(id ?? ''),
        generationBatch: stressMeta?.generationBatch ?? null,
        eligibleNoTwist,
        status: result.status,
        ok: !!result.ok,
        deadlineTruncated: !!result.deadlineTruncated,
        workSpent: result.workSpent ?? null,
        elapsedMs: Date.now() - started,
        ...counts,
        phaseExamples,
        capacityExamples,
    });
    console.log(`${id ?? '?'}: H1=${counts.incrementalPhaseRejects}/${counts.phaseEvaluations} H2=${counts.incrementalParityRejects}/${counts.capacityEvaluations} ${result.deadlineTruncated ? 'DEADLINE-TRUNCATED' : result.status}`);
}

const report = {
    schema: 'pathfinder.parity-invariant-shadow/v1',
    createdAt: new Date().toISOString(),
    solverRef: getCommitSha(),
    questions: [
        {
            lane: 'H1',
            liveAmbiguity: 'Does twist-phase-conditioned relaxed goal distance prove decision-bearing dead states that scalar goal distance misses?',
            discriminatingObservable: 'incrementalPhaseReject=true at the scalar-distance seam while scalarDistanceWouldReject=false',
            outcomeInterpretation: {
                positive: 'non-trivial incremental incidence nominates witness replay, soundness differential, then the smallest consumer',
                negative: 'near-zero incremental incidence on completed twist-bearing rows stops H1 in this static conditioned-distance form',
                indeterminate: 'deadline truncation, no phase-observer reach, or absence of twist portals cannot support a negative',
            },
        },
        {
            lane: 'H2',
            liveAmbiguity: 'Does checkerboard-split reachable capacity prove decision-bearing dead states that existing scalar connectivity volume misses on future-no-twist states?',
            discriminatingObservable: 'incrementalParityReject=true at the real connectivity-volume seam while totalVolumeWouldReject=false',
            outcomeInterpretation: {
                positive: 'non-trivial incremental incidence nominates witness replay, soundness differential, then the smallest consumer',
                negative: 'near-zero incremental incidence on completed representative eligible rows stops H2 in this form',
                indeterminate: 'deadline truncation, no capacity-observer reach, or twist-bearing state cannot support a negative',
            },
        },
    ],
    protocol: {
        corpus: corpusFile,
        levelSpec: levelSpec ?? 'all',
        workBudget,
        wallDeadlineMs: budgetMs,
        strictTotalWorkBudget: true,
        solverPath: 'real sequential production solveLevel ladder under one strict whole-solve work cap; observer-only H2 instrumentation',
        observerEffect: 'H1 adds one observer callback at the existing distance seam; H2 scans the already-computed reached set after connectivity fill. No canonical work units are charged and no solver decision reads observer output',
    },
    resolutionInputs: {
        eligibility: { eligibleNoTwist: totals.eligibleNoTwist, selected: totals.selected },
        reach: { levelsWithObserverRecords: totals.observerReached, eligibleNoTwist: totals.eligibleNoTwist },
        participation: { phaseEvaluations: totals.phaseEvaluations, capacityEvaluations: totals.capacityEvaluations },
        measurementSupport: { status: 'supported', basis: 'H1 reads the static two-layer relaxation at the scalar-distance seam; H2 reads the exact reached set already used by isConnected; both have synthetic incremental witnesses in solver tests' },
        fidelity: { status: 'supported', basis: 'sequential production solveLevel with no ablation/profile changes and a fixed whole-solve work cap; ordinary additive-tier policy remains intact inside that cap' },
        coverage: { completedWithoutDeadline: totals.completedWithoutDeadline, selected: totals.selected },
        censoring: { deadlineTruncated: rows.filter(row => row.deadlineTruncated).length, errors: rows.filter(row => row.status === 'error').length },
    },
    totals,
    rows,
};

mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
writeFileSync(path.resolve(outFile), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${outFile}: H1 ${totals.incrementalPhaseRejects}/${totals.phaseEvaluations} incremental; H2 ${totals.incrementalParityRejects}/${totals.capacityEvaluations} incremental.`);
