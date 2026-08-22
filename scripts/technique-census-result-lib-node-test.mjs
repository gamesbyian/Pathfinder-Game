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

    const ablated = { tier: 'T1', techniqueKeys: ['bar'], ablation: { enable: ['STRATEGY_FOO'], disable: [] } };
    assert.equal(inferredVariantLabel(ablated), 'bar+foo-on');

    const plain = { tier: 'T1', techniqueKeys: ['baz'] };
    assert.equal(inferredVariantLabel(plain), null);
    assert.equal(techniqueCensusIdentityKey(plain), 'baz');
});
