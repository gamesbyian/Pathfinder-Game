#!/usr/bin/env node
import assert from 'node:assert/strict';
import { summarizeReconstructability } from './hint-reconstructability-report.mjs';

function event(overrides = {}) {
    return {
        solver: {
            id: 'pathfinder-solver',
            version: 'a'.repeat(40),
            technique: 'dfs',
            scoringProfileId: 'default',
            orderingBiasId: null,
            beamWidth: null,
            mechanicBucketRetention: null,
            gateKey: 1,
            forcing: null,
            ...overrides.solver,
        },
        search: {
            workBudget: 1000,
            termination: 'solved',
            randomSeed: null,
            ...overrides.search,
        },
        context: {
            usedExistingHints: false,
            hintGuided: false,
            isolatedTechnique: false,
            levelRevision: 'v2:test',
            ...overrides.context,
        },
        foundAt: '2026-09-20T00:00:00.000Z',
        ...(overrides.execution ? { execution: overrides.execution } : {}),
        ...(overrides.occurrences ? { occurrences: overrides.occurrences } : {}),
    };
}

const report = summarizeReconstructability([
    { path: [1, 2], provenance: [event({
        execution: {
            schemaVersion: 1,
            solverRequestIdentity: 'sha256:' + '1'.repeat(64),
            protocolHash: 'proto',
            reproducibilityMode: 'deterministic-work',
            arm: null,
        },
        occurrences: [
            {
                schemaVersion: 1,
                runId: 'run-1',
                runAttempt: '1',
                contractRef: 'manifest.json#experimentContract',
                observedAt: '2026-09-20T00:00:00.000Z',
                sourceRuns: [{ runId: 'source-a' }, { runId: 'source-b' }],
            },
            {
                schemaVersion: 1,
                runId: 'run-2',
                runAttempt: '1',
                contractRef: null,
                observedAt: '2026-09-21T00:00:00.000Z',
                sourceRuns: null,
            },
        ],
    })] },
    { path: [2, 3], provenance: [
        event({ solver: { id: 'external-constraint-solver', technique: 'cp-sat' } }),
    ] },
    { path: [3, 4], provenance: [] },
]);

assert.equal(report.hints, 3);
assert.equal(report.hintsWithProvenance, 2);
assert.equal(report.events, 2);
assert.equal(report.effectiveInputReconstructable, 0);
assert.equal(report.effectiveInputNotReconstructable, 2);
assert.equal(report.eventsWithExecution, 1);
assert.equal(report.eventsWithSolverRequestIdentity, 1);
assert.equal(report.eventsWithOccurrences, 1);
assert.equal(report.eventsWithMultipleOccurrences, 1);
assert.equal(report.occurrenceRecords, 2);
assert.equal(report.occurrencesWithContractRef, 1);
assert.equal(report.occurrenceSourceRunLinks, 2);
assert.equal(report.missingDimensions.solverStage, 1);
assert.equal(report.missingDimensions.solverRequestIdentity, 1);
assert.equal(report.missingDimensions.pathfinderSolverContract, 1);
assert.equal(report.replayBasisCounts['configuration-reconstructable'], 1);
assert.equal(report.replayBasisCounts['identity-only'], 1);

console.log('hint-reconstructability-report-node-test: ok');
