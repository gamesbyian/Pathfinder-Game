#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
    buildHintDiscoveryProcessEvidence,
    discoveryProcessEnvelopeFromContract,
    validateHintDiscoveryProcessEvidence,
} from './hint-discovery-process-evidence-lib.mjs';
import { hashConfiguration, hashPopulation } from './solver-experiment-contract.mjs';

const population = hashPopulation({
    kind: 'explicit-ids',
    identityBasis: 'stable-level-id',
    identities: ['P1', 'P2'],
});
const contract = {
    experiment: {
        workflowFamily: 'solver-sweep',
        producer: 'level-blind-capability-sweep',
        entrypoint: 'scripts/level-blind-capability-sweep.mjs',
        configurationHash: hashConfiguration({ schedulerMode: 'production', work: 1000 }),
        resolvedSha: 'a'.repeat(40),
    },
    population: {
        kind: 'explicit-ids',
        identityBasis: 'stable-level-id',
        identityHash: population.identityHash,
        corpusIdentity: 'sha256:' + '1'.repeat(64),
        independentUnit: 'parentId',
    },
    execution: {
        levelBlind: true,
        historyAware: false,
        historicalInputs: [],
        reproducibilityExpected: true,
        producerFamily: 'solver-sweep',
        schedulerMode: 'production',
    },
    limits: {
        cumulativeNodeCeiling: null,
        initialWorkAllocation: 1000,
        totalWorkCeiling: 1000,
        wallSafetyDeadlineMs: 10000,
        wallDeadlineBinding: false,
    },
    sideEffects: {
        hints: 'artifact-only',
        canonicalBaseline: 'none',
        telemetry: 'artifact-only',
        reports: 'artifact-only',
    },
};

const envelope = discoveryProcessEnvelopeFromContract(contract, {
    runId: 'run-123',
    contractRef: 'manifest.json#experimentContract',
});
assert.equal(envelope.runId, 'run-123');
assert.equal(envelope.protocolHash, contract.experiment.configurationHash);
assert.equal(envelope.solverRef, 'a'.repeat(40));
assert.equal(envelope.populationIdentity, population.identityHash);
assert.equal(envelope.contractRef, 'manifest.json#experimentContract');

const joinResult = {
    summary: {
        solvedRowsWithPath: 2,
        exactHintMatchedRows: 1,
        unmatchedSolvedRows: 1,
        solvedRowsWithoutWinnerAttempt: 0,
        rowsWithPrecedingFailures: 1,
    },
    joined: [{
        rowIndex: 0,
        parentId: 'P1',
        solutionSignature: '1,2,3',
        matchingHintIndices: [2],
        exactHintMatchCount: 1,
        process: {
            parentId: 'P1',
            solutionSignature: '1,2,3',
            winnerIndex: 1,
            precedingAttemptCount: 1,
            precedingAttempts: [{ outcome: 'exhausted' }],
            winner: { outcome: 'solved' },
            cumulativeWorkSpent: 900,
            processCompleteness: 'attempt-sequence-through-winner',
        },
    }],
    unmatched: [{ parentId: 'P2' }],
};

const evidence = buildHintDiscoveryProcessEvidence(joinResult, {
    sourceReport: 'reports/run.json',
    levels: 'data/stress/stress-levels-random.json',
    contract,
    runId: 'run-123',
    contractRef: 'manifest.json#experimentContract',
});
validateHintDiscoveryProcessEvidence(evidence);
assert.equal(evidence.records.length, 1);
assert.equal(evidence.records[0].parentId, 'P1');
assert.match(evidence.records[0].evidenceId, /^sha256:/u);
const reorderedEvidence = buildHintDiscoveryProcessEvidence({
    ...joinResult,
    joined: [{ ...joinResult.joined[0], rowIndex: 99 }],
}, {
    sourceReport: 'reports/run.json',
    levels: 'data/stress/stress-levels-random.json',
    contract,
    runId: 'run-123',
    contractRef: 'manifest.json#experimentContract',
});
assert.equal(reorderedEvidence.records[0].evidenceId, evidence.records[0].evidenceId,
    'source row ordering must not alter semantic evidence identity');
assert.equal(evidence.summary.unmatchedRowsRetainedAsCountOnly, 1,
    'unmatched successes remain counted without inventing a hint binding');

assert.throws(() => discoveryProcessEnvelopeFromContract(contract, { runId: '' }), /runId/);
assert.throws(() => discoveryProcessEnvelopeFromContract({
    ...contract,
    experiment: { ...contract.experiment, resolvedSha: 'main' },
}, { runId: 'x' }), /decision-grade/);

console.log('hint-discovery-process-evidence-lib-node-test: ok');
