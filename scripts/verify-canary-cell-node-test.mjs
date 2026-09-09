#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyCanaryCells, verifyNoDeadlineTruncation } from './verify-canary-cell.mjs';

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (err) { console.error(`  ✗ ${name}\n    ${err.stack || err.message}`); process.exitCode = 1; }
}

function healthyRow(overrides = {}) {
    return {
        id: 'R00001', ok: true, status: 'success', hadAttemptError: false,
        attempts: [{ stageId: 'main-search', ok: true, nodesExpanded: 10, workSpent: 20 }],
        nodesExpanded: 10, workSpent: 20, deadlineTruncated: false,
        ...overrides,
    };
}

test('verifyCanaryCells passes on a healthy row', () => {
    const result = verifyCanaryCells([healthyRow()]);
    assert.equal(result.ok, true);
    assert.deepEqual(result.failures, []);
});

test('verifyCanaryCells fails on an empty levels array (nothing to verify)', () => {
    assert.equal(verifyCanaryCells([]).ok, false);
    assert.equal(verifyCanaryCells(null).ok, false);
});

test('verifyCanaryCells fails when the row errored', () => {
    const result = verifyCanaryCells([healthyRow({ status: 'error', ok: false })]);
    assert.equal(result.ok, false);
    assert.match(result.failures[0], /solve raised an error/);
});

test('verifyCanaryCells fails when hadAttemptError is true even if status looks ok', () => {
    const result = verifyCanaryCells([healthyRow({ hadAttemptError: true })]);
    assert.equal(result.ok, false);
    assert.match(result.failures[0], /solve raised an error/);
});

test('verifyCanaryCells fails when zero attempts ran -- the "eliminated every attempt config" failure mode', () => {
    const result = verifyCanaryCells([healthyRow({ attempts: [] })]);
    assert.equal(result.ok, false);
    assert.match(result.failures[0], /zero attempts ran/);
});

test('verifyCanaryCells fails on malformed ok/status/nodesExpanded/workSpent fields', () => {
    assert.equal(verifyCanaryCells([healthyRow({ ok: 'yes' })]).ok, false);
    assert.equal(verifyCanaryCells([healthyRow({ status: '' })]).ok, false);
    assert.equal(verifyCanaryCells([healthyRow({ nodesExpanded: '10' })]).ok, false);
    assert.equal(verifyCanaryCells([healthyRow({ workSpent: '20' })]).ok, false);
});

test('verifyCanaryCells tolerates null nodesExpanded/workSpent (a legitimate shape for some rows)', () => {
    const result = verifyCanaryCells([healthyRow({ nodesExpanded: null, workSpent: null })]);
    assert.equal(result.ok, true);
});

test('verifyNoDeadlineTruncation passes when nothing truncated', () => {
    assert.equal(verifyNoDeadlineTruncation([healthyRow()]).ok, true);
});

test('verifyNoDeadlineTruncation fails and names the truncated id when the deadline unexpectedly fires', () => {
    const result = verifyNoDeadlineTruncation([healthyRow({ deadlineTruncated: true })]);
    assert.equal(result.ok, false);
    assert.match(result.failures[0], /R00001/);
});

const dir = mkdtempSync(path.join(tmpdir(), 'verify-canary-cell-test-'));
function writeResult(name, levels) {
    const file = path.join(dir, name);
    writeFileSync(file, JSON.stringify({ levels }));
    return file;
}
function run(args) {
    try {
        execFileSync('node', ['scripts/verify-canary-cell.mjs', ...args], { encoding: 'utf8', stdio: 'pipe' });
        return 0;
    } catch (err) {
        return err.status;
    }
}

test('CLI exits 0 on a healthy canary result', () => {
    const file = writeResult('ok.json', [healthyRow()]);
    assert.equal(run([`--result=${file}`]), 0);
});

test('CLI exits nonzero on a broken canary result', () => {
    const file = writeResult('broken.json', [healthyRow({ attempts: [] })]);
    assert.equal(run([`--result=${file}`]), 2);
});

test('CLI only checks deadline truncation when --expect-no-deadline-truncation=true is passed', () => {
    const file = writeResult('truncated.json', [healthyRow({ deadlineTruncated: true })]);
    assert.equal(run([`--result=${file}`]), 0, 'without the flag, a truncated deadline alone must not fail the canary');
    assert.equal(run([`--result=${file}`, '--expect-no-deadline-truncation=true']), 2);
});

console.log(`\nverify-canary-cell tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
