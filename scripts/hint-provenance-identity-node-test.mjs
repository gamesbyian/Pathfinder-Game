#!/usr/bin/env node
/**
 * Regression coverage for scripts/hint-provenance-identity.mjs's provenanceEventIdentity(): the
 * 2026-09-09 historical regression-risk audit flagged that it relied on plain JSON.stringify()
 * after stripping ignored fields, which makes semantically identical events hash to DIFFERENT
 * identity strings purely because of object property insertion order -- silently defeating the
 * duplicate guard both scripts/hint-capture-lib.mjs (write-time) and
 * scripts/dedupe-hint-provenance.mjs (cleanup) rely on this function to share exactly.
 */
import assert from 'node:assert/strict';
import { provenanceEventIdentity } from './hint-provenance-identity.mjs';

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (err) { console.error(`  ✗ ${name}\n    ${err.stack || err.message}`); process.exitCode = 1; }
}

function baseEntry() {
    return {
        solver: {
            id: 'pathfinder-solver', version: 'abc123', technique: 'main-search',
            scoringProfileId: 'p1', orderingBiasId: 'o1', beamWidth: 64,
            mechanicBucketRetention: true, gateKey: 3,
            forcing: { gateKey: 3, direction: 'up', portalDest: null, portalExitDirection: null },
            attemptIndex: 2,
        },
        search: {
            nodesExpanded: 500, elapsedMs: 1234, budgetMs: 5862, workSpent: 900, workBudget: 2000,
            cumulativeNodesExpanded: 900, cumulativeElapsedMs: 4000, cumulativeBudgetMs: 20000,
            termination: 'success', randomSeed: 42, seedSalt: 1,
        },
        context: { usedExistingHints: false, hintGuided: false, levelRevision: 'r1', isolatedTechnique: false },
        foundAt: '2026-09-09T00:00:00.000Z',
    };
}

// Deep clone with every plain object's own keys rebuilt in REVERSE insertion order -- the
// canonical adversarial permutation for a JSON.stringify-based identity function, since
// JSON.stringify preserves insertion order exactly.
function reverseKeyOrder(value) {
    if (Array.isArray(value)) return value.map(reverseKeyOrder);
    if (value && typeof value === 'object') {
        const out = {};
        for (const key of Object.keys(value).reverse()) out[key] = reverseKeyOrder(value[key]);
        return out;
    }
    return value;
}

test('identical entries with every object\'s keys in reverse insertion order produce the same identity', () => {
    const a = baseEntry();
    const b = reverseKeyOrder(baseEntry());
    assert.equal(provenanceEventIdentity(a), provenanceEventIdentity(b));
});

test('reversed key order at a NESTED level (solver.forcing) still matches', () => {
    const a = baseEntry();
    const b = baseEntry();
    b.solver.forcing = reverseKeyOrder(b.solver.forcing);
    assert.equal(provenanceEventIdentity(a), provenanceEventIdentity(b));
});

test('a legacy round-trip shape (rebuilt via spread, like upgradeProvenanceEntry) still matches the original', () => {
    const a = baseEntry();
    // Mirrors modules/domain/hint-runtime.mjs's upgradeProvenanceEntry(): spreads the whole raw
    // object first, then overwrites `solver` with a freshly-keyed object -- a realistic source of
    // key-order drift between a persisted legacy record and a freshly constructed one.
    const legacySolver = { ...a.solver };
    const rebuilt = { ...a, solver: { ...legacySolver, id: legacySolver.id } };
    assert.equal(provenanceEventIdentity(a), provenanceEventIdentity(rebuilt));
});

test('foundAt and the excluded host/wall-clock-measurement fields do not affect identity', () => {
    const a = baseEntry();
    const b = baseEntry();
    b.foundAt = '2099-01-01T00:00:00.000Z';
    b.search.elapsedMs = 999999;
    b.search.cumulativeElapsedMs = 1;
    b.search.cumulativeNodesExpanded = 1;
    b.search.cumulativeBudgetMs = 1;
    b.search.budgetMs = 1;
    assert.equal(provenanceEventIdentity(a), provenanceEventIdentity(b));
});

test('a genuinely different discovery (different nodesExpanded) produces a different identity', () => {
    const a = baseEntry();
    const b = baseEntry();
    b.search.nodesExpanded = 999;
    assert.notEqual(provenanceEventIdentity(a), provenanceEventIdentity(b));
});

test('a genuinely different commit (solver.version) produces a different identity (deliberately NOT excluded)', () => {
    const a = baseEntry();
    const b = baseEntry();
    b.solver.version = 'def456';
    assert.notEqual(provenanceEventIdentity(a), provenanceEventIdentity(b));
});

test('an entry missing `search` entirely does not throw and stays distinguishable from one with it', () => {
    const a = baseEntry();
    delete a.search;
    const b = baseEntry();
    assert.doesNotThrow(() => provenanceEventIdentity(a));
    assert.notEqual(provenanceEventIdentity(a), provenanceEventIdentity(b));
});

test('a non-object entry (legacy bare-array hint path) is handled without throwing', () => {
    assert.doesNotThrow(() => provenanceEventIdentity(null));
    assert.doesNotThrow(() => provenanceEventIdentity(undefined));
    assert.equal(provenanceEventIdentity(null), provenanceEventIdentity(undefined));
});

console.log(`\nhint-provenance-identity tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
