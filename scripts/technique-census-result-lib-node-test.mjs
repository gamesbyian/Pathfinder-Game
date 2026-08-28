import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dedupeTechniqueCensusResults, inferredVariantLabel, techniqueCensusIdentityKey } from './technique-census-result-lib.mjs';

test('dedupeTechniqueCensusResults treats top-level totalMs as timing noise', () => {
    const a = { cellId: 'T1-1', tier: 'T1', ok: true, status: 'success', nodesExpanded: 10, totalMs: 100 };
    const b = { cellId: 'T1-1', tier: 'T1', ok: true, status: 'success', nodesExpanded: 10, totalMs: 200 };
    const { results, duplicatesRemoved } = dedupeTechniqueCensusResults([a, b]);
    assert.equal(duplicatesRemoved, 1);
    assert.equal(results.length, 1);
    assert.equal(results[0].totalMs, 100);
});

test('dedupeTechniqueCensusResults treats per-attempt elapsedMs as timing noise', () => {
    const a = {
        cellId: 'T1-2', tier: 'T1', ok: true, status: 'success', nodesExpanded: 10, totalMs: 1317,
        attempts: [{ configKey: 'k', gateKey: 'g', elapsedMs: 1317, ok: true }],
    };
    const b = {
        cellId: 'T1-2', tier: 'T1', ok: true, status: 'success', nodesExpanded: 10, totalMs: 1566,
        attempts: [{ configKey: 'k', gateKey: 'g', elapsedMs: 1566, ok: true }],
    };
    const { results, duplicatesRemoved } = dedupeTechniqueCensusResults([a, b]);
    assert.equal(duplicatesRemoved, 1);
    assert.equal(results.length, 1);
});

test('dedupeTechniqueCensusResults still rejects genuinely conflicting duplicates', () => {
    const a = { cellId: 'T1-3', tier: 'T1', ok: true, status: 'success', nodesExpanded: 10, totalMs: 100 };
    const b = { cellId: 'T1-3', tier: 'T1', ok: false, status: 'exhausted', nodesExpanded: 20, totalMs: 200 };
    assert.throws(() => dedupeTechniqueCensusResults([a, b]), /Conflicting duplicate technique-census result/);
});

test('inferredVariantLabel / techniqueCensusIdentityKey basic behavior', () => {
    const explicit = { variantLabel: 'foo' };
    assert.equal(inferredVariantLabel(explicit), 'foo');
    assert.equal(techniqueCensusIdentityKey(explicit), 'foo');

    const ablated = { tier: 'T1', techniqueKeys: ['dfs:default'], ablation: { enable: ['STRATEGY_FOO'], disable: [] } };
    assert.equal(inferredVariantLabel(ablated), 'dfs|score=default|bias=none+foo-on');

    const plain = { tier: 'T1', techniqueKeys: ['beam:objectiveFirst@beam2000'] };
    assert.equal(inferredVariantLabel(plain), null);
    assert.equal(techniqueCensusIdentityKey(plain), 'beam|score=objectiveFirst|bias=none|width=2000|retention=plain');
});

test('dedupeTechniqueCensusResults treats legacy and canonical attempt keys as one cell identity', () => {
    const legacy = {
        cellId: 'T1-legacy-canonical', tier: 'T1', techniqueKeys: ['dfs:default'],
        ok: true, status: 'success', nodesExpanded: 10, totalMs: 50,
    };
    const canonical = {
        ...legacy, techniqueKeys: ['dfs|score=default|bias=none'], totalMs: 60,
    };
    const { results, duplicatesRemoved } = dedupeTechniqueCensusResults([legacy, canonical]);
    assert.equal(duplicatesRemoved, 1);
    assert.deepEqual(results[0].techniqueKeys, ['dfs|score=default|bias=none']);
});
