import assert from 'node:assert/strict';
import { test } from 'vitest';
import { buildSolveWorkerResult } from './worker-result-serialization.mjs';

test('worker solve serialization preserves aggregate result fields without a second whitelist', () => {
    const resumableResidualPass = {
        eligibleContinuationCount: 3,
        residualDispatchCount: 2,
        residualIncrementalWork: 1234,
        firstPassCaptureOvershoot: 56,
    };
    const result = buildSolveWorkerResult(17, {
        ok: true,
        status: 'success',
        solution: [1, 2, 3],
        solutions: [[1, 2, 3]],
        attempts: [],
        totalMs: 42,
        nodesExpanded: 99,
        schedulerMode: 'static-portfolio',
        staticPortfolioWinningConfigKey: 'beam/example',
        resumableResidualPass,
        // A sentinel for the contract property this test is intended to protect: future plain
        // SolveResult fields should cross the worker seam without another serializer edit.
        futurePlainTelemetry: { count: 7 },
    });

    assert.equal(result.type, 'RESULT');
    assert.equal(result.id, 17);
    assert.equal(result.elapsedMs, 42);
    assert.equal(result.staticPortfolioWinningConfigKey, 'beam/example');
    assert.deepEqual(result.resumableResidualPass, resumableResidualPass);
    assert.deepEqual(result.futurePlainTelemetry, { count: 7 });
    assert.equal(Object.hasOwn(result, 'totalMs'), false);
});

test('worker solve serialization normalizes historical aggregate aliases', () => {
    const result = buildSolveWorkerResult(1, {
        ok: false,
        status: 'failed',
        solution: null,
        solutions: [],
        attempts: [],
        totalMs: 5,
        nodesExpanded: 10,
        techniqueLifecycle: { legacy: true },
        portfolio: { solvedBeforeFallback: false },
    });

    assert.deepEqual(result.stageLifecycle, { legacy: true });
    assert.deepEqual(result.legacyLatencyPortfolioExperiment, { solvedBeforeFallback: false });
    assert.equal(Object.hasOwn(result, 'techniqueLifecycle'), false);
    assert.equal(Object.hasOwn(result, 'portfolio'), false);
});
