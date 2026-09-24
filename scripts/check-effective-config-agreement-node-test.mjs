#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkAgreement, checkCompare } from './check-effective-config-agreement.mjs';
import { solverRequestIdentityFromProjection } from './solver-request-identity-lib.mjs';

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

function fakeProjection(sentinel) {
    return { schemaVersion: 1, kind: 'pathfinder-solver-request-projection', sentinel };
}
function writeReportWithCanonical(name, effectiveConfig, sentinel) {
    const file = path.join(dir, name);
    const solverRequestProjection = fakeProjection(sentinel);
    writeFileSync(file, JSON.stringify({
        summary: {
            effectiveConfig,
            effectiveConfigDigest: digest(effectiveConfig),
            solverRequestProjection,
            solverRequestIdentity: solverRequestIdentityFromProjection(solverRequestProjection),
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

test('checkAgreement legacy mismatch notes when canonical solver-request identity still agrees', () => {
    // Same canonical sentinel (solver-request semantics), different corpusSha256-like legacy field
    // (population identity) -- exactly the case the canonical projection is designed to separate out.
    const a = writeReportWithCanonical('canonical-agree-a.json', { nodeBudget: 100, corpusSha256: 'aaa' }, 'X');
    const b = writeReportWithCanonical('canonical-agree-b.json', { nodeBudget: 100, corpusSha256: 'bbb' }, 'X');
    assert.throws(() => checkAgreement([a, b]), /differs in \[corpusSha256\] \(canonical solver-request identity still agrees/);
});

test('checkAgreement legacy mismatch notes when canonical solver-request identity also disagrees', () => {
    const a = writeReportWithCanonical('canonical-disagree-a.json', { nodeBudget: 100 }, 'X');
    const b = writeReportWithCanonical('canonical-disagree-b.json', { nodeBudget: 999 }, 'Y');
    assert.throws(() => checkAgreement([a, b]), /differs in \[nodeBudget\] \(canonical solver-request identity also disagrees\)/);
});

test('checkCompare reports canonicalDiffers when both sides carry canonical solver-request identity', () => {
    const control = writeReportWithCanonical('canonical-compare-control.json', { nodeBudget: 100, ablation: { STRATEGY_X: false } }, 'X');
    const treatmentSame = writeReportWithCanonical('canonical-compare-treatment-same.json', { nodeBudget: 100, ablation: { STRATEGY_X: true } }, 'X');
    const sameResult = checkCompare(control, treatmentSame, ['ablation'], true);
    assert.equal(sameResult.canonicalDiffers, false, 'ablation is excluded from the canonical projection, so identical sentinel means identical canonical identity');

    const treatmentDifferent = writeReportWithCanonical('canonical-compare-treatment-different.json', { nodeBudget: 100, ablation: { STRATEGY_X: true } }, 'Y');
    const differentResult = checkCompare(control, treatmentDifferent, ['ablation'], true);
    assert.equal(differentResult.canonicalDiffers, true);
});

test('checkCompare reports canonicalDiffers as null when canonical identity is not available on both sides', () => {
    const control = writeReport('canonical-unavailable-control.json', { nodeBudget: 100, ablation: { STRATEGY_X: false } });
    const treatment = writeReport('canonical-unavailable-treatment.json', { nodeBudget: 100, ablation: { STRATEGY_X: true } });
    const result = checkCompare(control, treatment, ['ablation'], true);
    assert.equal(result.canonicalDiffers, null);
});

console.log(`\ncheck-effective-config-agreement tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
