#!/usr/bin/env node
/**
 * Parity-invariant shadow probe for:
 *   - WS2-PARITY-PHASE-DISTANCE
 *   - WS2-CHECKERBOARD-CAPACITY
 *
 * Runs the real sequential production solve ladder under a deterministic whole-solve work cap.
 * Research-only observers read phase-conditioned distance and the connectivity reached set; solver
 * decisions never read observer output. A generous wall deadline is a safety cap only, and
 * deadline-truncated/error rows remain explicit censoring rather than becoming negative evidence.
 *
 * Usage:
 *   npm run solver:parity-invariant-shadow -- --work-budget=5000000 --budget-ms=600000
 *   npm run solver:parity-invariant-shadow -- --corpus=data/stress/stress-levels.json --levels=R00001,R00002 --work-budget=5000000
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execSync } from 'node:child_process';

import { keyParity } from '../../modules/domain/cell-key.js';
import { buildResearchResolutionEnvelope } from '../research-resolution-envelope-lib.mjs';
import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { selectLevelsBySpec } from '../level-data-io.mjs';

const PHASE_QUESTION_ID = 'WS2-PARITY-PHASE-DISTANCE';
const CAPACITY_QUESTION_ID = 'WS2-CHECKERBOARD-CAPACITY';

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
const totals = {
    selected: selected.length,
    phaseEligibleLevels: 0,
    capacityEligibleLevels: 0,
    phaseLevelsWithRecords: 0,
    capacityLevelsWithRecords: 0,
    phaseEvaluations: 0,
    phaseHeadroomEvaluations: 0,
    scalarDistanceRejects: 0,
    phaseDistanceRejects: 0,
    incrementalPhaseRejects: 0,
    capacityEvaluations: 0,
    capacityHeadroomEvaluations: 0,
    scalarVolumeRejects: 0,
    parityCapacityRejects: 0,
    incrementalParityRejects: 0,
};

for (const entry of selected) {
    const { id, stressMeta, ...raw } = entry;
    const level = Solver.prepareLevelForSolver(raw, { source: 'raw' });
    const eligiblePhase = hasTwistPortal(level);
    const eligibleCapacity = !eligiblePhase;
    if (eligiblePhase) totals.phaseEligibleLevels++;
    if (eligibleCapacity) totals.capacityEligibleLevels++;

    const counts = {
        phaseEvaluations: 0,
        phaseHeadroomEvaluations: 0,
        scalarDistanceRejects: 0,
        phaseDistanceRejects: 0,
        incrementalPhaseRejects: 0,
        capacityEvaluations: 0,
        capacityHeadroomEvaluations: 0,
        scalarVolumeRejects: 0,
        parityCapacityRejects: 0,
        incrementalParityRejects: 0,
    };
    const phaseExamples = [];
    const capacityExamples = [];

    const phaseObserver = {
        observe(record) {
            counts.phaseEvaluations++;
            if (!record.scalarDistanceWouldReject) counts.phaseHeadroomEvaluations++;
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
            if (!record.totalVolumeWouldReject) counts.capacityHeadroomEvaluations++;
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
            generationBatch: stressMeta?.generationBatch ?? null,
            eligiblePhase,
            eligibleCapacity,
            status: 'error',
            deadlineTruncated: false,
            error: error?.message ?? String(error),
            elapsedMs: Date.now() - started,
            ...counts,
            phaseExamples,
            capacityExamples,
        });
        console.log(`${id ?? '?'}: ERROR — ${error?.message ?? String(error)}`);
        continue;
    }

    if (counts.phaseEvaluations > 0) totals.phaseLevelsWithRecords++;
    if (counts.capacityEvaluations > 0) totals.capacityLevelsWithRecords++;
    for (const key of [
        'phaseEvaluations', 'phaseHeadroomEvaluations', 'scalarDistanceRejects',
        'phaseDistanceRejects', 'incrementalPhaseRejects', 'capacityEvaluations',
        'capacityHeadroomEvaluations', 'scalarVolumeRejects', 'parityCapacityRejects',
        'incrementalParityRejects',
    ]) totals[key] += counts[key];

    rows.push({
        id: String(id ?? ''),
        generationBatch: stressMeta?.generationBatch ?? null,
        eligiblePhase,
        eligibleCapacity,
        status: result.status,
        ok: !!result.ok,
        deadlineTruncated: !!result.deadlineTruncated,
        workSpent: result.workSpent ?? null,
        elapsedMs: Date.now() - started,
        ...counts,
        phaseExamples,
        capacityExamples,
    });
    console.log(
        `${id ?? '?'}: phase=${counts.incrementalPhaseRejects}/${counts.phaseEvaluations} ` +
        `capacity=${counts.incrementalParityRejects}/${counts.capacityEvaluations} ` +
        `${result.deadlineTruncated ? 'DEADLINE-TRUNCATED' : result.status}`,
    );
}

const eligibleRows = (kind) => rows.filter(row => kind === 'phase' ? row.eligiblePhase : row.eligibleCapacity);
const completedEligible = (kind) => eligibleRows(kind).filter(row => row.status !== 'error' && !row.deadlineTruncated).length;
const censoredEligible = (kind) => eligibleRows(kind).filter(row => row.status === 'error' || row.deadlineTruncated).length;

const axis = (status, reason, evidence) => ({
    status,
    ...(reason ? { reason } : {}),
    ...(evidence != null ? { evidence } : {}),
});

const sharedFidelity = axis(
    'satisfied',
    'real sequential production solveLevel ladder; no ablation/profile changes; strict whole-solve work cap',
    { workBudget, wallDeadlineMs: budgetMs, strictTotalWorkBudget: true },
);
const sharedMeasurementSupport = axis(
    'satisfied',
    'observers sit on the exact production decision seams and have synthetic incremental witnesses in solver tests',
);

const phaseResolution = buildResearchResolutionEnvelope({
    questionId: PHASE_QUESTION_ID,
    liveRivals: [
        'phase-conditioned distance has material incremental decision-bearing opportunity',
        'scalar distance plus current parity handling already captures practically all opportunity at this seam',
    ],
    discriminatingObservable: 'incrementalPhaseReject=true while scalarDistanceWouldReject=false at the real distance-prune seam',
    requiredAxes: ['eligibility', 'opportunity', 'reach', 'participation', 'measurementSupport', 'fidelity', 'coverage', 'censoring'],
    axes: {
        eligibility: axis(
            totals.phaseEligibleLevels > 0 ? 'satisfied' : 'blocked',
            totals.phaseEligibleLevels > 0 ? 'twist-bearing levels are present' : 'no twist-bearing levels selected',
            { eligibleLevels: totals.phaseEligibleLevels, selectedLevels: totals.selected },
        ),
        opportunity: axis(
            totals.phaseHeadroomEvaluations > 0 ? 'satisfied' : 'blocked',
            totals.phaseHeadroomEvaluations > 0
                ? 'scalar distance passed on observed phase evaluations, so the conditioned bound had room to disagree'
                : 'no observed phase evaluation survived scalar distance',
            { headroomEvaluations: totals.phaseHeadroomEvaluations },
        ),
        reach: axis(
            totals.phaseLevelsWithRecords > 0 ? 'satisfied' : 'blocked',
            totals.phaseLevelsWithRecords > 0 ? 'phase observer reached at least one eligible solve' : 'phase observer produced no records',
            { levelsWithRecords: totals.phaseLevelsWithRecords },
        ),
        participation: axis(
            totals.phaseEvaluations > 0 ? 'satisfied' : 'blocked',
            totals.phaseEvaluations > 0 ? 'phase-conditioned distance was evaluated' : 'zero phase evaluations',
            { evaluations: totals.phaseEvaluations },
        ),
        measurementSupport: sharedMeasurementSupport,
        fidelity: sharedFidelity,
        coverage: axis(
            completedEligible('phase') === totals.phaseEligibleLevels ? 'satisfied' : 'blocked',
            completedEligible('phase') === totals.phaseEligibleLevels
                ? 'all eligible selected levels completed without deadline/error'
                : 'some eligible selected levels did not complete cleanly',
            { completedEligible: completedEligible('phase'), eligibleLevels: totals.phaseEligibleLevels },
        ),
        censoring: axis(
            censoredEligible('phase') === 0 ? 'satisfied' : 'blocked',
            censoredEligible('phase') === 0 ? 'no eligible phase rows were deadline-truncated or errors' : 'eligible phase rows were censored',
            { censoredEligible: censoredEligible('phase') },
        ),
    },
    negativeInterpretationPolicy: 'A near-zero incremental incidence is interpretable only when every required observability axis is satisfied; otherwise the result is observability-blocked, not a clean negative.',
    outcomeInterpretation: {
        positive: 'non-trivial incremental incidence nominates stored-prefix replay, differential soundness checking, then the smallest consumer',
        negative: 'near-zero incremental incidence with a resolution-ready envelope stops this static conditioned-distance form',
        indeterminate: 'any blocked required axis prevents a negative interpretation',
    },
    source: { corpus: corpusFile, levelSpec: levelSpec ?? 'all', solverRef: getCommitSha() },
});

const capacityResolution = buildResearchResolutionEnvelope({
    questionId: CAPACITY_QUESTION_ID,
    liveRivals: [
        'checkerboard-split reachable capacity has material incremental decision-bearing opportunity',
        'scalar connectivity volume already captures practically all opportunity at this seam',
    ],
    discriminatingObservable: 'incrementalParityReject=true while totalVolumeWouldReject=false at the real connectivity-volume seam',
    requiredAxes: ['eligibility', 'opportunity', 'reach', 'participation', 'measurementSupport', 'fidelity', 'coverage', 'censoring'],
    axes: {
        eligibility: axis(
            totals.capacityEligibleLevels > 0 ? 'satisfied' : 'blocked',
            totals.capacityEligibleLevels > 0 ? 'zero-twist levels are present' : 'no zero-twist levels selected',
            { eligibleLevels: totals.capacityEligibleLevels, selectedLevels: totals.selected },
        ),
        opportunity: axis(
            totals.capacityHeadroomEvaluations > 0 ? 'satisfied' : 'blocked',
            totals.capacityHeadroomEvaluations > 0
                ? 'scalar volume passed on observed connectivity evaluations, so color capacity had room to disagree'
                : 'no observed capacity evaluation survived scalar volume',
            { headroomEvaluations: totals.capacityHeadroomEvaluations },
        ),
        reach: axis(
            totals.capacityLevelsWithRecords > 0 ? 'satisfied' : 'blocked',
            totals.capacityLevelsWithRecords > 0 ? 'capacity observer reached at least one eligible solve' : 'capacity observer produced no records',
            { levelsWithRecords: totals.capacityLevelsWithRecords },
        ),
        participation: axis(
            totals.capacityEvaluations > 0 ? 'satisfied' : 'blocked',
            totals.capacityEvaluations > 0 ? 'checkerboard capacity was evaluated' : 'zero capacity evaluations',
            { evaluations: totals.capacityEvaluations },
        ),
        measurementSupport: sharedMeasurementSupport,
        fidelity: sharedFidelity,
        coverage: axis(
            completedEligible('capacity') === totals.capacityEligibleLevels ? 'satisfied' : 'blocked',
            completedEligible('capacity') === totals.capacityEligibleLevels
                ? 'all eligible selected levels completed without deadline/error'
                : 'some eligible selected levels did not complete cleanly',
            { completedEligible: completedEligible('capacity'), eligibleLevels: totals.capacityEligibleLevels },
        ),
        censoring: axis(
            censoredEligible('capacity') === 0 ? 'satisfied' : 'blocked',
            censoredEligible('capacity') === 0 ? 'no eligible capacity rows were deadline-truncated or errors' : 'eligible capacity rows were censored',
            { censoredEligible: censoredEligible('capacity') },
        ),
    },
    negativeInterpretationPolicy: 'A near-zero incremental incidence is interpretable only when every required observability axis is satisfied; otherwise the result is observability-blocked, not a clean negative.',
    outcomeInterpretation: {
        positive: 'non-trivial incremental incidence nominates stored-prefix replay, differential soundness checking, then the smallest consumer',
        negative: 'near-zero incremental incidence with a resolution-ready envelope stops this checkerboard-capacity form',
        indeterminate: 'any blocked required axis prevents a negative interpretation',
    },
    source: { corpus: corpusFile, levelSpec: levelSpec ?? 'all', solverRef: getCommitSha() },
});

const report = {
    schema: 'pathfinder.parity-invariant-shadow/v2',
    createdAt: new Date().toISOString(),
    solverRef: getCommitSha(),
    questionIds: [PHASE_QUESTION_ID, CAPACITY_QUESTION_ID],
    protocol: {
        corpus: corpusFile,
        levelSpec: levelSpec ?? 'all',
        workBudget,
        wallDeadlineMs: budgetMs,
        strictTotalWorkBudget: true,
        solverPath: 'real sequential production solveLevel ladder under one strict whole-solve work cap',
        observerEffect: 'phase observer reads the precomputed conditioned map at the distance seam; capacity observer scans the already-computed reached set. Neither observer output is consumed by solver policy and no observer work is charged as canonical search work.',
    },
    resolutions: [phaseResolution, capacityResolution],
    totals,
    rows,
};

mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
writeFileSync(path.resolve(outFile), `${JSON.stringify(report, null, 2)}\n`);
console.log(
    `Wrote ${outFile}: phase ${totals.incrementalPhaseRejects}/${totals.phaseEvaluations} incremental; ` +
    `capacity ${totals.incrementalParityRejects}/${totals.capacityEvaluations} incremental.`,
);
