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
import { buildResearchResolutionEnvelope } from './research-resolution-envelope-lib.mjs';

const args = new Map(process.argv.slice(2).filter(arg => arg.startsWith('--') && arg.includes('=')).map(arg => {
    const i = arg.indexOf('=');
    return [arg.slice(2, i), arg.slice(i + 1)];
}));
const input = args.get('in');
const sampleFile = args.get('sample')
    || 'reports/stress/failure-evidence/reserve-starvation-default-profile-sample-2026-09-19.json';
const outFile = args.get('out') || null;
const reserveNodes = Number(args.get('reserve-nodes') || 75_000_000);
const totalNodes = Number(args.get('total-nodes') || 300_000_000);
const expectedAction = args.get('action') || 'admissible-order|tieBreak=default|lds=off';

if (!input) {
    console.error('Usage: node scripts/analyze-reserve-starvation-probe.mjs --in=<compact-failure-response.json> [--sample=<frozen-sample.json>] [--out=<result.json>]');
    process.exit(2);
}
if (!Number.isFinite(reserveNodes) || !Number.isFinite(totalNodes) || reserveNodes < 0 || totalNodes <= reserveNodes) {
    throw new Error('reserve/total node thresholds must satisfy 0 <= reserve < total');
}

const document = validateFailureResponseDocument(JSON.parse(fs.readFileSync(input, 'utf8')));
const sample = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
const expectedIds = [...new Set(sample.ids ?? [])].map(String).sort();
if (!expectedIds.length) throw new Error('frozen sample has no ids');
const resolutionDesign = sample.resolutionDesign;
if (!resolutionDesign || typeof resolutionDesign !== 'object' || Array.isArray(resolutionDesign)) {
    throw new Error('frozen sample is missing resolutionDesign');
}

const recordsByParent = new Map();
for (const row of document.records) {
    const parentId = String(row.parentId ?? row.levelId ?? row.identity ?? '');
    if (!parentId) continue;
    const list = recordsByParent.get(parentId) ?? [];
    list.push(row);
    recordsByParent.set(parentId, list);
}
const duplicateParents = [...recordsByParent].filter(([, rows]) => rows.length !== 1).map(([id]) => id).sort();
const observedIds = [...recordsByParent.keys()].sort();
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
const decisionReady = protocolKnown
    && solverKnown
    && missingIds.length === 0
    && unexpectedIds.length === 0
    && duplicateParents.length === 0
    && abstentionIds.length === 0
    && rows.length === expectedIds.length;

const opportunities = bucketCounts['reserve-starvation-opportunity'] ?? 0;
let decision = 'recover-incomplete-or-censored';
if (decisionReady) {
    if (opportunities === 0) decision = 'close-first-recurrence-screen-negative';
    else if (opportunities === 1) decision = 'freeze-additional-disjoint-40';
    else decision = 'design-smallest-matched-total-work-reserve-ab';
}

const exactActionKnown = rows.every(row => !['abstain-action-unknown', 'abstain-action-mismatch'].includes(row.bucket));
const coverageComplete = missingIds.length === 0
    && unexpectedIds.length === 0
    && duplicateParents.length === 0
    && rows.length === expectedIds.length;
const censoringClear = abstentionIds.length === 0;
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
            status: exactActionKnown ? 'satisfied' : 'blocked',
            reason: exactActionKnown
                ? 'every interpretable row identifies the exact prespecified admissible-order action'
                : 'one or more rows lack or mismatch the prespecified action identity',
        },
        measurementSupport: {
            status: rows.every(row => row.decisionEligible) ? 'satisfied' : 'unknown',
            reason: rows.every(row => row.decisionEligible)
                ? 'node-cost/terminal observations support the prespecified 75M/300M classification'
                : 'one or more rows do not support the prespecified cost classification',
        },
        coverage: {
            status: coverageComplete ? 'satisfied' : 'blocked',
            reason: coverageComplete
                ? 'the frozen population is present exactly once'
                : 'missing, unexpected, or duplicate parents prevent complete recurrence sizing',
        },
        censoring: {
            status: censoringClear ? 'satisfied' : 'blocked',
            reason: censoringClear
                ? 'no row is censored or otherwise abstaining'
                : 'censored/unknown rows must be recovered before applying the 0/1/>=2 rule',
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

const result = {
    schemaVersion: 1,
    kind: 'pathfinder-reserve-starvation-probe-analysis',
    questionId: sample.questionId ?? 'WS2-ADMISSIBLE-ORDER-RESERVE-STARVATION',
    source: { input, sample: sampleFile, protocolHash: document.protocolHash ?? null, solverRef: document.solverRef ?? null },
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
