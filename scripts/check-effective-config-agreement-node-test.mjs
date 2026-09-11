#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkAgreement, checkCompare } from './check-effective-config-agreement.mjs';

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (err) { console.error(`  ✗ ${name}\n    ${err.stack || err.message}`); process.exitCode = 1; }
}

function stableStringify(value) {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(v => stableStringify(v) ?? 'null').join(',')}]`;
    const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
    return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function digest(effectiveConfig) {
    return createHash('sha256').update(stableStringify(effectiveConfig)).digest('hex');
}

const dir = mkdtempSync(path.join(tmpdir(), 'effective-config-agreement-test-'));
function writeReport(name, effectiveConfig) {
    const file = path.join(dir, name);
    writeFileSync(file, JSON.stringify({
        summary: {
            effectiveConfig,
            effectiveConfigDigest: digest(effectiveConfig),
        },
        levels: [],
    }));
    return file;
}

test('checkAgreement passes for reports sharing the identical effectiveConfig', () => {
    const a = writeReport('a.json', { nodeBudget: 100, workBudget: 200, ablation: { X: true } });
    const b = writeReport('b.json', { nodeBudget: 100, workBudget: 200, ablation: { X: true } });
    const result = checkAgreement([a, b]);
    assert.equal(result.agree, true);
    assert.equal(result.count, 2);
});

test('checkAgreement fails and names the differing field when one shard silently drifted', () => {
    const a = writeReport('c.json', { nodeBudget: 100, workBudget: 200 });
    const b = writeReport('d.json', { nodeBudget: 999, workBudget: 200 });
    assert.throws(() => checkAgreement([a, b]), /differs in \[nodeBudget\]/);
});

test('checkAgreement rejects a stale or malformed effectiveConfigDigest', () => {
    const file = path.join(dir, 'stale-digest.json');
    writeFileSync(file, JSON.stringify({
        summary: {
            effectiveConfig: { nodeBudget: 100, ablation: { X: true } },
            effectiveConfigDigest: digest({ nodeBudget: 100 }),
        },
        levels: [],
    }));
    const other = writeReport('stale-digest-peer.json', { nodeBudget: 100, ablation: { X: true } });
    assert.throws(() => checkAgreement([file, other]), /does not match SHA-256 of the canonical/);
});

test('checkAgreement requires at least 2 result files', () => {
    const a = writeReport('e.json', { nodeBudget: 100 });
    assert.throws(() => checkAgreement([a]), /at least 2/);
});

test('checkAgreement fails loudly when a report has no effectiveConfig at all', () => {
    const file = path.join(dir, 'no-config.json');
    writeFileSync(file, JSON.stringify({ summary: { schedulerMode: 'production' }, levels: [] }));
    const other = writeReport('f.json', { nodeBudget: 100 });
    assert.throws(() => checkAgreement([file, other]), /effectiveConfig is missing/);
});

test('checkCompare passes when control/treatment differ only in the prespecified dimension', () => {
    const control = writeReport('control1.json', { nodeBudget: 100, ablation: { STRATEGY_X: false } });
    const treatment = writeReport('treatment1.json', { nodeBudget: 100, ablation: { STRATEGY_X: true } });
    const result = checkCompare(control, treatment, ['ablation'], true);
    assert.deepEqual(result.differing, ['ablation']);
});

test('checkCompare fails when an unprespecified field also differs (alias/default drift, dropped option)', () => {
    const control = writeReport('control2.json', { nodeBudget: 100, workBudget: 200, ablation: { STRATEGY_X: false } });
    const treatment = writeReport('treatment2.json', { nodeBudget: 999, workBudget: 200, ablation: { STRATEGY_X: true } });
    assert.throws(() => checkCompare(control, treatment, ['ablation'], true), /unprespecified field\(s\) \[nodeBudget\]/);
});

test('checkCompare with requireActualDiff fails on a control-vs-control dispatch mistake', () => {
    const control = writeReport('control3.json', { nodeBudget: 100, ablation: { STRATEGY_X: false } });
    const treatment = writeReport('treatment3.json', { nodeBudget: 100, ablation: { STRATEGY_X: false } });
    assert.throws(() => checkCompare(control, treatment, ['ablation'], true), /IDENTICAL effective configuration/);
});

test('checkCompare without requireActualDiff tolerates an identical pair (a caller not asserting a real difference)', () => {
    const control = writeReport('control4.json', { nodeBudget: 100 });
    const treatment = writeReport('control4-peer.json', { nodeBudget: 100 });
    const result = checkCompare(control, treatment, ['ablation'], false);
    assert.deepEqual(result.differing, []);
});

console.log(`\ncheck-effective-config-agreement tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
