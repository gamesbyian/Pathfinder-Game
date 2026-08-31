import assert from 'node:assert/strict';
import test from 'node:test';

import { buildReqLengths, classifyFeasibility, classifyRuns, parseInteger, portalFreeParityReason, summarizePoints, summarizeRuns } from './req-length-sweep-lib.mjs';

test('buildReqLengths makes an inclusive stepped sweep', () => {
    assert.deepEqual(buildReqLengths(10, { min: 6, max: 12, step: 2 }), [6, 8, 10, 12]);
    assert.deepEqual(buildReqLengths(10), Array.from({ length: 20 }, (_, i) => i + 1));
    assert.throws(() => buildReqLengths(10, { min: 5, max: 4 }), /min must be <=/);
    assert.throws(() => buildReqLengths(10, { min: 0 }), /integer >= 1/);
    assert.throws(() => parseInteger('1.5', '--repeats'), /integer/);
});

test('classifyRuns does not mistake a timeout for proof of infeasibility', () => {
    assert.equal(classifyRuns([{ ok: false }]), 'unknown-within-budget');
    assert.equal(classifyRuns([{ ok: false }], 'parity'), 'statically-infeasible');
    assert.equal(classifyRuns([{ ok: false }, { ok: true }], 'parity'), 'observed-solved');
});

test('classifyFeasibility keeps solver, stored-witness, proof, and unknown evidence distinct', () => {
    assert.equal(classifyFeasibility([{ ok: true }], 0, 'parity'), 'solver-witnessed');
    assert.equal(classifyFeasibility([{ ok: false }], 2, 'parity'), 'stored-witnessed');
    assert.equal(classifyFeasibility([{ ok: false }], 0, 'parity'), 'proven-infeasible');
    assert.equal(classifyFeasibility([{ ok: false }], 0), 'unknown');
});

test('summarizeRuns reports solve rate, medians, and winning techniques', () => {
    assert.deepEqual(summarizeRuns([
        { ok: true, elapsedMs: 10, nodesExpanded: 20, solvedBy: 'dfs:a' },
        { ok: false, elapsedMs: 30, nodesExpanded: 40 },
    ]), {
        solvedRuns: 1, totalRuns: 2, solveRate: 0.5,
        medianElapsedMs: 20, medianNodesExpanded: 30, winningTechniques: ['dfs:a'],
    });
});

test('portalFreeParityReason identifies impossible parity but exempts portals', () => {
    // Packed keys use x in the low 16 bits and y in the high 16 bits. Both coordinates are odd
    // here, specifically guarding against accidentally inspecting only x parity.
    const base = { goalKey: 0x00010001, gateKeys: [0], requiredLength: 5, portalMap: new Map() };
    assert.match(portalFreeParityReason(base), /parity mismatch/);
    assert.equal(portalFreeParityReason({ ...base, requiredLength: 4 }), null);
    assert.equal(portalFreeParityReason({ ...base, portalMap: new Map([[1, 2]]) }), null);
});

test('summarizePoints finds disjoint solve ranges and technique transitions', () => {
    const point = (reqLen, classification, winningTechniques = []) => ({ reqLen, classification, winningTechniques });
    assert.deepEqual(summarizePoints([
        point(2, 'observed-solved', ['dfs']), point(4, 'observed-solved', ['dfs']),
        { ...point(6, 'unknown-within-budget'), feasibility: 'stored-witnessed' }, point(8, 'observed-solved', ['beam']),
        point(10, 'statically-infeasible'),
    ], 2), {
        observedSolvedLengths: [2, 4, 8], observedSolvedRanges: [{ min: 2, max: 4 }, { min: 8, max: 8 }],
        unknownLengths: [6], staticallyInfeasibleLengths: [10], storedWitnessedLengths: [6],
        techniqueTransitions: [{ afterReqLen: 4, atReqLen: 8, from: 'dfs', to: 'beam' }],
    });
});
