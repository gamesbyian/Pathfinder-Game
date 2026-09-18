#!/usr/bin/env node
/**
 * Offline exact D1 annotator for a frozen production-decision capture.
 *
 * Search is already over when this command runs. It cannot change ranking or retention.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';

import { installBrowserStubs } from '../test-lib/browser-stubs.mjs';
import { createSolver, SOLVER_TESTING_API } from '../../modules/solver.js';
import { captureSolverGitState } from '../experiment-manifest-lib.mjs';
import { classifyProbeProcess, parseEmittedPath } from './cpsat-explicit-prefix-reference-lib.mjs';
import {
    candidateRevisitCells,
    classifyD1CandidateQueryResults,
    summarizeD1AnnotatedDecisions,
} from './d1-production-observation-lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
    const hit = argv.find(value => value.startsWith(`--${name}=`));
    return hit === undefined ? fallback : hit.slice(name.length + 3);
};
const inputFile = arg('input', null);
const outFile = arg('out', null);
const timeLimitSec = Number(arg('time-limit', 45));
const maxEligibleDecisionsRaw = arg('max-eligible-decisions', null);
const maxEligibleDecisions = maxEligibleDecisionsRaw == null ? Number.POSITIVE_INFINITY : Number(maxEligibleDecisionsRaw);

if (!inputFile || !outFile) throw new Error('--input and --out are required');
if (!Number.isFinite(timeLimitSec) || timeLimitSec <= 0) throw new Error('--time-limit must be positive');
if (maxEligibleDecisions !== Number.POSITIVE_INFINITY
    && (!Number.isInteger(maxEligibleDecisions) || maxEligibleDecisions <= 0)) {
    throw new Error('--max-eligible-decisions must be a positive integer');
}

installBrowserStubs();
const Solver = createSolver();
const { prepLevel } = SOLVER_TESTING_API;
const solver = captureSolverGitState();

const inputBytes = readFileSync(path.resolve(ROOT, inputFile));
const capture = JSON.parse(inputBytes);
if (capture.kind !== 'd1-production-inert-decision-capture') throw new Error('input is not a D1 production decision capture');
if (capture.evidenceRole === 'independent-confirmation' && Number.isFinite(maxEligibleDecisions)) {
    throw new Error('independent-confirmation may not cap eligible decisions after the capture is frozen');
}
const corpusDoc = JSON.parse(readFileSync(path.resolve(ROOT, capture.corpus), 'utf8'));
const corpusRows = Array.isArray(corpusDoc) ? corpusDoc : corpusDoc.levels;
const byId = new Map(corpusRows.map(row => [String(row.id), row]));

const unpack = key => [((key & 0xffff) + 1), (((key >>> 16) & 0xffff) + 1)];
const pack = ([x, y]) => (((x - 1) & 0xffff) | (((y - 1) & 0xffff) << 16));

const levelCache = new Map();
function getLevel(parentId) {
    if (levelCache.has(parentId)) return levelCache.get(parentId);
    const raw = byId.get(String(parentId));
    if (!raw) throw new Error(`parent ${parentId} missing from ${capture.corpus}`);
    const { id: _id, stressMeta: _stressMeta, ...rawLevel } = raw;
    const level = Solver.prepareLevelForSolver(rawLevel, { source: 'raw' });
    const prep = prepLevel(level);
    prep._cfg = null;
    const pair = { level, prep };
    levelCache.set(parentId, pair);
    return pair;
}

const annotated = [];
let eligibleSeen = 0;
for (const decision of capture.decisions ?? []) {
    const eligibility = decision.context?.d1Eligibility;
    if (!eligibility?.eligible) {
        annotated.push(decision);
        continue;
    }
    eligibleSeen++;
    if (eligibleSeen > maxEligibleDecisions) {
        annotated.push({
            ...decision,
            annotation: {
                support: 'UNKNOWN',
                d1: { reason: 'development-canary-cap', candidateResults: [] },
            },
        });
        continue;
    }

    const { level, prep } = getLevel(decision.parentId);
    const candidateResults = [];
    for (const candidateId of eligibility.eligibleCandidateIds ?? []) {
        const candidatePath = JSON.parse(candidateId);
        const revisitCells = candidateRevisitCells(candidatePath, level, prep);
        const outcomes = [];
        const started = performance.now();
        for (const cell of revisitCells) {
            const prefix = candidatePath.map(unpack);
            const pin = unpack(cell);
            const result = spawnSync('python3', [
                'scripts/stress/cpsat-reference-probe.py',
                String(decision.parentId),
                String(timeLimitSec),
                '--emit-path',
                `--corpus=${capture.corpus}`,
                `--prefix=${JSON.stringify(prefix)}`,
                `--pin-revisit=${JSON.stringify([pin])}`,
            ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
            const exitCode = result.status ?? (result.error ? -1 : 0);
            const classified = classifyProbeProcess({
                stdout: result.stdout ?? '',
                stderr: result.stderr ?? '',
                exitCode,
            });
            if (classified.label === 'live') {
                const emitted = parseEmittedPath(result.stdout ?? '');
                let refereeValid = false;
                let refereeReason = 'missing-emitted-path';
                if (emitted) {
                    const verdict = Solver.validateCandidatePath(level, emitted.map(pack));
                    refereeValid = verdict.ok;
                    refereeReason = verdict.ok ? null : verdict.reason;
                }
                outcomes.push({ cell, pin, label: 'live', refereeValid, refereeReason });
                if (refereeValid) break;
            } else if (classified.label === 'dead') {
                outcomes.push({ cell, pin, label: 'dead' });
            } else {
                outcomes.push({ cell, pin, label: 'unknown', reason: 'cpsat-timeout-or-abstain' });
            }
        }
        const informationCostMs = performance.now() - started;
        const classified = classifyD1CandidateQueryResults({
            candidateCount: revisitCells.length,
            outcomes,
        });
        candidateResults.push({
            candidateId,
            rank: eligibility.candidates?.find(row => row.candidateId === candidateId)?.rank ?? null,
            retained: eligibility.candidates?.find(row => row.candidateId === candidateId)?.retained ?? null,
            revisitCandidateCount: revisitCells.length,
            ...classified,
            informationCostMs,
            outcomes,
        });
    }

    const support = candidateResults.every(row => row.support === 'SUPPORTED')
        ? 'SUPPORTED'
        : candidateResults.some(row => row.support === 'SUPPORTED') ? 'UNKNOWN' : 'UNKNOWN';
    annotated.push({
        ...decision,
        observerCost: candidateResults.reduce((sum, row) => sum + row.informationCostMs, 0),
        annotation: {
            support,
            d1: {
                semantics: 'NONZERO means at least one individually pinned revisit remains exactly feasible; ZERO means every eligible pinned revisit is exactly infeasible; UNKNOWN is neutral',
                candidateResults,
            },
        },
    });
}

const result = {
    schemaVersion: 1,
    kind: 'd1-production-inert-decision-annotation',
    generatedAt: new Date().toISOString(),
    solver,
    sourceCapture: inputFile,
    sourceCaptureSha256: createHash('sha256').update(inputBytes).digest('hex'),
    evidenceRole: capture.evidenceRole,
    independentUnit: capture.independentUnit,
    annotationBoundary: 'exact D1 queries run only after production decisions and D1 eligibility were frozen',
    query: { timeLimitSec, maxEligibleDecisions: Number.isFinite(maxEligibleDecisions) ? maxEligibleDecisions : null },
    captureSummary: capture.summary,
    decisions: annotated,
    summary: summarizeD1AnnotatedDecisions(annotated),
};

const absolute = path.resolve(ROOT, outFile);
mkdirSync(path.dirname(absolute), { recursive: true });
writeFileSync(absolute, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ out: outFile, ...result.summary }, null, 2));
