/**
 * Shared dedupe -> validate -> canonicalize -> policy-decide sequence (Component 12 of the
 * hint-workbench plan). Both scripts/hint-workbench.mjs and scripts/hint-corpus-expand.mjs call
 * evaluateCandidateAcceptance() instead of each re-implementing this sequence; this file proves
 * the sequence itself is correct in isolation, independent of either caller's report bookkeeping.
 */
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createSolver } from '../solver.js';
import { PACK } from './cell-key.js';
import { evaluateCandidateAcceptance } from './hint-acceptance-pipeline.js';
import { pathSignature } from './hint-novelty.js';

const solverApi = createSolver();

function rawLevel(hints: number[][] = []): any {
    return {
        grid: { w: 3, h: 1 },
        gates: [{ x: 1, y: 1 }],
        goal: { x: 3, y: 1 },
        reqLen: 2, reqInt: 0,
        blocks: [], geese: [], falseGoals: [], mustPass: [], mustCross: [],
        filters: [], flippingFilters: [], landmarks: [], portals: [],
        hints,
    };
}

function normalizedLevel(raw: any): any {
    return solverApi.prepareLevelForSolver(raw, { source: 'raw', levelNumber: 1 });
}

// The only solution on this 1x3 corridor: gate (1,1) -> (2,1) -> goal (3,1), 0-indexed keys.
const validPath: number[] = [PACK(0, 0), PACK(1, 0), PACK(2, 0)];
const acceptAllPolicy = () => ({ accept: true, reason: 'save-all-valid' });
const rejectAllPolicy = (_level: any, _path: number[]) => ({ accept: false, reason: 'rejected-for-test' });

test('a fresh valid candidate reaches the policy stage and is accepted', () => {
    const raw = rawLevel();
    const level = normalizedLevel(raw);
    const outcome = evaluateCandidateAcceptance(level, raw, validPath, new Set(), acceptAllPolicy);

    assert.equal(outcome.stage, 'policy');
    assert.equal(outcome.accept, true);
    assert.equal(outcome.reason, 'save-all-valid');
    assert.ok(Array.isArray(outcome.path));
    assert.equal(outcome.pathSignature, pathSignature(outcome.path!));
});

test('an exact-duplicate signature is rejected before validation runs', () => {
    const raw = rawLevel();
    const level = normalizedLevel(raw);
    const inputSig = pathSignature(validPath);
    const poolSigs = new Set([inputSig]);
    // A policy that throws proves validation/policy never ran — exact-duplicate short-circuits first.
    const throwingPolicy = () => { throw new Error('policy should not run for an exact duplicate'); };

    const outcome = evaluateCandidateAcceptance(level, raw, validPath, poolSigs, throwingPolicy);

    assert.equal(outcome.stage, 'exact-duplicate');
    assert.equal(outcome.accept, false);
    assert.equal(outcome.reason, 'exact-duplicate');
    assert.equal(outcome.inputPathSignature, inputSig);
    assert.equal(outcome.path, undefined, 'no canonical path — validation never ran');
});

test('an invalid path is rejected with the validator reason, before any policy runs', () => {
    const raw = rawLevel();
    const level = normalizedLevel(raw);
    const throwingPolicy = () => { throw new Error('policy should not run for an invalid path'); };

    const outcome = evaluateCandidateAcceptance(level, raw, [PACK(0, 0)], new Set(), throwingPolicy);

    assert.equal(outcome.stage, 'invalid');
    assert.equal(outcome.accept, false);
    assert.match(outcome.reason, /^invalid:/);
    assert.equal(outcome.path, undefined);
});

test('a canonical duplicate (same path, different raw encoding) is rejected before policy runs', () => {
    const raw = rawLevel();
    const level = normalizedLevel(raw);
    const canonical = solverApi.validateCandidatePath(level, validPath);
    assert.equal(canonical.ok, true);
    const poolSigs = new Set([pathSignature((canonical as any).path)]);
    const throwingPolicy = () => { throw new Error('policy should not run for a canonical duplicate'); };

    // 1-indexed [x, y] pairs — a different raw encoding of the exact same path as `validPath`, so
    // its PRE-validation signature differs from the canonical one already in poolSigs, and only the
    // canonical-duplicate check (which runs after validation/canonicalization) catches it.
    const sameSolutionDifferentEncoding = [[1, 1], [2, 1], [3, 1]] as unknown as number[];
    assert.notEqual(pathSignature(sameSolutionDifferentEncoding), pathSignature((canonical as any).path));

    const outcome = evaluateCandidateAcceptance(level, raw, sameSolutionDifferentEncoding, poolSigs, throwingPolicy);

    assert.equal(outcome.stage, 'canonical-duplicate');
    assert.equal(outcome.accept, false);
    assert.equal(outcome.reason, 'canonical-duplicate');
    assert.deepEqual(outcome.path, (canonical as any).path);
});

test('a valid, non-duplicate candidate that the policy rejects surfaces the policy reason', () => {
    const raw = rawLevel();
    const level = normalizedLevel(raw);
    const outcome = evaluateCandidateAcceptance(level, raw, validPath, new Set(), rejectAllPolicy);

    assert.equal(outcome.stage, 'policy');
    assert.equal(outcome.accept, false);
    assert.equal(outcome.reason, 'rejected-for-test');
    assert.ok(Array.isArray(outcome.path), 'canonical path is still surfaced on a policy rejection');
});

test('poolSigs and pool are never mutated by the pipeline — the caller owns acceptance side effects', () => {
    const raw = rawLevel();
    const level = normalizedLevel(raw);
    const poolSigs = new Set<string>();
    const before = poolSigs.size;

    evaluateCandidateAcceptance(level, raw, validPath, poolSigs, acceptAllPolicy);

    assert.equal(poolSigs.size, before, 'evaluateCandidateAcceptance must not add to poolSigs itself');
});

test('the policy receives the canonicalized path', () => {
    const raw = rawLevel();
    const level = normalizedLevel(raw);
    let receivedPath: number[] | null = null;
    const capturingPolicy = (_levelForPolicy: any, canonicalPath: number[]) => {
        receivedPath = canonicalPath;
        return { accept: true, reason: 'ok' };
    };

    evaluateCandidateAcceptance(level, raw, validPath, new Set(), capturingPolicy);

    assert.ok(receivedPath, 'policy was invoked');
    assert.deepEqual(receivedPath, validPath);
});
