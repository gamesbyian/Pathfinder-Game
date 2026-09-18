#!/usr/bin/env node
/**
 * CLI-level regression coverage for scripts/experiment-opportunity-audit.mjs's --check/--fail-on
 * gating (analyzeOpportunity/wilsonInterval/opportunitySampleSizeForAtLeastOne themselves are
 * already covered by scripts/combine-solver-sweep-reports-node-test.mjs's imports). This file
 * exists specifically to pin the --check exit-code contract, since that CLI-only behavior has no
 * other test coverage and is exactly what a workflow's preflight step would depend on.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { analyzeOpportunity } from './experiment-opportunity-audit.mjs';

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (err) { console.error(`  ✗ ${name}\n    ${err.stack || err.message}`); process.exitCode = 1; }
}

const dir = mkdtempSync(path.join(tmpdir(), 'opportunity-audit-cli-test-'));

function writeControl(name, levels) {
    const file = path.join(dir, name);
    writeFileSync(file, JSON.stringify({ levels }));
    return file;
}

function run(args) {
    try {
        execFileSync('node', ['scripts/experiment-opportunity-audit.mjs', ...args], { encoding: 'utf8', stdio: 'pipe' });
        return 0;
    } catch (err) {
        return err.status;
    }
}

const zeroOpportunity = writeControl('zero.json', [
    { id: 'A', ok: true, attempts: [] },
    { id: 'B', ok: true, attempts: [] },
]);
const someOpportunity = writeControl('some.json', [
    { id: 'A', ok: false, attempts: [] },
    { id: 'B', ok: true, attempts: [] },
    { id: 'C', ok: true, attempts: [] },
    { id: 'D', ok: true, attempts: [] },
    { id: 'E', ok: true, attempts: [] },
]);

test('--check=true without --fail-on still fails only on zero opportunity (unchanged default)', () => {
    assert.equal(run([`--control=${zeroOpportunity}`, '--check=true']), 2, 'zero opportunity must fail by default');
    assert.equal(run([`--control=${someOpportunity}`, '--check=true']), 0, 'nonzero opportunity must not fail by default (unless a --fail-on code is also triggered and named)');
});

test('--check=true without --fail-on does not fail merely because CEILING/OVERPROVISIONED warnings fire', () => {
    // someOpportunity is 1/5 (20% failed) -- well above the 5% CEILING threshold, so use a
    // proposed-total large enough to trigger OVERPROVISIONED and confirm it alone does not fail.
    assert.equal(run([`--control=${someOpportunity}`, '--check=true', '--target-opportunities=20', '--proposed-total=2000']), 0,
        'OVERPROVISIONED must stay advisory-only unless explicitly named in --fail-on');
});

test('--fail-on=OVERPROVISIONED turns that specific warning into a hard failure', () => {
    assert.equal(run([`--control=${someOpportunity}`, '--check=true', '--fail-on=OVERPROVISIONED', '--target-opportunities=20', '--proposed-total=2000']), 2);
});

test('--fail-on with a code that never triggers leaves the run passing', () => {
    assert.equal(run([`--control=${someOpportunity}`, '--check=true', '--fail-on=CEILING']), 0, 'CEILING does not trigger at a 20% control-failure rate');
});

test('without --check=true, no --fail-on code ever affects the exit code', () => {
    assert.equal(run([`--control=${zeroOpportunity}`, '--fail-on=ZERO_OPPORTUNITY']), 0, '--check must be explicitly opted into');
});


test('independent-unit sizing separates detection rows from between-parent support', () => {
    const grouped = analyzeOpportunity({
        levels: [
            { id: 'A1', parentId: 'P1', ok: false, attempts: [] },
            { id: 'A2', parentId: 'P1', ok: false, attempts: [] },
            { id: 'B1', parentId: 'P2', ok: true, attempts: [] },
            { id: 'C1', parentId: 'P3', ok: false, attempts: [] },
        ],
        mode: 'control-fail',
        independentUnitField: 'parentId',
        sizingBasis: 'independent-unit',
        targetOpportunities: 2,
    });
    assert.equal(grouped.opportunities, 3);
    assert.equal(grouped.independentUnits.total, 3);
    assert.equal(grouped.independentUnits.opportunities, 2);
    assert.equal(grouped.sizing.basis, 'independent-unit');
    assert.equal(grouped.sizing.pointTotal, 3);
    assert.ok(grouped.warnings.some(warning => warning.startsWith('PSEUDOREPLICATION:')));
});

console.log(`\nexperiment-opportunity-audit CLI tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
