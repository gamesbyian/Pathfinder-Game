#!/usr/bin/env node
/**
 * Unit coverage for buildRow()'s enriched telemetry (scripts/portfolio-solve-sweep-lib.mjs):
 * attempts/attemptCount/failedStrategies/elapsedMs/refereeValid — added so a
 * portfolio-solve-sweep report can feed scripts/stress/rank-levels.mjs's levelBadness() and
 * scripts/stress/classify-stability.mjs's classifyOne() directly, the same way a
 * scripts/stress/benchmark.mjs report already does (both call the identical Solver.solve()).
 * Pure JS, no Solver dependency (buildRow doesn't compute refereeValid itself — see its own
 * doc comment) — runs under plain node.
 */
import assert from 'node:assert/strict';
import { buildRow, attemptActionKey, attemptConfigKey, attemptRecord } from './portfolio-solve-sweep-lib.mjs';
import { MAXIMALLY_POPULATED_SOLVER_ATTEMPT } from '../modules/solver/testing-fixtures.js';
import { buildSolveWorkerResult } from '../modules/solver/worker-result-serialization.mjs';

const PERSISTENT_ATTEMPT_FIELDS = new Set([
    'stageId', 'gateKey', 'scoringProfileId', 'orderingBiasId', 'beamWidth', 'ok', 'elapsedMs', 'allocatedBudgetMs',
    'outcome', 'error', 'passNumber', 'configKey', 'restart', 'schedulerPhase', 'mechanicBucketRetention',
    'repair', 'repairMustTurnBiased', 'repairTurnBiased', 'seedSalt', 'randomSeed',
    'nodesExpanded', 'timedOut', 'bestBadness', 'finalBadness', 'attractionDiversity',
    'admissibleOrder', 'admissibleOrderNoTieBreak', 'admissibleOrderLds',
    'mainLoopLateReserve', 'repairProbe', 'repairProbeShrinkRecovery',
    'allocatedWorkCeiling', 'allocatedNodeCeiling', 'workSpent', 'dedupNearTieRetry',
    'admissibleOrderNonDefaultRetry', 'connectivityAxisExhaustedRetry',
    'repairElitePrefixDfsRetry', 'mcNeighborBudgetRetry', 'repairLateProbe',
]);
const INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS = new Set([]);

let passed = 0;
function test(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(err);
        process.exitCode = 1;
    }
}

test('buildRow records per-attempt badness/timing telemetry', () => {
    const result = {
        ok: true,
        status: 'success',
        totalMs: 1234,
        nodesExpanded: 500,
        solution: [1, 2, 3],
        refereeValid: true,
        attempts: [
            { gateKey: 'g1', profile: 'perimeterSweep', template: 'perimeterCW', ok: false, elapsedMs: 100, nodesExpanded: 200, timedOut: true, finalBadness: 4 },
            { gateKey: 'g1', profile: 'objectiveFirst', ok: true, elapsedMs: 300, nodesExpanded: 300, beamWidth: 5000, diverseBeam: true },
        ],
    };
    const row = buildRow(7, 'R00042', result, 'legacy');
    assert.equal(row.level, 7);
    assert.equal(row.id, 'R00042');
    assert.equal(row.ok, true);
    assert.equal(row.totalMs, 1234);
    assert.equal(row.elapsedMs, 1234, 'elapsedMs should alias totalMs for classify-stability.mjs compatibility');
    assert.equal(row.refereeValid, true);
    assert.equal(row.attemptCount, 2);
    assert.equal(row.attempts.length, 2);
    assert.equal(row.attempts[0].finalBadness, 4);
    assert.equal(row.attempts[0].timedOut, true);
    assert.equal(row.attempts[1].beamWidth, 5000);
    assert.equal(row.attempts[1].mechanicBucketRetention, true);
    assert.deepEqual(row.failedStrategies, ['dfs|score=perimeterSweep|bias=perimeterCW']);
});

test('buildRow defaults attempts/refereeValid safely when result has neither', () => {
    const row = buildRow(3, 'R00003', { ok: false, status: 'cached-unsolved' }, 'legacy');
    assert.equal(row.attempts.length, 0);
    assert.equal(row.attemptCount, 0);
    assert.deepEqual(row.failedStrategies, []);
    assert.deepEqual(row.failedActionKeys, []);
    assert.equal(row.winningActionKey, null);
    assert.equal(row.refereeValid, null);
    assert.equal(row.elapsedMs, null);
});

test('failedStrategies only lists non-winning attempts, using the same key as winningConfig', () => {
    const result = {
        ok: true,
        status: 'success',
        totalMs: 10,
        solution: [1, 2],
        attempts: [
            { gateKey: 'g1', profile: 'a', ok: false, bestBadness: 9 },
            { gateKey: 'g1', profile: 'b', ok: false, bestBadness: 2, repair: true },
            { gateKey: 'g1', profile: 'c', ok: true },
        ],
    };
    const row = buildRow(1, 'R00001', result, 'legacy');
    assert.equal(row.winningConfig, 'dfs|score=c|bias=none');
    assert.deepEqual(row.failedStrategies, ['dfs|score=a|bias=none', 'repair|score=repair|guidance=standard']);
});

test('action identity separates stage and repair seed while config identity remains compatible', () => {
    const salt0 = { stageId: 'early-repair-search', gateKey: 10, profile: 'repair', template: null, beamWidth: null, repair: true, ok: false, elapsedMs: 1 };
    const salt1 = { ...salt0, seedSalt: 1, ok: true };
    assert.equal(attemptConfigKey(salt0), 'repair|score=repair|guidance=standard');
    assert.equal(attemptConfigKey(salt1), 'repair|score=repair|guidance=standard');
    assert.equal(attemptActionKey(salt0), 'early-repair-search|repair|score=repair|guidance=standard|seedSalt=0');
    assert.equal(attemptActionKey(salt1), 'early-repair-search|repair|score=repair|guidance=standard|seedSalt=1');

    const row = buildRow(1, 'R00001', { ok: true, status: 'success', attempts: [salt0, salt1] }, 'legacy');
    assert.equal(row.winningConfig, 'repair|score=repair|guidance=standard', 'legacy config-family summary stays unchanged');
    assert.equal(row.winningActionKey, 'early-repair-search|repair|score=repair|guidance=standard|seedSalt=1');
    assert.deepEqual(row.failedActionKeys, ['early-repair-search|repair|score=repair|guidance=standard|seedSalt=0']);
    assert.equal(row.attempts[0].actionKey, 'early-repair-search|repair|score=repair|guidance=standard|seedSalt=0');
    assert.equal(row.attempts[1].actionKey, 'early-repair-search|repair|score=repair|guidance=standard|seedSalt=1');
});

test('historical attempts without stageId do not get a fabricated action identity', () => {
    const legacy = { gateKey: 1, profile: 'repair', repair: true, ok: false, elapsedMs: 1, seedSalt: 2 };
    assert.equal(attemptActionKey(legacy), null);
    const rec = attemptRecord(legacy);
    assert.ok(!('actionKey' in rec));
});

// Regression test (2026-07-23): attemptConfigKey previously checked ONLY repairMustTurnBiased for
// the "(...)" suffix, silently dropping repairTurnBiased -- a turn-biased repair winner's persisted
// winningConfig lost its "(turnBiased)" marker entirely, so a later config-key lookup against the
// level's own CURRENT configured attempt list (which DOES produce that suffix -- see
// orchestration.ts's own attemptConfigKey, the two must stay in lockstep) matched the wrong (plain,
// non-turn-biased) repair config. Found while measuring --prime-winner's hit rate on repair winners:
// a level whose baseline-recorded winningConfig silently omitted "(turnBiased)" made the prime
// replay a different, non-turn-biased search, missing even with the exact right seed.
test('attemptConfigKey emits turn-biased repair guidance for a repairTurnBiased winner', () => {
    const key = attemptConfigKey({ profile: 'default', repair: true, repairTurnBiased: true });
    assert.equal(key, 'repair|score=repair|guidance=turn-biased');
});

test('attemptConfigKey prefers must-turn-biased guidance when both repair bias flags are set', () => {
    // Mirrors orchestration.ts's own precedence (repairMustTurnBiased checked first) -- the two are
    // mutually exclusive in practice (repair-search.ts never sets both on the same attempt), but the
    // key derivation must still agree with the source of truth on which one wins if it ever happened.
    const key = attemptConfigKey({ profile: 'default', repair: true, repairMustTurnBiased: true, repairTurnBiased: true });
    assert.equal(key, 'repair|score=repair|guidance=must-turn-biased');
});

// ── admissible-order-search tier telemetry ───────────────────────────────────
// Regression coverage for a gap measured 2026-07-29: the admissible-order tier's attempts carry no
// beamWidth, so this key reconstruction read them as plain `dfs:<profile>` and attemptRecord()
// dropped their dispatch flags outright. Net effect: 0 attempts in the entire corpus-2 baseline and
// the 240-shard high-budget sweep carried any admissible-order marker, despite 486 levels in that
// sweep demonstrably reaching the tier -- every one of its wins was silently attributed to DFS.

test('attemptConfigKey emits the admissible-order family', () => {
    assert.equal(attemptConfigKey({ profile: 'mustCrossFirst', admissibleOrder: true }), 'admissible-order|tieBreak=mustCrossFirst|lds=off');
});

test('attemptConfigKey maps the no-tie-break entry to admissible-order|tieBreak=none|lds=off', () => {
    // 'none' is not a real policy profile -- it is this tier's own no-tie-break marker, which is the
    // ONLY reason the gap was detectable at all before this fix (a `dfs:none` key in a report).
    assert.equal(attemptConfigKey({ profile: 'none', admissibleOrder: true, admissibleOrderNoTieBreak: true }), 'admissible-order|tieBreak=none|lds=off');
});

test('attemptConfigKey emits lds=on for the discrepancy-limited variant', () => {
    assert.equal(attemptConfigKey({ profile: 'default', admissibleOrder: true, admissibleOrderLds: true }), 'admissible-order|tieBreak=default|lds=on');
});

test('attemptRecord preserves the admissible-order dispatch flags', () => {
    const rec = attemptRecord({
        gateKey: 1, profile: 'none', template: null, beamWidth: null, ok: true, elapsedMs: 5,
        admissibleOrder: true, admissibleOrderNoTieBreak: true,
    });
    assert.equal(rec.admissibleOrder, true);
    assert.equal(rec.admissibleOrderNoTieBreak, true);
});

test('attemptRecord preserves allocatedBudgetMs, randomSeed and seedSalt', () => {
    // scripts/stress/benchmark.mjs's former hand-maintained copy of this projection dropped
    // randomSeed/seedSalt, making a repair winner from that tool unreplayable; allocatedBudgetMs was
    // dropped by both copies, which is what made "did this attempt get any room to run?"
    // unanswerable from a persisted report.
    const rec = attemptRecord({
        gateKey: 1, profile: 'repair', template: null, beamWidth: null, ok: true, elapsedMs: 5,
        allocatedBudgetMs: 8000, repair: true, randomSeed: 4272716209, seedSalt: 3,
    });
    assert.equal(rec.allocatedBudgetMs, 8000);
    assert.equal(rec.randomSeed, 4272716209);
    assert.equal(rec.seedSalt, 3);
});

test('attemptRecord omits absent optional fields rather than emitting undefined', () => {
    const rec = attemptRecord({ gateKey: 1, profile: 'default', template: null, beamWidth: null, ok: true, elapsedMs: 5 });
    for (const k of ['stageId', 'actionKey', 'allocatedBudgetMs', 'admissibleOrder', 'randomSeed', 'seedSalt', 'repair', 'timedOut']) {
        assert.ok(!(k in rec), `${k} should be absent, not undefined`);
    }
});

test('attempt errors and their aggregate signal survive report projection', () => {
    const error = { name: 'TypeError', message: 'dispatch failed', gateKey: 9, configKey: 'dfs|score=x|bias=none', scoringProfileId: 'x', orderingBiasId: null, stack: 'must not persist' };
    const row = buildRow(4, 'R00004', {
        ok: false, status: 'attempt-error', attempts: [{
            gateKey: 9, profile: 'x', template: null, beamWidth: null, ok: false,
            outcome: 'error', error, elapsedMs: 2, allocatedBudgetMs: 10,
        }],
    }, 'legacy');
    assert.equal(row.status, 'attempt-error');
    assert.equal(row.hadAttemptError, true);
    assert.equal(row.attempts[0].outcome, 'error');
    assert.deepEqual(row.attempts[0].error, {
        name: 'TypeError', message: 'dispatch failed', gateKey: 9,
        configKey: 'dfs|score=x|bias=none', profile: 'x', template: null,
    });
});

test('maximal Attempt round-trips completely through attemptRecord and buildRow', () => {
    const fixtureFields = Object.keys(MAXIMALLY_POPULATED_SOLVER_ATTEMPT);
    assert.equal(PERSISTENT_ATTEMPT_FIELDS.size + INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS.size, fixtureFields.length,
        'field expectations must have neither stale entries nor omissions');
    for (const field of fixtureFields) {
        const memberships = Number(PERSISTENT_ATTEMPT_FIELDS.has(field)) + Number(INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS.has(field));
        assert.equal(memberships, 1, `${field} must belong to exactly one projection set`);
    }

    const direct = attemptRecord(MAXIMALLY_POPULATED_SOLVER_ATTEMPT);
    const row = buildRow(99, 'fixture', {
        ok: false, status: 'attempt-error', attempts: [MAXIMALLY_POPULATED_SOLVER_ATTEMPT],
    }, 'legacy-latency-portfolio');
    for (const projected of [direct, row.attempts[0]]) {
        for (const field of PERSISTENT_ATTEMPT_FIELDS) {
            assert.deepEqual(projected[field], MAXIMALLY_POPULATED_SOLVER_ATTEMPT[field], `${field} changed during projection`);
        }
        for (const field of INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS) {
            assert.ok(!(field in projected), `${field} is intentionally transient`);
        }
        assert.equal(projected.actionKey, 'late-repair-search|admissible-order|tieBreak=none|lds=on|seedSalt=7', 'derived action identity must survive projection');
    }
    assert.equal(row.hadAttemptError, true);
});

test('worker result structured-clone preserves the complete raw Attempt contract', () => {
    const message = buildSolveWorkerResult('fixture-job', {
        ok: false, status: 'attempt-error', solution: null, totalMs: 321, nodesExpanded: 4567,
        attempts: [MAXIMALLY_POPULATED_SOLVER_ATTEMPT], deadlineTruncated: false,
    });
    const [transported] = globalThis.structuredClone(message).attempts;
    for (const field of PERSISTENT_ATTEMPT_FIELDS) {
        assert.deepEqual(transported[field], MAXIMALLY_POPULATED_SOLVER_ATTEMPT[field], `${field} changed across worker serialization`);
    }
    for (const field of INTENTIONALLY_TRANSIENT_ATTEMPT_FIELDS) {
        assert.ok(!(field in transported), `${field} is intentionally transient in worker results`);
    }
});

console.log(`\nportfolio-solve-sweep-lib tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
