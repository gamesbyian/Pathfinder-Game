#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    classifyFailureEvidenceApplicability,
    failureEvidenceDependencyStratum,
    summarizeFailureEvidenceApplicability,
} from './failure-evidence-semantics-lib.mjs';

const document = {
    protocolHash: 'proto',
    solverRef: 'solver',
    populationIntegrity: { coverageComplete: true, decisionValidComplete: false },
    records: [
        {
            identity: 'A-1', parentId: 'A', runId: 'run-1', outcome: 'workLimited',
            actionKey: 'beam', stageId: 'beam-main',
        },
        {
            identity: 'A-2', parentId: 'A', runId: 'run-2', outcome: 'exhaustedNegative',
            actionKey: 'beam', stageId: 'beam-main',
        },
        {
            identity: 'B-1', parentId: 'B', runId: 'run-1', outcome: 'harnessError',
            actionKey: 'dfs', stageId: 'dfs-main',
        },
    ],
};

assert.equal(failureEvidenceDependencyStratum(document, document.records[0]), 'parent:A');
assert.equal(failureEvidenceDependencyStratum(document, document.records[1]), 'parent:A',
    'repeated runs on one parent remain one conservative support stratum');

assert.deepEqual(
    classifyFailureEvidenceApplicability(document, document.records[0], 'forensic'),
    { applicability: 'admissible', reason: 'recorded-execution-observation' },
);

assert.deepEqual(
    classifyFailureEvidenceApplicability(document, document.records[2], 'mechanism-nomination'),
    { applicability: 'inadmissible', reason: 'infrastructure-or-malformed-outcome' },
);

assert.deepEqual(
    classifyFailureEvidenceApplicability(document, document.records[0], 'longitudinal-process'),
    { applicability: 'context-bound', reason: 'comparison-regime-not-specified' },
);
assert.deepEqual(
    classifyFailureEvidenceApplicability(document, document.records[0], 'longitudinal-process', {
        comparableProtocolHashes: ['proto'],
        comparableSolverRefs: ['solver'],
    }),
    { applicability: 'admissible', reason: 'matching-comparable-run-regime' },
);

assert.deepEqual(
    classifyFailureEvidenceApplicability(document, document.records[0], 'population-prevalence'),
    { applicability: 'context-bound', reason: 'population-sampling-design-not-declared' },
);
assert.deepEqual(
    classifyFailureEvidenceApplicability(document, document.records[0], 'population-prevalence', {
        populationSamplingDeclared: true,
    }),
    { applicability: 'context-bound', reason: 'population-includes-censored-or-indeterminate-outcomes' },
);
const decisionValidDocument = {
    ...document,
    populationIntegrity: { coverageComplete: true, decisionValidComplete: true },
    records: document.records.slice(0, 2),
};
assert.deepEqual(
    classifyFailureEvidenceApplicability(decisionValidDocument, decisionValidDocument.records[0], 'population-prevalence', {
        populationSamplingDeclared: true,
    }),
    { applicability: 'admissible', reason: 'declared-complete-parent-population' },
);

const summary = summarizeFailureEvidenceApplicability(document, 'forensic');
assert.equal(summary.admissibleRecords, 3);
assert.equal(summary.independentSupportStrata, 2);
assert.equal(summary.rawAdmissibleRecordsPerStratum, 1.5);

console.log('failure-evidence-semantics-lib-node-test: ok');
