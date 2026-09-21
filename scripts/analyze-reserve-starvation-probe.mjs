#!/usr/bin/env node
/**
 * Prespecified reducer for reports/2026-09-19-admissible-order-reserve-starvation-prospective-preflight-001.md.
 *
 * Reads one standard compact failure-response document and the frozen sample artifact. It never
 * selects rows from outcomes and refuses to apply the 0/1/>=2 decision rule while any expected
 * parent is missing, protocol identity is unknown, or a row is censored/otherwise non-interpretable.
 */
import fs from 'node:fs';
import path from 'node:path';

import { validateFailureResponseDocument } from './solver-failure-response-lib.mjs';
import { groupResearchObservationsByUnit } from './research-observation-integrity-lib.mjs';
import { buildResearchResolutionEnvelope } from './research-resolution-envelope-lib.mjs';
import { validateResearchIndependenceVector } from './research-independence-vector-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const i = arg.indexOf('=');
    return [arg.slice(2, i), arg.slice(i + 1)];
}));
const input = args.get('in');
const sampleFile = args.get('sample')
    || 'reports/stress/failure-evidence/reserve-starvation-default-profile-sample-2026-09-19.json';
const outFile = args.get('out') || null;

if (!input) {
    console.error('Usage: node scripts/analyze-reserve-starvation-probe.mjs --in=<compact-failure-response.json> [--sample=<frozen-sample.json>] [--out=<result.json>]');
    process.exit(2);
}
const document = validateFailureResponseDocument(JSON.parse(fs.readFileSync(input, 'utf8')));
const sample = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
const probeDesign = sample.probeDesign;
if (!probeDesign || typeof probeDesign !== 'object' || Array.isArray(probeDesign)) {
    throw new Error('frozen sample is missing probeDesign');
}
const reserveNodes = Number(probeDesign.reserveNodes);
const totalNodes = Number(probeDesign.totalNodes);
const expectedAction = String(probeDesign.expectedAction ?? '');
if (!Number.isFinite(reserveNodes) || !Number.isFinite(totalNodes) || reserveNodes < 0 || totalNodes <= reserveNodes) {
    throw new Error('sample.probeDesign node thresholds must satisfy 0 <= reserve < total');
}
if (!expectedAction) throw new Error('sample.probeDesign.expectedAction is required');

for (const [argName, frozenValue] of [
    ['reserve-nodes', reserveNodes],
    ['total-nodes', totalNodes],
    ['action', expectedAction],
]) {
    if (!args.has(argName)) continue;
    const supplied = argName === 'action' ? args.get(argName) : Number(args.get(argName));
    if (supplied !== frozenValue) {
        throw new Error(`--${argName} disagrees with frozen sample probeDesign`);
    }
}
const expectedIds = [...new Set(sample.ids ?? [])].map(String).sort();
if (!expectedIds.length) throw new Error('frozen sample has no ids');
const resolutionDesign = sample.resolutionDesign;
if (!resolutionDesign || typeof resolutionDesign !== 'object' || Array.isArray(resolutionDesign)) {
    throw new Error('frozen sample is missing resolutionDesign');
}
const independenceDesign = validateResearchIndependenceVector(sample.independenceDesign, {
    path: 'sample.independenceDesign',
});

const parentGrouping = groupResearchObservationsByUnit(
    document.records,
    row => row.parentId ?? row.levelId ?? row.identity ?? null,
);
const recordsByParent = parentGrouping.groups;
const duplicateParents = parentGrouping.repeatedUnitIds;
const observedIds = parentGrouping.unitIds;
const expectedSet = new Set(expectedIds);
const missingIds = expectedIds.filter(id => !recordsByParent.has(id));
const unexpectedIds = observedIds.filter(id => !expectedSet.has(id));

function attemptActionSupport(row) {
    const attempts = Array.isArray(row.attempts) ? row.attempts : [];
    const known = attempts.map(attempt => attempt.actionKey ?? attempt.configKey).filter(Boolean);
    if (known.length === 0) return 'unknown';
    return known.every(action => action === expectedAction) ? 'match' : 'mismatch';
}

function classify(row) {
    const nodes = Number.isFinite(row.nodesExpanded) ? row.nodesExpanded : null;
    if (row.refereeInvalid === true) return { bucket: 'abstain-referee-invalid', decisionEligible: false };
    if (row.deadlineTruncated === true || row.outcome === 'deadlineTruncated') {
        return { bucket: 'abstain-deadline', decisionEligible: false };
    }
    if (row.error != null || row.outcome === 'harnessError' || row.outcome === 'malformed' || row.outcome === 'missing' || row.outcome === 'unknown') {
        return { bucket: 'abstain-error-or-unknown', decisionEligible: false };
    }
    const actionSupport = attemptActionSupport(row);
    if (actionSupport === 'unknown') return { bucket: 'abstain-action-unknown', decisionEligible: false };
    if (actionSupport === 'mismatch') return { bucket: 'abstain-action-mismatch', decisionEligible: false };
    if (nodes != null && nodes <= 0) return { bucket: 'abstain-zero-participation', decisionEligible: false };
    if (row.outcome === 'workLimited' || row.workCapped === true) {
        return { bucket: 'abstain-unexpected-work-censor', decisionEligible: false };
    }
    if (row.outcome === 'solved') {
        if (nodes == null) return { bucket: 'abstain-solved-without-nodes', decisionEligible: false };
        if (nodes <= reserveNodes) return { bucket: 'solved-within-current-reserve', decisionEligible: true };
        if (nodes <= totalNodes) return { bucket: 'reserve-starvation-opportunity', decisionEligible: true };
        return { bucket: 'abstain-solve-over-total-envelope', decisionEligible: false };
    }
    if (row.outcome === 'exhaustedNegative' || row.exhausted === true) {
        return { bucket: 'no-solve-natural-exhaustion', decisionEligible: true };
    }
    if (row.outcome === 'nodeLimited' || row.nodeCapped === true) {
        const ceiling = Number.isFinite(row.nodeCeiling) ? row.nodeCeiling : null;
        if ((ceiling != null && ceiling >= totalNodes) || (nodes != null && nodes >= totalNodes)) {
            return { bucket: 'no-solve-at-total-node-envelope', decisionEligible: true };
        }
        return { bucket: 'abstain-node-censored-below-total', decisionEligible: false };
    }
    return { bucket: 'abstain-unclassified', decisionEligible: false };
}

const rows = expectedIds.filter(id => recordsByParent.has(id) && recordsByParent.get(id).length === 1).map(id => {
    const record = recordsByParent.get(id)[0];
    return { parentId: id, nodesExpanded: record.nodesExpanded ?? null, outcome: record.outcome, ...classify(record) };
});
const bucketCounts = {};
for (const row of rows) bucketCounts[row.bucket] = (bucketCounts[row.bucket] ?? 0) + 1;

const abstentionIds = rows.filter(row => !row.decisionEligible).map(row => row.parentId).sort();
const protocolKnown = typeof document.protocolHash === 'string' && document.protocolHash.length > 0;
const solverKnown = typeof document.solverRef === 'string' && document.solverRef.length > 0;
const baseDecisionReady = protocolKnown
    && solverKnown
    && missingIds.length === 0
    && unexpectedIds.length === 0
    && duplicateParents.length === 0
    && abstentionIds.length === 0
    && rows.length === expectedIds.length;

const opportunities = bucketCounts['reserve-starvation-opportunity'] ?? 0;

const fidelityBlockers = rows
    .filter(row => ['abstain-action-unknown', 'abstain-action-mismatch'].includes(row.bucket))
    .map(row => row.parentId);
const participationBlockers = rows
    .filter(row => row.bucket === 'abstain-zero-participation')
    .map(row => row.parentId);
const measurementSupportBlockers = rows
    .filter(row => ['abstain-solved-without-nodes', 'abstain-unclassified'].includes(row.bucket))
    .map(row => row.parentId);
const censoringBlockers = rows
    .filter(row => [
        'abstain-deadline',
        'abstain-error-or-unknown',
        'abstain-unexpected-work-censor',
        'abstain-node-censored-below-total',
        'abstain-solve-over-total-envelope',
        'abstain-referee-invalid',
    ].includes(row.bucket))
    .map(row => row.parentId);
const coverageComplete = missingIds.length === 0
    && unexpectedIds.length === 0
    && duplicateParents.length === 0
    && rows.length === expectedIds.length;
const sourceBoundaryEligible = sample?.sourceBoundary?.residual > 0
    && sample?.selection?.eligibleCount >= expectedIds.length;
const resolution = buildResearchResolutionEnvelope({
    questionId: sample.questionId ?? 'WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION',
    liveRivals: resolutionDesign.liveRivals,
    discriminatingObservable: resolutionDesign.discriminatingObservable,
    requiredAxes: resolutionDesign.requiredAxes,
    axes: {
        eligibility: {
            status: protocolKnown && solverKnown ? 'satisfied' : 'blocked',
            reason: protocolKnown && solverKnown
                ? 'protocol and solver identities are known'
                : 'protocol and solver identities must be known before recurrence interpretation',
        },
        opportunity: {
            status: sourceBoundaryEligible ? 'satisfied' : 'unknown',
            reason: sourceBoundaryEligible
                ? 'frozen sample is drawn from the current unsolved residual after discovery exclusions'
                : 'sample source boundary does not establish residual headroom',
        },
        reach: {
            status: 'not-required',
            reason: 'the isolated method probe has no separate downstream stage-reach gate',
        },
        participation: {
            status: participationBlockers.length === 0 ? 'satisfied' : 'blocked',
            reason: participationBlockers.length === 0
                ? 'every interpretable isolated action performs nonzero node work'
                : `zero-work execution on: ${participationBlockers.join(', ')}`,
        },
        measurementSupport: {
            status: measurementSupportBlockers.length === 0 ? 'satisfied' : 'blocked',
            reason: measurementSupportBlockers.length === 0
                ? 'reported node-cost/terminal fields support the prespecified 75M/300M classification when execution is uncensored'
                : `unsupported cost classification on: ${measurementSupportBlockers.join(', ')}`,
        },
        fidelity: {
            status: fidelityBlockers.length === 0 ? 'satisfied' : 'blocked',
            reason: fidelityBlockers.length === 0
                ? 'every observed row identifies the exact prespecified admissible-order action/config'
                : `missing/mismatched prespecified action identity on: ${fidelityBlockers.join(', ')}`,
        },
        coverage: {
            status: coverageComplete ? 'satisfied' : 'blocked',
            reason: coverageComplete
                ? 'the frozen population is present exactly once'
                : 'missing, unexpected, or duplicate parents prevent complete recurrence sizing',
        },
        censoring: {
            status: censoringBlockers.length === 0 ? 'satisfied' : 'blocked',
            reason: censoringBlockers.length === 0
                ? 'no row is deadline/work/node/error/referee censored for the recurrence interpretation'
                : `censored/indeterminate execution on: ${censoringBlockers.join(', ')}`,
        },
    },
    negativeInterpretationPolicy: resolutionDesign.negativeInterpretationPolicy,
    outcomeInterpretation: resolutionDesign.outcomeInterpretation,
    source: {
        kind: 'reserve-starvation-probe',
        sample: sampleFile,
        reserveNodes,
        totalNodes,
        expectedAction,
    },
});

const decisionReady = baseDecisionReady && resolution.resolutionStatus === 'resolution-ready';
let decision = 'recover-incomplete-or-censored';
if (decisionReady) {
    if (opportunities === 0) decision = 'close-first-recurrence-screen-negative';
    else if (opportunities === 1) decision = 'freeze-additional-disjoint-40';
    else decision = 'design-smallest-matched-total-work-reserve-ab';
}

const result = {
    schemaVersion: 1,
    kind: 'pathfinder-reserve-starvation-probe-analysis',
    questionId: sample.questionId ?? 'WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION',
    source: { input, sample: sampleFile, protocolHash: document.protocolHash ?? null, solverRef: document.solverRef ?? null },
    independenceVector: independenceDesign,
    thresholds: { reserveNodes, totalNodes, expectedAction },
    population: {
        expected: expectedIds.length,
        observedUniqueParents: observedIds.length,
        missingIds,
        unexpectedIds,
        duplicateParents,
        abstentionIds,
    },
    bucketCounts,
    opportunities,
    decisionReady,
    decision,
    resolution,
    rows,
    interpretation: 'Isolated find-cost recurrence only. A positive screen nominates a matched-total-work allocation A/B; it does not authorize a reserve change.',
};
const text = JSON.stringify(result, null, 2) + '\n';
if (outFile) {
    fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    fs.writeFileSync(outFile, text);
} else {
    process.stdout.write(text);
}
