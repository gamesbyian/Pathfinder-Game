#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildHealthRecord, summarizeStageParticipation } from './append-solver-health-record.mjs';

let passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log(`  ✓ ${name}`); }
    catch (err) { console.error(`  ✗ ${name}\n    ${err.stack || err.message}`); process.exitCode = 1; }
}

const sampleLevels = [
    { id: 'A', ok: true, deadlineTruncated: false, attempts: [{ stageId: 'main-search', ok: true, nodesExpanded: 10 }] },
    { id: 'B', ok: false, status: 'error', attempts: [{ stageId: 'main-search', ok: false, nodesExpanded: 5 }, { stageId: 'repair-fallback', ok: false, nodesExpanded: 3 }] },
    { id: 'C', ok: false, deadlineTruncated: true, attempts: [{ stageId: 'main-search', ok: false, nodesExpanded: 20 }] },
];

test('summarizeStageParticipation aggregates reach/attempts/solves/nodesExpanded per stage', () => {
    const stats = summarizeStageParticipation(sampleLevels);
    assert.deepEqual(stats['main-search'], { reach: 3, attempts: 3, solves: 1, nodesExpanded: 35 });
    assert.deepEqual(stats['repair-fallback'], { reach: 1, attempts: 1, solves: 0, nodesExpanded: 3 });
});

test('buildHealthRecord aggregates truncation/error counts and carries commit/protocol identity through', () => {
    const summary = {
        runId: '12345', solverRef: 'abc123', levelBlind: true, enableFlags: '', disableFlags: '',
        corpus1: { total: 3, solved: 1, nodes: 35, work: 100 },
        corpus2: null,
    };
    const record = buildHealthRecord(summary, { 'corpus1.json': sampleLevels });
    assert.equal(record.runId, '12345');
    assert.equal(record.commit, 'abc123');
    assert.equal(record.truncated, 1);
    assert.equal(record.errored, 1);
    assert.deepEqual(record.corpus1, { total: 3, solved: 1, nodes: 35, work: 100 });
    assert.equal(record.corpus2, null);
    assert.ok(record.recordedAt);
    assert.deepEqual(record.stageParticipation['corpus1.json']['main-search'], { reach: 3, attempts: 3, solves: 1, nodesExpanded: 35 });
});

test('CLI appends one JSONL line to the timeline file, creating the directory if needed', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'solver-health-record-test-'));
    const summaryFile = path.join(dir, 'summary.json');
    const combinedFile = path.join(dir, 'combined.json');
    const outFile = path.join(dir, 'nested', 'solver-health-timeline.jsonl');
    writeFileSync(summaryFile, JSON.stringify({ runId: 'r1', solverRef: 'sha1', corpus1: { total: 3, solved: 1, nodes: 35, work: 100 } }));
    writeFileSync(combinedFile, JSON.stringify({ levels: sampleLevels }));
    execFileSync('node', ['scripts/append-solver-health-record.mjs', `--summary=${summaryFile}`, `--combined=${combinedFile}`, `--out=${outFile}`], { encoding: 'utf8' });
    const lines = readFileSync(outFile, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]);
    assert.equal(record.runId, 'r1');
    assert.equal(record.truncated, 1);

    // A second run appends, never overwrites -- this IS the longitudinal series.
    execFileSync('node', ['scripts/append-solver-health-record.mjs', `--summary=${summaryFile}`, `--combined=${combinedFile}`, `--out=${outFile}`], { encoding: 'utf8' });
    const lines2 = readFileSync(outFile, 'utf8').trim().split('\n');
    assert.equal(lines2.length, 2, 'a second invocation must append, not overwrite');
});

console.log(`\nappend-solver-health-record tests: ${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
